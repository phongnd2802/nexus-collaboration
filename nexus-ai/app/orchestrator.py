import time
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic_ai import DeferredToolRequests, DeferredToolResults, ToolDenied
from pydantic_ai.messages import FunctionToolCallEvent, FunctionToolResultEvent, PartDeltaEvent
from pydantic_ai.run import AgentRunResultEvent

from app.agent import AgentDeps, build_agent_with_capture
from app.backend_client import NexusBackendClient
from app.config import settings
from app.schemas import ChatCompletionRequest, ResumeRequest
from app.stores import RunState, run_store, session_store
from app.streaming import CompletionAccumulator, accumulate_chunk, normalized_text_deltas, openai_chunk, tool_part_payload


@dataclass
class ChatCompletionContext:
    model_name: str
    completion_id: str
    session_id: str
    run_id: str


class NexusAIOrchestrator:
    def metadata_value(self, request: ChatCompletionRequest, key: str) -> str | None:
        value = (request.metadata or {}).get(key)
        return str(value) if value else None

    def _model_settings(self, request: ChatCompletionRequest) -> dict[str, Any]:
        settings_map: dict[str, Any] = {}
        if request.temperature is not None:
            settings_map["temperature"] = request.temperature
        if request.max_tokens is not None:
            settings_map["max_tokens"] = request.max_tokens
        return settings_map

    def _latest_user_prompt(self, request: ChatCompletionRequest) -> str:
        if not request.messages:
            raise HTTPException(status_code=400, detail="messages must contain at least one item")

        if request.tools or request.tool_choice:
            raise HTTPException(status_code=400, detail="Client-supplied tools are not supported")

        for index, message in enumerate(request.messages):
            if not isinstance(message.content, str):
                raise HTTPException(status_code=400, detail=f"messages[{index}].content must be a text string")

        for message in reversed(request.messages):
            if message.role == "user":
                return str(message.content)
        raise HTTPException(status_code=400, detail="messages must include a user message")

    def _runtime_error_message(self, error: Exception) -> str:
        if isinstance(error, HTTPException):
            detail = str(error.detail)
            if error.status_code == 401 and "internal token" in detail.lower():
                return "Nexus AI cannot access Nexus internal APIs. Check NEXUS_INTERNAL_API_TOKEN in nexus-ai and backend."
            return detail
        return "Nexus AI could not complete that request."

    def _approval_events(
        self,
        context: ChatCompletionContext,
        run: RunState,
        output: DeferredToolRequests,
    ) -> list[str]:
        events: list[str] = []
        for approval in output.approvals:
            payload = tool_part_payload(approval)
            tool_call_id = str(payload["tool_call_id"])
            run.pending_tool_calls[tool_call_id] = {
                "tool_name": payload["tool_name"],
                "args": payload["args"],
            }
            events.append(
                openai_chunk(
                    context.completion_id,
                    context.model_name,
                    "approval_required",
                    context.session_id,
                    run.run_id,
                    finish_reason="tool_calls",
                    extra={
                        "tool_call_id": tool_call_id,
                        "tool_name": payload["tool_name"],
                        "args": payload["args"],
                        "summary": f"Approve {payload['tool_name']}?",
                    },
                )
            )
        return events

    def _json_completion_response(
        self,
        request: ChatCompletionRequest,
        completion: CompletionAccumulator,
    ) -> JSONResponse:
        return JSONResponse(
            {
                "id": f"chatcmpl-{uuid.uuid4().hex}",
                "object": "chat.completion",
                "created": int(time.time()),
                "model": request.model or settings.nexus_ai_model,
                "session_id": completion.session_id,
                "run_id": completion.run_id,
                "choices": [
                    {
                        "index": 0,
                        "message": {"role": "assistant", "content": completion.content},
                        "finish_reason": completion.finish_reason,
                    }
                ],
                "usage": {"prompt_tokens": None, "completion_tokens": None, "total_tokens": None},
            }
        )

    async def chat_completions(self, request: ChatCompletionRequest, session_id: str | None) -> Response:
        if request.stream:
            return StreamingResponse(self.stream_agent_run(request=request, session_id=session_id), media_type="text/event-stream")

        completion = CompletionAccumulator(session_id=session_id)
        async for chunk in self.stream_agent_run(request=request, session_id=session_id):
            accumulate_chunk(completion, chunk)
        return self._json_completion_response(request, completion)

    async def resume_run(self, session_id: str, run_id: str, request: ResumeRequest) -> Response:
        try:
            run = run_store.get(run_id, session_id=session_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Run not found for this session")

        if request.tool_call_id not in run.pending_tool_calls:
            raise HTTPException(status_code=404, detail="Pending tool call not found")

        deferred_results = DeferredToolResults()
        if request.decision == "approve":
            deferred_results.approvals[request.tool_call_id] = True
        else:
            deferred_results.approvals[request.tool_call_id] = ToolDenied(request.comment or "User denied this action.")

        chat_request = ChatCompletionRequest(
            model=None,
            messages=[{"role": "user", "content": "Continue"}],
            stream=True,
            metadata={"user_id": run.user_id, "workspace_id": run.workspace_id},
        )
        return StreamingResponse(
            self.stream_agent_run(
                request=chat_request,
                session_id=session_id,
                deferred_tool_results=deferred_results,
                resume_run=run,
            ),
            media_type="text/event-stream",
        )

    async def stream_agent_run(
        self,
        *,
        request: ChatCompletionRequest,
        session_id: str | None,
        deferred_tool_results: DeferredToolResults | None = None,
        resume_run: RunState | None = None,
    ) -> AsyncIterator[str]:
        model_name = request.model or settings.nexus_ai_model
        completion_id = f"chatcmpl-{uuid.uuid4().hex}"
        user_id = self.metadata_value(request, "user_id")
        workspace_id = self.metadata_value(request, "workspace_id")
        if not user_id or not workspace_id:
            raise HTTPException(status_code=400, detail="metadata.user_id and metadata.workspace_id are required")

        session = session_store.get_or_create(user_id, workspace_id, session_id)
        run = resume_run or run_store.create(session)
        user_prompt = "Continue after tool approval." if deferred_tool_results else self._latest_user_prompt(request)
        run_settings = self._model_settings(request)
        message_history = run.messages if deferred_tool_results else session.messages
        text = ""

        yield openai_chunk(
            completion_id,
            model_name,
            "run_started" if session_id else "session_started",
            session.session_id,
            run.run_id,
            content="",
        )

        try:
            agent, provider_http_client, capture_state = build_agent_with_capture(model_name, completion_id)
            async with provider_http_client:
                async with NexusBackendClient(user_id, workspace_id) as backend:
                    deps = AgentDeps(user_id=user_id, workspace_id=workspace_id, backend=backend)
                    first_text_emitted = False
                    async with agent.run_stream_events(
                        user_prompt,
                        deps=deps,
                        message_history=message_history or None,
                        deferred_tool_results=deferred_tool_results,
                        model_settings=run_settings or None,
                    ) as stream:
                        async for event in stream:
                            if isinstance(event, PartDeltaEvent) and getattr(event.delta, "part_delta_kind", None) == "text":
                                delta = event.delta.content_delta
                                for text_delta in normalized_text_deltas(
                                    capture_state.first_text_delta,
                                    delta,
                                    first_text_emitted,
                                ):
                                    text += text_delta
                                    yield openai_chunk(
                                        completion_id,
                                        model_name,
                                        "text_delta",
                                        session.session_id,
                                        run.run_id,
                                        content=text_delta,
                                    )
                                first_text_emitted = True
                            elif isinstance(event, FunctionToolCallEvent):
                                payload = tool_part_payload(event.part)
                                yield openai_chunk(
                                    completion_id,
                                    model_name,
                                    "tool_call",
                                    session.session_id,
                                    run.run_id,
                                    extra=payload,
                                )
                            elif isinstance(event, FunctionToolResultEvent):
                                part = event.part
                                yield openai_chunk(
                                    completion_id,
                                    model_name,
                                    "tool_result",
                                    session.session_id,
                                    run.run_id,
                                    extra={
                                        "tool_call_id": getattr(part, "tool_call_id", None),
                                        "tool_name": getattr(part, "tool_name", None),
                                    },
                                )
                            elif isinstance(event, AgentRunResultEvent):
                                output = event.result.output
                                run.messages = event.result.all_messages()
                                session_store.save_messages(session.session_id, run.messages)
                                if isinstance(output, DeferredToolRequests):
                                    context = ChatCompletionContext(
                                        model_name=model_name,
                                        completion_id=completion_id,
                                        session_id=session.session_id,
                                        run_id=run.run_id,
                                    )
                                    for approval_event in self._approval_events(context, run, output):
                                        yield approval_event
                                    run_store.save(run)
                                    yield openai_chunk(
                                        completion_id,
                                        model_name,
                                        "done",
                                        session.session_id,
                                        run.run_id,
                                        finish_reason="tool_calls",
                                    )
                                    yield "data: [DONE]\n\n"
                                    return
                                if not text:
                                    text = str(output)
                                    yield openai_chunk(
                                        completion_id,
                                        model_name,
                                        "text_delta",
                                        session.session_id,
                                        run.run_id,
                                        content=text,
                                    )
        except Exception as error:
            message = self._runtime_error_message(error)
            yield openai_chunk(
                completion_id,
                model_name,
                "error",
                session.session_id,
                run.run_id,
                extra={"error": message},
            )
            if not text:
                yield openai_chunk(
                    completion_id,
                    model_name,
                    "text_delta",
                    session.session_id,
                    run.run_id,
                    content=message,
                )
            run_store.save(run)
            yield openai_chunk(completion_id, model_name, "done", session.session_id, run.run_id, finish_reason="error")
            yield "data: [DONE]\n\n"
            return

        run.pending_tool_calls.clear()
        run_store.save(run)
        yield openai_chunk(completion_id, model_name, "done", session.session_id, run.run_id, finish_reason="stop")
        yield "data: [DONE]\n\n"


orchestrator = NexusAIOrchestrator()

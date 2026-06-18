import time
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
import json
from typing import Any

from fastapi import HTTPException
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic_ai import DeferredToolRequests, DeferredToolResults, ToolDenied
from pydantic_ai.messages import FunctionToolCallEvent, FunctionToolResultEvent, ModelResponse, PartDeltaEvent, TextPart
from pydantic_ai.run import AgentRunResultEvent

from app.config import settings
from app.schemas import ChatCompletionRequest, ResumeRequest
from app.stores import RunState, run_store, session_store
from app.streaming import CompletionAccumulator, accumulate_chunk, normalized_text_deltas, openai_chunk, tool_part_payload
from app.agent import AgentDeps, build_agent_with_capture, build_post_action_agent_with_capture


@dataclass
class ChatCompletionContext:
    model_name: str
    completion_id: str
    session_id: str
    run_id: str


class NexusAIOrchestrator:
    def _post_create_project_prompt(self, result: dict[str, Any]) -> str:
        return (
            "A project was created successfully.\n"
            f"Tool result JSON: {json.dumps(result, ensure_ascii=False)}\n"
            "Write a concise reply to the end user in the same language they used most recently. "
            "Confirm the project was created successfully, mention the project name if present, "
            "and suggest creating the first task next. Do not mention approval forms, resumes, or tools."
        )

    async def _stream_post_action_follow_up(
        self,
        *,
        model_name: str,
        completion_id: str,
        session_id: str,
        run_id: str,
        prompt: str,
    ) -> AsyncIterator[str]:
        agent, provider_http_client, capture_state = build_post_action_agent_with_capture(model_name, completion_id)
        text = ""
        async with provider_http_client:
            first_text_emitted = False
            async with agent.run_stream_events(prompt) as stream:
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
                                session_id,
                                run_id,
                                content=text_delta,
                            )
                        first_text_emitted = True
                    elif isinstance(event, AgentRunResultEvent) and not text:
                        output = event.result.output
                        text = str(output)
                        yield openai_chunk(
                            completion_id,
                            model_name,
                            "text_delta",
                            session_id,
                            run_id,
                            content=text,
                        )

    def _tool_result_payload(self, part: Any) -> dict[str, Any] | None:
        if hasattr(part, "model_response_object"):
            try:
                return part.model_response_object()
            except Exception:
                return None
        content = getattr(part, "content", None)
        return content if isinstance(content, dict) else None

    def _replace_last_response_text(self, messages: list[Any], text: str) -> list[Any]:
        response = ModelResponse(parts=[TextPart(content=text)])
        if messages and isinstance(messages[-1], ModelResponse):
            return [*messages[:-1], response]
        return [*messages, response]

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
                        "summary": (
                            "Complete project details and confirm creation"
                            if payload["tool_name"] == "create_project"
                            else f"Approve {payload['tool_name']}?"
                        ),
                        "approval_kind": (
                            "project_create_form"
                            if payload["tool_name"] == "create_project"
                            else "generic"
                        ),
                        "initial_values": payload["args"] if payload["tool_name"] == "create_project" else None,
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
            if request.form_data is not None:
                deferred_results.metadata[request.tool_call_id] = {"form_data": request.form_data}
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
        buffered_main_text = ""
        latest_tool_name: str | None = None
        latest_tool_result: dict[str, Any] | None = None
        latest_tool_outcome: str | None = None
        completed_messages: list[Any] | None = None
        deferred_tool_call_id = next(iter(deferred_tool_results.approvals), None) if deferred_tool_results else None
        resumed_tool_name = (
            run.pending_tool_calls.get(deferred_tool_call_id, {}).get("tool_name")
            if deferred_tool_call_id
            else None
        )
        suppress_main_agent_text = (
            deferred_tool_results is not None
            and resumed_tool_name == "create_project"
            and deferred_tool_call_id is not None
            and deferred_tool_results.approvals.get(deferred_tool_call_id) is True
        )

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
                deps = AgentDeps(user_id=user_id, workspace_id=workspace_id)
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
                                if suppress_main_agent_text:
                                    buffered_main_text += text_delta
                                else:
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
                            latest_tool_name = getattr(part, "tool_name", None)
                            latest_tool_result = self._tool_result_payload(part)
                            latest_tool_outcome = getattr(part, "outcome", None)
                            yield openai_chunk(
                                completion_id,
                                model_name,
                                "tool_result",
                                session.session_id,
                                run.run_id,
                                extra={
                                    "tool_call_id": getattr(part, "tool_call_id", None),
                                    "tool_name": getattr(part, "tool_name", None),
                                    "result": latest_tool_result,
                                    "outcome": latest_tool_outcome,
                                },
                            )
                        elif isinstance(event, AgentRunResultEvent):
                            output = event.result.output
                            completed_messages = event.result.all_messages()
                            if isinstance(output, DeferredToolRequests):
                                run.messages = completed_messages
                                session_store.save_messages(session.session_id, run.messages)
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
                            if suppress_main_agent_text:
                                if not buffered_main_text:
                                    buffered_main_text = str(output)
                            elif not text:
                                text = str(output)
                                yield openai_chunk(
                                    completion_id,
                                    model_name,
                                    "text_delta",
                                    session.session_id,
                                    run.run_id,
                                    content=text,
                                )
            if (
                suppress_main_agent_text
                and latest_tool_name == "create_project"
                and latest_tool_outcome == "success"
                and latest_tool_result
            ):
                text = ""
                async for chunk in self._stream_post_action_follow_up(
                    model_name=model_name,
                    completion_id=completion_id,
                    session_id=session.session_id,
                    run_id=run.run_id,
                    prompt=self._post_create_project_prompt(latest_tool_result),
                ):
                    payload = chunk.removeprefix("data: ").strip()
                    if payload != "[DONE]":
                        try:
                            parsed = json.loads(payload)
                        except Exception:
                            parsed = None
                        if isinstance(parsed, dict):
                            delta = parsed.get("delta")
                            if isinstance(delta, str):
                                text += delta
                    yield chunk
                if completed_messages is not None:
                    completed_messages = self._replace_last_response_text(completed_messages, text)
            elif suppress_main_agent_text and buffered_main_text:
                text = buffered_main_text
                yield openai_chunk(
                    completion_id,
                    model_name,
                    "text_delta",
                    session.session_id,
                    run.run_id,
                    content=text,
                )
            if completed_messages is not None:
                run.messages = completed_messages
                session_store.save_messages(session.session_id, run.messages)
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

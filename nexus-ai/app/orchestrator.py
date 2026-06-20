import time
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import datetime, timezone
import json
from typing import Any

from fastapi import HTTPException
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic_ai import DeferredToolRequests, DeferredToolResults, ToolDenied
from pydantic_ai.messages import (
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    ModelRequest,
    ModelResponse,
    PartDeltaEvent,
    RetryPromptPart,
    TextPart,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)
from pydantic_ai.run import AgentRunResultEvent

from app.config import settings
from app.schemas import ChatCompletionRequest, ResumeRequest, SessionSnapshot, SessionSummary
from app.stores import RunState, run_store, session_store
from app.streaming import CompletionAccumulator, accumulate_chunk, normalized_text_deltas, openai_chunk, tool_part_payload
from app.agent import AgentDeps, build_agent_with_capture, build_post_action_agent_with_capture
from app.tools.backend_client import request_backend


@dataclass
class ChatCompletionContext:
    model_name: str
    completion_id: str
    session_id: str
    run_id: str


class NexusAIOrchestrator:
    PROJECT_CREATE_TOOL = "create_project"
    PROJECT_UPDATE_TOOL = "update_project"
    PROJECT_LIST_TOOL = "list_projects"

    def _timestamp_iso(self, value: Any) -> str:
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc).isoformat()
        return datetime.now(timezone.utc).isoformat()

    def _approval_summary(self, tool_name: str) -> str:
        if tool_name == self.PROJECT_CREATE_TOOL:
            return "Complete project details and confirm creation"
        if tool_name == self.PROJECT_UPDATE_TOOL:
            return "Review changes and confirm project update"
        return f"Approve {tool_name}?"

    def _approval_kind(self, tool_name: str) -> str:
        if tool_name == self.PROJECT_CREATE_TOOL:
            return "project_create_form"
        if tool_name == self.PROJECT_UPDATE_TOOL:
            return "project_update_form"
        return "generic"

    async def _approval_initial_values(
        self,
        *,
        tool_name: str,
        user_id: str,
        workspace_id: str,
        args: dict[str, Any],
    ) -> dict[str, Any] | None:
        if tool_name == self.PROJECT_CREATE_TOOL:
            return args
        if tool_name == self.PROJECT_UPDATE_TOOL:
            project_id = args.get("project_id")
            if not isinstance(project_id, str) or not project_id.strip():
                return args
            try:
                project = await request_backend(
                    user_id=user_id,
                    workspace_id=workspace_id,
                    method="GET",
                    path=f"/projects/{project_id}",
                )
            except Exception:
                return args
            if not isinstance(project, dict):
                return args
            return {
                **project,
                "project_id": project_id,
            }
        return None

    def _post_action_prompt(self, tool_name: str, result: dict[str, Any]) -> str | None:
        if tool_name == self.PROJECT_CREATE_TOOL:
            return (
                "A project was created successfully.\n"
                f"Tool result JSON: {json.dumps(result, ensure_ascii=False)}\n"
                "Write a concise reply to the end user in the same language they used most recently. "
                "Confirm the project was created successfully, mention the project name if present, "
                "and suggest creating the first task next. Do not mention approval forms, resumes, or tools."
            )
        if tool_name == self.PROJECT_UPDATE_TOOL:
            return (
                "A project was updated successfully.\n"
                f"Tool result JSON: {json.dumps(result, ensure_ascii=False)}\n"
                "Write a concise reply to the end user in the same language they used most recently. "
                "Confirm the project was updated successfully, mention the project name if present, "
                "and do not mention approval forms, resumes, or tools."
            )
        return None

    def _is_duplicate_resumed_approval(
        self,
        payload: dict[str, Any],
        *,
        resumed_tool_name: str | None,
        resumed_tool_args: dict[str, Any] | None,
    ) -> bool:
        if not resumed_tool_name or payload.get("tool_name") != resumed_tool_name:
            return False

        if resumed_tool_name == self.PROJECT_UPDATE_TOOL:
            resumed_project_id = (resumed_tool_args or {}).get("project_id")
            approval_project_id = payload.get("args", {}).get("project_id")
            return isinstance(resumed_project_id, str) and resumed_project_id == approval_project_id

        return True

    def _strip_tool_calls_from_messages(self, messages: list[Any], tool_call_ids: set[str]) -> list[Any]:
        sanitized: list[Any] = []
        for message in messages:
            if not isinstance(message, ModelResponse):
                sanitized.append(message)
                continue

            filtered_parts = [
                part
                for part in message.parts
                if not (
                    isinstance(part, ToolCallPart)
                    and getattr(part, "tool_call_id", None) in tool_call_ids
                )
            ]
            if filtered_parts:
                sanitized.append(ModelResponse(parts=filtered_parts, timestamp=message.timestamp))
        return sanitized

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
                data = part.model_response_object()
                return data if isinstance(data, dict) else None
            except Exception:
                return None
        content = getattr(part, "content", None)
        return content if isinstance(content, dict) else None

    def _tool_result_metadata(self, part: Any) -> dict[str, Any] | None:
        metadata = getattr(part, "metadata", None)
        return metadata if isinstance(metadata, dict) else None

    def _assistant_payload_item(self, payload: dict[str, Any], timestamp: str) -> dict[str, Any] | None:
        if payload.get("payload_type") != "project_list":
            return None

        items = payload.get("items")
        if not isinstance(items, list) or not items:
            return None

        return {
            "id": f"assistant-project-list-{len(items)}-{timestamp}",
            "type": "assistant_project_list",
            "title": payload.get("title") if isinstance(payload.get("title"), str) else "Projects",
            "projects": items,
            "timestamp": timestamp,
        }

    def _replace_last_response_text(self, messages: list[Any], text: str) -> list[Any]:
        response = ModelResponse(parts=[TextPart(content=text)])
        if messages and isinstance(messages[-1], ModelResponse):
            return [*messages[:-1], response]
        return [*messages, response]

    def _find_session_run(self, session_id: str) -> RunState | None:
        runs = run_store.list_by_session(session_id)
        return runs[-1] if runs else None

    def _build_session_items(
        self,
        messages: list[Any],
        *,
        session_id: str,
        run: RunState | None,
    ) -> tuple[list[dict[str, Any]], str | None]:
        items: list[dict[str, Any]] = []
        active_approval_item_id: str | None = None
        pending_assistant_payloads: list[tuple[dict[str, Any], str]] = []

        def flush_assistant_text(parts: list[str], timestamp: str) -> None:
            content = "".join(parts).strip()
            if not content:
                return
            items.append(
                {
                    "id": f"assistant-{len(items)}",
                    "type": "assistant_message",
                    "content": content,
                    "status": "completed",
                    "timestamp": timestamp,
                }
            )

            if not pending_assistant_payloads:
                return
            for payload, payload_timestamp in pending_assistant_payloads:
                item = self._assistant_payload_item(payload, payload_timestamp)
                if item is not None:
                    items.append(item)
            pending_assistant_payloads.clear()

        for message in messages:
            if isinstance(message, ModelRequest):
                for part in message.parts:
                    if isinstance(part, UserPromptPart):
                        items.append(
                            {
                                "id": f"user-{len(items)}",
                                "type": "user_message",
                                "content": str(part.content),
                                "timestamp": self._timestamp_iso(getattr(part, "timestamp", None) or message.timestamp),
                            }
                        )
                continue

            if not isinstance(message, ModelResponse):
                continue

            assistant_parts: list[str] = []
            assistant_timestamp = self._timestamp_iso(message.timestamp)

            for part in message.parts:
                if isinstance(part, TextPart):
                    assistant_parts.append(part.content)
                    continue

                flush_assistant_text(assistant_parts, assistant_timestamp)
                assistant_parts = []

                if isinstance(part, ToolCallPart):
                    items.append(
                        {
                            "id": f"tool-call-{part.tool_call_id}",
                            "type": "tool_call",
                            "toolName": part.tool_name,
                            "input": part.args_as_dict() if hasattr(part, "args_as_dict") else getattr(part, "args", None),
                            "status": "completed",
                            "timestamp": self._timestamp_iso(message.timestamp),
                        }
                    )
                    continue

                if isinstance(part, ToolReturnPart):
                    items.append(
                        {
                            "id": f"tool-result-{part.tool_call_id}",
                            "type": "tool_result",
                            "toolName": part.tool_name,
                            "result": self._tool_result_payload(part),
                            "outcome": getattr(part, "outcome", None),
                            "status": "error" if getattr(part, "outcome", None) in {"failed", "error", "denied"} else "completed",
                            "timestamp": self._timestamp_iso(getattr(part, "timestamp", None) or message.timestamp),
                        }
                    )
                    metadata = self._tool_result_metadata(part)
                    if metadata is not None:
                        pending_assistant_payloads.append(
                            (
                                metadata,
                                self._timestamp_iso(getattr(part, "timestamp", None) or message.timestamp),
                            )
                        )
                    continue

                if isinstance(part, RetryPromptPart):
                    items.append(
                        {
                            "id": f"system-{len(items)}",
                            "type": "system_event",
                            "title": "Retry requested",
                            "description": str(part.content),
                            "status": "error",
                            "timestamp": self._timestamp_iso(getattr(part, "timestamp", None) or message.timestamp),
                        }
                    )

            flush_assistant_text(assistant_parts, assistant_timestamp)

        for payload, payload_timestamp in pending_assistant_payloads:
            item = self._assistant_payload_item(payload, payload_timestamp)
            if item is not None:
                items.append(item)

        if run and run.pending_tool_calls:
            for tool_call_id, payload in run.pending_tool_calls.items():
                if tool_call_id in run.consumed_tool_call_ids:
                    continue
                item_id = f"approval-{tool_call_id}"
                active_approval_item_id = item_id
                items.append(
                    {
                        "id": item_id,
                        "type": "approval_required",
                        "approval": {
                            "sessionId": session_id,
                            "runId": run.run_id,
                            "toolCallId": tool_call_id,
                            "toolName": payload["tool_name"],
                            "args": payload["args"],
                            "summary": self._approval_summary(payload["tool_name"]),
                            "approvalKind": self._approval_kind(payload["tool_name"]),
                            "initialValues": payload.get("initial_values"),
                        },
                        "status": "pending",
                        "timestamp": self._timestamp_iso(datetime.now(timezone.utc)),
                    }
                )
                break

        return items, active_approval_item_id

    def get_session_snapshot(self, session_id: str, user_id: str, workspace_id: str) -> SessionSnapshot:
        try:
            session = session_store.get(session_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Session not found")

        if session.user_id != user_id or session.workspace_id != workspace_id:
            raise HTTPException(status_code=404, detail="Session not found")

        run = self._find_session_run(session_id)
        items, active_approval_item_id = self._build_session_items(session.messages, session_id=session_id, run=run)
        first_user_message = next((item for item in items if item["type"] == "user_message" and item.get("content")), None)
        title = (
            str(first_user_message["content"]).strip()[:48]
            if first_user_message
            else "New conversation"
        ) or "New conversation"
        updated_at = items[-1]["timestamp"] if items else self._timestamp_iso(datetime.now(timezone.utc))

        return SessionSnapshot(
            sessionId=session.session_id,
            title=title,
            items=items,
            updatedAt=updated_at,
            activeApprovalItemId=active_approval_item_id,
        )

    def list_sessions(self, user_id: str, workspace_id: str) -> list[SessionSummary]:
        sessions = session_store.list_by_owner(user_id, workspace_id)
        summaries: list[SessionSummary] = []

        for session in sessions:
            snapshot = self.get_session_snapshot(session.session_id, user_id, workspace_id)
            summaries.append(
                SessionSummary(
                    sessionId=snapshot.sessionId,
                    title=snapshot.title,
                    updatedAt=snapshot.updatedAt,
                    messageCount=len(snapshot.items),
                    hasPendingApproval=snapshot.activeApprovalItemId is not None,
                )
            )

        return sorted(summaries, key=lambda item: item.updatedAt, reverse=True)

    def delete_session(self, session_id: str, user_id: str, workspace_id: str) -> dict[str, Any]:
        try:
            session = session_store.get(session_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Session not found")

        if session.user_id != user_id or session.workspace_id != workspace_id:
            raise HTTPException(status_code=404, detail="Session not found")

        run_store.delete_by_session(session_id)
        session_store.delete(session_id)
        return {"success": True, "sessionId": session_id}

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

    async def _approval_events(
        self,
        context: ChatCompletionContext,
        run: RunState,
        output: DeferredToolRequests,
    ) -> list[str]:
        events: list[str] = []
        for approval in output.approvals:
            payload = tool_part_payload(approval)
            tool_call_id = str(payload["tool_call_id"])
            initial_values = await self._approval_initial_values(
                tool_name=payload["tool_name"],
                user_id=run.user_id,
                workspace_id=run.workspace_id,
                args=payload["args"],
            )
            run.pending_tool_calls[tool_call_id] = {
                "tool_name": payload["tool_name"],
                "args": payload["args"],
                "initial_values": initial_values,
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
                        "summary": self._approval_summary(payload["tool_name"]),
                        "approval_kind": self._approval_kind(payload["tool_name"]),
                        "initial_values": initial_values,
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
        run.consumed_tool_call_ids.add(request.tool_call_id)
        run_store.save(run)
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
        latest_tool_metadata: dict[str, Any] | None = None
        latest_tool_outcome: str | None = None
        completed_messages: list[Any] | None = None
        deferred_tool_call_id = next(iter(deferred_tool_results.approvals), None) if deferred_tool_results else None
        deferred_tool_approval = (
            deferred_tool_results.approvals.get(deferred_tool_call_id)
            if deferred_tool_results is not None and deferred_tool_call_id is not None
            else None
        )
        resumed_tool_name = (
            run.pending_tool_calls.get(deferred_tool_call_id, {}).get("tool_name")
            if deferred_tool_call_id
            else None
        )
        resumed_tool_args = (
            run.pending_tool_calls.get(deferred_tool_call_id, {}).get("args")
            if deferred_tool_call_id
            else None
        )
        suppress_main_agent_text = (
            deferred_tool_results is not None
            and resumed_tool_name in {self.PROJECT_CREATE_TOOL, self.PROJECT_UPDATE_TOOL}
            and deferred_tool_call_id is not None
        )
        approval_granted = deferred_tool_approval is True
        approval_denied = isinstance(deferred_tool_approval, ToolDenied)
        suppressed_duplicate_denial = False

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
                            if approval_denied and payload.get("tool_name") == resumed_tool_name:
                                continue
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
                            if approval_denied and getattr(part, "tool_name", None) == resumed_tool_name:
                                continue
                            latest_tool_name = getattr(part, "tool_name", None)
                            latest_tool_result = self._tool_result_payload(part)
                            latest_tool_metadata = self._tool_result_metadata(part)
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
                                duplicate_approval_payloads = [
                                    tool_part_payload(approval)
                                    for approval in output.approvals
                                    if self._is_duplicate_resumed_approval(
                                        tool_part_payload(approval),
                                        resumed_tool_name=resumed_tool_name,
                                        resumed_tool_args=resumed_tool_args if isinstance(resumed_tool_args, dict) else None,
                                    )
                                ]
                                if duplicate_approval_payloads and len(duplicate_approval_payloads) == len(output.approvals):
                                    duplicate_tool_call_ids = {
                                        str(payload["tool_call_id"])
                                        for payload in duplicate_approval_payloads
                                    }
                                    if (
                                        deferred_tool_results is not None
                                        and resumed_tool_name is not None
                                        and latest_tool_name == resumed_tool_name
                                        and latest_tool_outcome == "success"
                                    ):
                                        completed_messages = self._strip_tool_calls_from_messages(
                                            completed_messages,
                                            duplicate_tool_call_ids,
                                        )
                                        continue
                                    if approval_denied:
                                        candidate_messages = self._strip_tool_calls_from_messages(
                                            completed_messages,
                                            duplicate_tool_call_ids,
                                        )
                                        completed_messages = candidate_messages or run.messages
                                        text = ""
                                        buffered_main_text = ""
                                        suppressed_duplicate_denial = True
                                        break
                                    raise HTTPException(
                                        status_code=500,
                                        detail=(
                                            f"Nexus AI attempted to request approval for {resumed_tool_name} again "
                                            "after approval was already submitted."
                                        ),
                                    )
                                run.messages = completed_messages
                                session_store.save_messages(session.session_id, run.messages)
                                context = ChatCompletionContext(
                                    model_name=model_name,
                                    completion_id=completion_id,
                                    session_id=session.session_id,
                                    run_id=run.run_id,
                                )
                                for approval_event in await self._approval_events(context, run, output):
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
            if latest_tool_name == self.PROJECT_LIST_TOOL and latest_tool_outcome == "success" and latest_tool_metadata:
                assistant_payload_item = self._assistant_payload_item(
                    latest_tool_metadata,
                    self._timestamp_iso(datetime.now(timezone.utc)),
                )
                if assistant_payload_item is not None:
                    yield openai_chunk(
                        completion_id,
                        model_name,
                        "assistant_payload",
                        session.session_id,
                        run.run_id,
                        extra={
                            "payload_type": "project_list",
                            "title": assistant_payload_item["title"],
                            "items": assistant_payload_item["projects"],
                        },
                    )
            if (
                suppress_main_agent_text
                and latest_tool_name in {self.PROJECT_CREATE_TOOL, self.PROJECT_UPDATE_TOOL}
                and latest_tool_outcome == "success"
                and latest_tool_result
            ):
                prompt = self._post_action_prompt(latest_tool_name, latest_tool_result)
                if prompt:
                    text = ""
                    async for chunk in self._stream_post_action_follow_up(
                        model_name=model_name,
                        completion_id=completion_id,
                        session_id=session.session_id,
                        run_id=run.run_id,
                        prompt=prompt,
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
            elif suppress_main_agent_text and buffered_main_text and approval_granted and not suppressed_duplicate_denial:
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
            if deferred_tool_call_id:
                run.pending_tool_calls.pop(deferred_tool_call_id, None)
                run.consumed_tool_call_ids.discard(deferred_tool_call_id)
            run_store.save(run)
            yield openai_chunk(completion_id, model_name, "done", session.session_id, run.run_id, finish_reason="error")
            yield "data: [DONE]\n\n"
            return

        run.pending_tool_calls.clear()
        run.consumed_tool_call_ids.clear()
        run_store.save(run)
        yield openai_chunk(completion_id, model_name, "done", session.session_id, run.run_id, finish_reason="stop")
        yield "data: [DONE]\n\n"


orchestrator = NexusAIOrchestrator()

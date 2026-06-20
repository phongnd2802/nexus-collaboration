import json
import uuid
from collections.abc import AsyncIterator
from dataclasses import replace
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, Request
from fastapi.responses import Response
from pydantic_ai import DeferredToolRequests
from pydantic_ai.messages import ModelRequest, ModelResponse, ToolCallPart, UserPromptPart
from pydantic_ai.ui.vercel_ai import VercelAIAdapter
from pydantic_ai.ui.vercel_ai.response_types import BaseChunk, DataChunk

from app.agent import AgentDeps, build_agent_with_capture
from app.config import settings
from app.schemas import SessionSnapshot, SessionSummary
from app.stores import RunState, run_store, session_store
from app.streaming import tool_part_payload
from app.tools.backend_client import request_backend


class NexusAIOrchestrator:
    PROJECT_CREATE_TOOL = "create_project"
    PROJECT_UPDATE_TOOL = "update_project"
    UI_SDK_VERSION = 6

    def _debug_log(self, event: str, payload: dict[str, Any]) -> None:
        if not settings.nexus_ai_debug_log:
            return
        print(f"[nexus-ai] {event}", json.dumps(payload, ensure_ascii=True, default=str))

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
            return {**project, "project_id": project_id}
        return None

    def _approval_provider_details(
        self,
        *,
        session_id: str,
        run_id: str,
        tool_call_id: str,
        tool_name: str,
        args: dict[str, Any],
        initial_values: dict[str, Any] | None,
    ) -> dict[str, Any]:
        return {
            "approval_required": True,
            "session_id": session_id,
            "run_id": run_id,
            "tool_call_id": tool_call_id,
            "tool_name": tool_name,
            "args": args,
            "summary": self._approval_summary(tool_name),
            "approval_kind": self._approval_kind(tool_name),
            "initial_values": initial_values,
        }

    def _approval_data_chunk(
        self,
        *,
        session_id: str,
        run_id: str,
        tool_call_id: str,
        tool_name: str,
        args: dict[str, Any],
        initial_values: dict[str, Any] | None,
    ) -> DataChunk:
        return DataChunk(
            type="data-approval_required",
            id=f"approval-{tool_call_id}",
            data={
                "sessionId": session_id,
                "runId": run_id,
                "toolCallId": tool_call_id,
                "toolName": tool_name,
                "args": args,
                "summary": self._approval_summary(tool_name),
                "approvalKind": self._approval_kind(tool_name),
                "initialValues": initial_values,
            },
        )

    def _annotate_pending_tool_call(
        self,
        messages: list[Any],
        *,
        tool_call_id: str,
        provider_details: dict[str, Any],
    ) -> list[Any]:
        annotated_messages: list[Any] = []

        for message in messages:
            if not isinstance(message, ModelResponse):
                annotated_messages.append(message)
                continue

            updated_parts: list[Any] = []
            changed = False
            for part in message.parts:
                if isinstance(part, ToolCallPart) and part.tool_call_id == tool_call_id:
                    existing_details = part.provider_details if isinstance(part.provider_details, dict) else {}
                    updated_parts.append(replace(part, provider_details={**existing_details, **provider_details}))
                    changed = True
                else:
                    updated_parts.append(part)

            annotated_messages.append(replace(message, parts=updated_parts) if changed else message)

        return annotated_messages

    async def _prepare_pending_approvals(
        self,
        *,
        messages: list[Any],
        session_id: str,
        run: RunState,
        output: DeferredToolRequests,
    ) -> tuple[list[Any], list[DataChunk]]:
        annotated_messages = messages
        data_chunks: list[DataChunk] = []
        run.pending_tool_calls.clear()
        run.consumed_tool_call_ids.clear()

        for approval in output.approvals:
            payload = tool_part_payload(approval)
            tool_call_id = str(payload["tool_call_id"])
            tool_name = str(payload["tool_name"])
            args = payload["args"] if isinstance(payload["args"], dict) else {}
            initial_values = await self._approval_initial_values(
                tool_name=tool_name,
                user_id=run.user_id,
                workspace_id=run.workspace_id,
                args=args,
            )
            run.pending_tool_calls[tool_call_id] = {
                "tool_name": tool_name,
                "args": args,
                "initial_values": initial_values,
            }

            provider_details = self._approval_provider_details(
                session_id=session_id,
                run_id=run.run_id,
                tool_call_id=tool_call_id,
                tool_name=tool_name,
                args=args,
                initial_values=initial_values,
            )
            annotated_messages = self._annotate_pending_tool_call(
                annotated_messages,
                tool_call_id=tool_call_id,
                provider_details=provider_details,
            )
            data_chunks.append(
                self._approval_data_chunk(
                    session_id=session_id,
                    run_id=run.run_id,
                    tool_call_id=tool_call_id,
                    tool_name=tool_name,
                    args=args,
                    initial_values=initial_values,
                )
            )

        return annotated_messages, data_chunks

    def _find_session_run(self, session_id: str) -> RunState | None:
        runs = run_store.list_by_session(session_id)
        return runs[-1] if runs else None

    def _find_run_for_tool_approvals(self, session_id: str, tool_call_ids: set[str]) -> RunState | None:
        runs = run_store.list_by_session(session_id)
        for run in reversed(runs):
            if tool_call_ids.intersection(run.pending_tool_calls):
                return run
        return None

    def _dump_ui_messages(self, messages: list[Any]) -> list[dict[str, Any]]:
        return [
            message.model_dump(by_alias=True, exclude_none=True)
            for message in VercelAIAdapter.dump_messages(messages, sdk_version=self.UI_SDK_VERSION)
        ]

    def _active_approval_item_id(self, ui_messages: list[dict[str, Any]]) -> str | None:
        for message in reversed(ui_messages):
            if message.get("role") != "assistant":
                continue
            for part in reversed(message.get("parts") or []):
                if not isinstance(part, dict):
                    continue
                tool_call_id = part.get("toolCallId") or part.get("tool_call_id")
                if isinstance(tool_call_id, str) and part.get("state") == "approval-requested":
                    return f"approval-{tool_call_id}"
        return None

    def _session_title(self, ui_messages: list[dict[str, Any]]) -> str:
        for message in ui_messages:
            if message.get("role") != "user":
                continue
            text = "".join(
                part.get("text", "")
                for part in message.get("parts") or []
                if isinstance(part, dict) and part.get("type") == "text"
            ).strip()
            if text:
                return text[:48]
        return "New conversation"

    def _session_updated_at(self, messages: list[Any]) -> str:
        for message in reversed(messages):
            timestamp = getattr(message, "timestamp", None)
            if isinstance(timestamp, datetime):
                return self._timestamp_iso(timestamp)
        return self._timestamp_iso(None)

    async def dispatch_ui_request(
        self,
        *,
        request: Request,
        user_id: str,
        workspace_id: str,
        session_id: str | None,
        model_name: str | None = None,
    ) -> Response:
        body = await request.body()
        run_input = VercelAIAdapter.build_run_input(body)
        resolved_session_id = session_id or run_input.id or None
        session = session_store.get_or_create(user_id, workspace_id, resolved_session_id)
        completion_id = f"chatcmpl-{uuid.uuid4().hex}"
        resolved_model_name = model_name or settings.nexus_ai_model
        agent, provider_http_client, _capture_state = build_agent_with_capture(resolved_model_name, completion_id)
        adapter = VercelAIAdapter(
            agent=agent,
            run_input=run_input,
            accept=request.headers.get("accept"),
            sdk_version=self.UI_SDK_VERSION,
            server_message_id=f"assistant-{uuid.uuid4().hex}",
        )

        deferred_tool_results = adapter.deferred_tool_results
        if deferred_tool_results:
            run = self._find_run_for_tool_approvals(session.session_id, set(deferred_tool_results.approvals))
            if run is None:
                raise HTTPException(status_code=404, detail="Pending tool call not found")
        else:
            run = run_store.create(session)

        self._debug_log(
            "ui_request",
            {
                "session_id": session.session_id,
                "run_id": run.run_id,
                "workspace_id": workspace_id,
                "model": resolved_model_name,
                "message_count": len(run_input.messages),
                "has_deferred_tool_results": bool(deferred_tool_results),
            },
        )

        async def on_complete(result: Any) -> AsyncIterator[BaseChunk]:
            messages = result.all_messages()
            output = result.output
            chunks: list[DataChunk] = []

            if isinstance(output, DeferredToolRequests):
                messages, chunks = await self._prepare_pending_approvals(
                    messages=messages,
                    session_id=session.session_id,
                    run=run,
                    output=output,
                )
            else:
                if deferred_tool_results:
                    for tool_call_id in deferred_tool_results.approvals:
                        run.pending_tool_calls.pop(tool_call_id, None)
                    run.consumed_tool_call_ids.clear()

            run.messages = messages
            session_store.save_messages(session.session_id, messages)
            run_store.save(run)
            self._debug_log(
                "ui_complete",
                {
                    "session_id": session.session_id,
                    "run_id": run.run_id,
                    "output_type": type(output).__name__,
                    "stored_message_count": len(messages),
                    "pending_tool_call_count": len(run.pending_tool_calls),
                    "data_chunk_count": len(chunks),
                },
            )

            for chunk in chunks:
                yield chunk

        event_stream = adapter.run_stream(
            conversation_id=session.session_id,
            model=resolved_model_name,
            deps=AgentDeps(user_id=user_id, workspace_id=workspace_id),
            deferred_tool_results=deferred_tool_results,
            on_complete=on_complete,
        )

        async def managed_stream() -> AsyncIterator[BaseChunk]:
            async with provider_http_client:
                async for event in event_stream:
                    print(event)
                    yield event

        return adapter.streaming_response(managed_stream())

    def get_session_snapshot(self, session_id: str, user_id: str, workspace_id: str) -> SessionSnapshot:
        try:
            session = session_store.get(session_id)
        except KeyError:
            raise HTTPException(status_code=404, detail="Session not found")

        if session.user_id != user_id or session.workspace_id != workspace_id:
            raise HTTPException(status_code=404, detail="Session not found")

        ui_messages = self._dump_ui_messages(session.messages)
        title = self._session_title(ui_messages)
        updated_at = self._session_updated_at(session.messages)
        active_approval_item_id = self._active_approval_item_id(ui_messages)

        return SessionSnapshot(
            sessionId=session.session_id,
            title=title,
            items=[],
            uiMessages=ui_messages,
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
                    messageCount=len(snapshot.uiMessages or []),
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


orchestrator = NexusAIOrchestrator()

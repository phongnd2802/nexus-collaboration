from __future__ import annotations

import json
from typing import Any

from pydantic_ai.messages import (
    FinalResultEvent,
    FunctionToolResultEvent,
    PartDeltaEvent,
    PartEndEvent,
    PartStartEvent,
    TextPart,
    TextPartDelta,
    ThinkingPart,
    ThinkingPartDelta,
    ToolCallPart,
    ToolCallPartDelta,
    ToolReturnPart,
)
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, StreamingResponse
from starlette.routing import Route

from nexus_ai.agent import NexusAgentRuntime
from nexus_ai.agent_chat_store import AgentChatStore, ChatSession
from nexus_ai.request_context import RequestContext, get_request_context, reset_request_context, set_request_context


def create_agent_chat_app(runtime: NexusAgentRuntime) -> Starlette:
    store = AgentChatStore(runtime.deps.memory.store)

    async def create_chat_completion(request: Request) -> Response:
        body = await request.json()
        workspace_id = request.path_params["workspace_id"]
        return await _stream_chat(runtime, store, request, body, workspace_id, session_id=None)

    async def continue_chat_completion(request: Request) -> Response:
        body = await request.json()
        workspace_id = request.path_params["workspace_id"]
        session_id = request.path_params["session_id"]
        return await _stream_chat(runtime, store, request, body, workspace_id, session_id=session_id)

    async def list_sessions(request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        sessions = store.list_sessions(workspace_id)
        return JSONResponse(
            {
                "data": [
                    {
                        "sessionId": session.id,
                        "title": session.title,
                        "updatedAt": session.updated_at,
                        "messageCount": len(store.messages_for_session(session.id)),
                        "hasPendingApproval": False,
                    }
                    for session in sessions
                ]
            }
        )

    async def get_session(request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        session_id = request.path_params["session_id"]
        try:
            return JSONResponse(store.snapshot(workspace_id, session_id))
        except KeyError:
            return JSONResponse({"detail": "Session not found"}, status_code=404)

    async def delete_session(request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        session_id = request.path_params["session_id"]
        try:
            store.delete_session(workspace_id, session_id)
        except KeyError:
            return JSONResponse({"detail": "Session not found"}, status_code=404)
        return JSONResponse({"success": True, "sessionId": session_id})

    async def replay_session_events(request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        session_id = request.path_params["session_id"]
        since_event_id = request.query_params.get("since_event_id")
        if not store.get_session(workspace_id, session_id):
            return JSONResponse({"detail": "Session not found"}, status_code=404)

        events = store.events_for_session(session_id, since_event_id)

        async def stream() -> Any:
            for event in events:
                yield encode_sse(event.id, event.event_name, event.payload)
            yield encode_done()

        return StreamingResponse(stream(), media_type="text/event-stream")

    async def decide_approval(request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        session_id = request.path_params["session_id"]
        approval_id = request.path_params["approval_id"]
        body = await request.json()
        decision = body.get("decision")
        if decision not in {"approved", "rejected"}:
            return JSONResponse({"detail": "Invalid approval decision"}, status_code=400)
        record = store.upsert_approval_decision(
            session_id=session_id,
            workspace_id=workspace_id,
            approval_id=approval_id,
            user_id=request.headers.get("x-nexus-user-id"),
            decision=decision,
            idempotency_key=body.get("idempotency_key") or body.get("idempotencyKey") or approval_id,
            message=body.get("message"),
        )
        return JSONResponse(
            {
                "accepted": True,
                "workspace_id": record["workspace_id"],
                "session_id": record["session_id"],
                "approval_id": record["approval_id"],
                "decision": decision,
                "idempotency_key": record["idempotency_key"],
                "status": record["status"],
            },
            status_code=202,
        )

    async def health(_request: Request) -> Response:
        return JSONResponse({"status": "ok", "service": "nexus-ai"})

    routes = [
        Route("/health", health, methods=["GET"]),
        Route("/agent-chat/ui/workspaces/{workspace_id}/chat/completions", create_chat_completion, methods=["POST"]),
        Route(
            "/agent-chat/ui/workspaces/{workspace_id}/sessions/{session_id}/chat/completions",
            continue_chat_completion,
            methods=["POST"],
        ),
        Route("/agent-chat/workspaces/{workspace_id}/sessions", list_sessions, methods=["GET"]),
        Route("/agent-chat/workspaces/{workspace_id}/sessions/{session_id}", get_session, methods=["GET"]),
        Route("/agent-chat/workspaces/{workspace_id}/sessions/{session_id}", delete_session, methods=["DELETE"]),
        Route("/agent-chat/workspaces/{workspace_id}/sessions/{session_id}/events", replay_session_events, methods=["GET"]),
        Route(
            "/agent-chat/workspaces/{workspace_id}/sessions/{session_id}/approvals/{approval_id}/decision",
            decide_approval,
            methods=["POST"],
        ),
    ]
    return Starlette(routes=routes)


async def _stream_chat(
    runtime: NexusAgentRuntime,
    store: AgentChatStore,
    request: Request,
    body: dict[str, Any],
    workspace_id: str,
    *,
    session_id: str | None,
) -> StreamingResponse:
    authorization = request.headers.get("authorization")
    request_token = _extract_bearer_token(authorization)
    effective_token = runtime.deps.settings.api_token
    print(
        "[nexus-ai] agent-chat request",
        {
            "workspace_id": workspace_id,
            "session_id": session_id,
            "has_authorization_header": bool(authorization),
            "request_token_present": bool(request_token),
            "effective_token_present": bool(effective_token),
            "effective_token_prefix": _token_prefix(effective_token),
            "user_id": request.headers.get("x-nexus-user-id"),
            "request_id": request.headers.get("x-nexus-request-id"),
        },
        flush=True,
    )

    if not runtime.deps.settings.has_api_token:
        return StreamingResponse(
            _single_error_stream("Missing Authorization bearer token for Nexus MCP access."),
            media_type="text/event-stream",
            status_code=401,
        )

    user_id = request.headers.get("x-nexus-user-id")
    session = store.get_or_create_session(workspace_id, user_id, session_id)
    user_text = _last_user_text(body)
    model_name = runtime.deps.settings.model
    message_history = store.get_message_history(workspace_id, session.id)
    request_context = _build_agent_request_context(request, workspace_id, session.id)

    if user_text:
        store.add_message(
            session,
            "user",
            user_text,
            user_id=user_id,
            parts=_message_parts(body),
            metadata={"timestamp": request.headers.get("x-nexus-request-id")},
        )

    async def stream() -> Any:
        nonlocal session
        assistant_parts: list[dict[str, Any]] = []
        assistant_text = ""
        state = StreamState()

        token = set_request_context(request_context)
        try:
            session_event = {"type": "data-session", "data": {"sessionId": session.id}}
            stored = store.add_event(session.id, workspace_id, "message", session_event)
            yield encode_sse(stored.id, "message", session_event)

            try:
                async with runtime.agent.run_stream_events(
                    user_text,
                    deps=runtime.deps,
                    message_history=message_history,
                    conversation_id=session.id,
                ) as event_stream:
                    async for event in event_stream:
                        if is_agent_run_result(event):
                            assistant_text = stringify_output(event.output)
                            final_payload = {
                                "type": "data-final_answer",
                                "data": {"content": assistant_text, "sessionId": session.id, "runId": event.run_id},
                            }
                            stored = store.add_event(session.id, workspace_id, "message", final_payload)
                            yield encode_sse(stored.id, "message", final_payload)
                            store.save_message_history(workspace_id, session.id, event.all_messages_json())
                            if assistant_text or assistant_parts:
                                finalized_parts = finalize_assistant_parts(assistant_parts, assistant_text)
                                store.add_message(
                                    session,
                                    "assistant",
                                    assistant_text,
                                    user_id=user_id,
                                    parts=finalized_parts,
                                    model=model_name,
                                )
                            break

                        for payload in payloads_from_event(event, state):
                            update_assistant_parts(assistant_parts, payload)
                            stored = store.add_event(session.id, workspace_id, "message", payload)
                            yield encode_sse(stored.id, "message", payload)
            except Exception as exc:
                payload = {"type": "error", "error_text": str(exc)}
                stored = store.add_event(session.id, workspace_id, "message", payload)
                yield encode_sse(stored.id, "message", payload)
        finally:
            reset_request_context(token)

        yield encode_done()

    return StreamingResponse(stream(), media_type="text/event-stream")


def _build_agent_request_context(request: Request, workspace_id: str, session_id: str) -> RequestContext:
    current = get_request_context()
    authorization = request.headers.get("authorization") or (current.authorization if current else None)
    request_id = request.headers.get("x-nexus-request-id") or (current.request_id if current else None)
    user_id = request.headers.get("x-nexus-user-id") or (current.user_id if current else None)
    return RequestContext(
        authorization=authorization,
        api_token=current.api_token if current else None,
        workspace_id=workspace_id,
        user_id=user_id,
        request_id=request_id,
        session_id=session_id,
    )


class StreamState:
    def __init__(self) -> None:
        self.text_by_index: dict[int, str] = {}
        self.thinking_by_index: dict[int, str] = {}
        self.tool_calls_by_index: dict[int, ToolCallPart | ToolCallPartDelta] = {}


def payloads_from_event(event: Any, state: StreamState) -> list[dict[str, Any]]:
    payloads: list[dict[str, Any]] = []

    if isinstance(event, PartStartEvent):
        if isinstance(event.part, TextPart) and event.part.content:
            state.text_by_index[event.index] = event.part.content
            payloads.append({"type": "text-delta", "delta": event.part.content})
        elif isinstance(event.part, ThinkingPart):
            state.thinking_by_index[event.index] = event.part.content
            payloads.append({"type": "reasoning-start", "id": event.part.id or f"reasoning-{event.index}"})
            if event.part.content:
                payloads.append({"type": "reasoning-delta", "id": event.part.id or f"reasoning-{event.index}", "delta": event.part.content})
        elif isinstance(event.part, ToolCallPart):
            state.tool_calls_by_index[event.index] = event.part
            payloads.append(
                {
                    "type": "tool-input-start",
                    "tool_call_id": event.part.tool_call_id,
                    "tool_name": event.part.tool_name,
                }
            )
            if event.part.args is not None:
                payloads.append(
                    {
                        "type": "tool-input-available",
                        "tool_call_id": event.part.tool_call_id,
                        "tool_name": event.part.tool_name,
                        "input": event.part.args,
                    }
                )
        return payloads

    if isinstance(event, PartDeltaEvent):
        if isinstance(event.delta, TextPartDelta):
            payloads.append({"type": "text-delta", "delta": event.delta.content_delta})
        elif isinstance(event.delta, ThinkingPartDelta):
            reasoning_id = f"reasoning-{event.index}"
            if event.delta.content_delta:
                payloads.append({"type": "reasoning-delta", "id": reasoning_id, "delta": event.delta.content_delta})
        elif isinstance(event.delta, ToolCallPartDelta):
            tool = state.tool_calls_by_index.get(event.index)
            tool_part = event.delta.apply(tool) if tool is not None else event.delta.as_part()
            if tool_part is not None:
                state.tool_calls_by_index[event.index] = tool_part
                payloads.append(
                    {
                        "type": "tool-input-available",
                        "tool_call_id": tool_part.tool_call_id,
                        "tool_name": tool_part.tool_name,
                        "input": tool_part.args,
                    }
                )
            else:
                payloads.append({"type": "tool-input-delta"})
        return payloads

    if isinstance(event, PartEndEvent):
        if isinstance(event.part, ThinkingPart):
            payloads.append({"type": "reasoning-end", "id": event.part.id or f"reasoning-{event.index}"})
        elif isinstance(event.part, TextPart):
            current = state.text_by_index.get(event.index, "")
            if event.part.content.startswith(current):
                remainder = event.part.content[len(current):]
                if remainder:
                    payloads.append({"type": "text-delta", "delta": remainder})
            elif event.part.content:
                payloads.append({"type": "text-delta", "delta": event.part.content})
            state.text_by_index[event.index] = event.part.content
        return payloads

    if isinstance(event, FunctionToolResultEvent):
        payloads.append(
            {
                "type": output_type_from_tool_result(event.part),
                "tool_call_id": event.tool_call_id,
                "tool_name": event.part.tool_name,
                "output": tool_result_payload(event.part),
                "error_text": event.part.content if isinstance(event.part.content, str) and event.part.outcome != "success" else None,
            }
        )
        return payloads

    if isinstance(event, FinalResultEvent):
        return payloads

    return payloads


def output_type_from_tool_result(part: ToolReturnPart) -> str:
    if part.outcome == "failed":
        return "tool-output-error"
    if part.outcome == "denied":
        return "tool-output-denied"
    return "tool-output-available"


def tool_result_payload(part: ToolReturnPart) -> Any:
    content = part.content
    if isinstance(content, (str, int, float, bool)) or content is None:
        return {"content": content}
    if isinstance(content, dict):
        return content
    if isinstance(content, list):
        return {"items": content}
    return {"content": str(content)}


def update_assistant_parts(parts: list[dict[str, Any]], payload: dict[str, Any]) -> None:
    payload_type = payload.get("type")
    if payload_type == "text-delta":
        part = _find_part(parts, "assistant-text")
        if part is None:
            parts.append({"id": "assistant-text", "type": "text", "text": payload.get("delta", ""), "state": "streaming"})
        else:
            part["text"] = f"{part.get('text', '')}{payload.get('delta', '')}"
            part["state"] = "streaming"
        return

    if payload_type in {"reasoning-start", "reasoning-delta", "reasoning-end"}:
        part_id = payload.get("id") or "reasoning"
        part = _find_part(parts, part_id)
        if part is None:
            part = {"id": part_id, "type": "reasoning", "text": "", "state": "streaming"}
            parts.append(part)
        if payload_type == "reasoning-delta":
            part["text"] = f"{part.get('text', '')}{payload.get('delta', '')}"
        if payload_type == "reasoning-end":
            part["state"] = "done"
        return

    if payload_type in {"tool-input-start", "tool-input-available", "tool-output-available", "tool-output-error", "tool-output-denied"}:
        part_id = payload.get("tool_call_id") or payload.get("tool_name") or "tool"
        part = _find_part(parts, part_id)
        if part is None:
            part = {
                "id": part_id,
                "type": "tool-output" if str(payload_type).startswith("tool-output") else "tool-input",
                "tool_call_id": payload.get("tool_call_id"),
                "tool_name": payload.get("tool_name"),
            }
            parts.append(part)
        part["type"] = "tool-output" if str(payload_type).startswith("tool-output") else "tool-input"
        part["tool_call_id"] = payload.get("tool_call_id")
        part["tool_name"] = payload.get("tool_name")
        if "input" in payload:
            part["input"] = payload.get("input")
        if "output" in payload:
            part["output"] = payload.get("output")
        if "error_text" in payload and payload.get("error_text"):
            part["error_text"] = payload.get("error_text")
        part["state"] = payload_type.removeprefix("tool-")


def finalize_assistant_parts(parts: list[dict[str, Any]], assistant_text: str) -> list[dict[str, Any]]:
    finalized: list[dict[str, Any]] = []
    seen_text = False
    for part in parts:
        next_part = dict(part)
        if next_part.get("type") == "text":
            seen_text = True
            next_part["state"] = "done"
            if not next_part.get("text"):
                next_part["text"] = assistant_text
        elif next_part.get("type") == "reasoning":
            next_part["state"] = "done"
        elif next_part.get("type") == "tool-input" and next_part.get("state") == "input-start":
            next_part["state"] = "input-available"
        finalized.append(next_part)
    if assistant_text and not seen_text:
        finalized.append({"id": "assistant-text", "type": "text", "text": assistant_text, "state": "done"})
    return finalized


def _find_part(parts: list[dict[str, Any]], part_id: str) -> dict[str, Any] | None:
    for part in parts:
        if part.get("id") == part_id:
            return part
    return None


def _last_user_text(body: dict[str, Any]) -> str:
    messages = body.get("messages")
    if not isinstance(messages, list):
        return ""
    for message in reversed(messages):
        if not isinstance(message, dict) or message.get("role") != "user":
            continue
        parts = message.get("parts")
        if isinstance(parts, list):
            text_parts = [part.get("text", "") for part in parts if isinstance(part, dict) and part.get("type") == "text"]
            if text_parts:
                return "\n".join(text_parts).strip()
    return ""


def _message_parts(body: dict[str, Any]) -> list[dict[str, Any]]:
    messages = body.get("messages")
    if not isinstance(messages, list):
        return []
    for message in reversed(messages):
        if isinstance(message, dict) and message.get("role") == "user" and isinstance(message.get("parts"), list):
            return [part for part in message["parts"] if isinstance(part, dict)]
    return []


def stringify_output(output: Any) -> str:
    if output is None:
        return ""
    if isinstance(output, str):
        return output
    if isinstance(output, (dict, list)):
        return json.dumps(output, ensure_ascii=False)
    return str(output)


def is_agent_run_result(value: Any) -> bool:
    return hasattr(value, "output") and hasattr(value, "all_messages_json") and hasattr(value, "run_id")


def encode_sse(event_id: str, event_name: str, payload: dict[str, Any]) -> bytes:
    data = json.dumps(payload, ensure_ascii=False)
    return f"id: {event_id}\nevent: {event_name}\ndata: {data}\n\n".encode("utf-8")


def encode_done() -> bytes:
    return b"event: done\ndata: [DONE]\n\n"


async def _single_error_stream(message: str) -> Any:
    yield encode_sse("error", "message", {"type": "error", "error_text": message})
    yield encode_done()


def _extract_bearer_token(value: str | None) -> str | None:
    if not value:
        return None
    scheme, _, token = value.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


def _token_prefix(value: str | None) -> str | None:
    if not value:
        return None
    return value[:8]

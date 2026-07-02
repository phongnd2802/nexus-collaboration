from __future__ import annotations

import json
import logging
from typing import Any

from pydantic_ai.messages import (
    FinalResultEvent,
    FunctionToolResultEvent,
    PartDeltaEvent,
    PartEndEvent,
    PartStartEvent,
    RetryPromptPart,
    TextPart,
    TextPartDelta,
    ThinkingPart,
    ThinkingPartDelta,
    ToolCallPart,
    ToolCallPartDelta,
    ToolReturnPart,
)
from pydantic_ai.run import AgentRunResultEvent
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, StreamingResponse
from starlette.routing import Route

from nexus_ai.agent import NexusAgentRuntime
from nexus_ai.agent_chat_store import AgentChatStore, ChatSession
from nexus_ai.capabilities.shields import validate_user_input
from nexus_ai.context_pipeline import (
    build_prompt_message_history,
    extract_and_store_memories,
    schedule_session_summary_update,
)
from nexus_ai.request_context import RequestContext, get_request_context, reset_request_context, set_request_context
from nexus_ai.rag.routes import rag_routes

logger = logging.getLogger(__name__)


def create_agent_chat_app(runtime: NexusAgentRuntime) -> Starlette:
    store = AgentChatStore(runtime.deps.store)

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
        user_id = request.headers.get("x-nexus-user-id")
        sessions = await store.list_sessions(workspace_id, user_id)
        return JSONResponse(
            {
                "data": [
                    {
                        "sessionId": session.id,
                        "title": session.title,
                        "updatedAt": session.updated_at,
                        "messageCount": len(await store.messages_for_session(session.id)),
                        "hasPendingApproval": False,
                    }
                    for session in sessions
                ]
            }
        )

    async def get_session(request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        session_id = request.path_params["session_id"]
        user_id = request.headers.get("x-nexus-user-id")
        try:
            return JSONResponse(await store.snapshot(workspace_id, session_id, user_id))
        except KeyError:
            return JSONResponse({"detail": "Session not found"}, status_code=404)

    async def delete_session(request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        session_id = request.path_params["session_id"]
        user_id = request.headers.get("x-nexus-user-id")
        try:
            await store.delete_session(workspace_id, session_id, user_id)
        except KeyError:
            return JSONResponse({"detail": "Session not found"}, status_code=404)
        return JSONResponse({"success": True, "sessionId": session_id})

    async def replay_session_events(request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        session_id = request.path_params["session_id"]
        user_id = request.headers.get("x-nexus-user-id")
        since_event_id = request.query_params.get("since_event_id")
        if not await store.get_session(workspace_id, session_id, user_id):
            return JSONResponse({"detail": "Session not found"}, status_code=404)

        events = await store.events_for_session(session_id, since_event_id)

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
        record = await store.upsert_approval_decision(
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
        *rag_routes(runtime.deps.settings),
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
    user_text = _last_user_text(body)
    if not user_text:
        return StreamingResponse(
            _single_error_stream("Nexus AI request must include a non-empty user message."),
            media_type="text/event-stream",
            status_code=400,
        )
    try:
        validate_user_input(user_text)
    except ValueError as exc:
        return StreamingResponse(_single_error_stream(str(exc)), media_type="text/event-stream", status_code=400)

    session = await store.get_or_create_session(workspace_id, user_id, session_id)
    model_name = runtime.deps.settings.model
    raw_message_history = await store.get_message_history(workspace_id, session.id, user_id)
    session_summary = await store.get_session_summary(workspace_id, session.id, user_id)
    message_history = build_prompt_message_history(
        raw_message_history,
        session_summary.summary_text if session_summary else None,
        runtime.deps.settings.history_recent_turns,
    )
    request_context = _build_agent_request_context(request, workspace_id, session.id)

    if user_text:
        await store.add_message(
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
            stored = await store.add_event(session.id, workspace_id, "message", session_event)
            yield encode_sse(stored.id, "message", session_event)

            try:
                async with runtime.agent.run_stream_events(
                    user_text,
                    deps=runtime.deps,
                    message_history=message_history,
                    conversation_id=session.id,
                ) as event_stream:
                    async for event in event_stream:
                        run_result = agent_run_result(event)
                        if run_result is not None:
                            assistant_text = stringify_output(run_result.output) or assistant_text_from_parts(assistant_parts)
                            final_payload = {
                                "type": "data-final_answer",
                                "data": {"content": assistant_text, "sessionId": session.id, "runId": run_result.run_id},
                            }
                            stored = await store.add_event(session.id, workspace_id, "message", final_payload)
                            yield encode_sse(stored.id, "message", final_payload)
                            await store.save_message_history(workspace_id, session.id, user_id, run_result.all_messages_json())
                            if assistant_text or assistant_parts:
                                finalized_parts = finalize_assistant_parts(assistant_parts, assistant_text)
                                await store.add_message(
                                    session,
                                    "assistant",
                                    assistant_text,
                                    user_id=user_id,
                                    parts=finalized_parts,
                                    model=model_name,
                                )
                                try:
                                    await extract_and_store_memories(
                                        runtime.deps.memory,
                                        runtime.deps.settings,
                                        workspace_id=workspace_id,
                                        session_id=session.id,
                                        user_id=user_id,
                                        user_text=user_text,
                                        assistant_text=assistant_text,
                                    )
                                    schedule_session_summary_update(
                                        store,
                                        runtime.deps.settings,
                                        workspace_id=workspace_id,
                                        session_id=session.id,
                                        user_id=user_id,
                                    )
                                except Exception as exc:
                                    logger.warning("Context pipeline maintenance failed for session %s: %s", session.id, exc)
                            break

                        await audit_event(runtime, store, session.id, workspace_id, event)
                        for payload in payloads_from_event(event, state):
                            await audit_payload(runtime, store, session.id, workspace_id, payload)
                            update_assistant_parts(assistant_parts, payload)
                            stored = await store.add_event(session.id, workspace_id, "message", payload)
                            yield encode_sse(stored.id, "message", payload)
            except Exception as exc:
                payload = {"type": "error", "error_text": str(exc)}
                stored = await store.add_event(session.id, workspace_id, "message", payload)
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
            delta = event.delta.content_delta
            state.text_by_index[event.index] = f"{state.text_by_index.get(event.index, '')}{delta}"
            payloads.append({"type": "text-delta", "delta": delta})
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
        output_type = output_type_from_tool_result(event.part)
        payloads.append(
            {
                "type": output_type,
                "tool_call_id": event.tool_call_id,
                "tool_name": event.part.tool_name,
                "output": tool_result_payload(event.part),
                "error_text": event.part.content if isinstance(event.part.content, str) and output_type != "tool-output-available" else None,
            }
        )
        return payloads

    if isinstance(event, FinalResultEvent):
        return payloads

    return payloads


def output_type_from_tool_result(part: ToolReturnPart | RetryPromptPart) -> str:
    if isinstance(part, RetryPromptPart):
        return "tool-output-error"
    if part.outcome == "failed":
        return "tool-output-error"
    if part.outcome == "denied":
        return "tool-output-denied"
    return "tool-output-available"


def tool_result_payload(part: ToolReturnPart | RetryPromptPart) -> Any:
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


def agent_run_result(value: Any) -> Any | None:
    result = value.result if isinstance(value, AgentRunResultEvent) else value
    if hasattr(result, "output") and hasattr(result, "all_messages_json") and hasattr(result, "run_id"):
        return result
    return None


def assistant_text_from_parts(parts: list[dict[str, Any]]) -> str:
    texts: list[str] = []
    for part in parts:
        if part.get("type") == "text" and isinstance(part.get("text"), str):
            texts.append(part["text"])
    return "\n".join(texts).strip()


async def audit_payload(
    runtime: NexusAgentRuntime,
    store: AgentChatStore,
    session_id: str,
    workspace_id: str,
    payload: dict[str, Any],
) -> None:
    if not runtime.deps.settings.audit_tool_calls:
        return
    payload_type = str(payload.get("type") or "")
    if not payload_type.startswith("tool-"):
        return
    tool_name = payload.get("tool_name")
    if not isinstance(tool_name, str) or not tool_name:
        return
    context = get_request_context()
    status = payload_type.removeprefix("tool-").replace("-", "_")
    await store.add_tool_audit(
        workspace_id=workspace_id,
        user_id=context.user_id if context else None,
        session_id=session_id,
        request_id=context.request_id if context else None,
        tool_call_id=payload.get("tool_call_id") if isinstance(payload.get("tool_call_id"), str) else None,
        tool_name=tool_name,
        status=status,
        input_payload=payload.get("input"),
        output_payload=payload.get("output"),
        error=payload.get("error_text") if isinstance(payload.get("error_text"), str) else None,
    )


async def audit_event(
    runtime: NexusAgentRuntime,
    store: AgentChatStore,
    session_id: str,
    workspace_id: str,
    event: Any,
) -> None:
    if not runtime.deps.settings.audit_tool_calls or not isinstance(event, FunctionToolResultEvent):
        return
    metadata = getattr(event.part, "metadata", None)
    if not isinstance(metadata, dict):
        return
    tool_calls = metadata.get("tool_calls")
    tool_returns = metadata.get("tool_returns")
    if not isinstance(tool_calls, dict):
        return
    context = get_request_context()
    for key, call in tool_calls.items():
        tool_name = getattr(call, "tool_name", None)
        if not isinstance(tool_name, str) or not tool_name:
            continue
        returned = tool_returns.get(key) if isinstance(tool_returns, dict) else None
        outcome = getattr(returned, "outcome", None) if returned is not None else None
        content = getattr(returned, "content", None) if returned is not None else None
        await store.add_tool_audit(
            workspace_id=workspace_id,
            user_id=context.user_id if context else None,
            session_id=session_id,
            request_id=context.request_id if context else None,
            tool_call_id=getattr(call, "tool_call_id", None),
            tool_name=tool_name,
            status=f"code_mode_{outcome or 'called'}",
            input_payload=getattr(call, "args", None),
            output_payload=content,
            error=content if isinstance(content, str) and outcome not in {None, "success"} else None,
        )


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

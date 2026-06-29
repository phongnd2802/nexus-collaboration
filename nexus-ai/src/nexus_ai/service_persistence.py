from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from pydantic_ai.ui.vercel_ai import VercelAIAdapter

from nexus_ai.storage import SessionRepository
from nexus_ai.workspace_references import extract_action_results, extract_mcp_sources


def save_regular_session(
    *,
    sessions: SessionRepository,
    session_id: str,
    workspace_id: str,
    user_id: str,
    result: Any,
    routing_event: dict[str, Any] | None = None,
) -> None:
    messages = _json_list(result.all_messages_json())
    ui_messages = [_model_dump(message) for message in VercelAIAdapter.dump_messages(result.all_messages())]
    ui_messages = _with_derived_reference_parts(ui_messages, workspace_id)
    ui_messages = _with_routing_message(ui_messages, routing_event)
    sessions.upsert(
        session_id=session_id,
        workspace_id=workspace_id,
        user_id=user_id,
        title=session_title(ui_messages),
        metadata={
            "route": _route_from_event(routing_event),
            "executionPath": _execution_path_from_event(routing_event),
            "usedModelFallback": _used_model_fallback(routing_event),
        },
        messages=messages,
        ui_messages=ui_messages,
    )


def save_orchestrated_session(
    *,
    sessions: SessionRepository,
    session_id: str,
    workspace_id: str,
    user_id: str | None,
    request_payload: dict[str, Any],
    orchestration_events: list[dict[str, Any]],
    orchestrator_result: Any,
    routing_event: dict[str, Any] | None = None,
) -> None:
    ui_messages = request_ui_messages(request_payload)
    ui_messages = _with_routing_message(ui_messages, routing_event)
    final_answer_payload = _final_answer_payload(orchestrator_result)
    orchestration_parts = _orchestration_parts(orchestration_events)
    ui_messages.append(
        {
            "id": f"assistant-{uuid.uuid4()}",
            "role": "assistant",
            "metadata": {"timestamp": datetime.now(timezone.utc).isoformat()},
            "parts": [
                *orchestration_parts,
                {"type": "data-final_answer", "data": final_answer_payload},
                {"type": "text", "text": final_answer_payload["content"]},
            ],
        }
    )
    sessions.upsert(
        session_id=session_id,
        workspace_id=workspace_id,
        user_id=user_id,
        title=session_title(ui_messages),
        metadata={
            "orchestrationMode": "multi",
            "route": _route_from_event(routing_event),
            "executionPath": _execution_path_from_event(routing_event),
            "approved": bool(final_answer_payload.get("approved")),
            "revisionCount": final_answer_payload.get("revisionCount", 0),
            "retrievalRetryCount": final_answer_payload.get("retrievalRetryCount", 0),
            "usedModelFallback": _used_model_fallback(routing_event),
        },
        messages=ui_messages,
        ui_messages=ui_messages,
    )


def request_ui_messages(payload: dict[str, Any]) -> list[dict[str, Any]]:
    messages = payload.get("messages")
    if not isinstance(messages, list):
        return []
    output: list[dict[str, Any]] = []
    for message in messages:
        if not isinstance(message, dict):
            continue
        role = message.get("role")
        if role not in {"user", "assistant", "system"}:
            continue
        parts = message.get("parts")
        output.append(
            {
                "id": str(message.get("id") or f"message-{uuid.uuid4()}"),
                "role": role,
                "metadata": message.get("metadata") if isinstance(message.get("metadata"), dict) else {},
                "parts": parts if isinstance(parts, list) else [],
            }
        )
    return output


def session_title(ui_messages: list[dict[str, Any]]) -> str:
    for message in ui_messages:
        if message.get("role") != "user":
            continue
        for part in message.get("parts", []):
            text = part.get("text") if isinstance(part, dict) else None
            if isinstance(text, str) and text.strip():
                title = text.strip().replace("\n", " ")
                return title[:60]
    return "New conversation"


def message_count(ui_messages: list[dict[str, Any]]) -> int:
    return sum(1 for message in ui_messages if message.get("role") in {"user", "assistant"})


def _with_routing_message(ui_messages: list[dict[str, Any]], routing_event: dict[str, Any] | None) -> list[dict[str, Any]]:
    if routing_event is None:
        return ui_messages
    message = {
        "id": f"routing-{uuid.uuid4()}",
        "role": "system",
        "metadata": {"timestamp": datetime.now(timezone.utc).isoformat()},
        "parts": [
            {
                "type": routing_event.get("type", "data-routing_decision"),
                "data": routing_event.get("data") or {},
            }
        ],
    }
    return [message, *ui_messages]


def _route_from_event(routing_event: dict[str, Any] | None) -> str | None:
    if routing_event is None:
        return None
    data = routing_event.get("data")
    if not isinstance(data, dict):
        return None
    route = data.get("route")
    return route if isinstance(route, str) else None


def _execution_path_from_event(routing_event: dict[str, Any] | None) -> str | None:
    if routing_event is None:
        return None
    data = routing_event.get("data")
    if not isinstance(data, dict):
        return None
    execution_path = data.get("executionPath")
    return execution_path if isinstance(execution_path, str) else None


def _used_model_fallback(routing_event: dict[str, Any] | None) -> bool:
    if routing_event is None:
        return False
    data = routing_event.get("data")
    if not isinstance(data, dict):
        return False
    return bool(data.get("usedModelFallback"))


def _orchestration_parts(orchestration_events: list[dict[str, Any]]) -> list[dict[str, Any]]:
    parts: list[dict[str, Any]] = []
    seen_final = False
    for event in orchestration_events:
        event_type = event.get("type")
        if not isinstance(event_type, str):
            continue
        if not event_type.startswith("data-") or event_type in {"data-session", "data-routing_decision"}:
            continue
        if event_type == "data-final_answer":
            seen_final = True
            continue
        parts.append({"type": event_type, "data": event.get("data") or {}})
    if seen_final:
        return parts
    return parts


def _final_answer_payload(orchestrator_result: Any) -> dict[str, Any]:
    draft = getattr(orchestrator_result, "draft", None)
    citations = getattr(draft, "citations", []) if draft is not None else []
    assumptions = getattr(draft, "assumptions", []) if draft is not None else []
    return {
        "content": getattr(orchestrator_result, "content", ""),
        "approved": bool(getattr(orchestrator_result, "approved", False)),
        "revisionCount": int(getattr(orchestrator_result, "revision_count", 0)),
        "retrievalRetryCount": int(getattr(orchestrator_result, "retrieval_retry_count", 0)),
        "limitations": list(getattr(orchestrator_result, "limitations", []) or []),
        "citations": list(citations or []),
        "assumptions": list(assumptions or []),
    }


def _json_list(raw: bytes) -> list[dict[str, Any]]:
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return []
    return value if isinstance(value, list) else []


def _model_dump(value: Any) -> dict[str, Any]:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json", by_alias=True, exclude_none=True)
    if isinstance(value, dict):
        return value
    return {}


def _with_derived_reference_parts(ui_messages: list[dict[str, Any]], workspace_id: str) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for message in ui_messages:
        if not isinstance(message, dict):
            output.append(message)
            continue
        parts = message.get("parts")
        if not isinstance(parts, list):
            output.append(message)
            continue
        next_parts: list[dict[str, Any]] = []
        for part in parts:
            if not isinstance(part, dict):
                next_parts.append(part)
                continue
            next_parts.append(part)
            next_parts.extend(_derived_parts_from_tool_part(part, workspace_id))
        cloned = dict(message)
        cloned["parts"] = next_parts
        output.append(cloned)
    return output


def _derived_parts_from_tool_part(part: dict[str, Any], workspace_id: str) -> list[dict[str, Any]]:
    tool_name = _tool_name(part)
    output = _tool_output(part)
    if not tool_name or output is None:
        return []
    if tool_name == "search_rag":
        sources = output.get("sources") if isinstance(output, dict) else None
        if isinstance(sources, list) and sources:
            return [{"type": "data-rag_sources", "data": {"sources": sources}}]
        return []
    parts: list[dict[str, Any]] = []
    action_results = extract_action_results(output, workspace_id, tool_name)
    if action_results:
        parts.append({"type": "data-action_result", "data": {"toolName": tool_name, "actions": action_results}})
        return parts
    sources = extract_mcp_sources(output, workspace_id, tool_name)
    if sources:
        parts.append({"type": "data-mcp_sources", "data": {"toolName": tool_name, "sources": sources}})
    return parts


def _tool_name(part: dict[str, Any]) -> str | None:
    value = part.get("toolName") or part.get("tool_name")
    if isinstance(value, str):
        return value
    part_type = part.get("type")
    if isinstance(part_type, str) and part_type.startswith("tool-"):
        return part_type.removeprefix("tool-")
    return None


def _tool_output(part: dict[str, Any]) -> Any:
    if "output" in part:
        return part.get("output")
    if "result" in part:
        return part.get("result")
    return None

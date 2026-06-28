from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from pydantic_ai.ui.vercel_ai import VercelAIAdapter

from nexus_ai.storage import SessionRepository


def save_regular_session(
    *,
    sessions: SessionRepository,
    session_id: str,
    workspace_id: str,
    user_id: str,
    result: Any,
) -> None:
    messages = _json_list(result.all_messages_json())
    ui_messages = [_model_dump(message) for message in VercelAIAdapter.dump_messages(result.all_messages())]
    sessions.upsert(
        session_id=session_id,
        workspace_id=workspace_id,
        user_id=user_id,
        title=session_title(ui_messages),
        metadata={},
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
    assistant_content: str,
    orchestration_events: list[dict[str, Any]],
) -> None:
    ui_messages = request_ui_messages(request_payload)
    ui_messages.append(
        {
            "id": f"assistant-{uuid.uuid4()}",
            "role": "assistant",
            "metadata": {"timestamp": datetime.now(timezone.utc).isoformat()},
            "parts": [
                *[
                    {
                        "type": "data-orchestration_stage",
                        "data": event.get("data") or {},
                    }
                    for event in orchestration_events
                    if event.get("type") == "data-orchestration_stage"
                ],
                {"type": "text", "text": assistant_content},
            ],
        }
    )
    sessions.upsert(
        session_id=session_id,
        workspace_id=workspace_id,
        user_id=user_id,
        title=session_title(ui_messages),
        metadata={"orchestrationMode": "multi"},
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

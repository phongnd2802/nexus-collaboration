from __future__ import annotations

from collections.abc import Iterable
from typing import Any


ENTITY_ROUTE_KEYS: dict[str, tuple[str, ...]] = {
    "project": ("projectId", "project_id", "projectId", "id"),
    "task": ("taskId", "task_id", "id"),
    "file": ("fileId", "file_id", "id"),
    "note": ("noteId", "note_id", "id"),
    "channel": ("channelId", "channel_id", "id"),
    "message": ("messageId", "message_id", "id"),
    "calendar_event": ("eventId", "event_id", "id"),
    "video_call": ("callId", "call_id", "id"),
}

ENTITY_ID_KEYS: dict[str, str] = {
    "project_id": "project",
    "projectId": "project",
    "task_id": "task",
    "taskId": "task",
    "file_id": "file",
    "fileId": "file",
    "note_id": "note",
    "noteId": "note",
    "channel_id": "channel",
    "channelId": "channel",
    "message_id": "message",
    "messageId": "message",
    "event_id": "calendar_event",
    "eventId": "calendar_event",
    "call_id": "video_call",
    "callId": "video_call",
}

ACTION_WORDS = (
    "create",
    "created",
    "update",
    "updated",
    "delete",
    "deleted",
    "assign",
    "assigned",
    "send",
    "sent",
    "move",
    "moved",
    "share",
    "shared",
)


def entity_href(workspace_id: str, entity_type: str | None, entity_id: str | None, data: dict[str, Any] | None = None) -> str | None:
    if not workspace_id or not entity_type or not entity_id:
        return None
    entity_type = normalize_entity_type(entity_type)
    data = data or {}
    if entity_type == "project":
        return f"/workspaces/{workspace_id}/projects/{entity_id}"
    if entity_type == "task":
        project_id = _string_value(data, "projectId", "project_id")
        if project_id:
            return f"/workspaces/{workspace_id}/projects/{project_id}?taskId={entity_id}"
        return f"/workspaces/{workspace_id}/projects?taskId={entity_id}"
    if entity_type == "file":
        return f"/workspaces/{workspace_id}/files/{entity_id}"
    if entity_type == "note":
        return f"/workspaces/{workspace_id}/notes/{entity_id}"
    if entity_type in {"channel", "message"}:
        channel_id = entity_id if entity_type == "channel" else _string_value(data, "channelId", "channel_id")
        if channel_id:
            return f"/workspaces/{workspace_id}/chat/{channel_id}"
    if entity_type == "calendar_event":
        return f"/workspaces/{workspace_id}/calendar?eventId={entity_id}"
    if entity_type == "video_call":
        return f"/workspaces/{workspace_id}/video-calls"
    return None


def normalize_rag_results(results: list[dict[str, Any]], workspace_id: str) -> list[dict[str, Any]]:
    return [enrich_rag_result(result, workspace_id) for result in results if isinstance(result, dict)]


def enrich_rag_result(result: dict[str, Any], workspace_id: str) -> dict[str, Any]:
    item = dict(result)
    file_id = _string_value(item, "fileId", "file_id", "id")
    title = _title(item) or (f"File {file_id}" if file_id else "Indexed file")
    href = _string_value(item, "href", "url") or entity_href(workspace_id, "file", file_id, item)
    snippet = _string_value(item, "snippet", "text", "content", "chunk")
    source = {
        "sourceType": "rag",
        "entityType": "file",
        "entityId": file_id,
        "title": title,
        "href": href,
        "snippet": snippet,
        "score": item.get("score"),
        "citation": title if not href else f"{title} ({href})",
    }
    item.update({key: value for key, value in source.items() if value is not None})
    return item


def rag_sources_from_results(results: list[dict[str, Any]], workspace_id: str) -> list[dict[str, Any]]:
    return [
        _compact_reference(enrich_rag_result(result, workspace_id), "rag")
        for result in results
        if isinstance(result, dict)
    ]


def extract_mcp_sources(value: Any, workspace_id: str, tool_name: str | None = None) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    for record in _iter_records(value):
        entity_type, entity_id = infer_entity(record, tool_name)
        if not entity_type or not entity_id:
            continue
        href = _string_value(record, "href", "url") or entity_href(workspace_id, entity_type, entity_id, record)
        sources.append(
            {
                "sourceType": "mcp",
                "entityType": entity_type,
                "entityId": entity_id,
                "title": _title(record) or f"{entity_type} {entity_id}",
                "href": href,
            }
        )
    return _dedupe_refs(sources)


def extract_action_results(value: Any, workspace_id: str, tool_name: str | None = None) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    if not _looks_like_action(tool_name):
        return results
    for record in _iter_records(value):
        entity_type, entity_id = infer_entity(record, tool_name)
        status = _action_status(record)
        if not entity_type and not entity_id and status == "unknown":
            continue
        href = _string_value(record, "href", "url") or entity_href(workspace_id, entity_type, entity_id, record)
        results.append(
            {
                "toolName": tool_name,
                "action": _action_name(tool_name),
                "status": status,
                "entityType": entity_type,
                "entityId": entity_id,
                "title": _title(record),
                "href": href,
                "message": _string_value(record, "message", "error"),
            }
        )
    return _dedupe_refs(results)


def infer_entity(record: dict[str, Any], tool_name: str | None = None) -> tuple[str | None, str | None]:
    explicit_type = _string_value(record, "entityType", "entity_type", "type", "resourceType", "resource_type")
    explicit_id = _string_value(record, "entityId", "entity_id")
    if explicit_type and explicit_id:
        return normalize_entity_type(explicit_type), explicit_id
    inferred_type = _entity_type_from_tool(tool_name)
    if inferred_type:
        for key in ENTITY_ROUTE_KEYS.get(inferred_type, ("id",)):
            value = _string_value(record, key)
            if value:
                return inferred_type, value
    for key, entity_type in ENTITY_ID_KEYS.items():
        value = _string_value(record, key)
        if value:
            return entity_type, value
    return normalize_entity_type(explicit_type) if explicit_type else inferred_type, explicit_id


def normalize_entity_type(value: str) -> str:
    normalized = value.strip().lower().replace("-", "_")
    if normalized in {"projects"}:
        return "project"
    if normalized in {"tasks"}:
        return "task"
    if normalized in {"files", "document", "documents"}:
        return "file"
    if normalized in {"notes"}:
        return "note"
    if normalized in {"channels"}:
        return "channel"
    if normalized in {"messages"}:
        return "message"
    if normalized in {"event", "events", "calendar_event"}:
        return "calendar_event"
    if normalized in {"call", "calls", "video_calls"}:
        return "video_call"
    return normalized


def _iter_records(value: Any) -> Iterable[dict[str, Any]]:
    if isinstance(value, dict):
        yielded = False
        for key in ("sources", "items", "results", "data", "projects", "tasks", "files", "notes", "channels", "messages"):
            child = value.get(key)
            if isinstance(child, list):
                yielded = True
                yield from _iter_records(child)
            elif isinstance(child, dict):
                yielded = True
                yield from _iter_records(child)
        if not yielded:
            yield value
        return
    if isinstance(value, list):
        for item in value:
            yield from _iter_records(item)


def _compact_reference(record: dict[str, Any], source_type: str) -> dict[str, Any]:
    return {
        "sourceType": source_type,
        "entityType": record.get("entityType"),
        "entityId": record.get("entityId"),
        "title": record.get("title"),
        "href": record.get("href"),
        "snippet": record.get("snippet"),
        "score": record.get("score"),
        "citation": record.get("citation"),
    }


def _entity_type_from_tool(tool_name: str | None) -> str | None:
    if not tool_name:
        return None
    name = tool_name.lower()
    for singular, plural in (
        ("project", "projects"),
        ("task", "tasks"),
        ("file", "files"),
        ("note", "notes"),
        ("channel", "channels"),
        ("message", "messages"),
    ):
        if singular in name or plural in name:
            return singular
    if "calendar" in name or "event" in name:
        return "calendar_event"
    if "call" in name:
        return "video_call"
    return None


def _looks_like_action(tool_name: str | None) -> bool:
    if not tool_name:
        return False
    name = tool_name.lower()
    return any(word in name for word in ACTION_WORDS)


def _action_name(tool_name: str | None) -> str | None:
    if not tool_name:
        return None
    name = tool_name.lower()
    for word in ACTION_WORDS:
        if word in name:
            return word
    return None


def _action_status(record: dict[str, Any]) -> str:
    if record.get("success") is True or record.get("ok") is True:
        return "completed"
    status = _string_value(record, "status")
    if status:
        normalized = status.lower()
        if normalized in {"success", "succeeded", "completed", "done", "ok"}:
            return "completed"
        if normalized in {"error", "failed", "failure"}:
            return "error"
        return normalized
    if record.get("error") or record.get("success") is False or record.get("ok") is False:
        return "error"
    return "unknown"


def _title(record: dict[str, Any]) -> str | None:
    return _string_value(record, "title", "name", "summary", "subject", "filename", "fileName")


def _string_value(record: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = record.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if isinstance(value, (int, float)):
            return str(value)
    return None


def _dedupe_refs(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[tuple[Any, Any, Any]] = set()
    output: list[dict[str, Any]] = []
    for item in items:
        cleaned = {key: value for key, value in item.items() if value is not None}
        marker = (cleaned.get("sourceType") or cleaned.get("toolName"), cleaned.get("entityType"), cleaned.get("entityId") or cleaned.get("href"))
        if marker in seen:
            continue
        seen.add(marker)
        output.append(cleaned)
    return output

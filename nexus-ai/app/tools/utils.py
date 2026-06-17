from typing import Any

COMPACT_FIELDS = {
    "assigned_to",
    "created_at",
    "description",
    "due_date",
    "id",
    "kanban_stages",
    "name",
    "priority",
    "project_id",
    "status",
    "title",
    "type",
    "updated_at",
}


def compact_value(value: Any) -> Any:
    if isinstance(value, list):
        return [compact_value(item) for item in value[:20]]
    if isinstance(value, dict):
        return {key: compact_value(val) for key, val in value.items() if key in COMPACT_FIELDS and val is not None}
    return value


def omit_none(payload: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in payload.items() if value is not None}

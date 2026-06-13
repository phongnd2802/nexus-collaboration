from typing import Any

from nexus_mcp.context import NexusContext
from nexus_mcp.internal_api import internal_api
from nexus_mcp.tools.common import ToolSpec, clean_params, clean_payload, preview

NOTE_FIELDS = {
    "title",
    "content",
    "parent_id",
    "template_id",
    "tags",
    "cover_image",
    "icon",
    "is_public",
    "attachments",
}


async def list_notes(args: dict[str, Any], context: NexusContext) -> Any:
    return await internal_api.list_notes(
        context,
        clean_params(args, {"parent_id", "is_deleted", "is_archived"}),
    )


async def search_notes(args: dict[str, Any], context: NexusContext) -> Any:
    query = args.get("q")
    if not isinstance(query, str) or not query:
        raise ValueError("q is required")
    params = clean_params(args, {"q", "mode", "limit", "offset"})
    return await internal_api.search_notes(context, params)


async def create_note(args: dict[str, Any], context: NexusContext) -> Any:
    payload = clean_payload(args, NOTE_FIELDS)
    if not payload.get("title"):
        raise ValueError("title is required")

    if not context.execute_actions:
        return preview("create_note", payload)
    return await internal_api.create_note(context, payload)


async def get_note(args: dict[str, Any], context: NexusContext) -> Any:
    note_id = args.get("note_id")
    if not isinstance(note_id, str) or not note_id:
        raise ValueError("note_id is required")
    return await internal_api.get_note(context, note_id)


async def update_note(args: dict[str, Any], context: NexusContext) -> Any:
    note_id = args.get("note_id")
    if not isinstance(note_id, str) or not note_id:
        raise ValueError("note_id is required")
    payload = clean_payload(args, NOTE_FIELDS)
    if not payload:
        raise ValueError("At least one note field is required")

    if not context.execute_actions:
        return preview("update_note", {"note_id": note_id, **payload})
    return await internal_api.update_note(context, note_id, payload)


async def delete_note(args: dict[str, Any], context: NexusContext) -> Any:
    note_id = args.get("note_id")
    if not isinstance(note_id, str) or not note_id:
        raise ValueError("note_id is required")

    if not context.execute_actions:
        return preview("delete_note", {"note_id": note_id})
    return await internal_api.delete_note(context, note_id)


async def _note_simple_action(args: dict[str, Any], context: NexusContext, action: str) -> Any:
    note_id = args.get("note_id")
    if not isinstance(note_id, str) or not note_id:
        raise ValueError("note_id is required")

    if not context.execute_actions:
        return preview(f"{action}_note", {"note_id": note_id})
    return await internal_api.note_action(context, note_id, action)


async def archive_note(args: dict[str, Any], context: NexusContext) -> Any:
    return await _note_simple_action(args, context, "archive")


async def unarchive_note(args: dict[str, Any], context: NexusContext) -> Any:
    return await _note_simple_action(args, context, "unarchive")


async def restore_note(args: dict[str, Any], context: NexusContext) -> Any:
    return await _note_simple_action(args, context, "restore")


async def duplicate_note(args: dict[str, Any], context: NexusContext) -> Any:
    note_id = args.get("note_id")
    if not isinstance(note_id, str) or not note_id:
        raise ValueError("note_id is required")
    payload = clean_payload(args, {"title", "parent_id", "include_sub_notes"})

    if not context.execute_actions:
        return preview("duplicate_note", {"note_id": note_id, **payload})
    return await internal_api.note_action(context, note_id, "duplicate", payload)


async def share_note(args: dict[str, Any], context: NexusContext) -> Any:
    note_id = args.get("note_id")
    user_ids = args.get("user_ids")
    if not isinstance(note_id, str) or not note_id:
        raise ValueError("note_id is required")
    if not isinstance(user_ids, list) or not user_ids:
        raise ValueError("user_ids is required")

    payload = clean_payload(args, {"user_ids", "permission"})
    if not context.execute_actions:
        return preview("share_note", {"note_id": note_id, **payload})
    return await internal_api.note_action(context, note_id, "share", payload)


async def merge_notes(args: dict[str, Any], context: NexusContext) -> Any:
    note_ids = args.get("note_ids")
    title = args.get("title")
    if not isinstance(note_ids, list) or len(note_ids) < 2:
        raise ValueError("note_ids must include at least two notes")
    if not isinstance(title, str) or not title:
        raise ValueError("title is required")

    payload = clean_payload(
        args,
        {"note_ids", "title", "include_headers", "add_dividers", "sort_by_date", "parent_id"},
    )
    if not context.execute_actions:
        return preview("merge_notes", payload)
    return await internal_api.merge_notes(context, payload)


NOTE_PROPERTIES = {
    "title": {"type": "string"},
    "content": {"type": "string"},
    "parent_id": {"type": "string"},
    "template_id": {"type": "string"},
    "tags": {"type": "array", "items": {"type": "string"}},
    "cover_image": {"type": "string"},
    "icon": {"type": "string"},
    "is_public": {"type": "boolean"},
}

NOTE_ID_SCHEMA = {
    "type": "object",
    "required": ["note_id"],
    "properties": {"note_id": {"type": "string"}},
}


TOOLS = [
    ToolSpec(
        name="list_notes",
        description="List notes in the current workspace with optional parent/deleted/archive filters.",
        input_schema={
            "type": "object",
            "properties": {
                "parent_id": {"type": "string"},
                "is_deleted": {"type": "boolean"},
                "is_archived": {"type": "boolean"},
            },
        },
        handler=list_notes,
    ),
    ToolSpec(
        name="search_notes",
        description="Search notes using keyword, semantic, or hybrid mode.",
        input_schema={
            "type": "object",
            "required": ["q"],
            "properties": {
                "q": {"type": "string"},
                "mode": {"type": "string", "enum": ["keyword", "semantic", "hybrid"]},
                "limit": {"type": "integer"},
                "offset": {"type": "integer"},
            },
        },
        handler=search_notes,
    ),
    ToolSpec(
        name="create_note",
        description="Create a note. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["title"],
            "properties": NOTE_PROPERTIES,
        },
        handler=create_note,
    ),
    ToolSpec(
        name="get_note",
        description="Get note details.",
        input_schema=NOTE_ID_SCHEMA,
        handler=get_note,
    ),
    ToolSpec(
        name="update_note",
        description="Update note fields. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["note_id"],
            "properties": {"note_id": {"type": "string"}, **NOTE_PROPERTIES},
        },
        handler=update_note,
    ),
    ToolSpec(
        name="delete_note",
        description="Soft-delete a note. Returns preview unless executeActions=true.",
        input_schema=NOTE_ID_SCHEMA,
        handler=delete_note,
    ),
    ToolSpec(
        name="archive_note",
        description="Archive a note. Returns preview unless executeActions=true.",
        input_schema=NOTE_ID_SCHEMA,
        handler=archive_note,
    ),
    ToolSpec(
        name="unarchive_note",
        description="Unarchive a note. Returns preview unless executeActions=true.",
        input_schema=NOTE_ID_SCHEMA,
        handler=unarchive_note,
    ),
    ToolSpec(
        name="restore_note",
        description="Restore a soft-deleted note. Returns preview unless executeActions=true.",
        input_schema=NOTE_ID_SCHEMA,
        handler=restore_note,
    ),
    ToolSpec(
        name="duplicate_note",
        description="Duplicate a note. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["note_id"],
            "properties": {
                "note_id": {"type": "string"},
                "title": {"type": "string"},
                "parent_id": {"type": "string"},
                "include_sub_notes": {"type": "boolean"},
            },
        },
        handler=duplicate_note,
    ),
    ToolSpec(
        name="share_note",
        description="Share a note with workspace users. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["note_id", "user_ids"],
            "properties": {
                "note_id": {"type": "string"},
                "user_ids": {"type": "array", "items": {"type": "string"}},
                "permission": {"type": "string", "enum": ["read", "write", "admin"]},
            },
        },
        handler=share_note,
    ),
    ToolSpec(
        name="merge_notes",
        description="Merge multiple notes into a new note. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["note_ids", "title"],
            "properties": {
                "note_ids": {"type": "array", "items": {"type": "string"}},
                "title": {"type": "string"},
                "include_headers": {"type": "boolean"},
                "add_dividers": {"type": "boolean"},
                "sort_by_date": {"type": "boolean"},
                "parent_id": {"type": "string"},
            },
        },
        handler=merge_notes,
    ),
]

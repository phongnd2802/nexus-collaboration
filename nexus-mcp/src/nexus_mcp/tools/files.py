from typing import Any

from nexus_mcp.context import NexusContext
from nexus_mcp.internal_api import internal_api
from nexus_mcp.tools.common import ToolSpec, clean_params, clean_payload, int_arg, preview

FILE_FIELDS = {"name", "description", "tags", "mark_as_opened", "starred"}
FOLDER_FIELDS = {"name", "parent_id", "description"}


async def list_folders(args: dict[str, Any], context: NexusContext) -> Any:
    return await internal_api.list_folders(
        context,
        clean_params(args, {"parent_id", "is_deleted"}),
    )


async def create_folder(args: dict[str, Any], context: NexusContext) -> Any:
    payload = clean_payload(args, FOLDER_FIELDS)
    if not payload.get("name"):
        raise ValueError("name is required")

    if not context.execute_actions:
        return preview("create_folder", payload)
    return await internal_api.create_folder(context, payload)


async def update_folder(args: dict[str, Any], context: NexusContext) -> Any:
    folder_id = args.get("folder_id")
    if not isinstance(folder_id, str) or not folder_id:
        raise ValueError("folder_id is required")

    payload = clean_payload(args, {"name"})
    if not payload:
        raise ValueError("At least one folder field is required")

    if not context.execute_actions:
        return preview("update_folder", {"folder_id": folder_id, **payload})
    return await internal_api.update_folder(context, folder_id, payload)


async def move_folder(args: dict[str, Any], context: NexusContext) -> Any:
    folder_id = args.get("folder_id")
    if not isinstance(folder_id, str) or not folder_id:
        raise ValueError("folder_id is required")

    payload = clean_payload(args, {"target_parent_id", "new_name"})
    if not payload:
        raise ValueError("target_parent_id or new_name is required")

    if not context.execute_actions:
        return preview("move_folder", {"folder_id": folder_id, **payload})
    return await internal_api.move_folder(context, folder_id, payload)


async def delete_folder(args: dict[str, Any], context: NexusContext) -> Any:
    folder_id = args.get("folder_id")
    if not isinstance(folder_id, str) or not folder_id:
        raise ValueError("folder_id is required")

    if not context.execute_actions:
        return preview("delete_folder", {"folder_id": folder_id})
    return await internal_api.delete_folder(context, folder_id)


async def restore_folder(args: dict[str, Any], context: NexusContext) -> Any:
    folder_id = args.get("folder_id")
    if not isinstance(folder_id, str) or not folder_id:
        raise ValueError("folder_id is required")

    if not context.execute_actions:
        return preview("restore_folder", {"folder_id": folder_id})
    return await internal_api.restore_folder(context, folder_id)


async def list_files(args: dict[str, Any], context: NexusContext) -> Any:
    return await internal_api.list_files(
        context,
        clean_params(args, {"folder_id", "is_deleted", "page", "limit"}),
    )


async def search_files(args: dict[str, Any], context: NexusContext) -> Any:
    query = args.get("q")
    if not isinstance(query, str) or not query:
        raise ValueError("q is required")
    return await internal_api.search_files(
        context,
        clean_params(args, {"q", "mime_type", "date_from", "date_to", "page", "limit"}),
    )


async def list_recent_files(args: dict[str, Any], context: NexusContext) -> Any:
    return await internal_api.list_recent_files(context, int_arg(args, "limit"))


async def list_starred_files(args: dict[str, Any], context: NexusContext) -> Any:
    return await internal_api.list_starred_files(
        context,
        clean_params(args, {"page", "limit"}),
    )


async def get_file(args: dict[str, Any], context: NexusContext) -> Any:
    file_id = args.get("file_id")
    if not isinstance(file_id, str) or not file_id:
        raise ValueError("file_id is required")
    return await internal_api.get_file(context, file_id)


async def update_file(args: dict[str, Any], context: NexusContext) -> Any:
    file_id = args.get("file_id")
    if not isinstance(file_id, str) or not file_id:
        raise ValueError("file_id is required")

    payload = clean_payload(args, FILE_FIELDS)
    if not payload:
        raise ValueError("At least one file field is required")

    if not context.execute_actions:
        return preview("update_file", {"file_id": file_id, **payload})
    return await internal_api.update_file(context, file_id, payload)


async def move_file(args: dict[str, Any], context: NexusContext) -> Any:
    file_id = args.get("file_id")
    if not isinstance(file_id, str) or not file_id:
        raise ValueError("file_id is required")

    payload = clean_payload(args, {"target_folder_id", "new_name"})
    if not payload:
        raise ValueError("target_folder_id or new_name is required")

    if not context.execute_actions:
        return preview("move_file", {"file_id": file_id, **payload})
    return await internal_api.move_file(context, file_id, payload)


async def copy_file(args: dict[str, Any], context: NexusContext) -> Any:
    file_id = args.get("file_id")
    if not isinstance(file_id, str) or not file_id:
        raise ValueError("file_id is required")

    payload = clean_payload(args, {"target_folder_id", "new_name"})
    if not context.execute_actions:
        return preview("copy_file", {"file_id": file_id, **payload})
    return await internal_api.copy_file(context, file_id, payload)


async def delete_file(args: dict[str, Any], context: NexusContext) -> Any:
    file_id = args.get("file_id")
    if not isinstance(file_id, str) or not file_id:
        raise ValueError("file_id is required")

    if not context.execute_actions:
        return preview("delete_file", {"file_id": file_id})
    return await internal_api.delete_file(context, file_id)


async def restore_file(args: dict[str, Any], context: NexusContext) -> Any:
    file_id = args.get("file_id")
    if not isinstance(file_id, str) or not file_id:
        raise ValueError("file_id is required")

    if not context.execute_actions:
        return preview("restore_file", {"file_id": file_id})
    return await internal_api.restore_file(context, file_id)


async def share_file(args: dict[str, Any], context: NexusContext) -> Any:
    file_id = args.get("file_id")
    user_ids = args.get("user_ids")
    if not isinstance(file_id, str) or not file_id:
        raise ValueError("file_id is required")
    if not isinstance(user_ids, list) or not user_ids:
        raise ValueError("user_ids is required")

    payload = clean_payload(args, {"user_ids", "permission"})
    if not context.execute_actions:
        return preview("share_file", {"file_id": file_id, **payload})
    return await internal_api.share_file(context, file_id, payload)


FILE_ID_SCHEMA = {
    "type": "object",
    "required": ["file_id"],
    "properties": {"file_id": {"type": "string"}},
}

FOLDER_ID_SCHEMA = {
    "type": "object",
    "required": ["folder_id"],
    "properties": {"folder_id": {"type": "string"}},
}


TOOLS = [
    ToolSpec(
        name="list_folders",
        description="List folders in the current workspace.",
        input_schema={
            "type": "object",
            "properties": {"parent_id": {"type": "string"}, "is_deleted": {"type": "boolean"}},
        },
        handler=list_folders,
    ),
    ToolSpec(
        name="create_folder",
        description="Create a folder. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["name"],
            "properties": {
                "name": {"type": "string"},
                "parent_id": {"type": "string"},
                "description": {"type": "string"},
            },
        },
        handler=create_folder,
    ),
    ToolSpec(
        name="update_folder",
        description="Rename or update a folder. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["folder_id"],
            "properties": {"folder_id": {"type": "string"}, "name": {"type": "string"}},
        },
        handler=update_folder,
    ),
    ToolSpec(
        name="move_folder",
        description="Move and optionally rename a folder. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["folder_id"],
            "properties": {
                "folder_id": {"type": "string"},
                "target_parent_id": {"type": "string"},
                "new_name": {"type": "string"},
            },
        },
        handler=move_folder,
    ),
    ToolSpec(
        name="delete_folder",
        description="Delete a folder. Returns preview unless executeActions=true.",
        input_schema=FOLDER_ID_SCHEMA,
        handler=delete_folder,
    ),
    ToolSpec(
        name="restore_folder",
        description="Restore a deleted folder. Returns preview unless executeActions=true.",
        input_schema=FOLDER_ID_SCHEMA,
        handler=restore_folder,
    ),
    ToolSpec(
        name="list_files",
        description="List files in the current workspace.",
        input_schema={
            "type": "object",
            "properties": {
                "folder_id": {"type": "string"},
                "is_deleted": {"type": "boolean"},
                "page": {"type": "integer"},
                "limit": {"type": "integer"},
            },
        },
        handler=list_files,
    ),
    ToolSpec(
        name="search_files",
        description="Search files in the current workspace.",
        input_schema={
            "type": "object",
            "required": ["q"],
            "properties": {
                "q": {"type": "string"},
                "mime_type": {"type": "string"},
                "date_from": {"type": "string"},
                "date_to": {"type": "string"},
                "page": {"type": "integer"},
                "limit": {"type": "integer"},
            },
        },
        handler=search_files,
    ),
    ToolSpec(
        name="list_recent_files",
        description="List recently accessed files.",
        input_schema={"type": "object", "properties": {"limit": {"type": "integer"}}},
        handler=list_recent_files,
    ),
    ToolSpec(
        name="list_starred_files",
        description="List starred files.",
        input_schema={
            "type": "object",
            "properties": {"page": {"type": "integer"}, "limit": {"type": "integer"}},
        },
        handler=list_starred_files,
    ),
    ToolSpec(
        name="get_file",
        description="Get file metadata.",
        input_schema=FILE_ID_SCHEMA,
        handler=get_file,
    ),
    ToolSpec(
        name="update_file",
        description="Update file metadata or starred state. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["file_id"],
            "properties": {
                "file_id": {"type": "string"},
                "name": {"type": "string"},
                "description": {"type": "string"},
                "tags": {"type": "array", "items": {"type": "string"}},
                "mark_as_opened": {"type": "boolean"},
                "starred": {"type": "boolean"},
            },
        },
        handler=update_file,
    ),
    ToolSpec(
        name="move_file",
        description="Move and optionally rename a file. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["file_id"],
            "properties": {
                "file_id": {"type": "string"},
                "target_folder_id": {"type": "string"},
                "new_name": {"type": "string"},
            },
        },
        handler=move_file,
    ),
    ToolSpec(
        name="copy_file",
        description="Copy a file. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["file_id"],
            "properties": {
                "file_id": {"type": "string"},
                "target_folder_id": {"type": "string"},
                "new_name": {"type": "string"},
            },
        },
        handler=copy_file,
    ),
    ToolSpec(
        name="delete_file",
        description="Soft-delete a file. Returns preview unless executeActions=true.",
        input_schema=FILE_ID_SCHEMA,
        handler=delete_file,
    ),
    ToolSpec(
        name="restore_file",
        description="Restore a soft-deleted file. Returns preview unless executeActions=true.",
        input_schema=FILE_ID_SCHEMA,
        handler=restore_file,
    ),
    ToolSpec(
        name="share_file",
        description="Share a file with workspace users. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["file_id", "user_ids"],
            "properties": {
                "file_id": {"type": "string"},
                "user_ids": {"type": "array", "items": {"type": "string"}},
                "permission": {"type": "string"},
            },
        },
        handler=share_file,
    ),
]

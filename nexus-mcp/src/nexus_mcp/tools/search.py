from typing import Any

from nexus_mcp.context import NexusContext
from nexus_mcp.internal_api import internal_api
from nexus_mcp.tools.common import ToolSpec, clean_params, int_arg


async def universal_search(args: dict[str, Any], context: NexusContext) -> Any:
    query = args.get("query")
    if not isinstance(query, str) or not query:
        raise ValueError("query is required")
    return await internal_api.universal_search(
        context,
        clean_params(args, {"query", "types", "page", "limit", "semantic"}),
    )


async def search_suggestions(args: dict[str, Any], context: NexusContext) -> Any:
    query = args.get("q")
    if not isinstance(query, str) or not query:
        raise ValueError("q is required")
    return await internal_api.search_suggestions(context, query)


async def semantic_search(args: dict[str, Any], context: NexusContext) -> Any:
    query = args.get("q")
    if not isinstance(query, str) or not query:
        raise ValueError("q is required")
    return await internal_api.semantic_search(
        context,
        clean_params(args, {"q", "types", "limit", "min_score"}),
    )


async def find_similar_content(args: dict[str, Any], context: NexusContext) -> Any:
    content_type = args.get("content_type")
    content_id = args.get("content_id")
    if not isinstance(content_type, str) or not content_type:
        raise ValueError("content_type is required")
    if not isinstance(content_id, str) or not content_id:
        raise ValueError("content_id is required")
    return await internal_api.find_similar_content(
        context,
        content_type,
        content_id,
        int_arg(args, "limit"),
    )


TOOLS = [
    ToolSpec(
        name="universal_search",
        description="Search across Nexus content types such as notes, files, messages, tasks, projects, and events.",
        input_schema={
            "type": "object",
            "required": ["query"],
            "properties": {
                "query": {"type": "string"},
                "types": {"type": "array", "items": {"type": "string"}},
                "page": {"type": "integer"},
                "limit": {"type": "integer"},
                "semantic": {"type": "boolean"},
            },
        },
        handler=universal_search,
    ),
    ToolSpec(
        name="search_suggestions",
        description="Get search suggestions for a partial query.",
        input_schema={
            "type": "object",
            "required": ["q"],
            "properties": {"q": {"type": "string"}},
        },
        handler=search_suggestions,
    ),
    ToolSpec(
        name="semantic_search",
        description="Run semantic search over indexed workspace content.",
        input_schema={
            "type": "object",
            "required": ["q"],
            "properties": {
                "q": {"type": "string"},
                "types": {"type": "array", "items": {"type": "string"}},
                "limit": {"type": "integer"},
                "min_score": {"type": "number"},
            },
        },
        handler=semantic_search,
    ),
    ToolSpec(
        name="find_similar_content",
        description="Find content similar to a known indexed item.",
        input_schema={
            "type": "object",
            "required": ["content_type", "content_id"],
            "properties": {
                "content_type": {
                    "type": "string",
                    "enum": ["note", "message", "file", "task", "meeting_transcript"],
                },
                "content_id": {"type": "string"},
                "limit": {"type": "integer"},
            },
        },
        handler=find_similar_content,
    ),
]

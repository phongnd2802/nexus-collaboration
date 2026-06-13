from typing import Any

from nexus_mcp.context import NexusContext
from nexus_mcp.internal_api import internal_api
from nexus_mcp.tools.common import ToolSpec, clean_params, clean_payload, int_arg, preview

EVENT_FIELDS = {
    "title",
    "description",
    "start_time",
    "end_time",
    "all_day",
    "location",
    "room_id",
    "category_id",
    "attendees",
    "meeting_url",
    "visibility",
    "priority",
    "status",
    "is_recurring",
    "recurrence_rule",
    "reminders",
    "tags",
    "description_file_ids",
}

EVENT_FILTERS = {
    "start_date",
    "end_date",
    "search",
    "categories",
    "priorities",
    "statuses",
    "tags",
    "attendees",
}


async def list_calendar_events(args: dict[str, Any], context: NexusContext) -> Any:
    return await internal_api.list_calendar_events(context, clean_params(args, EVENT_FILTERS))


async def list_upcoming_events(args: dict[str, Any], context: NexusContext) -> Any:
    return await internal_api.list_upcoming_events(context, int_arg(args, "days"))


async def search_calendar_events(args: dict[str, Any], context: NexusContext) -> Any:
    query = args.get("q")
    if not isinstance(query, str) or not query:
        raise ValueError("q is required")
    params = clean_params(args, {"q", "start_date", "end_date", "categories", "priorities", "statuses", "tags"})
    return await internal_api.search_calendar_events(context, params)


async def create_calendar_event(args: dict[str, Any], context: NexusContext) -> Any:
    payload = clean_payload(args, EVENT_FIELDS)
    if not payload.get("title"):
        raise ValueError("title is required")
    if not payload.get("start_time"):
        raise ValueError("start_time is required")
    if not payload.get("end_time"):
        raise ValueError("end_time is required")

    if not context.execute_actions:
        return preview("create_calendar_event", payload)
    return await internal_api.create_calendar_event(context, payload)


async def get_calendar_event(args: dict[str, Any], context: NexusContext) -> Any:
    event_id = args.get("event_id")
    if not isinstance(event_id, str) or not event_id:
        raise ValueError("event_id is required")
    return await internal_api.get_calendar_event(context, event_id)


async def update_calendar_event(args: dict[str, Any], context: NexusContext) -> Any:
    event_id = args.get("event_id")
    if not isinstance(event_id, str) or not event_id:
        raise ValueError("event_id is required")

    payload = clean_payload(args, EVENT_FIELDS)
    if not payload:
        raise ValueError("At least one event field is required")

    if not context.execute_actions:
        return preview("update_calendar_event", {"event_id": event_id, **payload})
    return await internal_api.update_calendar_event(context, event_id, payload)


async def delete_calendar_event(args: dict[str, Any], context: NexusContext) -> Any:
    event_id = args.get("event_id")
    if not isinstance(event_id, str) or not event_id:
        raise ValueError("event_id is required")

    if not context.execute_actions:
        return preview("delete_calendar_event", {"event_id": event_id})
    return await internal_api.delete_calendar_event(context, event_id)


async def respond_to_calendar_event(args: dict[str, Any], context: NexusContext) -> Any:
    event_id = args.get("event_id")
    response = args.get("response")
    if not isinstance(event_id, str) or not event_id:
        raise ValueError("event_id is required")
    if response not in {"accepted", "declined", "tentative"}:
        raise ValueError("response must be accepted, declined, or tentative")

    if not context.execute_actions:
        return preview("respond_to_calendar_event", {"event_id": event_id, "response": response})
    return await internal_api.respond_to_calendar_event(context, event_id, response)


EVENT_PROPERTIES = {
    "title": {"type": "string"},
    "description": {"type": "string"},
    "start_time": {"type": "string"},
    "end_time": {"type": "string"},
    "all_day": {"type": "boolean"},
    "location": {"type": "string"},
    "room_id": {"type": "string"},
    "category_id": {"type": "string"},
    "attendees": {"type": "array", "items": {"type": "string"}},
    "meeting_url": {"type": "string"},
    "visibility": {"type": "string", "enum": ["private", "public", "internal"]},
    "priority": {"type": "string", "enum": ["low", "normal", "high", "urgent"]},
    "status": {"type": "string", "enum": ["confirmed", "tentative", "cancelled"]},
    "tags": {"type": "array", "items": {"type": "string"}},
    "reminders": {"type": "array", "items": {"type": "integer"}},
}


TOOLS = [
    ToolSpec(
        name="list_calendar_events",
        description="List calendar events with optional date, text, attendee, status, and tag filters.",
        input_schema={
            "type": "object",
            "properties": {
                "start_date": {"type": "string"},
                "end_date": {"type": "string"},
                "search": {"type": "string"},
                "categories": {"type": "array", "items": {"type": "string"}},
                "priorities": {"type": "array", "items": {"type": "string"}},
                "statuses": {"type": "array", "items": {"type": "string"}},
                "tags": {"type": "array", "items": {"type": "string"}},
                "attendees": {"type": "array", "items": {"type": "string"}},
            },
        },
        handler=list_calendar_events,
    ),
    ToolSpec(
        name="list_upcoming_events",
        description="List upcoming calendar events. Defaults to the next 7 days.",
        input_schema={"type": "object", "properties": {"days": {"type": "integer"}}},
        handler=list_upcoming_events,
    ),
    ToolSpec(
        name="search_calendar_events",
        description="Search calendar events visible to the current user.",
        input_schema={
            "type": "object",
            "required": ["q"],
            "properties": {"q": {"type": "string"}, "start_date": {"type": "string"}, "end_date": {"type": "string"}},
        },
        handler=search_calendar_events,
    ),
    ToolSpec(
        name="create_calendar_event",
        description="Create a calendar event. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["title", "start_time", "end_time"],
            "properties": EVENT_PROPERTIES,
        },
        handler=create_calendar_event,
    ),
    ToolSpec(
        name="get_calendar_event",
        description="Get details for a calendar event.",
        input_schema={
            "type": "object",
            "required": ["event_id"],
            "properties": {"event_id": {"type": "string"}},
        },
        handler=get_calendar_event,
    ),
    ToolSpec(
        name="update_calendar_event",
        description="Update calendar event fields. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["event_id"],
            "properties": {"event_id": {"type": "string"}, **EVENT_PROPERTIES},
        },
        handler=update_calendar_event,
    ),
    ToolSpec(
        name="delete_calendar_event",
        description="Delete a calendar event. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["event_id"],
            "properties": {"event_id": {"type": "string"}},
        },
        handler=delete_calendar_event,
    ),
    ToolSpec(
        name="respond_to_calendar_event",
        description="Respond to a calendar event invitation. Returns preview unless executeActions=true.",
        input_schema={
            "type": "object",
            "required": ["event_id", "response"],
            "properties": {
                "event_id": {"type": "string"},
                "response": {"type": "string", "enum": ["accepted", "declined", "tentative"]},
            },
        },
        handler=respond_to_calendar_event,
    ),
]

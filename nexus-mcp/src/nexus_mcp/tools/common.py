from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import Any

from nexus_mcp.context import NexusContext

ToolHandler = Callable[[dict[str, Any], NexusContext], Awaitable[Any]]


@dataclass(frozen=True)
class ToolSpec:
    name: str
    description: str
    input_schema: dict[str, Any]
    handler: ToolHandler


def context_from_args(args: dict[str, Any]) -> NexusContext:
    raw_context = args.pop("__nexusContext", None)
    if not isinstance(raw_context, dict):
        raise ValueError("Missing trusted Nexus context")
    return NexusContext.model_validate(raw_context)


def preview(tool: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "success": True,
        "preview": True,
        "tool": tool,
        "message": "Preview only. Set executeActions=true to execute this action.",
        "payload": payload,
    }


def clean_payload(args: dict[str, Any], allowed: set[str]) -> dict[str, Any]:
    return {key: value for key, value in args.items() if key in allowed and value is not None}


def clean_params(args: dict[str, Any], allowed: set[str]) -> dict[str, Any]:
    params = clean_payload(args, allowed)
    return {
        key: ",".join(value) if isinstance(value, list) else value
        for key, value in params.items()
        if value not in ("", [], {})
    }


def int_arg(args: dict[str, Any], key: str) -> int | None:
    value = args.get(key)
    if isinstance(value, int):
        return value
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return None

from typing import Any


def tool_part_payload(part: Any) -> dict[str, Any]:
    args = part.args_as_dict() if hasattr(part, "args_as_dict") else getattr(part, "args", None)
    return {
        "tool_call_id": getattr(part, "tool_call_id", None),
        "tool_name": getattr(part, "tool_name", None),
        "args": args,
    }


def normalized_text_deltas(first_raw_delta: str | None, current_delta: str, first_text_emitted: bool) -> list[str]:
    if first_text_emitted or not first_raw_delta:
        return [current_delta]
    if current_delta.startswith(first_raw_delta):
        return [current_delta]
    return [first_raw_delta, current_delta]

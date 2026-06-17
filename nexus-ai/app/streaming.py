import json
import time
from dataclasses import dataclass
from typing import Any


@dataclass
class CompletionAccumulator:
    content: str = ""
    session_id: str | None = None
    run_id: str | None = None
    finish_reason: str = "stop"


def sse(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, separators=(',', ':'), default=str)}\n\n"


def openai_chunk(
    completion_id: str,
    model: str,
    event_type: str,
    session_id: str,
    run_id: str,
    content: str | None = None,
    finish_reason: str | None = None,
    extra: dict[str, Any] | None = None,
) -> str:
    delta: dict[str, str] = {}
    if content is not None:
        delta["content"] = content
    payload = {
        "id": completion_id,
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": model,
        "type": event_type,
        "session_id": session_id,
        "run_id": run_id,
        "choices": [{"index": 0, "delta": delta, "finish_reason": finish_reason}],
    }
    if extra:
        payload.update(extra)
    if event_type == "text_delta" and content is not None:
        payload["delta"] = content
    return sse(payload)


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


def parse_chunk_payload(chunk: str) -> dict[str, Any] | None:
    if not chunk.startswith("data: ") or "[DONE]" in chunk:
        return None
    return json.loads(chunk.removeprefix("data: ").strip())


def accumulate_chunk(accumulator: CompletionAccumulator, chunk: str) -> None:
    payload = parse_chunk_payload(chunk)
    if payload is None:
        return

    accumulator.session_id = payload.get("session_id") or accumulator.session_id
    accumulator.run_id = payload.get("run_id") or accumulator.run_id

    choices = payload.get("choices", [])
    if choices:
        choice = choices[0]
        accumulator.finish_reason = choice.get("finish_reason") or accumulator.finish_reason
        delta = choice.get("delta", {})
        accumulator.content += delta.get("content", "")

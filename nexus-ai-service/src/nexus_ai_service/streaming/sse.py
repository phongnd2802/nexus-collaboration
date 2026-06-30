from collections.abc import Iterable
from typing import Any

import orjson

from nexus_ai_service.streaming.events import StreamEvent


def encode_sse(event: StreamEvent) -> bytes:
    data = orjson.dumps(event.client_payload()).decode("utf-8")
    return f"id: {event.id}\nevent: {event.event_type}\ndata: {data}\n\n".encode("utf-8")


def encode_done() -> bytes:
    return b"event: done\ndata: [DONE]\n\n"


def event_stream(events: Iterable[StreamEvent], include_done: bool = False) -> Iterable[bytes]:
    for event in events:
        yield encode_sse(event)
    if include_done:
        yield encode_done()


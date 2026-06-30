import json

from nexus_ai_service.streaming.events import StreamEvent
from nexus_ai_service.streaming.sse import encode_sse


def test_sse_event_contains_stable_ids_and_compat_payload() -> None:
    event = StreamEvent(
        run_id="run-1",
        session_id="session-1",
        workspace_id="workspace-1",
        event_type="message.delta",
        payload={"delta": "hello"},
    )
    encoded = encode_sse(event).decode("utf-8")
    assert encoded.startswith(f"id: {event.id}\n")
    assert "event: message.delta\n" in encoded
    data_line = next(line for line in encoded.splitlines() if line.startswith("data: "))
    payload = json.loads(data_line.removeprefix("data: "))
    assert payload["run_id"] == "run-1"
    assert payload["session_id"] == "session-1"
    assert payload["workspace_id"] == "workspace-1"
    assert payload["event_type"] == "message.delta"
    assert payload["type"] == "text-delta"
    assert payload["delta"] == "hello"


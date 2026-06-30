from collections.abc import Iterator

from nexus_ai_service.core.ids import new_id
from nexus_ai_service.streaming.events import StreamEvent


def deterministic_chat_events(
    workspace_id: str,
    session_id: str,
    user_text: str,
) -> Iterator[StreamEvent]:
    run_id = new_id()
    yield StreamEvent(
        run_id=run_id,
        session_id=session_id,
        workspace_id=workspace_id,
        event_type="session.created",
    )
    yield StreamEvent(
        run_id=run_id,
        session_id=session_id,
        workspace_id=workspace_id,
        event_type="retrieval.completed",
        payload={"sources": []},
    )
    answer = (
        "Nexus AI service is online. "
        f"I received your request: {user_text.strip() or '(empty message)'}"
    )
    for chunk in _chunks(answer, 24):
        yield StreamEvent(
            run_id=run_id,
            session_id=session_id,
            workspace_id=workspace_id,
            event_type="message.delta",
            payload={"delta": chunk},
        )
    yield StreamEvent(
        run_id=run_id,
        session_id=session_id,
        workspace_id=workspace_id,
        event_type="message.completed",
        payload={"content": answer, "metadata": {"runtime": "deterministic-dev"}},
    )


def _chunks(text: str, size: int) -> Iterator[str]:
    for index in range(0, len(text), size):
        yield text[index : index + size]


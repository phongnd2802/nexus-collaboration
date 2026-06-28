from __future__ import annotations

import asyncio
import json
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from http import HTTPStatus
from typing import Any

from starlette.responses import StreamingResponse

from nexus_ai.storage import SessionRepository

from .service_persistence import save_orchestrated_session


def dispatch_orchestrated_chat(
    *,
    runtime: Any,
    deps: Any,
    request_payload: dict[str, Any],
    sessions: SessionRepository,
    workspace_id: str,
    session_id: str,
    user_id: str | None,
) -> StreamingResponse:
    user_prompt = extract_user_prompt(request_payload)
    if not user_prompt:
        return StreamingResponse(
            error_stream(session_id, "A user message is required."),
            status_code=HTTPStatus.BAD_REQUEST,
            media_type="text/event-stream",
        )

    async def body() -> AsyncIterator[str]:
        yield sse({"type": "data-session", "data": {"sessionId": session_id}})
        events: list[dict[str, Any]] = []
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()

        async def event_sink(event: dict[str, Any]) -> None:
            enriched = with_event_timestamp(event)
            events.append(enriched)
            await queue.put(enriched)

        task = asyncio.create_task(runtime.orchestrator.run(user_prompt, deps, event_sink=event_sink))
        try:
            while not task.done() or not queue.empty():
                try:
                    event = await asyncio.wait_for(queue.get(), timeout=0.1)
                except TimeoutError:
                    continue
                yield sse(event)
            result = await task
        except Exception as exc:
            yield sse({"type": "error", "error_text": str(exc)})
            yield "data: [DONE]\n\n"
            return

        yield sse({"type": "text-delta", "delta": result.content})
        save_orchestrated_session(
            sessions=sessions,
            session_id=session_id,
            workspace_id=workspace_id,
            user_id=user_id,
            request_payload=request_payload,
            assistant_content=result.content,
            orchestration_events=events,
        )
        yield "data: [DONE]\n\n"

    return StreamingResponse(body(), media_type="text/event-stream")


async def error_stream(session_id: str, message: str) -> AsyncIterator[str]:
    yield sse({"type": "data-session", "data": {"sessionId": session_id}})
    yield sse({"type": "error", "error_text": message})
    yield "data: [DONE]\n\n"


def with_event_timestamp(event: dict[str, Any]) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    enriched = dict(event)
    data = dict(enriched.get("data") or {})
    status = data.get("status")
    if status == "running":
        data.setdefault("startedAt", now)
    elif status in {"completed", "error", "skipped", "denied"}:
        data.setdefault("endedAt", now)
    enriched["data"] = data
    return enriched


def sse(event: dict[str, Any]) -> str:
    return f"data: {json.dumps(event, ensure_ascii=False)}\n\n"


def prepend_session_event(response: StreamingResponse, session_id: str) -> StreamingResponse:
    if not isinstance(response, StreamingResponse) or response.status_code >= 400:
        return response

    async def body() -> AsyncIterator[str | bytes]:
        yield f'data: {json.dumps({"type": "data-session", "data": {"sessionId": session_id}})}\n\n'
        async for chunk in response.body_iterator:
            yield chunk

    return StreamingResponse(
        body(),
        status_code=response.status_code,
        media_type=response.media_type,
        headers=dict(response.headers),
        background=response.background,
    )


def extract_user_prompt(payload: dict[str, Any]) -> str:
    messages = payload.get("messages")
    if not isinstance(messages, list):
        return ""
    for message in reversed(messages):
        if not isinstance(message, dict) or message.get("role") != "user":
            continue
        text = message_text(message)
        if text:
            return text
    return ""


def message_text(message: dict[str, Any]) -> str:
    parts = message.get("parts")
    if not isinstance(parts, list):
        return ""
    return "".join(
        part.get("text", "")
        for part in parts
        if isinstance(part, dict) and part.get("type") == "text" and isinstance(part.get("text"), str)
    ).strip()

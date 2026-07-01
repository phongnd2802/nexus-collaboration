from __future__ import annotations

import asyncio
import logging
import re
from functools import lru_cache
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from pydantic_ai import Agent
from pydantic_ai.messages import ModelRequest, SystemPromptPart, UserPromptPart

from nexus_ai.agent_chat_store import AgentChatStore, ChatMessage
from nexus_ai.settings import Settings
from nexus_ai.storage import MemoryStore

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class MemoryCandidate:
    memory_type: str
    content: str
    importance: int
    tags: list[str]
    metadata: dict[str, Any]


def build_prompt_message_history(
    raw_message_history: list[Any] | None,
    summary_text: str | None,
    recent_turns: int,
) -> list[Any] | None:
    if not raw_message_history:
        if not summary_text:
            return None
        return [_summary_message(summary_text)]

    recent_history = _slice_recent_turns(raw_message_history, recent_turns)
    if not summary_text:
        return recent_history
    return [_summary_message(summary_text), *recent_history]


async def maintain_context_pipeline(
    store: AgentChatStore,
    memory_repo: MemoryStore,
    settings: Settings,
    *,
    workspace_id: str,
    session_id: str,
    user_id: str | None,
    user_text: str,
    assistant_text: str,
) -> asyncio.Task[None]:
    await extract_and_store_memories(
        memory_repo,
        settings,
        workspace_id=workspace_id,
        session_id=session_id,
        user_id=user_id,
        user_text=user_text,
        assistant_text=assistant_text,
    )
    return schedule_session_summary_update(
        store,
        settings,
        workspace_id=workspace_id,
        session_id=session_id,
        user_id=user_id,
    )


def schedule_session_summary_update(
    store: AgentChatStore,
    settings: Settings,
    *,
    workspace_id: str,
    session_id: str,
    user_id: str | None,
) -> asyncio.Task[None]:
    task = asyncio.create_task(
        _run_session_summary_update(
            store,
            settings,
            workspace_id=workspace_id,
            session_id=session_id,
            user_id=user_id,
        ),
        name=f"session-summary:{session_id}",
    )
    return task


async def _run_session_summary_update(
    store: AgentChatStore,
    settings: Settings,
    *,
    workspace_id: str,
    session_id: str,
    user_id: str | None,
) -> None:
    try:
        await update_session_summary(store, settings, workspace_id=workspace_id, session_id=session_id, user_id=user_id)
    except asyncio.CancelledError:
        logger.debug("Session summary background task cancelled for session %s", session_id)
        raise
    except Exception as exc:
        logger.warning("Session summary background task failed for session %s: %s", session_id, exc)


async def update_session_summary(
    store: AgentChatStore,
    settings: Settings,
    *,
    workspace_id: str,
    session_id: str,
    user_id: str | None,
) -> None:
    messages = await store.messages_for_session(session_id)
    user_turns = sum(1 for message in messages if message.role == "user")
    if user_turns <= settings.history_recent_turns:
        return

    summary = await store.get_session_summary(workspace_id, session_id, user_id)
    boundary_index = _summary_boundary_index(messages, settings.history_recent_turns)
    if boundary_index <= 0:
        return

    already_summarized = summary.summarized_user_turns if summary else 0
    old_messages = messages[:boundary_index]
    old_user_turns = sum(1 for message in old_messages if message.role == "user")
    pending_turns = old_user_turns - already_summarized
    if pending_turns < settings.summary_trigger_turns:
        return

    start_index = _message_index(messages, summary.summarized_through_message_id) + 1 if summary else 0
    delta_messages = messages[start_index:boundary_index]
    if not delta_messages:
        return

    combined = await _generate_session_summary(
        settings,
        existing_summary=summary.summary_text if summary else None,
        delta_messages=delta_messages,
    )
    await store.upsert_session_summary(
        workspace_id,
        session_id,
        user_id,
        combined,
        old_messages[-1].id,
        old_user_turns,
    )


async def extract_and_store_memories(
    memory_repo: MemoryStore,
    settings: Settings,
    *,
    workspace_id: str,
    session_id: str,
    user_id: str | None,
    user_text: str,
    assistant_text: str,
) -> None:
    if not user_id:
        return
    ingest_turn = getattr(memory_repo, "ingest_turn", None)
    if callable(ingest_turn):
        await ingest_turn(
            workspace_id=workspace_id,
            session_id=session_id,
            user_id=user_id,
            user_text=user_text,
            assistant_text=assistant_text,
        )
        return
    recent = await memory_repo.recent(workspace_id=workspace_id, session_id=session_id, user_id=user_id, limit=20)
    existing = {_normalize_memory(record.content) for record in recent}
    candidates = _extract_memory_candidates(user_text, assistant_text)[: settings.memory_max_items_per_turn]

    for candidate in candidates:
        normalized = _normalize_memory(candidate.content)
        if not normalized or normalized in existing:
            continue
        existing.add(normalized)
        await memory_repo.add(
            workspace_id=workspace_id,
            session_id=session_id,
            user_id=user_id,
            memory_type=candidate.memory_type,
            content=candidate.content,
            importance=candidate.importance,
            tags=candidate.tags,
            metadata=candidate.metadata,
        )


def _summary_message(summary_text: str) -> ModelRequest:
    return ModelRequest(
        parts=[
            SystemPromptPart(
                content=(
                    "Session summary from earlier turns. Treat this as background context and do not repeat it verbatim.\n\n"
                    f"{summary_text}"
                )
            )
        ],
        timestamp=datetime.now(timezone.utc),
    )


def _slice_recent_turns(messages: list[Any], recent_turns: int) -> list[Any]:
    if recent_turns <= 0:
        return list(messages)
    seen_turns = 0
    start_index = 0
    for index in range(len(messages) - 1, -1, -1):
        message = messages[index]
        parts = getattr(message, "parts", None) or []
        if any(isinstance(part, UserPromptPart) for part in parts):
            seen_turns += 1
            if seen_turns == recent_turns:
                start_index = index
                break
    return list(messages[start_index:])


def _summary_boundary_index(messages: list[ChatMessage], recent_turns: int) -> int:
    seen_turns = 0
    for index in range(len(messages) - 1, -1, -1):
        if messages[index].role == "user":
            seen_turns += 1
            if seen_turns == recent_turns:
                return index
    return 0


def _message_index(messages: list[ChatMessage], message_id: str) -> int:
    for index, message in enumerate(messages):
        if message.id == message_id:
            return index
    return -1


def _summarize_messages(messages: list[ChatMessage]) -> str:
    lines = ["Earlier chat context:"]
    pending_user: str | None = None
    for message in messages:
        text = _compact_text(message.content or _parts_text(message.parts))
        if not text:
            continue
        if message.role == "user":
            pending_user = text
            continue
        if message.role == "assistant" and pending_user:
            lines.append(f"- User said: {pending_user}")
            lines.append(f"  Assistant replied: {text}")
            pending_user = None
            continue
        prefix = "User said" if message.role == "user" else "Assistant said"
        lines.append(f"- {prefix}: {text}")
    if pending_user:
        lines.append(f"- Open user request: {pending_user}")
    return "\n".join(lines)


async def _generate_session_summary(
    settings: Settings,
    *,
    existing_summary: str | None,
    delta_messages: list[ChatMessage],
) -> str:
    summary_model = settings.session_summary_model
    if summary_model == "test":
        heuristic = _summarize_messages(delta_messages)
        return _clip_summary(heuristic, settings.summary_max_chars)

    transcript = _summarization_transcript(delta_messages)
    prompt = (
        "Update the conversation summary for a private user chat session.\n"
        "Keep stable user facts, preferences, constraints, outstanding tasks, and important assistant commitments.\n"
        "Be concise and factual. Use short bullet points.\n"
        "Do not repeat trivial chit-chat.\n"
        "Do not mention tools unless they materially affect the session state.\n\n"
        f"Existing summary:\n{existing_summary or '(none)'}\n\n"
        f"New conversation segment:\n{transcript}\n\n"
        "Return only the updated summary."
    )
    result = await _summary_agent(summary_model).run(prompt)
    return _clip_summary(str(result.output).strip(), settings.summary_max_chars)


@lru_cache(maxsize=8)
def _summary_agent(model_name: str) -> Agent[None, str]:
    return Agent(
        model_name,
        instructions=(
            "You write compact rolling summaries for chat sessions. "
            "Preserve durable context and omit low-value detail."
        ),
        output_type=str,
    )


def _summarization_transcript(messages: list[ChatMessage]) -> str:
    lines: list[str] = []
    for message in messages:
        text = _compact_text(message.content or _parts_text(message.parts))
        if not text:
            continue
        speaker = "User" if message.role == "user" else "Assistant"
        lines.append(f"{speaker}: {text}")
    return "\n".join(lines) or "(empty)"


def _clip_summary(summary: str, max_chars: int) -> str:
    if len(summary) <= max_chars:
        return summary
    return summary[-max_chars:]


def _parts_text(parts: list[dict[str, Any]]) -> str:
    output: list[str] = []
    for part in parts:
        if part.get("type") == "text" and isinstance(part.get("text"), str):
            output.append(part["text"])
    return " ".join(output)


def _compact_text(text: str, limit: int = 240) -> str:
    compact = " ".join(text.split())
    return compact if len(compact) <= limit else f"{compact[:limit]}..."


def _extract_memory_candidates(user_text: str, assistant_text: str) -> list[MemoryCandidate]:
    candidates: list[MemoryCandidate] = []
    candidates.extend(_extract_user_preferences(user_text))
    candidates.extend(_extract_user_facts(user_text))
    candidates.extend(_extract_user_constraints(user_text))
    candidates.extend(_extract_assistant_commitments(assistant_text))
    deduped: list[MemoryCandidate] = []
    seen: set[str] = set()
    for candidate in candidates:
        normalized = _normalize_memory(candidate.content)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(candidate)
    return deduped


def _extract_user_preferences(text: str) -> list[MemoryCandidate]:
    patterns = [
        r"\bI prefer ([^.!\n]+)",
        r"\bplease use ([^.!\n]+)",
        r"\balways ([^.!\n]+)",
    ]
    return _extract_matches(text, patterns, "preference", 8, ["preference"])


def _extract_user_constraints(text: str) -> list[MemoryCandidate]:
    patterns = [
        r"\bdon't ([^.!\n]+)",
        r"\bdo not ([^.!\n]+)",
        r"\bnever ([^.!\n]+)",
        r"\bremember that ([^.!\n]+)",
    ]
    return _extract_matches(text, patterns, "constraint", 9, ["constraint"])


def _extract_user_facts(text: str) -> list[MemoryCandidate]:
    patterns = [
        r"\bmy name is ([^.!\n]+)",
        r"\bI am ([^.!\n]+)",
        r"\bwe use ([^.!\n]+)",
        r"\bI work on ([^.!\n]+)",
    ]
    return _extract_matches(text, patterns, "fact", 7, ["fact"])


def _extract_assistant_commitments(text: str) -> list[MemoryCandidate]:
    patterns = [
        r"\bI will ([^.!\n]+)",
        r"\bI'll ([^.!\n]+)",
    ]
    return _extract_matches(text, patterns, "commitment", 6, ["commitment"])


def _extract_matches(
    text: str,
    patterns: list[str],
    memory_type: str,
    importance: int,
    tags: list[str],
) -> list[MemoryCandidate]:
    matches: list[MemoryCandidate] = []
    for pattern in patterns:
        for match in re.finditer(pattern, text, flags=re.IGNORECASE):
            content = _compact_text(match.group(0).strip())
            if len(content) < 12:
                continue
            matches.append(
                MemoryCandidate(
                    memory_type=memory_type,
                    content=content,
                    importance=importance,
                    tags=tags,
                    metadata={"source": "auto-extract"},
                )
            )
    return matches


def _normalize_memory(text: str) -> str:
    return " ".join(text.lower().split())

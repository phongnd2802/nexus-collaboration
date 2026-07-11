from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from pydantic_ai import ModelRetry

from nexus_ai.capabilities.mcp import _process_tool_call
from nexus_ai.capabilities.temporal_tools import normalize_temporal_tool_args
from nexus_ai.settings import load_settings


def test_normalize_schedule_message_accepts_explicit_timezone() -> None:
    normalized = normalize_temporal_tool_args(
        "nexus_schedule_message",
        {"scheduledAt": "2026-07-11T14:26:10+07:00"},
        "Asia/Ho_Chi_Minh",
        now=datetime(2026, 7, 10, 0, 0, tzinfo=timezone.utc),
    )

    assert normalized["scheduledAt"] == "2026-07-11T14:26:10+07:00"


def test_normalize_schedule_message_rejects_naive_datetime() -> None:
    with pytest.raises(ModelRetry, match="explicit timezone offset or Z"):
        normalize_temporal_tool_args(
            "nexus_schedule_message",
            {"scheduledAt": "2026-07-11T14:26:10"},
            "Asia/Ho_Chi_Minh",
            now=datetime(2026, 7, 10, 0, 0, tzinfo=timezone.utc),
        )


def test_normalize_schedule_message_rejects_past_time() -> None:
    with pytest.raises(ModelRetry, match="must be in the future"):
        normalize_temporal_tool_args(
            "nexus_schedule_message",
            {"scheduledAt": "2026-07-10T00:00:00Z"},
            "UTC",
            now=datetime(2026, 7, 10, 0, 0, 1, tzinfo=timezone.utc),
        )


def test_normalize_calendar_range_rejects_end_before_start() -> None:
    with pytest.raises(ModelRetry, match="must be after or equal to"):
        normalize_temporal_tool_args(
            "nexus_create_calendar_event",
            {
                "start_time": "2026-07-11T10:00:00+07:00",
                "end_time": "2026-07-11T09:00:00+07:00",
            },
            "Asia/Ho_Chi_Minh",
        )


def test_normalize_calendar_date_filters_keep_date_only() -> None:
    normalized = normalize_temporal_tool_args(
        "nexus_list_calendar_events",
        {"start_date": "2026-07-01", "end_date": "2026-07-31"},
        "Asia/Ho_Chi_Minh",
    )

    assert normalized == {"start_date": "2026-07-01", "end_date": "2026-07-31"}


def test_normalize_calendar_date_filters_reject_datetime_value() -> None:
    with pytest.raises(ModelRetry, match="calendar date"):
        normalize_temporal_tool_args(
            "nexus_list_calendar_events",
            {"start_date": "2026-07-01T00:00:00Z"},
            "UTC",
        )


def test_process_tool_call_normalizes_before_forwarding() -> None:
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "openrouter:test",
            "NEXUS_MCP_URL": "http://localhost:3333/mcp",
            "NEXUS_AI_DATABASE_URL": "postgresql://user:pass@localhost:5432/nexus_ai",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
        }
    )
    calls: list[tuple[str, dict[str, str]]] = []

    async def fake_call_tool(name: str, tool_args: dict[str, str]) -> dict[str, str]:
        calls.append((name, tool_args))
        return {"status": "ok"}

    ctx = SimpleNamespace(deps=SimpleNamespace(settings=settings))
    asyncio.run(
        _process_tool_call(
            ctx,
            fake_call_tool,
            "nexus_schedule_message",
            {"scheduledAt": "2026-07-11T14:26:10Z"},
        )
    )

    assert calls == [("nexus_schedule_message", {"scheduledAt": "2026-07-11T14:26:10Z"})]

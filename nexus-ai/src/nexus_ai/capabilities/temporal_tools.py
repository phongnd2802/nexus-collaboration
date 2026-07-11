from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
import logging
from typing import Any, Literal

from pydantic_ai import ModelRetry

logger = logging.getLogger(__name__)

TemporalKind = Literal["datetime", "date"]


@dataclass(frozen=True)
class TemporalFieldRule:
    path: tuple[str, ...]
    kind: TemporalKind
    required_timezone: bool = False
    must_be_future: bool = False


@dataclass(frozen=True)
class TemporalRangeRule:
    start_path: tuple[str, ...]
    end_path: tuple[str, ...]
    kind: TemporalKind


@dataclass(frozen=True)
class TemporalToolRule:
    fields: tuple[TemporalFieldRule, ...] = ()
    ranges: tuple[TemporalRangeRule, ...] = ()


TEMPORAL_TOOL_RULES: dict[str, TemporalToolRule] = {
    "nexus_schedule_message": TemporalToolRule(
        fields=(
            TemporalFieldRule(("scheduledAt",), "datetime", required_timezone=True, must_be_future=True),
        ),
    ),
    "nexus_update_scheduled_message": TemporalToolRule(
        fields=(
            TemporalFieldRule(("scheduledAt",), "datetime", required_timezone=True, must_be_future=True),
        ),
    ),
    "nexus_schedule_video_call": TemporalToolRule(
        fields=(
            TemporalFieldRule(
                ("scheduled_start_time",),
                "datetime",
                required_timezone=True,
                must_be_future=True,
            ),
            TemporalFieldRule(("scheduled_end_time",), "datetime", required_timezone=True),
        ),
        ranges=(
            TemporalRangeRule(("scheduled_start_time",), ("scheduled_end_time",), "datetime"),
        ),
    ),
    "nexus_create_calendar_event": TemporalToolRule(
        fields=(
            TemporalFieldRule(("start_time",), "datetime", required_timezone=True),
            TemporalFieldRule(("end_time",), "datetime", required_timezone=True),
            TemporalFieldRule(("recurrence_rule", "endDate"), "date"),
            TemporalFieldRule(("recurrence_rule", "until"), "datetime", required_timezone=True),
        ),
        ranges=(
            TemporalRangeRule(("start_time",), ("end_time",), "datetime"),
        ),
    ),
    "nexus_update_calendar_event": TemporalToolRule(
        fields=(
            TemporalFieldRule(("start_time",), "datetime", required_timezone=True),
            TemporalFieldRule(("end_time",), "datetime", required_timezone=True),
            TemporalFieldRule(("recurrence_rule", "endDate"), "date"),
            TemporalFieldRule(("recurrence_rule", "until"), "datetime", required_timezone=True),
        ),
        ranges=(
            TemporalRangeRule(("start_time",), ("end_time",), "datetime"),
        ),
    ),
    "nexus_list_calendar_events": TemporalToolRule(
        fields=(
            TemporalFieldRule(("start_date",), "date"),
            TemporalFieldRule(("end_date",), "date"),
        ),
        ranges=(
            TemporalRangeRule(("start_date",), ("end_date",), "date"),
        ),
    ),
    "nexus_create_project": TemporalToolRule(
        fields=(
            TemporalFieldRule(("start_date",), "datetime", required_timezone=True),
            TemporalFieldRule(("end_date",), "datetime", required_timezone=True),
        ),
        ranges=(
            TemporalRangeRule(("start_date",), ("end_date",), "datetime"),
        ),
    ),
    "nexus_update_project": TemporalToolRule(
        fields=(
            TemporalFieldRule(("start_date",), "datetime", required_timezone=True),
            TemporalFieldRule(("end_date",), "datetime", required_timezone=True),
        ),
        ranges=(
            TemporalRangeRule(("start_date",), ("end_date",), "datetime"),
        ),
    ),
    "nexus_create_task": TemporalToolRule(
        fields=(
            TemporalFieldRule(("due_date",), "datetime", required_timezone=True),
        ),
    ),
    "nexus_update_task": TemporalToolRule(
        fields=(
            TemporalFieldRule(("due_date",), "datetime", required_timezone=True),
        ),
    ),
}


def normalize_temporal_tool_args(
    tool_name: str,
    tool_args: dict[str, Any],
    timezone_name: str,
    *,
    now: datetime | None = None,
) -> dict[str, Any]:
    rule = TEMPORAL_TOOL_RULES.get(tool_name)
    if rule is None:
        return tool_args

    now_dt = now or datetime.now().astimezone()
    normalized: dict[str, Any] = _deep_copy_dict(tool_args)
    parsed_values: dict[tuple[str, ...], datetime | date] = {}

    for field in rule.fields:
        value = _get_path(normalized, field.path)
        if value is None:
            continue
        if field.kind == "datetime":
            if not isinstance(value, str):
                raise ModelRetry(
                    f"{tool_name}: field {'.'.join(field.path)} must be an ISO 8601 datetime in timezone {timezone_name}."
                )
            parsed = _parse_datetime(
                value,
                field.path,
                timezone_name,
                require_timezone=field.required_timezone,
            )
            if field.must_be_future and parsed <= now_dt.astimezone(parsed.tzinfo):
                raise ModelRetry(
                    f"{tool_name}: field {'.'.join(field.path)} must be in the future for timezone {timezone_name}."
                )
            parsed_values[field.path] = parsed
            _set_path(normalized, field.path, _format_datetime(parsed))
        else:
            if not isinstance(value, str):
                raise ModelRetry(
                    f"{tool_name}: field {'.'.join(field.path)} must be an ISO calendar date (YYYY-MM-DD)."
                )
            parsed_date = _parse_date(value, field.path)
            parsed_values[field.path] = parsed_date
            _set_path(normalized, field.path, parsed_date.isoformat())

    for range_rule in rule.ranges:
        start = parsed_values.get(range_rule.start_path)
        end = parsed_values.get(range_rule.end_path)
        if start is None or end is None:
            continue
        if end < start:
            raise ModelRetry(
                f"{tool_name}: field {'.'.join(range_rule.end_path)} must be after or equal to {'.'.join(range_rule.start_path)}."
            )

    if normalized != tool_args:
        logger.info(
            "Normalized temporal tool call %s in timezone %s: raw=%s normalized=%s",
            tool_name,
            timezone_name,
            tool_args,
            normalized,
        )
    else:
        logger.info("Validated temporal tool call %s in timezone %s", tool_name, timezone_name)
    return normalized


def _parse_datetime(
    value: str,
    path: tuple[str, ...],
    timezone_name: str,
    *,
    require_timezone: bool,
) -> datetime:
    candidate = value.strip()
    if require_timezone and not _has_explicit_timezone(candidate):
        raise ModelRetry(
            f"Field {'.'.join(path)} must include an explicit timezone offset or Z. "
            f"Use the user's timezone {timezone_name} when choosing the wall-clock time."
        )
    try:
        parsed = datetime.fromisoformat(candidate.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ModelRetry(
            f"Field {'.'.join(path)} must be a valid ISO 8601 datetime. "
            f"Use timezone {timezone_name} unless the user specified another timezone."
        ) from exc
    if parsed.tzinfo is None:
        raise ModelRetry(
            f"Field {'.'.join(path)} must include an explicit timezone offset or Z. "
            f"Use the user's timezone {timezone_name} when choosing the wall-clock time."
        )
    return parsed


def _parse_date(value: str, path: tuple[str, ...]) -> date:
    candidate = value.strip()
    if "T" in candidate:
        raise ModelRetry(
            f"Field {'.'.join(path)} must be a calendar date in YYYY-MM-DD format, not a datetime."
        )
    try:
        return date.fromisoformat(candidate)
    except ValueError as exc:
        raise ModelRetry(f"Field {'.'.join(path)} must be a valid calendar date in YYYY-MM-DD format.") from exc


def _format_datetime(value: datetime) -> str:
    iso = value.isoformat()
    if iso.endswith("+00:00"):
        return f"{iso[:-6]}Z"
    return iso


def _has_explicit_timezone(value: str) -> bool:
    if value.endswith("Z"):
        return True
    if len(value) < 6:
        return False
    suffix = value[-6:]
    return suffix[0] in {"+", "-"} and suffix[3] == ":"


def _get_path(data: dict[str, Any], path: tuple[str, ...]) -> Any:
    current: Any = data
    for key in path:
        if not isinstance(current, dict) or key not in current:
            return None
        current = current[key]
    return current


def _set_path(data: dict[str, Any], path: tuple[str, ...], value: Any) -> None:
    current: dict[str, Any] = data
    for key in path[:-1]:
        next_value = current.get(key)
        if not isinstance(next_value, dict):
            next_value = {}
            current[key] = next_value
        current = next_value
    current[path[-1]] = value


def _deep_copy_dict(value: dict[str, Any]) -> dict[str, Any]:
    copied: dict[str, Any] = {}
    for key, item in value.items():
        if isinstance(item, dict):
            copied[key] = _deep_copy_dict(item)
        elif isinstance(item, list):
            copied[key] = [(_deep_copy_dict(v) if isinstance(v, dict) else v) for v in item]
        else:
            copied[key] = item
    return copied

from __future__ import annotations

from typing import Any

from nexus_ai.capabilities.shields import validate_user_input
from nexus_ai.settings import Settings


def create_ecosystem_capabilities(settings: Settings) -> tuple[list[Any], list[str]]:
    if not settings.enable_ecosystem_capabilities:
        return [], []

    capabilities: list[Any] = []
    warnings: list[str] = []

    for name, factory in [
        ("summarization-pydantic-ai", lambda: _try_context_capability(settings)),
        ("pydantic-ai-shields", lambda: _try_shields(settings)),
    ]:
        try:
            capabilities.extend(factory())
        except Exception as exc:
            warnings.append(f"{name}: {exc}")

    return capabilities, warnings


def _try_context_capability(settings: Settings) -> list[Any]:
    try:
        from pydantic_ai_summarization import ContextManagerCapability
    except ImportError as exc:
        raise RuntimeError("pydantic-ai-summarization is required for context management.") from exc
    return [ContextManagerCapability(max_tokens=settings.context_max_tokens)]


def _try_shields(settings: Settings) -> list[Any]:
    try:
        from pydantic_ai_shields import InputGuard, SecretRedaction, ToolGuard
    except ImportError as exc:
        raise RuntimeError("pydantic-ai-shields is required for guardrails.") from exc

    return [
        InputGuard(guard=lambda prompt: _input_guard(prompt)),
        ToolGuard(
            blocked=["rm", "rmdir", "sudo", "curl", "wget", "ssh", "scp"],
            require_approval=[],
        ),
        SecretRedaction(),
    ]


def _input_guard(prompt: str) -> bool:
    try:
        validate_user_input(prompt)
    except ValueError:
        return False
    return True

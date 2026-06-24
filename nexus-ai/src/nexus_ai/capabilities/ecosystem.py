from __future__ import annotations

from pathlib import Path
from typing import Any

from nexus_ai.capabilities.shields import validate_user_input
from nexus_ai.settings import Settings


def create_ecosystem_capabilities(settings: Settings, skills_dir: Path, subagents_dir: Path) -> tuple[list[Any], list[str]]:
    if not settings.enable_ecosystem_capabilities:
        return [], []

    capabilities: list[Any] = []
    warnings: list[str] = []

    for name, factory in [
        ("pydantic-ai-backend", _try_console_capability),
        ("summarization-pydantic-ai", lambda: _try_context_capability(settings)),
        ("pydantic-deep", lambda: _try_memory_and_reliability(settings)),
        ("pydantic-ai-skills", lambda: _try_skills_capability(skills_dir)),
        ("subagents-pydantic-ai", lambda: _try_subagent_capability(settings, subagents_dir)),
        ("pydantic-ai-todo", _try_todo_capability),
        ("pydantic-ai-shields", lambda: _try_shields(settings)),
    ]:
        try:
            capabilities.extend(factory())
        except Exception as exc:
            warnings.append(f"{name}: {exc}")

    return capabilities, warnings


def _try_console_capability() -> list[Any]:
    try:
        from pydantic_ai_backends import ConsoleCapability
    except ImportError:
        try:
            from pydantic_ai_backend import ConsoleCapability
        except ImportError as exc:
            raise RuntimeError("pydantic-ai-backend is required for filesystem/shell capabilities.") from exc
    return [ConsoleCapability()]


def _try_context_capability(settings: Settings) -> list[Any]:
    try:
        from pydantic_ai_summarization import ContextManagerCapability
    except ImportError as exc:
        raise RuntimeError("pydantic-ai-summarization is required for context management.") from exc
    return [ContextManagerCapability(max_tokens=settings.context_max_tokens)]


def _try_memory_and_reliability(settings: Settings) -> list[Any]:
    try:
        from pydantic_deep import MemoryCapability, StuckLoopDetection
    except ImportError as exc:
        raise RuntimeError("pydantic-deep is required for memory and stuck-loop detection.") from exc
    return [MemoryCapability(agent_name=settings.agent_name), StuckLoopDetection()]


def _try_skills_capability(skills_dir: Path) -> list[Any]:
    try:
        from pydantic_ai_skills import SkillsCapability
    except ImportError as exc:
        raise RuntimeError("pydantic-ai-skills is required for skills capability.") from exc
    return [SkillsCapability(directories=[str(skills_dir)])]


def _try_subagent_capability(settings: Settings, subagents_dir: Path) -> list[Any]:
    try:
        import yaml
        from subagents_pydantic_ai import SubAgentCapability, SubAgentConfig
    except ImportError as exc:
        raise RuntimeError("subagents-pydantic-ai and pyyaml are required for subagent capability.") from exc

    configs: list[Any] = []
    for path in sorted(subagents_dir.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        configs.append(
            SubAgentConfig(
                name=str(data["name"]),
                description=str(data.get("description", "")),
                instructions=str(data.get("instructions", "")),
            )
        )
    return [SubAgentCapability(subagents=configs, default_model=_default_subagent_model(settings))] if configs else []


def _default_subagent_model(settings: Settings) -> Any:
    if settings.model != "test":
        return settings.model
    try:
        from pydantic_ai.models.test import TestModel
    except ImportError as exc:
        raise RuntimeError("Pydantic AI TestModel is unavailable for subagent capability.") from exc
    return TestModel()


def _try_todo_capability() -> list[Any]:
    try:
        from pydantic_ai_todo import TodoCapability
    except ImportError as exc:
        raise RuntimeError("pydantic-ai-todo is required for task tracking.") from exc
    return [TodoCapability(enable_subtasks=True)]


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

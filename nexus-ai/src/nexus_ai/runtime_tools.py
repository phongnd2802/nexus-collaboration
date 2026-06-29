from __future__ import annotations

from typing import Any

from pydantic_ai import RunContext

from nexus_ai.capabilities.context import current_time_instruction, memory_instruction
from nexus_ai.capabilities.shields import validate_user_input


def runtime_context_text(deps: Any) -> str:
    settings = deps.settings
    return "\n".join(
        [
            current_time_instruction(),
            f"Workspace id: {settings.workspace_id}. Session id: {settings.session_id}.",
            memory_instruction(deps.memory, settings.workspace_id, settings.session_id),
        ]
    )


def attach_runtime_tools(agent: Any) -> None:
    @agent.instructions
    def add_runtime_context(ctx: RunContext[Any]) -> str:
        return runtime_context_text(ctx.deps)

    @agent.tool
    def remember(
        ctx: RunContext[Any],
        content: str,
        memory_type: str = "episodic",
        importance: int = 5,
    ) -> dict[str, int]:
        """Store a workspace/session scoped memory for future agent runs."""
        memory_id = ctx.deps.memory.add(
            workspace_id=ctx.deps.settings.workspace_id,
            session_id=ctx.deps.settings.session_id,
            user_id=ctx.deps.settings.user_id,
            memory_type=memory_type,
            content=content,
            importance=importance,
        )
        return {"memory_id": memory_id}

    @agent.tool
    def list_memories(ctx: RunContext[Any], limit: int = 10) -> list[dict[str, object]]:
        """List recent workspace/session memories."""
        return [
            {
                "id": item.id,
                "type": item.memory_type,
                "content": item.content,
                "importance": item.importance,
                "tags": item.tags,
            }
            for item in ctx.deps.memory.recent(ctx.deps.settings.workspace_id, ctx.deps.settings.session_id, limit)
        ]

    @agent.tool
    def validate_prompt(_ctx: RunContext[Any], prompt: str) -> dict[str, str]:
        """Validate user input against local Nexus AI shield rules."""
        validate_user_input(prompt)
        return {"status": "accepted"}

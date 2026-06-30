from collections.abc import AsyncIterator
from typing import Any

from nexus_ai_service.core.ids import new_id
from nexus_ai_service.core.time import utc_now_iso
from nexus_ai_service.agent.capabilities.base import AgentCapability, CapabilityContext, CapabilityContribution
from nexus_ai_service.agent.capabilities.codemode import NexusCodeModeCapability
from nexus_ai_service.agent.capabilities.current_time import CurrentTimeCapability
from nexus_ai_service.agent.capabilities.mcp_tools import McpToolsCapability
from nexus_ai_service.agent.capabilities.memory import MemoryCapability
from nexus_ai_service.agent.capabilities.observability import ObservabilityCapability
from nexus_ai_service.agent.capabilities.rag import RagCapability
from nexus_ai_service.agent.capabilities.tool_policy import ToolPolicyCapability
from nexus_ai_service.agent.deps import WorkspaceAgentDeps
from nexus_ai_service.agent.pydantic_agent import build_pydantic_workspace_agent
from nexus_ai_service.integrations.openrouter import OpenRouterClient, chunk_text
from nexus_ai_service.streaming.events import StreamEvent


class WorkspaceAgent:
    def __init__(
        self,
        model: str,
        settings: Any,
        services: dict[str, Any],
        openrouter_api_key: str | None = None,
        capabilities: list[AgentCapability] | None = None,
    ) -> None:
        self.model = model
        self.settings = settings
        self.services = services
        self.openrouter_api_key = openrouter_api_key
        self.capabilities = capabilities or [
            CurrentTimeCapability(),
            RagCapability(),
            MemoryCapability(),
            ToolPolicyCapability(),
            McpToolsCapability(),
            NexusCodeModeCapability(),
            ObservabilityCapability(),
        ]

    async def stream(
        self,
        deps: WorkspaceAgentDeps,
        user_text: str,
        history: list[dict[str, str]],
    ) -> AsyncIterator[StreamEvent]:
        run_id = new_id()
        context = CapabilityContext(
            deps=deps,
            settings=self.settings,
            user_text=user_text,
            history=history,
            services=self.services,
            metadata={"run_id": run_id},
        )
        yield StreamEvent(
            run_id=run_id,
            session_id=deps.session_id,
            workspace_id=deps.workspace_id,
            event_type="session.created",
        )

        try:
            contribution = await self._prepare_capabilities(context)
            for event in contribution.events:
                yield event
            observability = next(
                (capability for capability in self.capabilities if isinstance(capability, ObservabilityCapability)),
                None,
            )
            if observability is not None:
                async with observability.span(context):
                    answer = await self._answer(context, contribution)
            else:
                answer = await self._answer(context, contribution)
            await self._after_run(context, answer)
            async for chunk in chunk_text(answer):
                yield StreamEvent(
                    run_id=run_id,
                    session_id=deps.session_id,
                    workspace_id=deps.workspace_id,
                    event_type="message.delta",
                    payload={"delta": chunk},
                )
            yield StreamEvent(
                run_id=run_id,
                session_id=deps.session_id,
                workspace_id=deps.workspace_id,
                event_type="message.completed",
                payload={
                    "content": answer,
                    "metadata": {
                        "model": self.model,
                        "generated_at": utc_now_iso(),
                        "runtime": "openrouter" if self.openrouter_api_key else "deterministic-dev",
                    },
                },
            )
        except Exception as exc:
            yield StreamEvent(
                run_id=run_id,
                session_id=deps.session_id,
                workspace_id=deps.workspace_id,
                event_type="error",
                payload={"message": str(exc)},
            )

    async def _prepare_capabilities(self, context: CapabilityContext) -> CapabilityContribution:
        contribution = CapabilityContribution(
            instructions=[
                (
                    "You are Nexus AI, the workspace assistant for Nexus Collaboration. "
                    "Use one agent runtime with capabilities, answer clearly, and respect workspace permissions."
                )
            ]
        )
        for capability in self.capabilities:
            contribution.extend(await capability.prepare(context))
        return contribution

    async def _after_run(self, context: CapabilityContext, assistant_text: str) -> None:
        for capability in self.capabilities:
            await capability.after_run(context, assistant_text)

    async def _answer(self, context: CapabilityContext, contribution: CapabilityContribution) -> str:
        if not self.openrouter_api_key:
            context_summary = ""
            if context.rag_sources:
                context_summary = " I found relevant workspace context: " + "; ".join(
                    source.get("citation", source.get("title", "source")) for source in context.rag_sources[:3]
                )
            return f"Nexus AI service is online.{context_summary} I received your request: {context.user_text.strip() or '(empty message)'}"

        instructions = contribution.instructions
        build = build_pydantic_workspace_agent(
            self.model,
            instructions=instructions,
            capabilities=contribution.pydantic_capabilities,
            tools=contribution.tools,
            toolsets=contribution.toolsets,
        )
        if build.enabled and build.agent is not None:
            try:
                result = await build.agent.run(context.user_text, deps=context.deps)
                output = getattr(result, "output", None)
                if isinstance(output, str) and output:
                    return output
            except Exception:
                pass

        system_context = (
            "\n\n".join(instructions)
            or "You are Nexus AI, the workspace assistant for Nexus Collaboration."
        )
        if context.rag_sources:
            joined_sources = "\n\n".join(
                f"[{index + 1}] {source.get('citation')}: {source.get('content')}"
                for index, source in enumerate(context.rag_sources[:8])
            )
            system_context += f"\n\nWorkspace context:\n{joined_sources}"
        messages = [{"role": "system", "content": system_context}, *context.history[-12:], {"role": "user", "content": context.user_text}]
        return await OpenRouterClient(self.openrouter_api_key, self.model).complete(messages)

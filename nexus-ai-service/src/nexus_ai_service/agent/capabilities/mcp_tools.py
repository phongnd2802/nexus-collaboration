from __future__ import annotations

from nexus_ai_service.agent.capabilities.base import CapabilityContext, CapabilityContribution, NoopAfterRun
from nexus_ai_service.tools.mcp_client import NexusMcpConfig


class McpToolsCapability(NoopAfterRun):
    name = "mcp_tools"

    async def prepare(self, context: CapabilityContext) -> CapabilityContribution:
        mcp_url = getattr(context.settings, "nexus_mcp_url", None)
        if not mcp_url:
            return CapabilityContribution()

        headers = NexusMcpConfig(mcp_url).headers(
            context.deps.authorization,
            context.deps.workspace_id,
            request_id=context.deps.request_id,
        )
        try:
            from pydantic_ai.mcp import MCPServerStreamableHTTP
        except Exception:
            return CapabilityContribution(
                instructions=["Nexus MCP tools are unavailable in this runtime; answer from context when possible."]
            )

        try:
            toolset = MCPServerStreamableHTTP(mcp_url, headers=headers, timeout=20)
        except TypeError:
            toolset = MCPServerStreamableHTTP(mcp_url)
        return CapabilityContribution(
            toolsets=[toolset],
            instructions=[
                "Use Nexus MCP tools for workspace reads when the answer needs live project, task, note, calendar, or file data."
            ],
        )

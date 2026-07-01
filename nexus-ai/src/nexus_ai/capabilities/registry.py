from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from nexus_ai.settings import Settings

from .code_mode import create_code_mode_capability
from .ecosystem import create_ecosystem_capabilities
from .mcp import create_nexus_mcp_capability
from .reasoning import create_thinking_capability
from .tool_preparation import create_mcp_tool_preparation_capability
from .tool_search import create_tool_search_capability


@dataclass
class CapabilityRegistry:
    capabilities: list[Any] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def add(self, name: str, factory) -> None:
        try:
            capability = factory()
        except Exception as exc:
            self.warnings.append(f"{name}: {exc}")
            return
        if capability is not None:
            self.capabilities.append(capability)


def build_capabilities(settings: Settings) -> CapabilityRegistry:
    registry = CapabilityRegistry()
    registry.add("nexus-mcp", lambda: create_nexus_mcp_capability(settings))
    registry.add("tool-search", create_tool_search_capability)
    registry.add("mcp-tool-preparation", create_mcp_tool_preparation_capability)
    if settings.enable_code_mode:
        registry.add("code-mode", create_code_mode_capability)
    registry.add("thinking", create_thinking_capability)
    registry.add(
        "ecosystem",
        lambda: _ecosystem_result(settings, registry),
    )
    registry.capabilities = _flatten(registry.capabilities)
    return registry


def _flatten(values: list[Any]) -> list[Any]:
    flattened: list[Any] = []
    for value in values:
        if isinstance(value, list):
            flattened.extend(value)
        else:
            flattened.append(value)
    return flattened


def _ecosystem_result(settings: Settings, registry: CapabilityRegistry) -> list[Any]:
    capabilities, warnings = create_ecosystem_capabilities(settings)
    registry.warnings.extend(warnings)
    return capabilities

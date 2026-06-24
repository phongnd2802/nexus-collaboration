from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class SubAgentSpec:
    name: str
    description: str
    instructions: str
    model: str | None = None


class SubAgentRegistry:
    def __init__(self, root: Path) -> None:
        self.root = root
        self._specs = self._load_specs()

    def list(self) -> list[SubAgentSpec]:
        return list(self._specs.values())

    def get(self, name: str) -> SubAgentSpec:
        try:
            return self._specs[name]
        except KeyError as exc:
            raise KeyError(f"Unknown subagent: {name}") from exc

    def create_agent(self, name: str, default_model: str) -> Any:
        try:
            from pydantic_ai import Agent
        except ImportError as exc:
            raise RuntimeError("Pydantic AI is required to create subagents.") from exc

        spec = self.get(name)
        return Agent(spec.model or default_model, instructions=spec.instructions)

    def _load_specs(self) -> dict[str, SubAgentSpec]:
        if not self.root.exists():
            return {}
        specs: dict[str, SubAgentSpec] = {}
        for path in sorted(self.root.glob("*.yaml")):
            data = _read_yaml(path)
            spec = SubAgentSpec(
                name=str(data["name"]),
                description=str(data.get("description", "")),
                instructions=str(data.get("instructions", "")),
                model=data.get("model"),
            )
            specs[spec.name] = spec
        return specs


def _read_yaml(path: Path) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    try:
        import yaml
    except ImportError:
        data: dict[str, Any] = {}
        for line in text.splitlines():
            if ":" not in line or line.startswith(" "):
                continue
            key, value = line.split(":", 1)
            data[key.strip()] = value.strip()
        return data
    return yaml.safe_load(text) or {}

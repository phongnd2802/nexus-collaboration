from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Skill:
    name: str
    path: Path
    content: str


class SkillLibrary:
    def __init__(self, root: Path) -> None:
        self.root = root

    def list(self) -> list[str]:
        if not self.root.exists():
            return []
        return sorted(path.parent.name for path in self.root.glob("*/SKILL.md"))

    def load(self, name: str) -> Skill:
        path = self.root / name / "SKILL.md"
        if not path.exists():
            raise FileNotFoundError(f"Unknown skill: {name}")
        return Skill(name=name, path=path, content=path.read_text(encoding="utf-8"))

    def summary_instruction(self) -> str:
        names = self.list()
        if not names:
            return "No local Nexus AI skills are available."
        return "Available local skills: " + ", ".join(names)


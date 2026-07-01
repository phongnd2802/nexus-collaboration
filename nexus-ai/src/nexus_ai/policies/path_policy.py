from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PathPolicy:
    root: Path

    def __post_init__(self) -> None:
        object.__setattr__(self, "root", self.root.resolve())

    def resolve(self, relative_path: str | Path) -> Path:
        candidate = (self.root / relative_path).resolve()
        if candidate != self.root and self.root not in candidate.parents:
            raise PermissionError(f"Path escapes sandbox: {relative_path}")
        return candidate

    def ensure_root(self) -> None:
        self.root.mkdir(parents=True, exist_ok=True)


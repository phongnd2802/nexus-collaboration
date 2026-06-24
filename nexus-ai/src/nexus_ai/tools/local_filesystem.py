from __future__ import annotations

from pathlib import Path

from nexus_ai.policies import PathPolicy


class LocalFilesystemTools:
    def __init__(self, policy: PathPolicy) -> None:
        self.policy = policy
        self.policy.ensure_root()

    def list_files(self, path: str = ".") -> list[str]:
        target = self.policy.resolve(path)
        if not target.exists():
            return []
        if target.is_file():
            return [str(target.relative_to(self.policy.root))]
        return sorted(str(item.relative_to(self.policy.root)) for item in target.iterdir())

    def read_file(self, path: str, max_chars: int = 20000) -> str:
        target = self.policy.resolve(path)
        return target.read_text(encoding="utf-8")[:max_chars]

    def write_file(self, path: str, content: str) -> dict[str, str]:
        target = self.policy.resolve(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(content, encoding="utf-8")
        return {"path": str(target.relative_to(self.policy.root)), "status": "written"}

    def search_files(self, query: str, path: str = ".") -> list[dict[str, str | int]]:
        root = self.policy.resolve(path)
        results: list[dict[str, str | int]] = []
        for file_path in _iter_text_files(root):
            try:
                for line_number, line in enumerate(file_path.read_text(encoding="utf-8").splitlines(), start=1):
                    if query.lower() in line.lower():
                        results.append(
                            {
                                "path": str(file_path.relative_to(self.policy.root)),
                                "line": line_number,
                                "text": line[:500],
                            }
                        )
            except UnicodeDecodeError:
                continue
        return results[:100]


def _iter_text_files(root: Path):
    if root.is_file():
        yield root
        return
    for item in root.rglob("*"):
        if item.is_file():
            yield item


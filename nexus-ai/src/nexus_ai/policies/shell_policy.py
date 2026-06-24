from __future__ import annotations

import shlex
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ShellPolicy:
    allowed_commands: set[str] = field(
        default_factory=lambda: {
            "python",
            "pytest",
            "node",
            "npm",
            "uv",
            "ls",
            "pwd",
            "find",
            "rg",
            "cat",
            "sed",
        },
    )
    denied_commands: set[str] = field(
        default_factory=lambda: {
            "rm",
            "rmdir",
            "mv",
            "cp",
            "chmod",
            "chown",
            "curl",
            "wget",
            "ssh",
            "scp",
            "sudo",
            "docker",
            "git",
        },
    )

    def validate(self, command: str) -> list[str]:
        parts = shlex.split(command)
        if not parts:
            raise PermissionError("Empty shell command is not allowed")

        executable = parts[0]
        if executable in self.denied_commands:
            raise PermissionError(f"Shell command is denied: {executable}")
        if executable not in self.allowed_commands:
            raise PermissionError(f"Shell command is not allowlisted: {executable}")

        if any(token in command for token in ["..", "$(", "`", ">", "<", "&&", "||", ";", "|"]):
            raise PermissionError("Shell metacharacters and parent traversal are not allowed")

        if executable == "python" and len(parts) >= 3 and parts[1] == "-m":
            return parts

        return parts


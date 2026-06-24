from __future__ import annotations

import subprocess
from pathlib import Path

from nexus_ai.policies import PathPolicy, ShellPolicy, redact_secrets


class LocalShellTools:
    def __init__(self, path_policy: PathPolicy, shell_policy: ShellPolicy, timeout_seconds: int = 30) -> None:
        self.path_policy = path_policy
        self.shell_policy = shell_policy
        self.timeout_seconds = timeout_seconds
        self.path_policy.ensure_root()

    def run_shell(self, command: str, cwd: str = ".") -> dict[str, object]:
        args = self.shell_policy.validate(command)
        working_dir = self.path_policy.resolve(cwd)
        working_dir.mkdir(parents=True, exist_ok=True)

        completed = subprocess.run(
            args,
            cwd=working_dir,
            text=True,
            capture_output=True,
            timeout=self.timeout_seconds,
            check=False,
        )
        return redact_secrets(
            {
                "returncode": completed.returncode,
                "stdout": completed.stdout[-12000:],
                "stderr": completed.stderr[-12000:],
            }
        )


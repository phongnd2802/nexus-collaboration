from __future__ import annotations

from nexus_ai.policies import PathPolicy, ShellPolicy
from nexus_ai.settings import Settings
from nexus_ai.tools import LocalShellTools


def create_shell_tools(settings: Settings) -> LocalShellTools:
    return LocalShellTools(
        PathPolicy(settings.filesystem_root),
        ShellPolicy(),
        timeout_seconds=min(settings.max_run_seconds, 30),
    )


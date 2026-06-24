from __future__ import annotations

from nexus_ai.policies import PathPolicy
from nexus_ai.settings import Settings
from nexus_ai.tools import LocalFilesystemTools


def create_filesystem_tools(settings: Settings) -> LocalFilesystemTools:
    return LocalFilesystemTools(PathPolicy(settings.filesystem_root))


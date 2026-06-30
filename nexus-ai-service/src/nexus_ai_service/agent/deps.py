from dataclasses import dataclass


@dataclass(frozen=True)
class WorkspaceAgentDeps:
    workspace_id: str
    user_id: str | None
    request_id: str | None
    authorization: str | None
    session_id: str


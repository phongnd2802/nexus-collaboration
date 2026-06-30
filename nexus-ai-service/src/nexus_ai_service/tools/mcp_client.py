from dataclasses import dataclass


@dataclass(frozen=True)
class NexusMcpConfig:
    url: str
    native: bool = False
    code_mode_tools: bool = True

    def headers(self, authorization: str | None, workspace_id: str, request_id: str | None = None) -> dict[str, str]:
        headers = {
            "Accept": "application/json, text/event-stream",
            "X-Nexus-Workspace-ID": workspace_id,
        }
        if authorization:
            headers["Authorization"] = authorization
        if request_id:
            headers["X-Nexus-Request-ID"] = request_id
        return headers


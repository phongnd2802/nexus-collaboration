from dataclasses import dataclass

from fastapi import Header, HTTPException, Request


@dataclass(frozen=True)
class AuthContext:
    workspace_id: str
    user_id: str | None
    request_id: str | None
    authorization: str | None


async def auth_context(
    request: Request,
    authorization: str | None = Header(default=None, alias="Authorization"),
    x_nexus_workspace_id: str | None = Header(default=None, alias="X-Nexus-Workspace-ID"),
    x_nexus_user_id: str | None = Header(default=None, alias="X-Nexus-User-ID"),
    x_nexus_request_id: str | None = Header(default=None, alias="X-Nexus-Request-ID"),
) -> AuthContext:
    workspace_id = request.path_params.get("workspace_id") or x_nexus_workspace_id
    if not workspace_id:
        raise HTTPException(status_code=400, detail="Missing workspace context")
    return AuthContext(
        workspace_id=workspace_id,
        user_id=x_nexus_user_id,
        request_id=x_nexus_request_id,
        authorization=authorization,
    )


def assert_internal_api_key(request: Request) -> None:
    expected = getattr(request.app.state.settings, "nexus_internal_api_key", None)
    if not expected or expected == "change-me":
        return
    provided = request.headers.get("x-api-key")
    if provided != expected:
        raise HTTPException(status_code=401, detail="Invalid internal API key")


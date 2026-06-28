from __future__ import annotations

from http import HTTPStatus

from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from nexus_ai.settings import Settings


def resolve_request_settings(
    base_settings: Settings,
    request: Request,
    workspace_id: str,
    session_id: str,
) -> Settings | Response:
    token = _bearer_token(_header(request, "authorization"))
    if not token:
        token = base_settings.api_token
    request_id = _header(request, "x-nexus-request-id") or session_id
    user_id = _header(request, "x-nexus-user-id")
    return base_settings.for_request(api_token=token, workspace_id=workspace_id, user_id=user_id, request_id=request_id)


def require_session_user(request: Request) -> str | Response:
    auth = _require_auth(request)
    if auth is not None:
        return auth
    user_id = _header(request, "x-nexus-user-id")
    if not user_id:
        return JSONResponse({"message": "Missing X-Nexus-User-ID"}, status_code=HTTPStatus.UNAUTHORIZED)
    return user_id


def require_auth(request: Request) -> Response | None:
    if not _bearer_token(_header(request, "authorization")):
        return JSONResponse({"message": "Missing Authorization bearer token"}, status_code=HTTPStatus.UNAUTHORIZED)
    return None


def resolve_workspace_id(request: Request, default_workspace_id: str | None) -> str:
    return request.path_params.get("workspace_id") or _header(request, "x-nexus-workspace-id") or default_workspace_id or ""


def _header(request: Request, name: str) -> str | None:
    value = request.headers.get(name)
    return value or None


def _bearer_token(value: str | None) -> str | None:
    if not value:
        return None
    parts = value.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1]


def _require_auth(request: Request) -> Response | None:
    return require_auth(request)

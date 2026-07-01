from __future__ import annotations

from contextvars import ContextVar, Token
from dataclasses import dataclass


@dataclass(frozen=True)
class RequestContext:
    authorization: str | None = None
    api_token: str | None = None
    workspace_id: str | None = None
    user_id: str | None = None
    request_id: str | None = None
    session_id: str | None = None


_CURRENT_REQUEST_CONTEXT: ContextVar[RequestContext | None] = ContextVar(
    "nexus_ai_request_context",
    default=None,
)


def get_request_context() -> RequestContext | None:
    return _CURRENT_REQUEST_CONTEXT.get()


def set_request_context(value: RequestContext | None) -> Token[RequestContext | None]:
    return _CURRENT_REQUEST_CONTEXT.set(value)


def reset_request_context(token: Token[RequestContext | None]) -> None:
    _CURRENT_REQUEST_CONTEXT.reset(token)


def extract_bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    parts = authorization.split(" ", 1)
    if len(parts) != 2:
        return None
    scheme, token = parts
    if scheme.lower() != "bearer" or not token:
        return None
    return token

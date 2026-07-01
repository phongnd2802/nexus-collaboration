from __future__ import annotations

from types import SimpleNamespace

import httpx

from nexus_ai.api import _build_agent_request_context
from nexus_ai.capabilities.mcp import _RequestScopedAuthorization, _RequestScopedHeaders
from nexus_ai.request_context import RequestContext, reset_request_context, set_request_context


def test_build_agent_request_context_uses_path_workspace_id():
    token = set_request_context(
        RequestContext(
            authorization="Bearer outer-token",
            workspace_id="outer-workspace",
            user_id="outer-user",
            request_id="outer-request",
            session_id="outer-session",
        )
    )
    try:
        context = _build_agent_request_context(
            SimpleNamespace(
                headers={
                    "authorization": "Bearer incoming-token",
                    "x-nexus-user-id": "user-1",
                    "x-nexus-request-id": "req-1",
                }
            ),
            "path-workspace",
            "session-1",
        )

        assert context.authorization == "Bearer incoming-token"
        assert context.workspace_id == "path-workspace"
        assert context.user_id == "user-1"
        assert context.request_id == "req-1"
        assert context.session_id == "session-1"
    finally:
        reset_request_context(token)


def test_request_scoped_mcp_headers_use_current_request_context():
    token = set_request_context(
        RequestContext(
            authorization="Bearer runtime-token",
            workspace_id="runtime-workspace",
            request_id="req-1",
        )
    )
    try:
        headers = _RequestScopedHeaders(SimpleNamespace(workspace_id="", request_id=""))

        assert bool(headers) is True
        assert dict(headers)["X-Nexus-Workspace-ID"] == "runtime-workspace"
        assert headers["X-Nexus-Workspace-ID"] == "runtime-workspace"
        assert headers["X-Nexus-Request-ID"] == "req-1"
    finally:
        reset_request_context(token)


def test_request_scoped_authorization_uses_current_request_context():
    token = set_request_context(
        RequestContext(
            authorization="Bearer runtime-token",
            workspace_id="runtime-workspace",
            request_id="req-1",
        )
    )
    try:
        auth = _RequestScopedAuthorization(SimpleNamespace(api_token=""))

        request = httpx.Request("POST", "http://localhost:3333/mcp")
        flow = auth.auth_flow(request)
        prepared = next(flow)
        assert prepared.headers["Authorization"] == "Bearer runtime-token"
    finally:
        reset_request_context(token)

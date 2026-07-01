from __future__ import annotations

import re
import os

from nexus_ai.agent import build_runtime
from nexus_ai.api import create_agent_chat_app
from nexus_ai.capabilities.observability import flush_langfuse, langfuse_attributes
from nexus_ai.request_context import RequestContext, reset_request_context, set_request_context


def create_web_app():
    runtime = build_runtime()
    return _wrap_with_langfuse_context(create_agent_chat_app(runtime), runtime.deps.settings)


def main() -> None:
    runtime = build_runtime()
    if runtime.capability_warnings:
        for warning in runtime.capability_warnings:
            print(f"[nexus-ai] capability warning: {warning}")
    app = _wrap_with_langfuse_context(create_agent_chat_app(runtime), runtime.deps.settings)

    if hasattr(app, "run"):
        app.run()
    else:
        import uvicorn

        uvicorn.run(
            app,
            host=os.environ.get("NEXUS_AI_HOST", "0.0.0.0"),
            port=int(os.environ.get("NEXUS_AI_PORT", "8000")),
        )

    flush_langfuse(runtime.deps.settings)


def _wrap_with_langfuse_context(app, settings):
    class LangfuseWrappedApp:
        def __init__(self, inner_app, inner_settings):
            self._app = inner_app
            self._settings = inner_settings

        async def __call__(self, scope, receive, send):
            request_context = _request_context_from_scope(scope)
            token = set_request_context(request_context)
            try:
                with langfuse_attributes(self._settings, user_id=request_context.user_id if request_context else None):
                    await self._app(scope, receive, send)
            finally:
                reset_request_context(token)

        def __getattr__(self, name):
            return getattr(self._app, name)

    return LangfuseWrappedApp(app, settings)


def _request_context_from_scope(scope) -> RequestContext | None:
    if scope.get("type") != "http":
        return None

    headers = {
        key.decode("latin-1").lower(): value.decode("latin-1")
        for key, value in scope.get("headers", [])
    }
    path = scope.get("path", "")
    session_match = re.search(r"/sessions/([^/]+)/", path)

    authorization = headers.get("authorization")
    workspace_id = headers.get("x-nexus-workspace-id")
    user_id = headers.get("x-nexus-user-id")
    request_id = headers.get("x-nexus-request-id")
    session_id = session_match.group(1) if session_match else None

    return RequestContext(
        authorization=authorization,
        workspace_id=workspace_id,
        user_id=user_id,
        request_id=request_id,
        session_id=session_id or request_id,
    )


if __name__ == "__main__":
    main()

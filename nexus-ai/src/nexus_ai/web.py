from __future__ import annotations

from nexus_ai.agent import build_runtime
from nexus_ai.capabilities.observability import flush_langfuse, langfuse_attributes
from nexus_ai.service import create_service_app
from nexus_ai.settings import load_settings


def create_web_app():
    settings = load_settings()
    app = create_service_app(settings)
    _mount_local_test_ui(app, settings)
    return _wrap_with_langfuse_context(app, settings)


def main() -> None:
    settings = load_settings()
    app = create_service_app(settings)
    _mount_local_test_ui(app, settings)
    app = _wrap_with_langfuse_context(app, settings)

    if hasattr(app, "run"):
        app.run()
    else:
        import uvicorn

        uvicorn.run(app, host="127.0.0.1", port=8000)

    flush_langfuse(settings)


def _mount_local_test_ui(app, settings) -> None:
    try:
        runtime = build_runtime(settings)
    except RuntimeError as exc:
        print(f"[nexus-ai] local /web UI disabled: {exc}")
        return

    if runtime.capability_warnings:
        for warning in runtime.capability_warnings:
            print(f"[nexus-ai] capability warning: {warning}")

    agent = runtime.agent
    if not hasattr(agent, "to_web"):
        print("[nexus-ai] local /web UI disabled: Agent.to_web() is unavailable")
        return

    app.mount("/web", agent.to_web(deps=runtime.deps))


def _wrap_with_langfuse_context(app, settings):
    class LangfuseWrappedApp:
        def __init__(self, inner_app, inner_settings):
            self._app = inner_app
            self._settings = inner_settings

        async def __call__(self, scope, receive, send):
            with langfuse_attributes(self._settings):
                await self._app(scope, receive, send)

        def __getattr__(self, name):
            return getattr(self._app, name)

    return LangfuseWrappedApp(app, settings)


if __name__ == "__main__":
    main()

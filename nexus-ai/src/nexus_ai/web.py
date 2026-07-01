from __future__ import annotations

from nexus_ai.agent import build_runtime
from nexus_ai.capabilities.observability import flush_langfuse, langfuse_attributes


def create_web_app():
    runtime = build_runtime()
    agent = runtime.agent
    if not hasattr(agent, "to_web"):
        raise RuntimeError(
            "Installed Pydantic AI Agent does not expose to_web(). "
            "Upgrade Pydantic AI to a version that supports agent.to_web()."
        )
    return _wrap_with_langfuse_context(agent.to_web(deps=runtime.deps), runtime.deps.settings)


def main() -> None:
    runtime = build_runtime()
    agent = runtime.agent
    if runtime.capability_warnings:
        for warning in runtime.capability_warnings:
            print(f"[nexus-ai] capability warning: {warning}")

    if not hasattr(agent, "to_web"):
        raise RuntimeError(
            "Installed Pydantic AI Agent does not expose to_web(). "
            "Upgrade Pydantic AI to a version that supports agent.to_web()."
        )

    app = _wrap_with_langfuse_context(agent.to_web(deps=runtime.deps), runtime.deps.settings)

    if hasattr(app, "run"):
        app.run()
    else:
        import uvicorn

        uvicorn.run(app, host="127.0.0.1", port=8000)

    flush_langfuse(runtime.deps.settings)


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

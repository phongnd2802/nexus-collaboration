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
    return agent.to_web(deps=runtime.deps)


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

    with langfuse_attributes(runtime.deps.settings):
        app = agent.to_web(deps=runtime.deps)

    if hasattr(app, "run"):
        app.run()
    else:
        import uvicorn

        uvicorn.run(app, host="127.0.0.1", port=8000)

    flush_langfuse(runtime.deps.settings)


if __name__ == "__main__":
    main()


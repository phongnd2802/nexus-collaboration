from __future__ import annotations

from http import HTTPStatus

from starlette.requests import Request
from starlette.responses import JSONResponse

from nexus_ai.agent import build_runtime
from nexus_ai.capabilities.observability import flush_langfuse, langfuse_attributes
from nexus_ai.orchestration.domain_skills import available_domain_skill_ids_by_role
from nexus_ai.service import create_service_app
from nexus_ai.settings import Settings, load_settings


def create_web_app():
    settings = load_settings()
    app = create_service_app(settings)
    _mount_local_runtime_status(app, settings)
    _mount_local_test_ui(app, settings)
    return _wrap_with_langfuse_context(app, settings)


def main() -> None:
    settings = load_settings()
    app = create_service_app(settings)
    _mount_local_runtime_status(app, settings)
    _mount_local_test_ui(app, settings)
    app = _wrap_with_langfuse_context(app, settings)

    if hasattr(app, "run"):
        app.run()
    else:
        import uvicorn

        uvicorn.run(app, host="127.0.0.1", port=8000)

    flush_langfuse(settings)


def _mount_local_runtime_status(app, settings: Settings) -> None:
    async def health(_request: Request):
        status_code = HTTPStatus.OK
        payload = {
            "webMounted": False,
            "orchestrationMode": settings.orchestration_mode,
            "routingMode": settings.orchestration_mode,
            "singleAgentDeprecated": settings.orchestration_mode == "single",
            "recommendedMode": "hybrid",
            "orchestratorMaxRevisions": settings.orchestrator_max_revisions,
            "orchestratorMaxRetrievalRetries": settings.orchestrator_max_retrieval_retries,
            "routerModel": settings.router_model,
            "routerConfidenceThreshold": settings.router_confidence_threshold,
            "model": settings.model,
            "workspaceId": settings.workspace_id or None,
            "mcpUrl": settings.mcp_url,
            "mcpUrls": settings.active_mcp_urls,
            "hasApiToken": bool(settings.api_token),
            "ragEnabled": settings.rag_enabled,
            "availableDomainSkills": available_domain_skill_ids_by_role(),
            "capabilityWarnings": [],
            "disabledReason": None,
        }
        try:
            runtime = build_runtime(settings)
        except RuntimeError as exc:
            status_code = HTTPStatus.SERVICE_UNAVAILABLE
            payload["disabledReason"] = str(exc)
        else:
            payload["webMounted"] = _can_mount_to_web(runtime.agent)
            payload["capabilityWarnings"] = runtime.capability_warnings
            payload["routingMode"] = runtime.routing_mode
            if not payload["webMounted"]:
                status_code = HTTPStatus.SERVICE_UNAVAILABLE
                payload["disabledReason"] = "Agent.to_web() is unavailable"
        return JSONResponse(payload, status_code=status_code)

    app.add_route("/web-runtime/health", health, methods=["GET"])


def _mount_local_test_ui(app, settings: Settings) -> None:
    try:
        runtime = build_runtime(settings)
    except RuntimeError as exc:
        print(f"[nexus-ai] local /web UI disabled: {exc}")
        return

    if runtime.capability_warnings:
        for warning in runtime.capability_warnings:
            print(f"[nexus-ai] capability warning: {warning}")

    agent = runtime.agent
    if not _can_mount_to_web(agent):
        print("[nexus-ai] local /web UI disabled: Agent.to_web() is unavailable")
        return

    app.mount("/", agent.to_web(deps=runtime.deps))


def _can_mount_to_web(agent) -> bool:
    return hasattr(agent, "to_web")


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

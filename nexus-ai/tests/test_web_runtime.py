import asyncio
import json

from starlette.applications import Starlette

from nexus_ai.settings import load_settings
from nexus_ai.web import _mount_local_runtime_status


async def _get(app: Starlette, path: str) -> tuple[int, dict[str, object]]:
    sent: list[dict[str, object]] = []
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": "GET",
        "scheme": "http",
        "path": path,
        "raw_path": path.encode(),
        "query_string": b"",
        "headers": [],
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
    }

    async def receive() -> dict[str, object]:
        return {"type": "http.request", "body": b"", "more_body": False}

    async def send(message: dict[str, object]) -> None:
        sent.append(message)

    await app(scope, receive, send)
    status = next(message["status"] for message in sent if message["type"] == "http.response.start")
    body = b"".join(message.get("body", b"") for message in sent if message["type"] == "http.response.body")
    return int(status), json.loads(body)


def test_web_runtime_health_reports_single_mode_without_secrets(tmp_path):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "secret-token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
            "NEXUS_AI_ORCHESTRATION_MODE": "single",
        }
    )
    app = Starlette()
    _mount_local_runtime_status(app, settings)

    status, body = asyncio.run(_get(app, "/web-runtime/health"))

    assert status == 200
    assert body["webMounted"] is True
    assert body["orchestrationMode"] == "single"
    assert body["singleAgentDeprecated"] is True
    assert body["recommendedMode"] == "multi"
    assert body["orchestratorMaxRevisions"] == 1
    assert body["workspaceId"] == "workspace"
    assert body["hasApiToken"] is True
    assert "secret-token" not in json.dumps(body)


def test_web_runtime_health_reports_multi_mode(tmp_path):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "secret-token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
            "NEXUS_AI_ORCHESTRATION_MODE": "multi",
        }
    )
    app = Starlette()
    _mount_local_runtime_status(app, settings)

    status, body = asyncio.run(_get(app, "/web-runtime/health"))

    assert status == 200
    assert body["orchestrationMode"] == "multi"
    assert body["singleAgentDeprecated"] is False
    assert body["recommendedMode"] == "multi"
    assert body["orchestratorMaxRevisions"] == 1


def test_web_runtime_health_reports_missing_config(tmp_path):
    settings = load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
        }
    )
    app = Starlette()
    _mount_local_runtime_status(app, settings)

    status, body = asyncio.run(_get(app, "/web-runtime/health"))

    assert status == 503
    assert body["webMounted"] is False
    assert body["hasApiToken"] is False
    assert "NEXUS_API_TOKEN" in body["disabledReason"]
    assert "NEXUS_WORKSPACE_ID" in body["disabledReason"]

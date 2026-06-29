import asyncio
import json
from types import SimpleNamespace

from nexus_ai.service import create_service_app
from nexus_ai.routing import RouteDecision
from nexus_ai.settings import load_settings
from nexus_ai.storage import SessionRepository, SQLiteStore
from starlette.responses import JSONResponse, StreamingResponse


def _settings(tmp_path):
    return load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "secret-token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
            "NEXUS_AI_SQLITE_PATH": str(tmp_path / "runtime" / "nexus_ai.sqlite3"),
        }
    )


def _seed_sessions(settings):
    store = SQLiteStore(settings.sqlite_path)
    store.initialize()
    sessions = SessionRepository(store)
    sessions.upsert(
        session_id="user-a-session",
        workspace_id="workspace",
        user_id="user-a",
        title="User A",
        ui_messages=[{"role": "user", "parts": [{"type": "text", "text": "Hello A"}]}],
    )
    sessions.upsert(
        session_id="user-b-session",
        workspace_id="workspace",
        user_id="user-b",
        title="User B",
        ui_messages=[{"role": "user", "parts": [{"type": "text", "text": "Hello B"}]}],
    )
    sessions.upsert(
        session_id="legacy-session",
        workspace_id="workspace",
        user_id="legacy-user",
        title="Legacy",
        ui_messages=[{"role": "user", "parts": [{"type": "text", "text": "Legacy"}]}],
    )


async def _request(app, method, path, *, user_id="user-a", body=None):
    sent = []
    raw_body = json.dumps(body or {}).encode("utf-8") if body is not None else b""
    headers = [
        (b"authorization", b"Bearer secret-token"),
    ]
    if user_id is not None:
        headers.append((b"x-nexus-user-id", user_id.encode("utf-8")))

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path,
        "raw_path": path.encode("utf-8"),
        "query_string": b"",
        "headers": headers,
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
    }

    async def receive():
        return {"type": "http.request", "body": raw_body, "more_body": False}

    async def send(message):
        sent.append(message)

    await app(scope, receive, send)
    status = next(message["status"] for message in sent if message["type"] == "http.response.start")
    response_body = b"".join(message.get("body", b"") for message in sent if message["type"] == "http.response.body")
    return int(status), json.loads(response_body or b"{}")


async def _request_stream(app, method, path, *, user_id="user-a", body=None):
    sent = []
    raw_body = json.dumps(body or {}).encode("utf-8") if body is not None else b""
    received = False
    headers = [
        (b"authorization", b"Bearer secret-token"),
    ]
    if user_id is not None:
        headers.append((b"x-nexus-user-id", user_id.encode("utf-8")))

    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "scheme": "http",
        "path": path,
        "raw_path": path.encode("utf-8"),
        "query_string": b"",
        "headers": headers,
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
    }

    async def receive():
        nonlocal received
        if not received:
            received = True
            return {"type": "http.request", "body": raw_body, "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message):
        sent.append(message)

    await app(scope, receive, send)
    status = next(message["status"] for message in sent if message["type"] == "http.response.start")
    response_body = b"".join(message.get("body", b"") for message in sent if message["type"] == "http.response.body")
    return int(status), response_body.decode("utf-8")


def test_service_lists_only_current_user_sessions(tmp_path):
    settings = _settings(tmp_path)
    _seed_sessions(settings)
    app = create_service_app(settings)

    status, body = asyncio.run(_request(app, "GET", "/agent-chat/workspaces/workspace/sessions", user_id="user-a"))

    assert status == 200
    assert [item["sessionId"] for item in body["data"]] == ["user-a-session"]


def test_service_get_and_delete_require_session_owner(tmp_path):
    settings = _settings(tmp_path)
    _seed_sessions(settings)
    app = create_service_app(settings)

    own_status, own_body = asyncio.run(
        _request(app, "GET", "/agent-chat/workspaces/workspace/sessions/user-a-session", user_id="user-a")
    )
    other_status, _ = asyncio.run(
        _request(app, "GET", "/agent-chat/workspaces/workspace/sessions/user-b-session", user_id="user-a")
    )
    legacy_status, _ = asyncio.run(
        _request(app, "GET", "/agent-chat/workspaces/workspace/sessions/legacy-session", user_id="user-a")
    )
    delete_other_status, _ = asyncio.run(
        _request(app, "DELETE", "/agent-chat/workspaces/workspace/sessions/user-b-session", user_id="user-a")
    )

    assert own_status == 200
    assert own_body["sessionId"] == "user-a-session"
    assert other_status == 404
    assert legacy_status == 404
    assert delete_other_status == 404


def test_service_requires_user_header_for_session_access(tmp_path):
    settings = _settings(tmp_path)
    _seed_sessions(settings)
    app = create_service_app(settings)

    status, body = asyncio.run(_request(app, "GET", "/agent-chat/workspaces/workspace/sessions", user_id=None))

    assert status == 401
    assert body["message"] == "Missing X-Nexus-User-ID"


def test_service_rejects_continue_chat_for_another_users_session(tmp_path):
    settings = _settings(tmp_path)
    _seed_sessions(settings)
    app = create_service_app(settings)

    status, body = asyncio.run(
        _request(
            app,
            "POST",
            "/agent-chat/ui/workspaces/workspace/sessions/user-b-session/chat/completions",
            user_id="user-a",
            body={
                "id": "user-b-session",
                "messages": [{"role": "user", "parts": [{"type": "text", "text": "Hello"}]}],
            },
        )
    )

    assert status == 404
    assert body["message"] == "Session not found"


def test_service_rejects_create_chat_with_another_users_session_id(tmp_path):
    settings = _settings(tmp_path)
    _seed_sessions(settings)
    app = create_service_app(settings)

    status, body = asyncio.run(
        _request(
            app,
            "POST",
            "/agent-chat/ui/workspaces/workspace/chat/completions",
            user_id="user-a",
            body={
                "id": "user-b-session",
                "messages": [{"role": "user", "parts": [{"type": "text", "text": "Hello"}]}],
            },
        )
    )

    assert status == 404
    assert body["message"] == "Session not found"


def test_service_hybrid_route_uses_direct_dispatch_for_simple_prompt(tmp_path, monkeypatch):
    settings = _settings(tmp_path)
    app = create_service_app(settings)
    captured = {}

    runtime = SimpleNamespace(
        agent=object(),
        direct_workspace_agent=object(),
        deps=SimpleNamespace(),
        capability_warnings=[],
        orchestrator=object(),
        routing_mode="hybrid",
        router=SimpleNamespace(
            decide=lambda prompt, payload: RouteDecision(
                route="direct_workspace",
                execution_path="direct_workspace",
                intent_class="general_simple",
                reason_codes=["simple_general_question"],
                confidence=0.92,
            )
        ),
    )

    monkeypatch.setattr("nexus_ai.service.build_runtime", lambda _settings: runtime)

    async def fake_dispatch_request(request, *, agent, conversation_id, deps, on_complete):
        captured["conversation_id"] = conversation_id
        captured["agent"] = agent
        captured["deps"] = deps
        await on_complete(object())

        async def body():
            yield 'data: {"type":"text-delta","delta":"hello"}\n\n'
            yield "data: [DONE]\n\n"

        return StreamingResponse(body(), media_type="text/event-stream")

    def fake_save_regular_session(**kwargs):
        captured["save_regular_session"] = kwargs

    monkeypatch.setattr("nexus_ai.service.VercelAIAdapter.dispatch_request", fake_dispatch_request)
    monkeypatch.setattr("nexus_ai.service.save_regular_session", fake_save_regular_session)

    status, body = asyncio.run(
        _request_stream(
            app,
            "POST",
            "/agent-chat/ui/workspaces/workspace/chat/completions",
            user_id="user-a",
            body={
                "messages": [{"role": "user", "parts": [{"type": "text", "text": "What is a milestone?"}]}],
            },
        )
    )

    assert status == 200
    assert '"type": "data-session"' in body
    assert '"type": "data-routing_decision"' in body
    assert '"route": "direct_workspace"' in body
    assert '"executionPath": "direct_workspace"' in body
    assert captured["conversation_id"]
    assert captured["agent"] is runtime.direct_workspace_agent
    assert captured["save_regular_session"]["routing_event"]["data"]["route"] == "direct_workspace"


def test_service_hybrid_route_uses_orchestrator_for_complex_prompt(tmp_path, monkeypatch):
    settings = _settings(tmp_path)
    app = create_service_app(settings)
    captured = {}

    runtime = SimpleNamespace(
        agent=object(),
        direct_workspace_agent=object(),
        deps=SimpleNamespace(),
        capability_warnings=[],
        orchestrator=object(),
        routing_mode="hybrid",
        router=SimpleNamespace(
            decide=lambda prompt, payload: RouteDecision(
                route="multi",
                execution_path="multi",
                intent_class="complex_analysis",
                reason_codes=["workspace_context", "complex_intent"],
                confidence=0.96,
                needs_workspace_data=True,
                needs_tools=True,
                needs_multi_step_reasoning=True,
            )
        ),
    )

    monkeypatch.setattr("nexus_ai.service.build_runtime", lambda _settings: runtime)

    async def fail_dispatch_request(*args, **kwargs):
        raise AssertionError("direct dispatch should not be used for multi route")

    def fake_dispatch_orchestrated_chat(**kwargs):
        captured["dispatch_orchestrated_chat"] = kwargs
        return JSONResponse({"ok": True})

    monkeypatch.setattr("nexus_ai.service.VercelAIAdapter.dispatch_request", fail_dispatch_request)
    monkeypatch.setattr("nexus_ai.service.dispatch_orchestrated_chat", fake_dispatch_orchestrated_chat)

    status, body = asyncio.run(
        _request(
            app,
            "POST",
            "/agent-chat/ui/workspaces/workspace/chat/completions",
            user_id="user-a",
            body={
                "messages": [
                    {
                        "role": "user",
                        "parts": [
                            {
                                "type": "text",
                                "text": "Phân tích tiến độ project marketing và đề xuất phân bổ lại nguồn lực",
                            }
                        ],
                    }
                ],
            },
        )
    )

    assert status == 200
    assert body["ok"] is True
    assert captured["dispatch_orchestrated_chat"]["routing_event"]["data"]["route"] == "multi"
    assert captured["dispatch_orchestrated_chat"]["routing_event"]["data"]["executionPath"] == "multi"
    assert captured["dispatch_orchestrated_chat"]["user_id"] == "user-a"

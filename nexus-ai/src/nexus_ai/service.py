from __future__ import annotations

import json
import inspect
import uuid
from http import HTTPStatus
from typing import Any

from pydantic_ai.ui.vercel_ai import VercelAIAdapter
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, Response
from starlette.routing import Route

from nexus_ai.agent import build_runtime
from nexus_ai.rag.routes import rag_routes
from nexus_ai.rag.test_api import create_rag_test_app
from nexus_ai.routing import routing_event_payload
from nexus_ai.service_auth import resolve_request_settings, resolve_workspace_id, require_session_user
from nexus_ai.service_persistence import (
    message_count,
    save_regular_session,
)
from nexus_ai.service_transport import dispatch_orchestrated_chat, prepend_stream_events
from nexus_ai.settings import Settings, load_settings
from nexus_ai.storage import SessionRepository, SQLiteStore


def create_service_app(base_settings: Settings | None = None) -> Starlette:
    base_settings = base_settings or load_settings()
    store = SQLiteStore(base_settings.sqlite_path)
    store.initialize()
    sessions = SessionRepository(store)

    async def health(_request: Request) -> Response:
        return JSONResponse({"ok": True})

    async def post_chat(request: Request) -> Response:
        workspace_id = resolve_workspace_id(request, base_settings.workspace_id)
        if not workspace_id:
            return JSONResponse({"message": "Workspace ID required"}, status_code=HTTPStatus.BAD_REQUEST)

        user_id_or_response = require_session_user(request)
        if isinstance(user_id_or_response, Response):
            return user_id_or_response
        user_id = user_id_or_response

        body = await request.body()
        path_session_id = request.path_params.get("session_id")
        session_id = path_session_id or _extract_session_id(body) or str(uuid.uuid4())

        if path_session_id and sessions.get(workspace_id, path_session_id, user_id) is None:
            return JSONResponse({"message": "Session not found"}, status_code=HTTPStatus.NOT_FOUND)
        if not path_session_id and sessions.exists(workspace_id, session_id) and sessions.get(workspace_id, session_id, user_id) is None:
            return JSONResponse({"message": "Session not found"}, status_code=HTTPStatus.NOT_FOUND)

        request_settings_or_response = resolve_request_settings(base_settings, request, workspace_id, session_id)
        if isinstance(request_settings_or_response, Response):
            return request_settings_or_response

        runtime = build_runtime(request_settings_or_response)
        request_payload = _json_body(body)
        user_prompt = _extract_user_prompt(request_payload)
        routing_event = None
        route = "multi" if runtime.orchestrator is not None and runtime.routing_mode == "multi" else "direct_workspace"
        execution_path = route
        if runtime.routing_mode == "hybrid" and runtime.router is not None:
            decision = runtime.router.decide(user_prompt, request_payload)
            if inspect.isawaitable(decision):
                decision = await decision
            route = decision.route
            execution_path = decision.execution_path
            routing_event = routing_event_payload(decision)

        if route == "multi" and runtime.orchestrator is not None:
            return dispatch_orchestrated_chat(
                runtime=runtime,
                deps=runtime.deps,
                request_payload=request_payload,
                sessions=sessions,
                workspace_id=workspace_id,
                session_id=session_id,
                user_id=user_id,
                routing_event=routing_event,
            )

        agent = runtime.direct_workspace_agent or runtime.agent

        async def save_session(result: Any) -> None:
            save_regular_session(
                sessions=sessions,
                session_id=session_id,
                workspace_id=workspace_id,
                user_id=user_id,
                result=result,
                routing_event=routing_event,
            )

        response = await VercelAIAdapter.dispatch_request(
            request,
            agent=agent,
            conversation_id=session_id,
            deps=runtime.deps,
            on_complete=save_session,
        )
        events = [{"type": "data-session", "data": {"sessionId": session_id}}]
        if routing_event is not None:
            events.append(routing_event)
        return prepend_stream_events(response, events)

    async def list_sessions(request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        user_id_or_response = require_session_user(request)
        if isinstance(user_id_or_response, Response):
            return user_id_or_response
        user_id = user_id_or_response
        data = [
            {
                "sessionId": item.session_id,
                "title": item.title,
                "updatedAt": item.updated_at,
                "messageCount": message_count(item.ui_messages),
                "hasPendingApproval": False,
            }
            for item in sessions.list(workspace_id, user_id)
        ]
        return JSONResponse({"success": True, "data": data})

    async def get_session(request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        session_id = request.path_params["session_id"]
        user_id_or_response = require_session_user(request)
        if isinstance(user_id_or_response, Response):
            return user_id_or_response
        record = sessions.get(workspace_id, session_id, user_id_or_response)
        if record is None:
            return JSONResponse({"message": "Session not found"}, status_code=HTTPStatus.NOT_FOUND)
        return JSONResponse(
            {
                "sessionId": record.session_id,
                "title": record.title,
                "items": [],
                "transcript": record.ui_messages,
                "uiMessages": record.ui_messages,
                "updatedAt": record.updated_at,
                "activeApprovalItemId": None,
            }
        )

    async def delete_session(request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        session_id = request.path_params["session_id"]
        user_id_or_response = require_session_user(request)
        if isinstance(user_id_or_response, Response):
            return user_id_or_response
        deleted = sessions.delete(workspace_id, session_id, user_id_or_response)
        if not deleted:
            return JSONResponse({"message": "Session not found"}, status_code=HTTPStatus.NOT_FOUND)
        return JSONResponse({"success": True, "sessionId": session_id})

    routes = [
        Route("/agent-chat/health", health, methods=["GET"]),
        Route("/agent-chat/ui/workspaces/{workspace_id}/chat/completions", post_chat, methods=["POST"]),
        Route(
            "/agent-chat/ui/workspaces/{workspace_id}/sessions/{session_id}/chat/completions",
            post_chat,
            methods=["POST"],
        ),
        Route("/agent-chat/workspaces/{workspace_id}/sessions", list_sessions, methods=["GET"]),
        Route("/agent-chat/workspaces/{workspace_id}/sessions/{session_id}", get_session, methods=["GET"]),
        Route("/agent-chat/workspaces/{workspace_id}/sessions/{session_id}", delete_session, methods=["DELETE"]),
        Route("/api/health", health, methods=["GET"]),
        Route("/api/chat", post_chat, methods=["POST"]),
    ]
    routes.extend(rag_routes(base_settings))
    app = Starlette(routes=routes)
    app.mount("/rag/test", create_rag_test_app(base_settings))
    return app


def _json_body(body: bytes) -> dict[str, Any]:
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _extract_session_id(body: bytes) -> str | None:
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    value = payload.get("id")
    return value if isinstance(value, str) and value else None


def _extract_user_prompt(payload: dict[str, Any]) -> str:
    messages = payload.get("messages")
    if not isinstance(messages, list):
        return ""
    for message in reversed(messages):
        if not isinstance(message, dict) or message.get("role") != "user":
            continue
        parts = message.get("parts")
        if not isinstance(parts, list):
            continue
        text = "".join(
            part.get("text", "")
            for part in parts
            if isinstance(part, dict) and part.get("type") == "text" and isinstance(part.get("text"), str)
        ).strip()
        if text:
            return text
    return ""

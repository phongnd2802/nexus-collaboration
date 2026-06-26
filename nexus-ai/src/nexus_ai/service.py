from __future__ import annotations

import json
import uuid
from collections.abc import AsyncIterator
from http import HTTPStatus
from typing import Any

from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse, Response, StreamingResponse
from starlette.routing import Route

from pydantic_ai.ui.vercel_ai import VercelAIAdapter

from nexus_ai.agent import build_runtime
from nexus_ai.rag.routes import rag_routes
from nexus_ai.rag.test_api import create_rag_test_app
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
        workspace_id = request.path_params.get("workspace_id") or _header(request, "x-nexus-workspace-id") or base_settings.workspace_id
        if not workspace_id:
            return JSONResponse({"message": "Workspace ID required"}, status_code=HTTPStatus.BAD_REQUEST)
        session_id = request.path_params.get("session_id") or _extract_session_id(await request.body())
        if not session_id:
            session_id = str(uuid.uuid4())

        request_settings_or_response = _settings_from_request(base_settings, request, workspace_id, session_id)
        if isinstance(request_settings_or_response, Response):
            return request_settings_or_response

        request_settings = request_settings_or_response
        runtime = build_runtime(request_settings)
        deps = runtime.deps

        async def save_session(result: Any) -> None:
            messages = _json_list(result.all_messages_json())
            ui_messages = [_model_dump(message) for message in VercelAIAdapter.dump_messages(result.all_messages())]
            title = _session_title(ui_messages)
            sessions.upsert(
                session_id=session_id,
                workspace_id=workspace_id,
                user_id=_header(request, "x-nexus-user-id"),
                title=title,
                metadata={},
                messages=messages,
                ui_messages=ui_messages,
            )

        response = await VercelAIAdapter.dispatch_request(
            request,
            agent=runtime.agent,
            conversation_id=session_id,
            deps=deps,
            on_complete=save_session,
        )
        return _prepend_session_event(response, session_id)

    async def list_sessions(request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        auth = _require_auth(request)
        if auth is not None:
            return auth
        data = [
            {
                "sessionId": item.session_id,
                "title": item.title,
                "updatedAt": item.updated_at,
                "messageCount": _message_count(item.ui_messages),
                "hasPendingApproval": False,
            }
            for item in sessions.list(workspace_id)
        ]
        return JSONResponse({"success": True, "data": data})

    async def get_session(request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        session_id = request.path_params["session_id"]
        auth = _require_auth(request)
        if auth is not None:
            return auth
        record = sessions.get(workspace_id, session_id)
        if record is None:
            return JSONResponse({"message": "Session not found"}, status_code=HTTPStatus.NOT_FOUND)
        return JSONResponse(
            {
                "sessionId": record.session_id,
                "title": record.title,
                "items": [],
                "uiMessages": record.ui_messages,
                "updatedAt": record.updated_at,
                "activeApprovalItemId": None,
            }
        )

    async def delete_session(request: Request) -> Response:
        workspace_id = request.path_params["workspace_id"]
        session_id = request.path_params["session_id"]
        auth = _require_auth(request)
        if auth is not None:
            return auth
        deleted = sessions.delete(workspace_id, session_id)
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


def _settings_from_request(
    base_settings: Settings,
    request: Request,
    workspace_id: str,
    session_id: str,
) -> Settings | Response:
    token = _bearer_token(_header(request, "authorization"))
    if not token:
        #return JSONResponse({"message": "Missing Authorization bearer token"}, status_code=HTTPStatus.UNAUTHORIZED)
        token = base_settings.api_token
    request_id = _header(request, "x-nexus-request-id") or session_id
    return base_settings.for_request(api_token=token, workspace_id=workspace_id, request_id=request_id)


def _require_auth(request: Request) -> Response | None:
    if not _bearer_token(_header(request, "authorization")):
        return JSONResponse({"message": "Missing Authorization bearer token"}, status_code=HTTPStatus.UNAUTHORIZED)
    return None


def _header(request: Request, name: str) -> str | None:
    value = request.headers.get(name)
    return value or None


def _bearer_token(value: str | None) -> str | None:
    if not value:
        return None
    parts = value.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1]


def _extract_session_id(body: bytes) -> str | None:
    try:
        payload = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return None
    value = payload.get("id")
    return value if isinstance(value, str) and value else None


def _prepend_session_event(response: Response, session_id: str) -> Response:
    if not isinstance(response, StreamingResponse) or response.status_code >= 400:
        return response

    async def body() -> AsyncIterator[str | bytes]:
        yield f'data: {json.dumps({"type": "data-session", "data": {"sessionId": session_id}})}\n\n'
        async for chunk in response.body_iterator:
            yield chunk

    return StreamingResponse(
        body(),
        status_code=response.status_code,
        media_type=response.media_type,
        headers=dict(response.headers),
        background=response.background,
    )


def _json_list(raw: bytes) -> list[dict[str, Any]]:
    try:
        value = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return []
    return value if isinstance(value, list) else []


def _model_dump(value: Any) -> dict[str, Any]:
    if hasattr(value, "model_dump"):
        return value.model_dump(mode="json", by_alias=True, exclude_none=True)
    if isinstance(value, dict):
        return value
    return {}


def _session_title(ui_messages: list[dict[str, Any]]) -> str:
    for message in ui_messages:
        if message.get("role") != "user":
            continue
        for part in message.get("parts", []):
            text = part.get("text") if isinstance(part, dict) else None
            if isinstance(text, str) and text.strip():
                title = text.strip().replace("\n", " ")
                return title[:60]
    return "New conversation"


def _message_count(ui_messages: list[dict[str, Any]]) -> int:
    return sum(1 for message in ui_messages if message.get("role") in {"user", "assistant"})

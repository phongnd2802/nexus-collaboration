from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

from nexus_ai_service.agent.workspace_agent import WorkspaceAgent
from nexus_ai_service.agent.deps import WorkspaceAgentDeps
from nexus_ai_service.security.auth_context import AuthContext, auth_context
from nexus_ai_service.streaming.sse import encode_done, encode_sse, event_stream

router = APIRouter(prefix="/agent-chat")


class ChatCompletionRequest(BaseModel):
    trigger: str | None = None
    id: str | None = None
    messages: list[dict[str, Any]] = []
    model: str | None = None


class ApprovalDecisionRequest(BaseModel):
    decision: str
    idempotency_key: str
    message: str | None = None


@router.post("/ui/workspaces/{workspace_id}/chat/completions")
async def create_chat_completion(
    request: Request,
    body: ChatCompletionRequest,
    ctx: AuthContext = Depends(auth_context),
) -> StreamingResponse:
    return await _stream_chat(request, body, ctx, session_id=None)


@router.post("/ui/workspaces/{workspace_id}/sessions/{session_id}/chat/completions")
async def continue_chat_completion(
    request: Request,
    body: ChatCompletionRequest,
    session_id: str,
    ctx: AuthContext = Depends(auth_context),
) -> StreamingResponse:
    return await _stream_chat(request, body, ctx, session_id=session_id)


@router.get("/workspaces/{workspace_id}/sessions")
async def list_sessions(request: Request, ctx: AuthContext = Depends(auth_context)) -> dict[str, object]:
    store = request.app.state.session_store
    sessions = await store.list_sessions(ctx.workspace_id)
    return {
        "data": [
            {
                "sessionId": session.id,
                "title": session.title or "New chat",
                "updatedAt": session.updated_at,
                "messageCount": len(await store.messages_for_session(session.id)),
                "hasPendingApproval": False,
            }
            for session in sessions
        ]
    }


@router.get("/workspaces/{workspace_id}/sessions/{session_id}")
async def get_session(request: Request, session_id: str, ctx: AuthContext = Depends(auth_context)) -> dict[str, Any]:
    try:
        return await request.app.state.session_store.snapshot(ctx.workspace_id, session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Session not found") from exc


@router.delete("/workspaces/{workspace_id}/sessions/{session_id}")
async def delete_session(request: Request, session_id: str, ctx: AuthContext = Depends(auth_context)) -> dict[str, object]:
    try:
        await request.app.state.session_store.delete_session(ctx.workspace_id, session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Session not found") from exc
    return {"success": True, "sessionId": session_id}


@router.get("/workspaces/{workspace_id}/sessions/{session_id}/events")
async def replay_session_events(
    request: Request,
    session_id: str,
    since_event_id: str | None = Query(default=None),
    ctx: AuthContext = Depends(auth_context),
) -> StreamingResponse:
    try:
        await request.app.state.session_store.get_session(ctx.workspace_id, session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Session not found") from exc
    events = await request.app.state.session_store.events_for_session(session_id, since_event_id)
    return StreamingResponse(event_stream(events, include_done=True), media_type="text/event-stream")


@router.post("/workspaces/{workspace_id}/sessions/{session_id}/approvals/{approval_id}/decision")
async def decide_approval(
    request: Request,
    session_id: str,
    approval_id: str,
    body: ApprovalDecisionRequest,
    ctx: AuthContext = Depends(auth_context),
) -> JSONResponse:
    if body.decision not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid approval decision")
    try:
        record = await request.app.state.session_store.upsert_approval_decision(
            session_id=session_id,
            workspace_id=ctx.workspace_id,
            approval_id=approval_id,
            user_id=ctx.user_id,
            decision=body.decision,
            idempotency_key=body.idempotency_key,
            message=body.message,
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail="Session not found") from exc
    return JSONResponse(
        status_code=202,
        content={
            "accepted": True,
            "workspace_id": record["workspace_id"],
            "session_id": record["session_id"],
            "approval_id": record["approval_id"],
            "decision": body.decision,
            "idempotency_key": body.idempotency_key,
            "status": record["status"],
        },
    )


async def _stream_chat(
    request: Request,
    body: ChatCompletionRequest,
    ctx: AuthContext,
    session_id: str | None,
) -> StreamingResponse:
    store = request.app.state.session_store
    session = await store.get_or_create_session(ctx.workspace_id, ctx.user_id, session_id)
    user_text = _last_user_text(body)
    await store.add_message(session, "user", user_text, user_id=ctx.user_id, parts=body.messages)
    history = [
        {"role": message.role, "content": message.content or ""}
        for message in await store.messages_for_session(session.id)
        if message.role in {"user", "assistant"} and message.content
    ]
    settings = request.app.state.settings
    deps = WorkspaceAgentDeps(
        workspace_id=ctx.workspace_id,
        user_id=ctx.user_id,
        request_id=ctx.request_id,
        authorization=ctx.authorization,
        session_id=session.id,
    )
    agent = WorkspaceAgent(
        model=body.model or settings.nexus_ai_model,
        settings=settings,
        services={
            "retrieval_service": request.app.state.retrieval_service,
            "memory_service": request.app.state.memory_service,
            "tracer": getattr(request.app.state, "tracer", None),
        },
        openrouter_api_key=settings.openrouter_api_key,
    )

    async def generate():
        completed_text = ""
        async for event in agent.stream(deps, user_text, history):
            await store.add_event(session.id, event)
            if event.event_type == "message.completed":
                completed_text = str(event.payload.get("content", ""))
            yield encode_sse(event)
        if completed_text:
            await store.add_message(
                session,
                "assistant",
                completed_text,
                model=body.model or request.app.state.settings.nexus_ai_model,
                metadata={"runtime": "openrouter" if request.app.state.settings.openrouter_api_key else "deterministic-dev"},
            )
        yield encode_done()

    return StreamingResponse(generate(), media_type="text/event-stream")


def _last_user_text(body: ChatCompletionRequest) -> str:
    for message in reversed(body.messages):
        if message.get("role") != "user":
            continue
        parts = message.get("parts")
        if isinstance(parts, list):
            text_parts = [part.get("text", "") for part in parts if isinstance(part, dict) and part.get("type") == "text"]
            if text_parts:
                return "\n".join(text_parts)
        content = message.get("content")
        if isinstance(content, str):
            return content
    return ""

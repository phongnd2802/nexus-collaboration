from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response

from app.config import settings
from app.orchestrator import orchestrator
from app.schemas import ErrorDetail

app = FastAPI(title="Nexus AI", version="0.2.0")


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if settings.nexus_ai_api_key and x_api_key != settings.nexus_ai_api_key:
        raise HTTPException(status_code=401, detail="Invalid Nexus AI API key")


def openai_error(message: str, status_code: int = 400, param: str | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={"error": ErrorDetail(message=message, param=param).model_dump()},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else "Request failed"
    return openai_error(detail, exc.status_code)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    first_error = exc.errors()[0] if exc.errors() else {}
    location = ".".join(str(item) for item in first_error.get("loc", []) if item != "body")
    message = first_error.get("msg", "Invalid request body")
    return openai_error(message, 400, location or None)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "model": settings.nexus_ai_model}


@app.get("/v1/models", dependencies=[Depends(require_api_key)])
async def models() -> dict[str, Any]:
    return {
        "object": "list",
        "data": [{"id": settings.nexus_ai_model, "object": "model", "owned_by": "openrouter"}],
    }


@app.post("/v1/ui/chat/completions", dependencies=[Depends(require_api_key)])
async def ui_chat_completions(
    request: Request,
    x_user_id: str | None = Header(default=None),
    x_workspace_id: str | None = Header(default=None),
) -> Response:
    if not x_user_id or not x_workspace_id:
        raise HTTPException(status_code=400, detail="x-user-id and x-workspace-id are required")
    raw = await request.json()
    model = raw.get("model") if isinstance(raw.get("model"), str) else None
    return await orchestrator.dispatch_ui_request(
        request=request,
        user_id=x_user_id,
        workspace_id=x_workspace_id,
        session_id=None,
        model_name=model,
    )


@app.post("/v1/ui/sessions/{session_id}/chat/completions", dependencies=[Depends(require_api_key)])
async def ui_session_chat_completions(
    session_id: str,
    request: Request,
    x_user_id: str | None = Header(default=None),
    x_workspace_id: str | None = Header(default=None),
) -> Response:
    if not x_user_id or not x_workspace_id:
        raise HTTPException(status_code=400, detail="x-user-id and x-workspace-id are required")
    raw = await request.json()
    model = raw.get("model") if isinstance(raw.get("model"), str) else None
    return await orchestrator.dispatch_ui_request(
        request=request,
        user_id=x_user_id,
        workspace_id=x_workspace_id,
        session_id=session_id,
        model_name=model,
    )


@app.get("/v1/sessions/{session_id}", dependencies=[Depends(require_api_key)])
async def session_snapshot(
    session_id: str,
    x_user_id: str | None = Header(default=None),
    x_workspace_id: str | None = Header(default=None),
) -> dict[str, Any]:
    if not x_user_id or not x_workspace_id:
        raise HTTPException(status_code=400, detail="x-user-id and x-workspace-id are required")
    return orchestrator.get_session_snapshot(session_id, x_user_id, x_workspace_id).model_dump()


@app.get("/v1/sessions", dependencies=[Depends(require_api_key)])
async def list_sessions(
    x_user_id: str | None = Header(default=None),
    x_workspace_id: str | None = Header(default=None),
) -> dict[str, Any]:
    if not x_user_id or not x_workspace_id:
        raise HTTPException(status_code=400, detail="x-user-id and x-workspace-id are required")
    return {
        "object": "list",
        "data": [item.model_dump() for item in orchestrator.list_sessions(x_user_id, x_workspace_id)],
    }


@app.delete("/v1/sessions/{session_id}", dependencies=[Depends(require_api_key)])
async def delete_session(
    session_id: str,
    x_user_id: str | None = Header(default=None),
    x_workspace_id: str | None = Header(default=None),
) -> dict[str, Any]:
    if not x_user_id or not x_workspace_id:
        raise HTTPException(status_code=400, detail="x-user-id and x-workspace-id are required")
    return orchestrator.delete_session(session_id, x_user_id, x_workspace_id)


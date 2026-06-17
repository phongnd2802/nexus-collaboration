import json
import time
import uuid
from collections.abc import AsyncIterator
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic_ai import Agent
from pydantic_ai.models.openrouter import OpenRouterModel
from pydantic_ai.providers.openrouter import OpenRouterProvider

from app.config import settings
from app.schemas import ChatCompletionRequest, ErrorDetail

app = FastAPI(title="Nexus AI", version="0.1.0")


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


def build_agent(model_name: str) -> Agent[None, str]:
    provider = OpenRouterProvider(
        api_key=settings.openrouter_api_key or None,
        app_url=settings.openrouter_app_url,
        app_title=settings.openrouter_app_title,
    )
    model = OpenRouterModel(model_name, provider=provider)
    return Agent(
        model,
        output_type=str,
        instructions=(
            "You are Nexus AI, a helpful assistant for the Nexus collaboration workspace. "
            "Answer clearly and concisely. In this phase you must only answer with text; "
            "do not claim to execute actions or use Nexus tools."
        ),
    )


def build_user_prompt(request: ChatCompletionRequest) -> str:
    if not request.messages:
        raise HTTPException(status_code=400, detail="messages must contain at least one item")

    if request.tools or request.tool_choice:
        raise HTTPException(status_code=400, detail="tools and tool_choice are not supported in this phase")

    for index, message in enumerate(request.messages):
        if not isinstance(message.content, str):
            raise HTTPException(status_code=400, detail=f"messages[{index}].content must be a text string")

    last_user_index = next(
        (index for index in range(len(request.messages) - 1, -1, -1) if request.messages[index].role == "user"),
        None,
    )
    if last_user_index is None:
        raise HTTPException(status_code=400, detail="messages must include a user message")

    transcript = [
        f"{message.role}: {message.content}"
        for index, message in enumerate(request.messages)
        if index != last_user_index and message.role in {"system", "developer", "user", "assistant"}
    ]
    if not transcript:
        return str(request.messages[last_user_index].content)

    return (
        "Conversation so far:\n"
        + "\n".join(transcript)
        + "\n\nRespond to the latest user message:\n"
        + str(request.messages[last_user_index].content)
    )


def model_settings(request: ChatCompletionRequest) -> dict[str, Any]:
    settings_map: dict[str, Any] = {}
    if request.temperature is not None:
        settings_map["temperature"] = request.temperature
    if request.max_tokens is not None:
        settings_map["max_tokens"] = request.max_tokens
    return settings_map


def completion_chunk(
    completion_id: str,
    model: str,
    content: str | None = None,
    finish_reason: str | None = None,
) -> str:
    delta: dict[str, str] = {}
    if content is not None:
        delta["content"] = content
    payload = {
        "id": completion_id,
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": model,
        "choices": [{"index": 0, "delta": delta, "finish_reason": finish_reason}],
    }
    return f"data: {json.dumps(payload, separators=(',', ':'))}\n\n"


@app.get("/health")
async def health() -> dict[str, Any]:
    return {"status": "ok", "model": settings.nexus_ai_model}


@app.get("/v1/models", dependencies=[Depends(require_api_key)])
async def models() -> dict[str, Any]:
    return {
        "object": "list",
        "data": [{"id": settings.nexus_ai_model, "object": "model", "owned_by": "openrouter"}],
    }


@app.post("/v1/chat/completions", dependencies=[Depends(require_api_key)])
async def chat_completions(request: ChatCompletionRequest) -> Response:
    model_name = request.model or settings.nexus_ai_model
    user_prompt = build_user_prompt(request)
    run_settings = model_settings(request)
    agent = build_agent(model_name)
    completion_id = f"chatcmpl-{uuid.uuid4().hex}"

    if request.stream:
        async def event_stream() -> AsyncIterator[str]:
            yield completion_chunk(completion_id, model_name, content="")
            async with agent.run_stream(user_prompt, model_settings=run_settings or None) as result:
                async for delta in result.stream_text(delta=True):
                    if delta:
                        yield completion_chunk(completion_id, model_name, content=delta)
            yield completion_chunk(completion_id, model_name, finish_reason="stop")
            yield "data: [DONE]\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    result = await agent.run(user_prompt, model_settings=run_settings or None)
    output = str(result.output)
    return JSONResponse(
        {
            "id": completion_id,
            "object": "chat.completion",
            "created": int(time.time()),
            "model": model_name,
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": output},
                    "finish_reason": "stop",
                }
            ],
            "usage": {
                "prompt_tokens": None,
                "completion_tokens": None,
                "total_tokens": None,
            },
        }
    )

import json
import time
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic_ai import DeferredToolRequests, DeferredToolResults, ToolDenied
from pydantic_ai.messages import FunctionToolCallEvent, FunctionToolResultEvent, PartDeltaEvent
from pydantic_ai.run import AgentRunResultEvent

from app.agent import AgentDeps, build_agent_with_capture
from app.backend_client import NexusBackendClient
from app.config import settings
from app.schemas import ChatCompletionRequest, ErrorDetail, ResumeRequest
from app.stores import RunState, run_store, session_store

app = FastAPI(title="Nexus AI", version="0.2.0")


@dataclass
class CompletionAccumulator:
    content: str = ""
    session_id: str | None = None
    run_id: str | None = None
    finish_reason: str = "stop"


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


def latest_user_prompt(request: ChatCompletionRequest) -> str:
    if not request.messages:
        raise HTTPException(status_code=400, detail="messages must contain at least one item")

    if request.tools or request.tool_choice:
        raise HTTPException(status_code=400, detail="Client-supplied tools are not supported")

    for index, message in enumerate(request.messages):
        if not isinstance(message.content, str):
            raise HTTPException(status_code=400, detail=f"messages[{index}].content must be a text string")

    for message in reversed(request.messages):
        if message.role == "user":
            return str(message.content)
    raise HTTPException(status_code=400, detail="messages must include a user message")


def model_settings(request: ChatCompletionRequest) -> dict[str, Any]:
    settings_map: dict[str, Any] = {}
    if request.temperature is not None:
        settings_map["temperature"] = request.temperature
    if request.max_tokens is not None:
        settings_map["max_tokens"] = request.max_tokens
    return settings_map


def metadata_value(request: ChatCompletionRequest, key: str) -> str | None:
    value = (request.metadata or {}).get(key)
    return str(value) if value else None


def sse(payload: dict[str, Any]) -> str:
    return f"data: {json.dumps(payload, separators=(',', ':'), default=str)}\n\n"


def openai_chunk(
    completion_id: str,
    model: str,
    event_type: str,
    session_id: str,
    run_id: str,
    content: str | None = None,
    finish_reason: str | None = None,
    extra: dict[str, Any] | None = None,
) -> str:
    delta: dict[str, str] = {}
    if content is not None:
        delta["content"] = content
    payload = {
        "id": completion_id,
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": model,
        "type": event_type,
        "session_id": session_id,
        "run_id": run_id,
        "choices": [{"index": 0, "delta": delta, "finish_reason": finish_reason}],
    }
    if extra:
        payload.update(extra)
    if event_type == "text_delta" and content is not None:
        payload["delta"] = content
    return sse(payload)


def tool_part_payload(part: Any) -> dict[str, Any]:
    args = part.args_as_dict() if hasattr(part, "args_as_dict") else getattr(part, "args", None)
    return {
        "tool_call_id": getattr(part, "tool_call_id", None),
        "tool_name": getattr(part, "tool_name", None),
        "args": args,
    }


def normalized_text_deltas(first_raw_delta: str | None, current_delta: str, first_text_emitted: bool) -> list[str]:
    if first_text_emitted or not first_raw_delta:
        return [current_delta]
    if current_delta.startswith(first_raw_delta):
        return [current_delta]
    return [first_raw_delta, current_delta]


def parse_chunk_payload(chunk: str) -> dict[str, Any] | None:
    if not chunk.startswith("data: ") or "[DONE]" in chunk:
        return None
    return json.loads(chunk.removeprefix("data: ").strip())


def accumulate_chunk(accumulator: CompletionAccumulator, chunk: str) -> None:
    payload = parse_chunk_payload(chunk)
    if payload is None:
        return

    accumulator.session_id = payload.get("session_id") or accumulator.session_id
    accumulator.run_id = payload.get("run_id") or accumulator.run_id

    choices = payload.get("choices", [])
    if choices:
        choice = choices[0]
        accumulator.finish_reason = choice.get("finish_reason") or accumulator.finish_reason
        delta = choice.get("delta", {})
        accumulator.content += delta.get("content", "")


def runtime_error_message(error: Exception) -> str:
    if isinstance(error, HTTPException):
        detail = str(error.detail)
        if error.status_code == 401 and "internal token" in detail.lower():
            return "Nexus AI cannot access Nexus internal APIs. Check NEXUS_INTERNAL_API_TOKEN in nexus-ai and backend."
        return detail
    return "Nexus AI could not complete that request."


def approval_events(
    completion_id: str,
    model: str,
    session_id: str,
    run: RunState,
    output: DeferredToolRequests,
) -> list[str]:
    events: list[str] = []
    for approval in output.approvals:
        payload = tool_part_payload(approval)
        tool_call_id = str(payload["tool_call_id"])
        run.pending_tool_calls[tool_call_id] = {
            "tool_name": payload["tool_name"],
            "args": payload["args"],
        }
        events.append(
            openai_chunk(
                completion_id,
                model,
                "approval_required",
                session_id,
                run.run_id,
                finish_reason="tool_calls",
                extra={
                    "tool_call_id": tool_call_id,
                    "tool_name": payload["tool_name"],
                    "args": payload["args"],
                    "summary": f"Approve {payload['tool_name']}?",
                },
            )
        )
    return events


async def stream_agent_run(
    *,
    request: ChatCompletionRequest,
    session_id: str | None,
    deferred_tool_results: DeferredToolResults | None = None,
    resume_run: RunState | None = None,
) -> AsyncIterator[str]:
    model_name = request.model or settings.nexus_ai_model
    completion_id = f"chatcmpl-{uuid.uuid4().hex}"
    user_id = metadata_value(request, "user_id")
    workspace_id = metadata_value(request, "workspace_id")
    if not user_id or not workspace_id:
        raise HTTPException(status_code=400, detail="metadata.user_id and metadata.workspace_id are required")

    session = session_store.get_or_create(user_id, workspace_id, session_id)
    run = resume_run or run_store.create(session)
    user_prompt = "Continue after tool approval." if deferred_tool_results else latest_user_prompt(request)
    run_settings = model_settings(request)
    message_history = run.messages if deferred_tool_results else session.messages
    text = ""

    yield openai_chunk(
        completion_id,
        model_name,
        "run_started" if session_id else "session_started",
        session.session_id,
        run.run_id,
        content="",
    )

    try:
        agent, provider_http_client, capture_state = build_agent_with_capture(model_name, completion_id)
        async with provider_http_client:
            async with NexusBackendClient(user_id, workspace_id) as backend:
                deps = AgentDeps(user_id=user_id, workspace_id=workspace_id, backend=backend)
                first_text_emitted = False
                async with agent.run_stream_events(
                    user_prompt,
                    deps=deps,
                    message_history=message_history or None,
                    deferred_tool_results=deferred_tool_results,
                    model_settings=run_settings or None,
                ) as stream:
                    async for event in stream:
                        if isinstance(event, PartDeltaEvent) and getattr(event.delta, "part_delta_kind", None) == "text":
                            delta = event.delta.content_delta
                            for text_delta in normalized_text_deltas(capture_state.first_text_delta, delta, first_text_emitted):
                                text += text_delta
                                yield openai_chunk(
                                    completion_id,
                                    model_name,
                                    "text_delta",
                                    session.session_id,
                                    run.run_id,
                                    content=text_delta,
                                )
                                first_text_emitted = True
                        elif isinstance(event, FunctionToolCallEvent):
                            payload = tool_part_payload(event.part)
                            yield openai_chunk(
                                completion_id,
                                model_name,
                                "tool_call",
                                session.session_id,
                                run.run_id,
                                extra=payload,
                            )
                        elif isinstance(event, FunctionToolResultEvent):
                            part = event.part
                            yield openai_chunk(
                                completion_id,
                                model_name,
                                "tool_result",
                                session.session_id,
                                run.run_id,
                                extra={
                                    "tool_call_id": getattr(part, "tool_call_id", None),
                                    "tool_name": getattr(part, "tool_name", None),
                                },
                            )
                        elif isinstance(event, AgentRunResultEvent):
                            output = event.result.output
                            run.messages = event.result.all_messages()
                            session_store.save_messages(session.session_id, run.messages)
                            if isinstance(output, DeferredToolRequests):
                                for approval_event in approval_events(completion_id, model_name, session.session_id, run, output):
                                    yield approval_event
                                run_store.save(run)
                                yield openai_chunk(
                                    completion_id,
                                    model_name,
                                    "done",
                                    session.session_id,
                                    run.run_id,
                                    finish_reason="tool_calls",
                                )
                                yield "data: [DONE]\n\n"
                                return
                            if not text:
                                text = str(output)
                                yield openai_chunk(completion_id, model_name, "text_delta", session.session_id, run.run_id, content=text)
    except Exception as error:
        message = runtime_error_message(error)
        yield openai_chunk(
            completion_id,
            model_name,
            "error",
            session.session_id,
            run.run_id,
            extra={"error": message},
        )
        if not text:
            yield openai_chunk(
                completion_id,
                model_name,
                "text_delta",
                session.session_id,
                run.run_id,
                content=message,
            )
        run_store.save(run)
        yield openai_chunk(completion_id, model_name, "done", session.session_id, run.run_id, finish_reason="error")
        yield "data: [DONE]\n\n"
        return

    run.pending_tool_calls.clear()
    run_store.save(run)
    yield openai_chunk(completion_id, model_name, "done", session.session_id, run.run_id, finish_reason="stop")
    yield "data: [DONE]\n\n"


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
    return await handle_chat_completion(request, session_id=metadata_value(request, "session_id"))


async def handle_chat_completion(request: ChatCompletionRequest, session_id: str | None) -> Response:
    if request.stream:
        return StreamingResponse(stream_agent_run(request=request, session_id=session_id), media_type="text/event-stream")

    completion = CompletionAccumulator(session_id=session_id)
    async for chunk in stream_agent_run(request=request, session_id=session_id):
        accumulate_chunk(completion, chunk)
    return JSONResponse(
        {
            "id": f"chatcmpl-{uuid.uuid4().hex}",
            "object": "chat.completion",
            "created": int(time.time()),
            "model": request.model or settings.nexus_ai_model,
            "session_id": completion.session_id,
            "run_id": completion.run_id,
            "choices": [
                {
                    "index": 0,
                    "message": {"role": "assistant", "content": completion.content},
                    "finish_reason": completion.finish_reason,
                }
            ],
            "usage": {"prompt_tokens": None, "completion_tokens": None, "total_tokens": None},
        }
    )


@app.post("/v1/sessions/{session_id}/chat/completions", dependencies=[Depends(require_api_key)])
async def session_chat_completions(session_id: str, request: ChatCompletionRequest) -> Response:
    return await handle_chat_completion(request, session_id=session_id)


@app.post("/v1/sessions/{session_id}/runs/{run_id}/resume", dependencies=[Depends(require_api_key)])
async def resume_run(session_id: str, run_id: str, request: ResumeRequest) -> Response:
    try:
        run = run_store.get(run_id, session_id=session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Run not found for this session")

    if request.tool_call_id not in run.pending_tool_calls:
        raise HTTPException(status_code=404, detail="Pending tool call not found")

    deferred_results = DeferredToolResults()
    if request.decision == "approve":
        deferred_results.approvals[request.tool_call_id] = True
    else:
        deferred_results.approvals[request.tool_call_id] = ToolDenied(request.comment or "User denied this action.")

    chat_request = ChatCompletionRequest(
        model=None,
        messages=[{"role": "user", "content": "Continue"}],
        stream=True,
        metadata={"user_id": run.user_id, "workspace_id": run.workspace_id},
    )
    return StreamingResponse(
        stream_agent_run(
            request=chat_request,
            session_id=session_id,
            deferred_tool_results=deferred_results,
            resume_run=run,
        ),
        media_type="text/event-stream",
    )

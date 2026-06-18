import json
from types import SimpleNamespace

import pytest
from fastapi.responses import JSONResponse
from pydantic_ai import DeferredToolResults
from pydantic_ai.messages import (
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    ModelResponse,
    PartDeltaEvent,
    TextPart,
    TextPartDelta,
    ToolCallPart,
    ToolReturnPart,
)
from pydantic_ai.run import AgentRunResultEvent

import app.orchestrator as orchestrator_module
from app.orchestrator import orchestrator
from app.schemas import ChatCompletionRequest, ResumeRequest
from app.stores import run_store, session_store
from app.streaming import CompletionAccumulator, accumulate_chunk, normalized_text_deltas


def test_accumulate_chunk_tracks_content_and_finish_reason() -> None:
    completion = CompletionAccumulator()

    accumulate_chunk(
        completion,
        'data: {"session_id":"sess_1","run_id":"run_1","choices":[{"delta":{"content":"hello"},"finish_reason":null}]}\n\n',
    )
    accumulate_chunk(
        completion,
        'data: {"choices":[{"delta":{"content":""},"finish_reason":"tool_calls"}]}\n\n',
    )

    assert completion.session_id == "sess_1"
    assert completion.run_id == "run_1"
    assert completion.content == "hello"
    assert completion.finish_reason == "tool_calls"


def test_normalized_text_deltas_backfills_missing_prefix() -> None:
    assert normalized_text_deltas("Xin", " chào", False) == ["Xin", " chào"]
    assert normalized_text_deltas("Xin", "Xin chào", False) == ["Xin chào"]
    assert normalized_text_deltas(None, "Xin", False) == ["Xin"]


@pytest.mark.asyncio
async def test_handle_chat_completion_uses_explicit_session_id(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_stream_agent_run(*, request: ChatCompletionRequest, session_id: str | None, **_kwargs: object):
        assert session_id == "sess_path"
        yield 'data: {"session_id":"sess_path","run_id":"run_1","choices":[{"delta":{"content":"ok"},"finish_reason":"stop"}]}\n\n'
        yield "data: [DONE]\n\n"

    monkeypatch.setattr(orchestrator, "stream_agent_run", fake_stream_agent_run)

    request = ChatCompletionRequest(
        model="test-model",
        messages=[{"role": "user", "content": "hi"}],
        metadata={"user_id": "user_1", "workspace_id": "ws_1"},
    )

    response = await orchestrator.chat_completions(request, session_id="sess_path")

    assert isinstance(response, JSONResponse)
    payload = json.loads(response.body)
    assert payload["session_id"] == "sess_path"
    assert payload["run_id"] == "run_1"
    assert payload["choices"][0]["message"]["content"] == "ok"
    assert payload["choices"][0]["finish_reason"] == "stop"


@pytest.mark.asyncio
async def test_resume_run_reuses_existing_run(monkeypatch: pytest.MonkeyPatch) -> None:
    session = session_store.get_or_create("user_resume", "ws_resume", "sess_resume")
    run = run_store.create(session)
    run.pending_tool_calls["tool_1"] = {"tool_name": "create_task", "args": {"title": "Test"}}
    request = ResumeRequest(tool_call_id="tool_1", decision="approve")

    async def fake_stream_agent_run(*, session_id: str | None, deferred_tool_results=None, resume_run=None, **_kwargs: object):
        assert session_id == "sess_resume"
        assert resume_run is run
        assert deferred_tool_results is not None
        assert deferred_tool_results.approvals["tool_1"] is True
        yield "data: [DONE]\n\n"

    monkeypatch.setattr(orchestrator, "stream_agent_run", fake_stream_agent_run)

    response = await orchestrator.resume_run("sess_resume", run.run_id, request)

    assert getattr(response, "media_type", None) == "text/event-stream"
    first_chunk = await response.body_iterator.__anext__()
    assert first_chunk == "data: [DONE]\n\n"


@pytest.mark.asyncio
async def test_resume_run_passes_form_data_as_tool_call_metadata(monkeypatch: pytest.MonkeyPatch) -> None:
    session = session_store.get_or_create("user_form", "ws_form", "sess_form")
    run = run_store.create(session)
    run.pending_tool_calls["tool_2"] = {"tool_name": "create_project", "args": {}}
    request = ResumeRequest(
        tool_call_id="tool_2",
        decision="approve",
        form_data={"name": "Project From Form"},
    )

    async def fake_stream_agent_run(*, deferred_tool_results=None, resume_run=None, **_kwargs: object):
        assert resume_run is run
        assert deferred_tool_results is not None
        assert deferred_tool_results.approvals["tool_2"] is True
        assert deferred_tool_results.metadata["tool_2"] == {"form_data": {"name": "Project From Form"}}
        yield "data: [DONE]\n\n"

    monkeypatch.setattr(orchestrator, "stream_agent_run", fake_stream_agent_run)

    response = await orchestrator.resume_run("sess_form", run.run_id, request)

    assert getattr(response, "media_type", None) == "text/event-stream"


def test_tool_result_payload_returns_dict_content() -> None:
    class FakePart:
        def model_response_object(self) -> dict[str, object]:
            return {"id": "proj_1", "name": "Roadmap"}

    assert orchestrator._tool_result_payload(FakePart()) == {"id": "proj_1", "name": "Roadmap"}


class FakeAsyncContextManager:
    def __init__(self, value: object) -> None:
        self.value = value

    async def __aenter__(self) -> object:
        return self.value

    async def __aexit__(self, *_args: object) -> None:
        return None


class FakeProviderClient:
    async def __aenter__(self) -> "FakeProviderClient":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None


class FakeAgent:
    def __init__(self, events: list[object]) -> None:
        self.events = events

    def run_stream_events(self, *_args: object, **_kwargs: object) -> FakeAsyncContextManager:
        async def iterate():
            for event in self.events:
                yield event

        return FakeAsyncContextManager(iterate())


class FakeRunResult:
    def __init__(self, output: object, messages: list[object]) -> None:
        self.output = output
        self._messages = messages

    def all_messages(self) -> list[object]:
        return self._messages


def text_deltas_from_sse(chunks: list[str]) -> str:
    deltas: list[str] = []
    for chunk in chunks:
        if not chunk.startswith("data: {"):
            continue
        payload = json.loads(chunk.removeprefix("data: ").strip())
        if payload.get("type") != "text_delta":
            continue
        delta = payload.get("delta")
        if isinstance(delta, str):
            deltas.append(delta)
    return "".join(deltas)


@pytest.mark.asyncio
async def test_resume_create_project_discards_stale_form_text_and_persists_follow_up(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = session_store.get_or_create("user_project_resume", "ws_project_resume", "sess_project_resume")
    run = run_store.create(session)
    run.pending_tool_calls["tool_create_project"] = {"tool_name": "create_project", "args": {}}

    deferred_results = DeferredToolResults()
    deferred_results.approvals["tool_create_project"] = True

    stale_text = "I've triggered the project creation approval form."
    final_text = 'Dự án "Xây dựng Nexus Agent 5" đã được tạo thành công.'
    main_messages = [ModelResponse(parts=[TextPart(content=stale_text)])]

    main_events = [
        FunctionToolCallEvent(ToolCallPart(tool_name="create_project", args={}, tool_call_id="tool_create_project")),
        FunctionToolResultEvent(
            ToolReturnPart(
                tool_name="create_project",
                content={"id": "proj_1", "name": "Xây dựng Nexus Agent 5"},
                tool_call_id="tool_create_project",
                outcome="success",
            )
        ),
        PartDeltaEvent(index=0, delta=TextPartDelta(content_delta=stale_text)),
        AgentRunResultEvent(result=FakeRunResult(output=stale_text, messages=main_messages)),
    ]
    post_action_events = [
        PartDeltaEvent(index=0, delta=TextPartDelta(content_delta=final_text)),
        AgentRunResultEvent(result=FakeRunResult(output=final_text, messages=[])),
    ]

    monkeypatch.setattr(
        orchestrator_module,
        "build_agent_with_capture",
        lambda *_args, **_kwargs: (
            FakeAgent(main_events),
            FakeProviderClient(),
            SimpleNamespace(first_text_delta=None),
        ),
    )
    monkeypatch.setattr(
        orchestrator_module,
        "build_post_action_agent_with_capture",
        lambda *_args, **_kwargs: (
            FakeAgent(post_action_events),
            FakeProviderClient(),
            SimpleNamespace(first_text_delta=None),
        ),
    )

    request = ChatCompletionRequest(
        model="test-model",
        messages=[{"role": "user", "content": "Continue"}],
        stream=True,
        metadata={"user_id": "user_project_resume", "workspace_id": "ws_project_resume"},
    )

    chunks = [
        chunk
        async for chunk in orchestrator.stream_agent_run(
            request=request,
            session_id=session.session_id,
            deferred_tool_results=deferred_results,
            resume_run=run,
        )
    ]
    emitted_text = text_deltas_from_sse(chunks)

    assert stale_text not in emitted_text
    assert emitted_text == final_text
    assert run.pending_tool_calls == {}
    assert isinstance(run.messages[-1], ModelResponse)
    assert run.messages[-1].parts[0].content == final_text
    assert session_store.get(session.session_id).messages[-1].parts[0].content == final_text

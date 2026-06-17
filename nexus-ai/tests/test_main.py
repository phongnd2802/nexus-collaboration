import json

import pytest
from fastapi.responses import JSONResponse

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

import json

import pytest
from fastapi.responses import JSONResponse

from app.main import CompletionAccumulator, accumulate_chunk, handle_chat_completion, normalized_text_deltas
from app.schemas import ChatCompletionRequest


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

    monkeypatch.setattr("app.main.stream_agent_run", fake_stream_agent_run)

    request = ChatCompletionRequest(
        model="test-model",
        messages=[{"role": "user", "content": "hi"}],
        metadata={"user_id": "user_1", "workspace_id": "ws_1"},
    )

    response = await handle_chat_completion(request, session_id="sess_path")

    assert isinstance(response, JSONResponse)
    payload = json.loads(response.body)
    assert payload["session_id"] == "sess_path"
    assert payload["run_id"] == "run_1"
    assert payload["choices"][0]["message"]["content"] == "ok"
    assert payload["choices"][0]["finish_reason"] == "stop"

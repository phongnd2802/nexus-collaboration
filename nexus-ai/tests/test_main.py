import json
from types import SimpleNamespace

import pytest
from pydantic_ai import DeferredToolResults
from pydantic_ai.messages import (
    FunctionToolCallEvent,
    FunctionToolResultEvent,
    ModelRequest,
    ModelResponse,
    PartDeltaEvent,
    TextPart,
    TextPartDelta,
    ToolCallPart,
    ToolReturnPart,
    UserPromptPart,
)
from pydantic_ai.run import AgentRunResultEvent
from pydantic_ai.tools import DeferredToolRequests
from pydantic_ai.ui.vercel_ai.response_types import DataChunk

import app.orchestrator as orchestrator_module
from app.orchestrator import orchestrator
from app.schemas import ResumeRequest
from app.stores import run_store, session_store
from app.streaming import normalized_text_deltas


def test_normalized_text_deltas_backfills_missing_prefix() -> None:
    assert normalized_text_deltas("Xin", " chào", False) == ["Xin", " chào"]
    assert normalized_text_deltas("Xin", "Xin chào", False) == ["Xin chào"]
    assert normalized_text_deltas(None, "Xin", False) == ["Xin"]


def test_tool_result_payload_returns_dict_content() -> None:
    class FakePart:
        def model_response_object(self) -> dict[str, object]:
            return {"id": "proj_1", "name": "Roadmap"}

    assert orchestrator._tool_result_payload(FakePart()) == {"id": "proj_1", "name": "Roadmap"}


def test_get_session_snapshot_returns_timeline_items_and_pending_approval() -> None:
    session = session_store.get_or_create("user_snapshot", "ws_snapshot", "sess_snapshot")
    session.messages = [
        ModelRequest(parts=[UserPromptPart(content="Create a project")]),
        ModelResponse(parts=[ToolCallPart(tool_name="create_project", args={}, tool_call_id="call_snapshot")]),
        ModelResponse(parts=[TextPart(content="The project creation approval form has been triggered.")]),
    ]
    run = run_store.create(session)
    run.pending_tool_calls["call_snapshot"] = {"tool_name": "create_project", "args": {}}
    run_store.save(run)

    snapshot = orchestrator.get_session_snapshot("sess_snapshot", "user_snapshot", "ws_snapshot")

    assert snapshot.sessionId == "sess_snapshot"
    assert snapshot.title == "Create a project"
    assert [item["type"] for item in snapshot.items] == [
        "user_message",
        "tool_call",
        "assistant_message",
        "approval_required",
    ]
    assert snapshot.uiMessages is not None
    assert snapshot.uiMessages[-1]["parts"][0]["state"] == "approval-requested"
    assert snapshot.activeApprovalItemId == "approval-call_snapshot"
    assert snapshot.items[-1]["approval"]["runId"] == run.run_id


def test_get_session_snapshot_ignores_consumed_pending_approval() -> None:
    session = session_store.get_or_create("user_snapshot_consumed", "ws_snapshot_consumed", "sess_snapshot_consumed")
    session.messages = [ModelRequest(parts=[UserPromptPart(content="Update a project")])]
    run = run_store.create(session)
    run.pending_tool_calls["call_consumed"] = {"tool_name": "update_project", "args": {"project_id": "proj_1"}}
    run.consumed_tool_call_ids.add("call_consumed")
    run_store.save(run)

    snapshot = orchestrator.get_session_snapshot("sess_snapshot_consumed", "user_snapshot_consumed", "ws_snapshot_consumed")

    assert [item["type"] for item in snapshot.items] == ["user_message"]
    assert snapshot.activeApprovalItemId is None


def test_get_session_snapshot_renders_project_list_from_data_chunk() -> None:
    session = session_store.get_or_create("user_snapshot_projects", "ws_snapshot_projects", "sess_snapshot_projects")
    session.messages = [
        ModelRequest(parts=[UserPromptPart(content="List projects")]),
        ModelResponse(
            parts=[
                ToolReturnPart(
                    tool_name="list_projects",
                    content=[{"id": "proj_1", "name": "Roadmap"}],
                    tool_call_id="tool_list_projects",
                    metadata=DataChunk(
                        type="data-project_list",
                        data={
                            "title": "Projects",
                            "items": [
                                {
                                    "id": "proj_1",
                                    "name": "Roadmap",
                                    "description": "Q4 roadmap",
                                    "status": "active",
                                    "type": "kanban",
                                    "updatedAt": "2026-06-18T00:00:00Z",
                                    "memberCount": 3,
                                    "href": "/workspaces/ws_snapshot_projects/projects/proj_1",
                                }
                            ],
                        },
                    ),
                )
            ]
        ),
        ModelResponse(parts=[TextPart(content="Mình tìm thấy 1 project đang hoạt động.")]),
    ]

    snapshot = orchestrator.get_session_snapshot("sess_snapshot_projects", "user_snapshot_projects", "ws_snapshot_projects")

    assert [item["type"] for item in snapshot.items] == [
        "user_message",
        "tool_result",
        "assistant_message",
        "project_list",
    ]
    assert snapshot.items[-1]["projects"][0]["id"] == "proj_1"
    assert snapshot.uiMessages is not None
    assert snapshot.uiMessages[-1]["parts"][0]["type"] == "data-project_list"


@pytest.mark.asyncio
async def test_ui_chat_completion_stream_uses_vercel_ui_headers(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_stream_ui_agent_run(**kwargs: object):
        assert kwargs["session_id"] == "sess_ui"
        yield 'data: {"type":"start","messageId":"assistant-run_1"}\n\n'
        yield "data: [DONE]\n\n"

    monkeypatch.setattr(orchestrator, "stream_ui_agent_run", fake_stream_ui_agent_run)

    response = await orchestrator.ui_chat_completions(
        user_id="user_ui",
        workspace_id="ws_ui",
        user_prompt="List projects",
        session_id="sess_ui",
    )

    assert getattr(response, "media_type", None) == "text/event-stream"
    assert response.headers["x-vercel-ai-ui-message-stream"] == "v1"


@pytest.mark.asyncio
async def test_ui_resume_run_reuses_existing_run_and_form_data(monkeypatch: pytest.MonkeyPatch) -> None:
    session = session_store.get_or_create("user_form", "ws_form", "sess_form")
    run = run_store.create(session)
    run.pending_tool_calls["tool_2"] = {"tool_name": "create_project", "args": {}}
    request = ResumeRequest(
        tool_call_id="tool_2",
        decision="approve",
        form_data={"name": "Project From Form"},
    )

    async def fake_stream_ui_agent_run(**kwargs: object):
        assert kwargs["resume_run"] is run
        deferred_tool_results = kwargs["deferred_tool_results"]
        assert deferred_tool_results is not None
        assert deferred_tool_results.approvals["tool_2"] is True
        assert deferred_tool_results.metadata["tool_2"] == {"form_data": {"name": "Project From Form"}}
        yield "data: [DONE]\n\n"

    monkeypatch.setattr(orchestrator, "stream_ui_agent_run", fake_stream_ui_agent_run)

    response = await orchestrator.ui_resume_run("sess_form", run.run_id, request)

    assert getattr(response, "media_type", None) == "text/event-stream"
    first_chunk = await response.body_iterator.__anext__()
    assert first_chunk == "data: [DONE]\n\n"


@pytest.mark.asyncio
async def test_ui_approval_events_tag_update_project_form_with_existing_project_values(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = session_store.get_or_create("user_update_snapshot", "ws_update_snapshot", "sess_update_snapshot")
    run = run_store.create(session)

    async def fake_request_backend(**kwargs: object) -> dict[str, object]:
        assert kwargs["path"] == "/projects/proj_1"
        return {
            "id": "proj_1",
            "name": "Existing Project Name",
            "description": "Existing description",
            "lead_id": "user_9",
            "kanban_stages": [{"id": "todo", "name": "To Do", "order": 1, "color": "#3B82F6"}],
            "collaborative_data": {"default_assignee_ids": ["user_2"]},
        }

    monkeypatch.setattr(orchestrator_module, "request_backend", fake_request_backend)

    class FakeApprovalPart:
        def __init__(self) -> None:
            self.tool_call_id = "call_update"
            self.tool_name = "update_project"

        def args_as_dict(self) -> dict[str, object]:
            return {"project_id": "proj_1", "name": "Renamed"}

    events = await orchestrator._ui_approval_events(
        session_id=session.session_id,
        run=run,
        output=SimpleNamespace(approvals=[FakeApprovalPart()]),
    )

    approval_request = json.loads(events[0].removeprefix("data: ").strip())
    approval_data = json.loads(events[1].removeprefix("data: ").strip())

    assert approval_request["type"] == "tool-approval-request"
    assert approval_data["type"] == "data-approval_required"
    assert approval_data["data"]["summary"] == "Review changes and confirm project update"
    assert approval_data["data"]["approvalKind"] == "project_update_form"
    assert approval_data["data"]["initialValues"] == {
        "id": "proj_1",
        "project_id": "proj_1",
        "name": "Existing Project Name",
        "description": "Existing description",
        "lead_id": "user_9",
        "kanban_stages": [{"id": "todo", "name": "To Do", "order": 1, "color": "#3B82F6"}],
        "collaborative_data": {"default_assignee_ids": ["user_2"]},
    }
    assert run.pending_tool_calls["call_update"]["initial_values"] == approval_data["data"]["initialValues"]


def test_list_sessions_returns_workspace_user_sessions_sorted() -> None:
    first = session_store.get_or_create("user_sessions", "ws_sessions", "sess_sessions_1")
    first.messages = [ModelRequest(parts=[UserPromptPart(content="Old question")])]
    second = session_store.get_or_create("user_sessions", "ws_sessions", "sess_sessions_2")
    second.messages = [
        ModelRequest(parts=[UserPromptPart(content="Newest question")]),
        ModelResponse(parts=[TextPart(content="Answer")]),
    ]
    session_store.get_or_create("other_user_sessions", "ws_sessions", "sess_other_user")

    run = run_store.create(second)
    run.pending_tool_calls["call_pending"] = {"tool_name": "create_project", "args": {}}
    run_store.save(run)

    sessions = orchestrator.list_sessions("user_sessions", "ws_sessions")

    assert [item.sessionId for item in sessions] == ["sess_sessions_2", "sess_sessions_1"]
    assert sessions[0].title == "Newest question"
    assert sessions[0].hasPendingApproval is True
    assert sessions[1].title == "Old question"


def test_delete_session_removes_session_and_related_runs() -> None:
    session = session_store.get_or_create("user_delete", "ws_delete", "sess_delete")
    session.messages = [ModelRequest(parts=[UserPromptPart(content="Delete me")])]
    run_one = run_store.create(session)
    run_two = run_store.create(session)
    run_one.pending_tool_calls["call_pending_delete"] = {"tool_name": "update_project", "args": {"project_id": "proj_1"}}
    run_store.save(run_one)
    run_store.save(run_two)

    result = orchestrator.delete_session("sess_delete", "user_delete", "ws_delete")

    assert result == {"success": True, "sessionId": "sess_delete"}
    with pytest.raises(KeyError):
        session_store.get("sess_delete")
    assert run_store.list_by_session("sess_delete") == []


def test_delete_session_rejects_other_owner() -> None:
    session_store.get_or_create("user_delete_owner", "ws_delete_owner", "sess_delete_owner")

    with pytest.raises(orchestrator_module.HTTPException) as error:
        orchestrator.delete_session("sess_delete_owner", "other_user", "ws_delete_owner")

    assert error.value.status_code == 404


def test_deleted_session_is_not_accessible_after_removal() -> None:
    session = session_store.get_or_create("user_delete_snapshot", "ws_delete_snapshot", "sess_delete_snapshot")
    run = run_store.create(session)

    orchestrator.delete_session("sess_delete_snapshot", "user_delete_snapshot", "ws_delete_snapshot")

    with pytest.raises(orchestrator_module.HTTPException) as session_error:
        orchestrator.get_session_snapshot("sess_delete_snapshot", "user_delete_snapshot", "ws_delete_snapshot")
    with pytest.raises(KeyError):
        run_store.get(run.run_id, session_id="sess_delete_snapshot")
    assert session_error.value.status_code == 404


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


def stream_payloads(chunks: list[str]) -> list[dict[str, object]]:
    payloads: list[dict[str, object]] = []
    for chunk in chunks:
        if not chunk.startswith("data: {"):
            continue
        payloads.append(json.loads(chunk.removeprefix("data: ").strip()))
    return payloads


def text_deltas_from_ui_stream(chunks: list[str]) -> str:
    deltas: list[str] = []
    for payload in stream_payloads(chunks):
        if payload.get("type") != "text-delta":
            continue
        delta = payload.get("delta")
        if isinstance(delta, str):
            deltas.append(delta)
    return "".join(deltas)


def data_chunks_from_ui_stream(chunks: list[str], chunk_type: str) -> list[dict[str, object]]:
    return [payload for payload in stream_payloads(chunks) if payload.get("type") == chunk_type]


@pytest.mark.asyncio
async def test_ui_resume_create_project_discards_stale_form_text_and_persists_follow_up(
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

    chunks = [
        chunk
        async for chunk in orchestrator.stream_ui_agent_run(
            user_id="user_project_resume",
            workspace_id="ws_project_resume",
            user_prompt="Continue after tool approval.",
            session_id=session.session_id,
            deferred_tool_results=deferred_results,
            resume_run=run,
        )
    ]
    emitted_text = text_deltas_from_ui_stream(chunks)

    assert stale_text not in emitted_text
    assert emitted_text == final_text
    assert run.pending_tool_calls == {}
    assert isinstance(run.messages[-1], ModelResponse)
    assert run.messages[-1].parts[0].content == final_text
    assert session_store.get(session.session_id).messages[-1].parts[0].content == final_text


@pytest.mark.asyncio
async def test_ui_stream_list_projects_emits_data_project_list_and_snapshot_cards(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = session_store.get_or_create("user_project_cards", "ws_project_cards", "sess_project_cards")
    run = run_store.create(session)
    summary_text = "Mình tìm thấy 1 project đang hoạt động."

    project_payload = DataChunk(
        type="data-project_list",
        data={
            "title": "Projects",
            "items": [
                {
                    "id": "proj_1",
                    "name": "Roadmap",
                    "description": "Q4 roadmap",
                    "status": "active",
                    "type": "kanban",
                    "updatedAt": "2026-06-18T00:00:00Z",
                    "memberCount": 3,
                    "href": "/workspaces/ws_project_cards/projects/proj_1",
                }
            ],
        },
    )
    main_messages = [
        ModelResponse(
            parts=[
                ToolReturnPart(
                    tool_name="list_projects",
                    content=[{"id": "proj_1", "name": "Roadmap"}],
                    tool_call_id="tool_list_projects",
                    metadata=project_payload,
                    outcome="success",
                )
            ]
        ),
        ModelResponse(parts=[TextPart(content=summary_text)]),
    ]
    main_events = [
        FunctionToolResultEvent(
            ToolReturnPart(
                tool_name="list_projects",
                content=[{"id": "proj_1", "name": "Roadmap"}],
                tool_call_id="tool_list_projects",
                metadata=project_payload,
                outcome="success",
            )
        ),
        PartDeltaEvent(index=0, delta=TextPartDelta(content_delta=summary_text)),
        AgentRunResultEvent(result=FakeRunResult(output=summary_text, messages=main_messages)),
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

    chunks = [
        chunk
        async for chunk in orchestrator.stream_ui_agent_run(
            user_id="user_project_cards",
            workspace_id="ws_project_cards",
            user_prompt="List projects",
            session_id=session.session_id,
            resume_run=run,
        )
    ]

    payloads = data_chunks_from_ui_stream(chunks, "data-project_list")
    assert len(payloads) == 1
    assert payloads[0]["data"]["items"][0]["id"] == "proj_1"

    snapshot = orchestrator.get_session_snapshot(session.session_id, "user_project_cards", "ws_project_cards")
    assert snapshot.items[-1]["type"] == "project_list"
    assert snapshot.items[-1]["projects"][0]["href"] == "/workspaces/ws_project_cards/projects/proj_1"
    assert snapshot.uiMessages[-1]["parts"][0]["type"] == "data-project_list"


@pytest.mark.asyncio
async def test_ui_resume_update_project_suppresses_duplicate_approval_after_success(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    session = session_store.get_or_create("user_project_update_duplicate", "ws_project_update_duplicate", "sess_project_update_duplicate")
    run = run_store.create(session)
    run.pending_tool_calls["tool_update_project_duplicate"] = {
        "tool_name": "update_project",
        "args": {"project_id": "proj_1", "name": "Nexus Agent 7"},
    }

    deferred_results = DeferredToolResults()
    deferred_results.approvals["tool_update_project_duplicate"] = True

    duplicate_tool_call_id = "tool_update_project_duplicate_second"
    duplicate_output = DeferredToolRequests(
        approvals=[
            ToolCallPart(
                tool_name="update_project",
                args={"project_id": "proj_1", "name": "Nexus Agent 7"},
                tool_call_id=duplicate_tool_call_id,
            )
        ]
    )
    duplicate_messages = [
        ModelResponse(
            parts=[
                ToolCallPart(
                    tool_name="update_project",
                    args={"project_id": "proj_1", "name": "Nexus Agent 7"},
                    tool_call_id=duplicate_tool_call_id,
                )
            ]
        )
    ]
    final_text = 'Dự án "Nexus Agent 7" đã được cập nhật thành công.'

    main_events = [
        FunctionToolCallEvent(
            ToolCallPart(
                tool_name="update_project",
                args={"project_id": "proj_1", "name": "Nexus Agent 7"},
                tool_call_id="tool_update_project_duplicate",
            )
        ),
        FunctionToolResultEvent(
            ToolReturnPart(
                tool_name="update_project",
                content={"id": "proj_1", "name": "Nexus Agent 7"},
                tool_call_id="tool_update_project_duplicate",
                outcome="success",
            )
        ),
        AgentRunResultEvent(result=FakeRunResult(output=duplicate_output, messages=duplicate_messages)),
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

    chunks = [
        chunk
        async for chunk in orchestrator.stream_ui_agent_run(
            user_id="user_project_update_duplicate",
            workspace_id="ws_project_update_duplicate",
            user_prompt="Continue after tool approval.",
            session_id=session.session_id,
            deferred_tool_results=deferred_results,
            resume_run=run,
        )
    ]

    emitted_text = text_deltas_from_ui_stream(chunks)
    emitted_types = [payload.get("type") for payload in stream_payloads(chunks)]

    assert emitted_text == final_text
    assert "tool-approval-request" not in emitted_types
    assert "data-approval_required" not in emitted_types
    assert run.pending_tool_calls == {}

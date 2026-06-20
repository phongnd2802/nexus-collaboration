from pydantic_ai.messages import ModelRequest, ModelResponse, TextPart, ToolCallPart, UserPromptPart

from app.orchestrator import orchestrator
from app.stores import run_store, session_store


def test_get_session_snapshot_dumps_vercel_ui_v6_pending_approval() -> None:
    session = session_store.get_or_create("user_snapshot_v6", "ws_snapshot_v6", "sess_snapshot_v6")
    run = run_store.create(session)
    tool_call_id = "call_snapshot_v6"
    provider_details = orchestrator._approval_provider_details(
        session_id=session.session_id,
        run_id=run.run_id,
        tool_call_id=tool_call_id,
        tool_name="create_project",
        args={"name": "Roadmap"},
        initial_values={"name": "Roadmap"},
    )
    session.messages = [
        ModelRequest(parts=[UserPromptPart(content="Create a project")]),
        ModelResponse(
            parts=[
                ToolCallPart(
                    tool_name="create_project",
                    args={"name": "Roadmap"},
                    tool_call_id=tool_call_id,
                    provider_details=provider_details,
                )
            ]
        ),
    ]
    run.pending_tool_calls[tool_call_id] = {
        "tool_name": "create_project",
        "args": {"name": "Roadmap"},
        "initial_values": {"name": "Roadmap"},
    }
    run_store.save(run)

    snapshot = orchestrator.get_session_snapshot(session.session_id, "user_snapshot_v6", "ws_snapshot_v6")

    assert snapshot.sessionId == session.session_id
    assert snapshot.title == "Create a project"
    assert snapshot.items == []
    assert snapshot.activeApprovalItemId == f"approval-{tool_call_id}"
    assert snapshot.uiMessages is not None
    tool_part = snapshot.uiMessages[-1]["parts"][0]
    assert tool_part["state"] == "approval-requested"
    assert tool_part["toolCallId"] == tool_call_id
    assert tool_part["callProviderMetadata"]["pydantic_ai"]["provider_details"]["approval_kind"] == "project_create_form"


def test_list_sessions_returns_workspace_user_sessions_sorted() -> None:
    first = session_store.get_or_create("user_sessions_v6", "ws_sessions_v6", "sess_sessions_v6_1")
    first.messages = [ModelRequest(parts=[UserPromptPart(content="Old question")])]
    second = session_store.get_or_create("user_sessions_v6", "ws_sessions_v6", "sess_sessions_v6_2")
    second.messages = [
        ModelRequest(parts=[UserPromptPart(content="Newest question")]),
        ModelResponse(parts=[TextPart(content="Answer")]),
    ]
    session_store.get_or_create("other_user_sessions_v6", "ws_sessions_v6", "sess_other_user_v6")

    sessions = orchestrator.list_sessions("user_sessions_v6", "ws_sessions_v6")

    by_id = {item.sessionId: item for item in sessions}
    assert set(by_id) == {"sess_sessions_v6_1", "sess_sessions_v6_2"}
    assert by_id["sess_sessions_v6_2"].title == "Newest question"
    assert by_id["sess_sessions_v6_2"].messageCount == 2
    assert by_id["sess_sessions_v6_1"].title == "Old question"


def test_delete_session_removes_session_and_related_runs() -> None:
    session = session_store.get_or_create("user_delete_v6", "ws_delete_v6", "sess_delete_v6")
    run_store.create(session)

    result = orchestrator.delete_session(session.session_id, "user_delete_v6", "ws_delete_v6")

    assert result == {"success": True, "sessionId": session.session_id}
    assert run_store.list_by_session(session.session_id) == []

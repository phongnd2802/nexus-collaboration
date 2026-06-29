from nexus_ai.routing import ComplexityRouter, routing_event_payload
from nexus_ai.settings import load_settings


def _settings(tmp_path):
    return load_settings(
        {
            "NEXUS_AI_MODEL": "test",
            "NEXUS_API_TOKEN": "token",
            "NEXUS_WORKSPACE_ID": "workspace",
            "NEXUS_AI_ENABLE_LANGFUSE": "false",
            "NEXUS_AI_RUNTIME_DIR": str(tmp_path / "runtime"),
        }
    )


def test_router_prefers_direct_for_simple_general_question(tmp_path):
    router = ComplexityRouter(_settings(tmp_path))

    decision = __import__("asyncio").run(router.decide("What is a project charter?", {"messages": []}))

    assert decision.route == "direct_workspace"
    assert decision.execution_path == "direct_workspace"
    assert decision.intent_class == "general_simple"
    assert "simple_general_question" in decision.reason_codes
    assert decision.needs_workspace_data is False


def test_router_prefers_multi_for_workspace_analysis(tmp_path):
    router = ComplexityRouter(_settings(tmp_path))

    decision = __import__("asyncio").run(
        router.decide(
            "Phân tích tiến độ project marketing, xác định rủi ro và đề xuất phân bổ lại nguồn lực",
            {"messages": []},
        )
    )

    assert decision.route == "multi"
    assert decision.execution_path == "multi"
    assert decision.needs_workspace_data is True
    assert decision.needs_tools is True


def test_router_prefers_direct_workspace_for_workspace_read(tmp_path):
    router = ComplexityRouter(_settings(tmp_path))

    decision = __import__("asyncio").run(
        router.decide("Cho tôi thông tin task overdue của project marketing nexus", {"messages": []})
    )

    assert decision.route == "direct_workspace"
    assert decision.execution_path == "direct_workspace"
    assert decision.intent_class in {"workspace_read", "workspace_action"}


def test_routing_event_payload_serializes_decision(tmp_path):
    router = ComplexityRouter(_settings(tmp_path))
    decision = __import__("asyncio").run(router.decide("Translate this sentence", {"messages": []}))

    event = routing_event_payload(decision)

    assert event["type"] == "data-routing_decision"
    assert event["data"]["route"] == decision.route
    assert event["data"]["executionPath"] == decision.execution_path

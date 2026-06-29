from nexus_ai.workspace_references import (
    entity_href,
    extract_action_results,
    extract_mcp_sources,
    rag_sources_from_results,
)


def test_entity_href_resolves_workspace_routes():
    assert entity_href("workspace-1", "project", "project-1") == "/workspaces/workspace-1/projects/project-1"
    assert entity_href("workspace-1", "task", "task-1", {"projectId": "project-1"}) == "/workspaces/workspace-1/projects/project-1?taskId=task-1"
    assert entity_href("workspace-1", "file", "file-1") == "/workspaces/workspace-1/files/file-1"
    assert entity_href("workspace-1", "message", "message-1", {"channelId": "channel-1"}) == "/workspaces/workspace-1/chat/channel-1"


def test_rag_sources_include_clickable_file_citation():
    sources = rag_sources_from_results(
        [{"file_id": "file-1", "title": "Roadmap", "snippet": "Q3 launch", "score": 0.82}],
        "workspace-1",
    )

    assert sources == [
        {
            "sourceType": "rag",
            "entityType": "file",
            "entityId": "file-1",
            "title": "Roadmap",
            "href": "/workspaces/workspace-1/files/file-1",
            "snippet": "Q3 launch",
            "score": 0.82,
            "citation": "Roadmap (/workspaces/workspace-1/files/file-1)",
        }
    ]


def test_mcp_sources_are_inferred_from_tool_output():
    sources = extract_mcp_sources(
        {"projects": [{"id": "project-1", "name": "Marketing Nexus"}]},
        "workspace-1",
        "nexus_list_projects",
    )

    assert sources == [
        {
            "sourceType": "mcp",
            "entityType": "project",
            "entityId": "project-1",
            "title": "Marketing Nexus",
            "href": "/workspaces/workspace-1/projects/project-1",
        }
    ]


def test_action_results_include_redirect_link():
    actions = extract_action_results(
        {"success": True, "taskId": "task-1", "projectId": "project-1", "title": "Follow up"},
        "workspace-1",
        "nexus_update_task",
    )

    assert actions == [
        {
            "toolName": "nexus_update_task",
            "action": "update",
            "status": "completed",
            "entityType": "task",
            "entityId": "task-1",
            "title": "Follow up",
            "href": "/workspaces/workspace-1/projects/project-1?taskId=task-1",
        }
    ]

from pathlib import Path
from dataclasses import dataclass
from typing import Any

import httpx
from pydantic_ai import Agent, DeferredToolRequests, RunContext
from pydantic_ai.capabilities import Capability
from pydantic_ai.models.openrouter import OpenRouterModel
from pydantic_ai.providers.openrouter import OpenRouterProvider

from app.config import settings
from app.provider_capture import ProviderCaptureState, create_provider_http_client
from app.tools.projects.create_project import create_project as create_project_tool
from app.tools.projects.get_project import get_project as get_project_tool
from app.tools.projects.list_projects import list_projects as list_projects_tool
from app.tools.projects.update_project import update_project as update_project_tool
from app.tools.tasks.create_task import create_task as create_task_tool
from app.tools.tasks.get_task import get_task as get_task_tool
from app.tools.tasks.list_tasks import list_tasks as list_tasks_tool
from app.tools.tasks.update_task import update_task as update_task_tool
from app.tools.utils import compact_value


@dataclass
class AgentDeps:
    user_id: str
    workspace_id: str


def _compact(value: Any) -> Any:
    return compact_value(value)


projects_tasks = Capability[AgentDeps](
    id="projects_tasks",
    description="Project and task lookup or safe user-confirmed create/update actions in Nexus.",
    instructions=(
        "Use these tools for Nexus project/task questions and actions. "
        "Prefer read tools before writing when IDs are unknown. "
        "All write tools require user approval before execution. "
        "Do not delete or archive projects/tasks. Keep final answers compact."
    ),
    defer_loading=True,
)


@projects_tasks.tool
async def list_projects(ctx: RunContext[AgentDeps], status: str | None = None, type: str | None = None) -> Any:
    """List projects in the current workspace, optionally filtered by status or type."""
    return _compact(await list_projects_tool(ctx, status=status, type=type))


@projects_tasks.tool
async def get_project(ctx: RunContext[AgentDeps], project_id: str) -> Any:
    """Get one project by ID."""
    return _compact(await get_project_tool(ctx, project_id))


@projects_tasks.tool
async def list_tasks(
    ctx: RunContext[AgentDeps],
    project_id: str | None = None,
    search: str | None = None,
    status: str | None = None,
    limit: int | None = 20,
) -> Any:
    """List tasks in one project or across the workspace."""
    return _compact(await list_tasks_tool(ctx, project_id=project_id, search=search, status=status, limit=limit))


@projects_tasks.tool
async def get_task(ctx: RunContext[AgentDeps], task_id: str) -> Any:
    """Get one task by ID."""
    return _compact(await get_task_tool(ctx, task_id))


projects_tasks.tool(requires_approval=True)(create_project_tool)


@projects_tasks.tool(requires_approval=True)
async def update_project(
    ctx: RunContext[AgentDeps],
    project_id: str,
    name: str | None = None,
    description: str | None = None,
    status: str | None = None,
    priority: str | None = None,
) -> Any:
    """Update basic project fields after explicit user approval."""
    return _compact(
        await update_project_tool(ctx, project_id, name=name, description=description, status=status, priority=priority)
    )


@projects_tasks.tool(requires_approval=True)
async def create_task(
    ctx: RunContext[AgentDeps],
    project_id: str,
    title: str,
    description: str | None = None,
    status: str | None = None,
    priority: str | None = "medium",
    assigned_to: list[str] | None = None,
    due_date: str | None = None,
) -> Any:
    """Create a task in a project after explicit user approval."""
    return _compact(
        await create_task_tool(
            ctx,
            project_id,
            title=title,
            description=description,
            status=status,
            priority=priority,
            assigned_to=assigned_to,
            due_date=due_date,
        )
    )


@projects_tasks.tool(requires_approval=True)
async def update_task(
    ctx: RunContext[AgentDeps],
    task_id: str,
    title: str | None = None,
    description: str | None = None,
    status: str | None = None,
    priority: str | None = None,
    assigned_to: list[str] | None = None,
    due_date: str | None = None,
) -> Any:
    """Update basic task fields after explicit user approval."""
    return _compact(
        await update_task_tool(
            ctx,
            task_id,
            title=title,
            description=description,
            status=status,
            priority=priority,
            assigned_to=assigned_to,
            due_date=due_date,
        )
    )


@projects_tasks.tool(requires_approval=True)
async def assign_task(ctx: RunContext[AgentDeps], task_id: str, assigned_to: list[str]) -> Any:
    """Assign a task to user IDs after explicit user approval."""
    return _compact(await update_task_tool(ctx, task_id, assigned_to=assigned_to))


@projects_tasks.tool(requires_approval=True)
async def move_task_status(ctx: RunContext[AgentDeps], task_id: str, status: str) -> Any:
    """Move a task to another status/stage after explicit user approval."""
    return _compact(await update_task_tool(ctx, task_id, status=status))


def build_agent(
    model_name: str,
    provider_http_client: httpx.AsyncClient | None = None,
) -> Agent[AgentDeps, str | DeferredToolRequests]:
    provider = OpenRouterProvider(
        api_key=settings.openrouter_api_key or None,
        app_url=settings.openrouter_app_url,
        app_title=settings.openrouter_app_title,
        http_client=provider_http_client,
    )
    model = OpenRouterModel(model_name, provider=provider)
    return Agent(
        model,
        deps_type=AgentDeps,
        output_type=[str, DeferredToolRequests],
        capabilities=[projects_tasks],
        instructions=(
            "You are Nexus AI, a concise assistant for the Nexus collaboration workspace. "
            "For ordinary questions, answer normally. For project/task requests, load the "
            "projects_tasks capability before using domain tools. Never claim an action was "
            "executed unless a tool result confirms it. All write actions must be approved by "
            "the user first. Refuse delete/archive requests in this phase."
        ),
    )


def raw_provider_response_path(completion_id: str) -> Path:
    directory = Path(settings.nexus_ai_raw_response_dir)
    return directory / f"{completion_id}.txt"


def build_agent_with_capture(
    model_name: str,
    completion_id: str,
) -> tuple[Agent[AgentDeps, str | DeferredToolRequests], httpx.AsyncClient, ProviderCaptureState]:
    output_path = raw_provider_response_path(completion_id)
    capture_state = ProviderCaptureState()
    provider_http_client = create_provider_http_client(output_path, capture_state)
    return build_agent(model_name, provider_http_client=provider_http_client), provider_http_client, capture_state

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { idSchema, limitSchema, workspaceIdSchema } from '../schemas/common.js';
import {
  createProjectInputShape,
  createTaskInputShape,
  deleteActionOutputSchema,
  projectMembersOutputSchema,
  projectOutputSchema,
  projectsListOutputSchema,
  projectTasksListOutputSchema,
  taskCommentsListOutputSchema,
  taskOutputSchema,
  updateProjectInputShape,
  updateTaskInputShape,
  workspaceTasksListOutputSchema,
} from '../schemas/projects.js';
import type { NexusApiClient } from '../services/nexus-api.js';
import { normalizeBySchema } from '../services/normalize.js';
import { registerApiTool } from './register-api-tool.js';

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

const write = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};

const destroy = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};

export function registerProjectTools(server: McpServer, client: NexusApiClient) {
  registerApiTool(server, client, {
    name: 'nexus_list_projects',
    title: 'List Nexus Projects',
    description:
      'Use this tool when you need to list projects in a workspace. Optionally filter by status (active/on_hold/completed/archived) and type (kanban/scrum/bug_tracking/feature/research).',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      status: z.string().optional().describe('Optional project status filter.'),
      type: z.string().optional().describe('Optional project type filter.'),
    },
    outputSchema: projectsListOutputSchema,
    outputTransform: (data) =>
      normalizeBySchema(projectsListOutputSchema, {
        projects: normalizeProjectListResponse(data),
      }),
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/projects`,
    query: ({ status, type }) => ({ status, type }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_project',
    title: 'Get Nexus Project',
    description:
      'Use this tool when you need to get detailed information about a specific project by its ID. Returns name, description, type, status, priority, owner, dates, budget, kanban stages, and attachments.',
    inputSchema: { workspace_id: workspaceIdSchema, project_id: idSchema('Project') },
    outputSchema: projectOutputSchema,
    outputTransform: (data) => normalizeProject(data),
    path: ({ workspace_id, project_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/${encodeURIComponent(String(project_id))}`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_create_project',
    title: 'Create Nexus Project',
    description:
      'Use this tool when you need to create a new project. Provide name (required), and optionally description, priority, lead, kanban stages, attachments, and collaborative metadata (default assignee IDs).',
    inputSchema: { workspace_id: workspaceIdSchema, ...createProjectInputShape },
    method: 'POST',
    outputSchema: projectOutputSchema,
    outputTransform: (data) => normalizeProject(data),
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/projects`,
    body: ({ workspace_id: _workspace_id, response_format: _response_format, ...body }) => body,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_update_project',
    title: 'Update Nexus Project',
    description:
      'Use this tool when you need to update a project\'s name, description, type, status, priority, owner, lead, dates, budget, kanban stages, attachments, or collaborative data. All fields are optional.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      project_id: idSchema('Project'),
      ...updateProjectInputShape,
    },
    method: 'PATCH',
    outputSchema: projectOutputSchema,
    outputTransform: (data) => normalizeProject(data),
    path: ({ workspace_id, project_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/${encodeURIComponent(String(project_id))}`,
    body: ({ workspace_id: _workspace_id, project_id: _project_id, response_format: _response_format, ...body }) => body,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_delete_project',
    title: 'Delete Nexus Project',
    description:
      'Use this tool when you need to permanently delete a project and its associated data by project ID.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      project_id: idSchema('Project'),
    },
    method: 'DELETE',
    outputSchema: deleteActionOutputSchema,
    outputTransform: () => ({
      success: true,
      message: 'Project deleted successfully.',
    }),
    path: ({ workspace_id, project_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/${encodeURIComponent(String(project_id))}`,
    annotations: destroy,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_project_members',
    title: 'Get Nexus Project Members',
    description:
      'Use this tool when you need to list all members of a project with their user details (name, email, avatar) and role within the project.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      project_id: idSchema('Project'),
    },
    outputSchema: projectMembersOutputSchema,
    outputTransform: (data) =>
      normalizeBySchema(projectMembersOutputSchema, {
        members: unwrapArray(data).map((member) => normalizeProjectMember(member)),
      }),
    path: ({ workspace_id, project_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/${encodeURIComponent(String(project_id))}/members`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_list_workspace_tasks',
    title: 'List Nexus Workspace Tasks',
    description:
      'Use this tool when you need to list tasks across all projects in a workspace. Optionally filter by title search or task status, with configurable limit.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      search: z.string().optional().describe('Optional task title search.'),
      status: z.string().optional().describe('Optional task status filter.'),
      limit: limitSchema,
    },
    outputSchema: workspaceTasksListOutputSchema,
    outputTransform: (data) =>
      normalizeBySchema(workspaceTasksListOutputSchema, {
        tasks: unwrapArray(data),
      }),
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/projects/all-tasks`,
    query: ({ search, status, limit }) => ({ search, status, limit }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_list_project_tasks',
    title: 'List Nexus Project Tasks',
    description:
      'Use this tool when you need to list tasks within a specific project. Optionally filter by sprint ID or task status.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      project_id: idSchema('Project'),
      sprintId: z.string().optional().describe('Optional sprint ID filter.'),
      status: z.string().optional().describe('Optional task status filter.'),
    },
    outputSchema: projectTasksListOutputSchema,
    outputTransform: (data) =>
      normalizeBySchema(projectTasksListOutputSchema, {
        tasks: unwrapArray(data).map((task) => normalizeTask(task)),
      }),
    path: ({ workspace_id, project_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/${encodeURIComponent(String(project_id))}/tasks`,
    query: ({ sprintId, status }) => ({ sprintId, status }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_task',
    title: 'Get Nexus Task',
    description:
      'Use this tool when you need to get detailed information about a specific task by its ID. Returns title, description, type, status, priority, assignees, due date, labels, custom fields, and attachments.',
    inputSchema: { workspace_id: workspaceIdSchema, task_id: idSchema('Task') },
    outputSchema: taskOutputSchema,
    outputTransform: (data) => normalizeTask(data),
    path: ({ workspace_id, task_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/tasks/${encodeURIComponent(String(task_id))}`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_create_task',
    title: 'Create Nexus Task',
    description:
      'Use this tool when you need to create a new task in a project. Provide title (required), and optionally description, type, status, priority, sprint, parent task, assignees, due date, story points, labels, attachments, and custom fields.',
    inputSchema: { workspace_id: workspaceIdSchema, project_id: idSchema('Project'), ...createTaskInputShape },
    method: 'POST',
    outputSchema: taskOutputSchema,
    outputTransform: (data) => normalizeTask(data),
    path: ({ workspace_id, project_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/${encodeURIComponent(String(project_id))}/tasks`,
    body: ({ workspace_id: _workspace_id, project_id: _project_id, response_format: _response_format, ...body }) => body,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_update_task',
    title: 'Update Nexus Task',
    description:
      'Use this tool when you need to update a task\'s title, description, type, status, priority, sprint, assignees, due date, story points, actual hours, labels, attachments, custom fields, or completion info. All fields are optional.',
    inputSchema: { workspace_id: workspaceIdSchema, task_id: idSchema('Task'), ...updateTaskInputShape },
    method: 'PATCH',
    outputSchema: taskOutputSchema,
    outputTransform: (data) => normalizeTask(data),
    path: ({ workspace_id, task_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/tasks/${encodeURIComponent(String(task_id))}`,
    body: ({ workspace_id: _workspace_id, task_id: _task_id, response_format: _response_format, ...body }) => body,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_delete_task',
    title: 'Delete Nexus Task',
    description:
      'Use this tool when you need to permanently delete a task by its ID.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      task_id: idSchema('Task'),
    },
    method: 'DELETE',
    outputSchema: deleteActionOutputSchema,
    outputTransform: () => ({
      success: true,
      message: 'Task deleted successfully.',
    }),
    path: ({ workspace_id, task_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/tasks/${encodeURIComponent(String(task_id))}`,
    annotations: destroy,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_task_comments',
    title: 'Get All Comments For Task',
    description:
      'Use this tool when you need to list all comments on a specific task, ordered as returned by the server. Each comment includes its content, attachments, and the author\'s user details.',
    inputSchema: { workspace_id: workspaceIdSchema, task_id: idSchema('Task') },
    outputSchema: taskCommentsListOutputSchema,
    outputTransform: (data) =>
      normalizeBySchema(taskCommentsListOutputSchema, {
        comments: unwrapArray(data),
      }),
    path: ({ workspace_id, task_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/tasks/${encodeURIComponent(String(task_id))}/comments`,
    annotations: readOnly,
  });
}

function unwrapArray(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown[] }).data)) {
    return (data as { data: unknown[] }).data;
  }

  return [];
}

function parseJsonValue<T>(value: T): T | unknown {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// projects.estimated_hours and projects.budget are TEXT columns in Postgres,
// so the backend returns them as strings — coerce before schema validation.
function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizeProjectListResponse(data: unknown) {
  return unwrapArray(data).map((project) => normalizeProject(project));
}

function normalizeProject(data: unknown) {
  const project = data as Record<string, unknown>;

  return normalizeBySchema(projectOutputSchema, {
    ...project,
    description: project.description ?? null,
    type: project.type ?? null,
    status: project.status ?? null,
    priority: project.priority ?? null,
    owner_id: project.owner_id ?? null,
    lead_id: project.lead_id ?? null,
    start_date: project.start_date ?? null,
    end_date: project.end_date ?? null,
    estimated_hours: toNumberOrNull(project.estimated_hours),
    actual_hours: toNumberOrNull(project.actual_hours),
    budget: toNumberOrNull(project.budget),
    is_template: typeof project.is_template === 'boolean' ? project.is_template : project.is_template ?? null,
    kanban_stages: Array.isArray(parseJsonValue(project.kanban_stages)) ? parseJsonValue(project.kanban_stages) : [],
    attachments: normalizeAttachmentGroup(parseJsonValue(project.attachments)),
    collaborative_data: normalizeRecord(parseJsonValue(project.collaborative_data)),
    archived_at: project.archived_at ?? null,
    archived_by: project.archived_by ?? null,
  });
}

function normalizeProjectMember(data: unknown) {
  const member = data as Record<string, unknown>;
  return {
    ...member,
    user: member.user ?? null,
  };
}

function normalizeTask(data: unknown) {
  const task = data as Record<string, unknown>;
  const assignedTo = parseJsonValue(task.assigned_to);
  const labels = parseJsonValue(task.labels);
  const customFields = parseJsonValue(task.custom_fields);

  return normalizeBySchema(taskOutputSchema, {
    ...task,
    description: task.description ?? null,
    task_type: task.task_type ?? null,
    priority: task.priority ?? null,
    sprint_id: task.sprint_id ?? null,
    parent_task_id: task.parent_task_id ?? null,
    assigned_to: Array.isArray(assignedTo) ? assignedTo : [],
    assignees: normalizeAssignees(task.assignees),
    assignee_team_member_id: task.assignee_team_member_id ?? null,
    reporter_team_member_id: task.reporter_team_member_id ?? null,
    due_date: task.due_date ?? null,
    story_points: toNumberOrNull(task.story_points),
    actual_hours: toNumberOrNull(task.actual_hours),
    labels: Array.isArray(labels) ? labels : [],
    attachments: normalizeAttachmentGroup(parseJsonValue(task.attachments)),
    custom_fields: Array.isArray(customFields) ? customFields : [],
    collaborative_data: normalizeRecord(parseJsonValue(task.collaborative_data)),
    created_by: (task.created_by as string | null | undefined) ?? null,
    updated_by: (task.updated_by as string | null | undefined) ?? null,
    completed_by: (task.completed_by as string | null | undefined) ?? null,
    completed_at: (task.completed_at as string | null | undefined) ?? null,
    updated_by_user: isObject(task.updated_by_user) ? task.updated_by_user : null,
    created_by_user: isObject(task.created_by_user) ? task.created_by_user : null,
  });
}

function normalizeAttachmentGroup(data: unknown) {
  const attachments = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};

  return {
    note_attachment: Array.isArray(attachments.note_attachment) ? attachments.note_attachment : [],
    file_attachment: Array.isArray(attachments.file_attachment) ? attachments.file_attachment : [],
    event_attachment: Array.isArray(attachments.event_attachment) ? attachments.event_attachment : [],
  };
}

function normalizeRecord(data: unknown) {
  return data && typeof data === 'object' && !Array.isArray(data) ? (data as Record<string, unknown>) : {};
}

function normalizeAssignees(assignees: unknown): unknown[] {
  if (!Array.isArray(assignees)) return [];
  return assignees.filter((a): a is Record<string, unknown> =>
    a !== null && typeof a === 'object' && !Array.isArray(a)
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

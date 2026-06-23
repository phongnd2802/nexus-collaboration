import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { dataObjectSchema, idSchema, limitSchema, workspaceIdSchema } from '../schemas/common.js';
import type { NexusApiClient } from '../services/nexus-api.js';
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

export function registerProjectTools(server: McpServer, client: NexusApiClient) {
  registerApiTool(server, client, {
    name: 'nexus_list_projects',
    title: 'List Nexus Projects',
    description: 'List projects in a workspace with optional status and type filters.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      status: z.string().optional().describe('Optional project status filter.'),
      type: z.string().optional().describe('Optional project type filter.'),
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/projects`,
    query: ({ status, type }) => ({ status, type }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_project',
    title: 'Get Nexus Project',
    description: 'Get project details by ID.',
    inputSchema: { workspace_id: workspaceIdSchema, project_id: idSchema('Project') },
    path: ({ workspace_id, project_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/${encodeURIComponent(String(project_id))}`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_create_project',
    title: 'Create Nexus Project',
    description: 'Create a project. The data object should match CreateProjectDto.',
    inputSchema: { workspace_id: workspaceIdSchema, data: dataObjectSchema },
    method: 'POST',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/projects`,
    body: ({ data }) => data,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_list_workspace_tasks',
    title: 'List Nexus Workspace Tasks',
    description: 'List tasks across all projects in a workspace, optionally filtered by title search and status.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      search: z.string().optional().describe('Optional task title search.'),
      status: z.string().optional().describe('Optional task status filter.'),
      limit: limitSchema,
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/projects/all-tasks`,
    query: ({ search, status, limit }) => ({ search, status, limit }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_list_project_tasks',
    title: 'List Nexus Project Tasks',
    description: 'List tasks for a project, optionally filtered by sprint ID or status.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      project_id: idSchema('Project'),
      sprintId: z.string().optional().describe('Optional sprint ID filter.'),
      status: z.string().optional().describe('Optional task status filter.'),
    },
    path: ({ workspace_id, project_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/${encodeURIComponent(String(project_id))}/tasks`,
    query: ({ sprintId, status }) => ({ sprintId, status }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_task',
    title: 'Get Nexus Task',
    description: 'Get task details by ID.',
    inputSchema: { workspace_id: workspaceIdSchema, task_id: idSchema('Task') },
    path: ({ workspace_id, task_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/tasks/${encodeURIComponent(String(task_id))}`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_create_task',
    title: 'Create Nexus Task',
    description: 'Create a task in a project. The data object should match CreateTaskDto.',
    inputSchema: { workspace_id: workspaceIdSchema, project_id: idSchema('Project'), data: dataObjectSchema },
    method: 'POST',
    path: ({ workspace_id, project_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/${encodeURIComponent(String(project_id))}/tasks`,
    body: ({ data }) => data,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_update_task',
    title: 'Update Nexus Task',
    description: 'Update a task. The data object should match UpdateTaskDto.',
    inputSchema: { workspace_id: workspaceIdSchema, task_id: idSchema('Task'), data: dataObjectSchema },
    method: 'PATCH',
    path: ({ workspace_id, task_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/projects/tasks/${encodeURIComponent(String(task_id))}`,
    body: ({ data }) => data,
    annotations: write,
  });
}

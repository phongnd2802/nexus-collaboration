import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { dataObjectSchema, idSchema, workspaceIdSchema } from '../schemas/common.js';
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

export function registerWorkspaceTools(server: McpServer, client: NexusApiClient) {
  registerApiTool(server, client, {
    name: 'nexus_list_workspaces',
    title: 'List Nexus Workspaces',
    description: 'List all Nexus workspaces available to the authenticated user.',
    inputSchema: {},
    path: () => 'workspaces',
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_workspace',
    title: 'Get Nexus Workspace',
    description: 'Get details for a Nexus workspace by ID.',
    inputSchema: { workspace_id: workspaceIdSchema },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_create_workspace',
    title: 'Create Nexus Workspace',
    description:
      'Create a new Nexus workspace. The data object should match CreateWorkspaceDto, for example name and optional description/settings fields.',
    inputSchema: { data: dataObjectSchema },
    method: 'POST',
    path: () => 'workspaces',
    body: ({ data }) => data,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_update_workspace',
    title: 'Update Nexus Workspace',
    description: 'Update workspace details. Requires admin or owner permission in the workspace.',
    inputSchema: { workspace_id: workspaceIdSchema, data: dataObjectSchema },
    method: 'PATCH',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}`,
    body: ({ data }) => data,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_workspace_members',
    title: 'Get Nexus Workspace Members',
    description: 'List members of a Nexus workspace.',
    inputSchema: { workspace_id: workspaceIdSchema },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/members`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_workspace_stats',
    title: 'Get Nexus Workspace Stats',
    description: 'Get member and invitation statistics for a Nexus workspace.',
    inputSchema: { workspace_id: workspaceIdSchema },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/stats`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_invite_workspace_member',
    title: 'Invite Nexus Workspace Member',
    description:
      'Invite a member to a workspace. Requires admin or owner permission. The data object should match InviteMemberDto.',
    inputSchema: { workspace_id: workspaceIdSchema, data: dataObjectSchema },
    method: 'POST',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/members/invite`,
    body: ({ data }) => data,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_update_workspace_member_role',
    title: 'Update Nexus Workspace Member Role',
    description: 'Update a workspace member role. Requires admin or owner permission.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      member_id: idSchema('Workspace member'),
      role: z.enum(['owner', 'admin', 'member']).describe('New workspace role.'),
    },
    method: 'PATCH',
    path: ({ workspace_id, member_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/members/${encodeURIComponent(String(member_id))}/role`,
    body: ({ role }) => ({ role }),
    annotations: write,
  });
}

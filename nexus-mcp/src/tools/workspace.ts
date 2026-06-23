import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { idSchema, workspaceIdSchema } from '../schemas/common.js';
import { workspaceMembersGetOutputSchema } from '../schemas/workspace-members.js';
import { workspaceGetOutputShape } from '../schemas/workspace.js';
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
    name: 'nexus_get_workspace',
    title: 'Get Nexus Workspace',
    description: 'Get details for a Nexus workspace by ID.',
    inputSchema: { workspace_id: workspaceIdSchema },
    outputSchema: z.object(workspaceGetOutputShape),
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_update_workspace',
    title: 'Update Nexus Workspace',
    description:
      'Update workspace details. Accepts any subset of name, description, logo, and website. Requires admin or owner permission in the workspace.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      name: z.string().max(100).optional().describe('Workspace name.'),
      description: z.string().max(500).optional().describe('Workspace description.'),
    },
    method: 'PATCH',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}`,
    body: ({ name, description, logo, website }) => ({
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(logo !== undefined ? { logo } : {}),
      ...(website !== undefined ? { website } : {}),
    }),
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_workspace_members',
    title: 'Get Nexus Workspace Members',
    description: 'List members of a Nexus workspace.',
    inputSchema: { workspace_id: workspaceIdSchema },
    outputSchema: workspaceMembersGetOutputSchema,
    outputTransform: (data) => ({ members: data }),
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/members`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_invite_workspace_member',
    title: 'Invite Nexus Workspace Member',
    description:
      'Invite a member to a workspace. Requires admin or owner permission. Accepts email, optional role, and optional message.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      email: z.string().email().describe('Email address to invite.'),
      role: z.enum(['owner', 'admin', 'member']).default('member').describe('Workspace role for the invited member.'),
      message: z.string().max(2000).optional().describe('Optional invitation message.'),
    },
    method: 'POST',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/members/invite`,
    body: ({ email, role, message }) => ({
      email,
      role,
      ...(message !== undefined ? { message } : {}),
    }),
    outputSchema: z.object({
      success: z.literal(true),
      invitationId: z.string().min(1),
      email: z.string().email(),
      status: z.literal('pending'),
      expiresAt: z.string().datetime(),
      message: z.string().min(1),
    }),
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

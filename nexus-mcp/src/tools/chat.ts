import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { dataObjectSchema, idSchema, limitSchema, offsetSchema, workspaceIdSchema } from '../schemas/common.js';
import type { NexusApiClient } from '../services/nexus-api.js';
import { registerApiTool } from './register-api-tool.js';

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export function registerChatTools(server: McpServer, client: NexusApiClient) {
  registerApiTool(server, client, {
    name: 'nexus_list_channels',
    title: 'List Nexus Channels',
    description: 'List channels in a workspace that the authenticated user can access.',
    inputSchema: { workspace_id: workspaceIdSchema },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/channels`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_channel_messages',
    title: 'Get Nexus Channel Messages',
    description: 'Get channel messages with limit and offset pagination.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      channel_id: idSchema('Channel'),
      limit: limitSchema,
      offset: offsetSchema,
    },
    path: ({ workspace_id, channel_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/channels/${encodeURIComponent(String(channel_id))}/messages`,
    query: ({ limit, offset }) => ({ limit, offset }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_send_channel_message',
    title: 'Send Nexus Channel Message',
    description:
      'Send a message to a channel. The data object should match SendMessageDto, commonly including content/message fields.',
    inputSchema: { workspace_id: workspaceIdSchema, channel_id: idSchema('Channel'), data: dataObjectSchema },
    method: 'POST',
    path: ({ workspace_id, channel_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/channels/${encodeURIComponent(String(channel_id))}/messages`,
    body: ({ data }) => data,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });
}

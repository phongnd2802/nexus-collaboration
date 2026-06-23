import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { queryObjectSchema, workspaceIdSchema } from '../schemas/common.js';
import type { NexusApiClient } from '../services/nexus-api.js';
import { registerApiTool } from './register-api-tool.js';

export function registerDashboardTools(server: McpServer, client: NexusApiClient) {
  registerApiTool(server, client, {
    name: 'nexus_get_dashboard',
    title: 'Get Nexus Dashboard',
    description:
      'Get comprehensive dashboard data for a workspace. Optional query can include the backend dashboard filters.',
    inputSchema: { workspace_id: workspaceIdSchema, query: queryObjectSchema },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/dashboard`,
    query: ({ query }) => query as Record<string, unknown> | undefined,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  });
}

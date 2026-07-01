// import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// import { queryObjectSchema, workspaceIdSchema } from '../schemas/common.js';
// import { dashboardOutputSchema } from '../schemas/dashboard.js';
// import type { NexusApiClient } from '../services/nexus-api.js';
// import { registerApiTool } from './register-api-tool.js';

// export function registerDashboardTools(server: McpServer, client: NexusApiClient) {
//   registerApiTool(server, client, {
//     name: 'nexus_get_dashboard',
//     title: 'Get Nexus Dashboard',
//     description:
//       'Use this tool when you need an overview of workspace performance and activity. Returns metrics (project/task counts, engagement, productivity), recent activity feed, activity trends, team productivity breakdown, and project analytics. Accepts optional query params: startDate, endDate, period (day/week/month/year), and activity limit.',
//     inputSchema: { workspace_id: workspaceIdSchema, query: queryObjectSchema },
//     outputSchema: dashboardOutputSchema,
//     path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/dashboard`,
//     query: ({ query }) => query as Record<string, unknown> | undefined,
//     annotations: {
//       readOnlyHint: true,
//       destructiveHint: false,
//       idempotentHint: true,
//       openWorldHint: true,
//     },
//   });
// }

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { limitSchema, workspaceIdSchema } from '../schemas/common.js';
import { ragSearchFilesOutputSchema } from '../schemas/rag.js';
import type { NexusApiClient } from '../services/nexus-api.js';
import { registerApiTool } from './register-api-tool.js';

const readOnlyWorkspaceData = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

export function registerRagTools(server: McpServer, client: NexusApiClient) {
  registerApiTool(server, client, {
    name: 'nexus_search_files_rag',
    title: 'Search Indexed Workspace Files',
    description:
      'Search indexed workspace files using RAG. Use this when the answer is likely inside uploaded documents from file management. Returns only files the current user can access in the current workspace.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      query: z.string().min(1).describe('Question or search query to run against indexed workspace files.'),
      limit: limitSchema.describe('Maximum number of matching file snippets to return.'),
      min_score: z.number().min(0).max(1).default(0.5).describe('Minimum retrieval score from 0 to 1.'),
    },
    outputSchema: ragSearchFilesOutputSchema,
    method: 'POST',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/rag/search`,
    body: ({ query, limit, min_score }) => ({ query, limit, min_score }),
    annotations: readOnlyWorkspaceData,
  });
}

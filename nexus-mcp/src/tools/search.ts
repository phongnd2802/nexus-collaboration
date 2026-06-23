import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { limitSchema, workspaceIdSchema } from '../schemas/common.js';
import type { NexusApiClient } from '../services/nexus-api.js';
import { registerApiTool } from './register-api-tool.js';

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export function registerSearchTools(server: McpServer, client: NexusApiClient) {
  registerApiTool(server, client, {
    name: 'nexus_search',
    title: 'Search Nexus Workspace',
    description:
      'Run universal search across Nexus workspace content. Supports optional type/filter/sort parameters accepted by the backend search endpoint.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      q: z.string().min(1).describe('Search query text.'),
      types: z.string().optional().describe('Optional comma-separated content types.'),
      limit: limitSchema,
      offset: z.number().int().min(0).default(0).describe('Offset for paginated results.'),
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/search`,
    query: ({ q, types, limit, offset }) => ({ q, types, limit, offset }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_search_suggestions',
    title: 'Get Nexus Search Suggestions',
    description: 'Get search suggestions for a workspace query prefix.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      q: z.string().min(1).describe('Partial query text.'),
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/search/suggestions`,
    query: ({ q }) => ({ q }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_semantic_search',
    title: 'Run Nexus Semantic Search',
    description: 'Run semantic search using AI embeddings across selected Nexus content types.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      q: z.string().min(1).describe('Semantic search query.'),
      types: z
        .string()
        .optional()
        .describe('Optional comma-separated content types: note,message,file,task,meeting_transcript.'),
      limit: limitSchema,
      minScore: z.number().min(0).max(1).optional().describe('Minimum similarity score from 0 to 1.'),
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/search/semantic`,
    query: ({ q, types, limit, minScore }) => ({ q, types, limit, minScore }),
    annotations: readOnly,
  });
}

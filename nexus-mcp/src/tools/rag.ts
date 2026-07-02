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
    title: 'Search Indexed Workspace File Content',
    description:
      'Search indexed uploaded workspace files using RAG. Use this for answers grounded in file content from file management, such as PDFs, office documents, manuals, policies, requirements, specs, and meeting artifacts that were uploaded as files. Returns raw matching chunk content, snippet preview, citation, page, and source metadata for files the current user can access in the current workspace.',
    search: {
      aliases: [
        'rag file search',
        'search workspace documents',
        'search uploaded files',
        'search file contents',
        'workspace knowledge search',
        'answer from uploaded documents',
      ],
      intents: ['document_search', 'knowledge_retrieval', 'evidence_lookup', 'answer_from_files', 'uploaded_file_search'],
      entities: [
        'uploaded files',
        'indexed files',
        'file contents',
        'uploaded documents',
        'policies',
        'procedures',
        'specifications',
        'requirements',
        'meeting transcripts',
        'meeting attachments',
        'decisions',
        'manuals',
      ],
      verbs: ['search', 'find', 'lookup', 'retrieve', 'answer', 'cite'],
      keywords: ['rag', 'retrieval', 'document evidence', 'source snippets', 'workspace files', 'file content'],
    },
    inputSchema: {
      workspace_id: workspaceIdSchema,
      query: z.string().min(1).describe('Question or search query to run against indexed workspace files.'),
      limit: limitSchema.describe('Maximum number of matching file content chunks to return.'),
      min_score: z.number().min(0).max(1).default(0.5).describe('Minimum retrieval score from 0 to 1.'),
    },
    outputSchema: ragSearchFilesOutputSchema,
    method: 'POST',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/rag/search`,
    body: ({ query, limit, min_score }) => ({ query, limit, min_score }),
    annotations: readOnlyWorkspaceData,
  });
}

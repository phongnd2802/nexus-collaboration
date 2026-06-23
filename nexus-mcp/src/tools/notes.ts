import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { dataObjectSchema, idSchema, limitSchema, offsetSchema, workspaceIdSchema } from '../schemas/common.js';
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

export function registerNotesTools(server: McpServer, client: NexusApiClient) {
  registerApiTool(server, client, {
    name: 'nexus_list_notes',
    title: 'List Nexus Notes',
    description: 'List notes in a workspace, optionally filtering by parent, deleted status, or archived status.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      parent_id: z.string().optional().describe('Optional parent note/folder ID.'),
      is_deleted: z.boolean().optional().describe('True for deleted notes, false for active notes.'),
      is_archived: z.boolean().optional().describe('True for archived notes, false for non-archived notes.'),
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/notes`,
    query: ({ parent_id, is_deleted, is_archived }) => ({ parent_id, is_deleted, is_archived }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_search_notes',
    title: 'Search Nexus Notes',
    description: 'Search notes with keyword, semantic, or hybrid mode.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      q: z.string().min(1).describe('Search query text.'),
      mode: z.enum(['keyword', 'semantic', 'hybrid']).default('hybrid').describe('Search mode.'),
      limit: limitSchema,
      offset: offsetSchema,
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/notes/search`,
    query: ({ q, mode, limit, offset }) => ({ q, mode, limit, offset }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_note',
    title: 'Get Nexus Note',
    description: 'Get note details by ID.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      note_id: idSchema('Note'),
      include_deleted: z.boolean().default(false).describe('Whether to include soft-deleted notes.'),
    },
    path: ({ workspace_id, note_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/notes/${encodeURIComponent(String(note_id))}`,
    query: ({ include_deleted }) => ({ include_deleted }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_create_note',
    title: 'Create Nexus Note',
    description:
      'Create a Nexus note. The data object should match CreateNoteDto, for example title, content, parent_id, tags.',
    inputSchema: { workspace_id: workspaceIdSchema, data: dataObjectSchema },
    method: 'POST',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/notes`,
    body: ({ data }) => data,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_update_note',
    title: 'Update Nexus Note',
    description: 'Update a Nexus note. The data object should match UpdateNoteDto.',
    inputSchema: { workspace_id: workspaceIdSchema, note_id: idSchema('Note'), data: dataObjectSchema },
    method: 'PATCH',
    path: ({ workspace_id, note_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/notes/${encodeURIComponent(String(note_id))}`,
    body: ({ data }) => data,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_import_url_note',
    title: 'Import URL As Nexus Note',
    description: 'Import readable content from a URL and create a Nexus note.',
    inputSchema: { workspace_id: workspaceIdSchema, data: dataObjectSchema },
    method: 'POST',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/notes/import/url`,
    body: ({ data }) => data,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_archive_note',
    title: 'Archive Nexus Note',
    description: 'Archive a note and its sub-notes.',
    inputSchema: { workspace_id: workspaceIdSchema, note_id: idSchema('Note') },
    method: 'POST',
    path: ({ workspace_id, note_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/notes/${encodeURIComponent(String(note_id))}/archive`,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });
}

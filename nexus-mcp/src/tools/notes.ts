import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { idSchema, limitSchema, offsetSchema, workspaceIdSchema } from '../schemas/common.js';
import {
  createNoteInputShape,
  createNoteOutputSchema,
  noteArchiveOutputSchema,
  noteDeleteOutputSchema,
  noteOutputSchema,
  noteRestoreOutputSchema,
  notesListOutputSchema,
  searchNotesListOutputSchema,
  updateNoteInputShape,
  noteUnarchiveOutputSchema,
} from '../schemas/notes.js';
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
    outputSchema: notesListOutputSchema,
    outputTransform: (data) => ({ notes: data }),
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
    outputSchema: searchNotesListOutputSchema,
    outputTransform: (data) => ({ notes: data }),
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
    outputSchema: noteOutputSchema,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_create_note',
    title: 'Create Nexus Note',
    description:
      'Create a Nexus note with title and content, and optional parent note, tags, cover image, icon, public flag, and attachments.',
    inputSchema: { workspace_id: workspaceIdSchema, ...createNoteInputShape },
    method: 'POST',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/notes`,
    body: ({ title, content, parent_id, tags, cover_image, icon, is_public, attachments }) => ({
      title,
      content,
      ...(parent_id !== undefined ? { parent_id } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(cover_image !== undefined ? { cover_image } : {}),
      ...(icon !== undefined ? { icon } : {}),
      ...(is_public !== undefined ? { is_public } : {}),
      ...(attachments !== undefined ? { attachments } : {}),
    }),
    outputSchema: createNoteOutputSchema,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_update_note',
    title: 'Update Nexus Note',
    description:
      'Update a Nexus note with optional title, content, tags, public flag, favorite flag, and attachments.',
    inputSchema: { workspace_id: workspaceIdSchema, note_id: idSchema('Note'), ...updateNoteInputShape },
    method: 'PATCH',
    path: ({ workspace_id, note_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/notes/${encodeURIComponent(String(note_id))}`,
    body: ({ title, content, tags, is_public, is_favorite, attachments }) => ({
      ...(title !== undefined ? { title } : {}),
      ...(content !== undefined ? { content } : {}),
      ...(tags !== undefined ? { tags } : {}),
      ...(is_public !== undefined ? { is_public } : {}),
      ...(is_favorite !== undefined ? { is_favorite } : {}),
      ...(attachments !== undefined ? { attachments } : {}),
    }),
    outputSchema: createNoteOutputSchema,
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
    outputSchema: noteArchiveOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });

  registerApiTool(server, client, {
    name: 'nexus_delete_note',
    title: 'Delete Nexus Note',
    description: 'Soft delete a note and all its sub-notes.',
    inputSchema: { workspace_id: workspaceIdSchema, note_id: idSchema('Note') },
    method: 'DELETE',
    path: ({ workspace_id, note_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/notes/${encodeURIComponent(String(note_id))}`,
    outputSchema: noteDeleteOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });

  registerApiTool(server, client, {
    name: 'nexus_restore_note',
    title: 'Restore Nexus Note',
    description: 'Restore a soft-deleted note and all its sub-notes.',
    inputSchema: { workspace_id: workspaceIdSchema, note_id: idSchema('Note') },
    method: 'POST',
    path: ({ workspace_id, note_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/notes/${encodeURIComponent(String(note_id))}/restore`,
    outputSchema: noteRestoreOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });

  registerApiTool(server, client, {
    name: 'nexus_unarchive_note',
    title: 'Unarchive Nexus Note',
    description: 'Unarchive a note and all its sub-notes.',
    inputSchema: { workspace_id: workspaceIdSchema, note_id: idSchema('Note') },
    method: 'POST',
    path: ({ workspace_id, note_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/notes/${encodeURIComponent(String(note_id))}/unarchive`,
    outputSchema: noteUnarchiveOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });
}

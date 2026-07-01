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
  shareNoteInputShape,
  shareNoteOutputSchema,
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
    description:
      'Use this tool when you need to list workspace notes in the Nexus Notes module. These are shared workspace documents, not private AI memory. Filter by parent_id for hierarchical browsing, is_deleted to include soft-deleted notes, or is_archived to show/hide archived notes.',
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
    description:
      'Use this tool when you need to search workspace notes in the Nexus Notes module using keyword, semantic (AI embedding), or hybrid mode. These results are workspace documents, not private AI memory. Provide a search query and optionally paginate with limit/offset.',
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
    description:
      'Use this tool when you need to get a workspace note by ID from the Nexus Notes module. Returns full note content, metadata, author info, collaborators, and attachments. This is for persisted workspace documents, not private AI memory. Optionally include soft-deleted notes with include_deleted=true.',
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
      'Use this tool when you need to create a new workspace note in the Nexus Notes module. Use it for meeting notes, shared documentation, or other workspace-visible documents. Do not use it to store private AI memory, user preferences, or future-chat reminders. Provide title and content (required), and optionally set a parent_id for nesting, tags, cover_image, icon, is_public flag, and file/note/event attachments.',
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
      'Use this tool when you need to update an existing workspace note in the Nexus Notes module. Only use it when the user wants to change a persisted workspace document. Do not use it for private AI memory, user preferences, or future-chat reminders. All fields are optional—only provided fields will be updated.',
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
    description:
      'Use this tool when you need to archive a note and all its sub-notes to hide them from the default list view. Archived notes can be unarchived later.',
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
    description:
      'Use this tool when you need to soft delete a note and all its sub-notes. Deleted notes can be restored or viewed with include_deleted=true on list/get queries.',
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
    description:
      'Use this tool when you need to restore a soft-deleted note and all its sub-notes back to active status.',
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
    description:
      'Use this tool when you need to unarchive a previously archived note and all its sub-notes, making them visible in the default list view again.',
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

  registerApiTool(server, client, {
    name: 'nexus_share_note',
    title: 'Share Nexus Note',
    description:
      'Use this tool when you need to share a workspace note with workspace members. This applies to Nexus Notes documents, not private AI memory. Provide an array of user_ids and optionally set a permission level (read/write/admin).',
    inputSchema: { workspace_id: workspaceIdSchema, note_id: idSchema('Note'), ...shareNoteInputShape },
    method: 'POST',
    path: ({ workspace_id, note_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/notes/${encodeURIComponent(String(note_id))}/share`,
    body: ({ user_ids, permission }) => ({
      user_ids,
      ...(permission !== undefined ? { permission } : {}),
    }),
    outputSchema: shareNoteOutputSchema,
    annotations: write,
  });
}

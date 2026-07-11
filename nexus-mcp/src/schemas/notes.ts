import { z } from 'zod';

// name/email may be null or non-standard when the user record is incomplete.
export const noteAuthorOutputSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().nullable(),
    email: z.string().nullable(),
  })
  .strip();

export const noteCollaboratorOutputSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().nullable(),
    email: z.string().nullable(),
  })
  .strip();

// Stored notes may miss attachment keys (input allows partial objects) or hold
// null — normalize to an object with all three arrays present.
export const noteAttachmentsOutputSchema = z.preprocess(
  (value) => (value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {}),
  z
    .object({
      file_attachment: z.array(z.unknown()).default([]),
      note_attachment: z.array(z.unknown()).default([]),
      event_attachment: z.array(z.unknown()).default([]),
    })
    .strip(),
);

// Legacy rows can hold collaborative_data as a double-encoded JSON string.
export const collaborativeDataOutputSchema = z.preprocess((value) => {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : {};
}, z.record(z.unknown()));

export const noteAttachmentsInputSchema = z
  .object({
    file_attachment: z.array(z.string().uuid()).optional(),
    note_attachment: z.array(z.string().uuid()).optional(),
    event_attachment: z.array(z.string().uuid()).optional(),
  })
  .strip();

export const noteOutputSchema = z
  .object({
    id: z.string().min(1),
    workspace_id: z.string().min(1),
    title: z.string(),
    content: z.string(),
    content_text: z.string().nullable(),
    parent_id: z.string().nullable(),
    author_id: z.string().min(1),
    created_by: z.string().min(1),
    last_edited_by: z.string().nullish(),
    view_count: z.number(),
    is_published: z.boolean(),
    tags: z.array(z.string()),
    attachments: noteAttachmentsOutputSchema,
    is_public: z.boolean(),
    deleted_at: z.string().datetime().nullable(),
    archived_at: z.string().datetime().nullable(),
    is_favorite: z.boolean(),
    collaborative_data: collaborativeDataOutputSchema,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    // author is null when the author's user record cannot be resolved.
    author: noteAuthorOutputSchema.nullable(),
    collaborators: z.array(noteCollaboratorOutputSchema),
  })
  .strip();

export const notesListOutputSchema = z.object({
  notes: z.array(noteOutputSchema),
});

export const searchNoteOutputSchema = noteOutputSchema.omit({
  author: true,
  collaborators: true,
});

export const searchNotesListOutputSchema = z.object({
  notes: z.array(searchNoteOutputSchema),
});

export const createNoteInputShape = {
  title: z.string().min(1),
  content: z.string().min(1),
  parent_id: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  cover_image: z.string().optional().describe('Cover image URL for the note.'),
  icon: z.string().optional().describe('Note icon (emoji or icon identifier).'),
  is_public: z.boolean().optional().default(false),
  attachments: noteAttachmentsInputSchema.optional(),
};

export const updateNoteInputShape = {
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
  cover_image: z.string().optional().describe('Updated cover image URL for the note.'),
  icon: z.string().optional().describe('Updated note icon (emoji or icon identifier).'),
  is_public: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
  attachments: noteAttachmentsInputSchema.optional(),
};

export const shareNoteInputShape = {
  user_ids: z.array(z.string().uuid()).min(1),
  permission: z.enum(['read', 'write', 'admin']).optional(),
};

export const createNoteOutputSchema = z
  .object({
    id: z.string().min(1),
    workspace_id: z.string().min(1),
    title: z.string(),
    content: z.string(),
    content_text: z.string().nullable(),
    parent_id: z.string().nullable(),
    author_id: z.string().min(1),
    created_by: z.string().min(1),
    last_edited_by: z.string().nullish(),
    view_count: z.number(),
    is_published: z.boolean(),
    tags: z.array(z.string()),
    attachments: noteAttachmentsOutputSchema,
    is_public: z.boolean(),
    deleted_at: z.string().datetime().nullable(),
    archived_at: z.string().datetime().nullable(),
    is_favorite: z.boolean(),
    collaborative_data: collaborativeDataOutputSchema,
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strip();

export const noteDeleteOutputSchema = z
  .object({
    success: z.literal(true),
    message: z.string().min(1),
    deletedCount: z.number().int().nonnegative(),
  })
  .strip();

export const noteRestoreOutputSchema = z
  .object({
    success: z.literal(true),
    message: z.string().min(1),
    restoredCount: z.number().int().nonnegative(),
  })
  .strip();

export const noteArchiveOutputSchema = z
  .object({
    success: z.literal(true),
    message: z.string().min(1),
    archivedCount: z.number().int().nonnegative(),
  })
  .strip();

export const noteUnarchiveOutputSchema = z
  .object({
    success: z.literal(true),
    message: z.string().min(1),
    unarchivedCount: z.number().int().nonnegative(),
  })
  .strip();

export const shareNoteOutputSchema = z
  .object({
    success: z.literal(true),
    message: z.string().min(1),
    shared_count: z.number().int().nonnegative(),
    total_shared_users: z.number().int().nonnegative(),
  })
  .strip();

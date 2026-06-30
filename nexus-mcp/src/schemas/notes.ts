import { z } from 'zod';

export const noteAuthorOutputSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
  })
  .strip();

export const noteCollaboratorOutputSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email(),
  })
  .strip();

export const noteAttachmentsOutputSchema = z
  .object({
    file_attachment: z.array(z.unknown()),
    note_attachment: z.array(z.unknown()),
    event_attachment: z.array(z.unknown()),
  })
  .strip();

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
    collaborative_data: z.record(z.unknown()),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    author: noteAuthorOutputSchema,
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
  is_public: z.boolean().optional().default(false),
  attachments: noteAttachmentsInputSchema.optional(),
};

export const updateNoteInputShape = {
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional(),
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
    collaborative_data: z.record(z.unknown()),
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

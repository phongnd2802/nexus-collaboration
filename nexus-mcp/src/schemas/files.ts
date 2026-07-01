import { z } from 'zod';

export const createFolderInputShape = {
  name: z.string().min(1).describe('Folder name.'),
  parent_id: z.string().uuid().optional().describe('Parent folder ID. Omit to create the folder at the workspace root.'),
  description: z
    .string()
    .optional()
    .describe('Optional folder description. Note: not currently persisted by the backend — accepted but has no visible effect.'),
};

export const folderOutputSchema = z
  .object({
    id: z.string().min(1),
    workspace_id: z.string().min(1),
    name: z.string().min(1),
    parent_id: z.string().nullable().optional(),
    created_by: z.string().nullable().optional(),
    collaborative_data: z.record(z.unknown()).optional(),
    is_deleted: z.boolean().optional(),
    deleted_at: z.string().nullable().optional(),
    deleted_by: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .strip();

export const foldersListOutputSchema = z.object({
  folders: z.array(folderOutputSchema),
});

export const updateFolderInputShape = {
  name: z.string().min(1).optional().describe('New folder name.'),
};

export const moveFolderInputShape = {
  target_parent_id: z
    .string()
    .uuid()
    .nullable()
    .optional()
    .describe('New parent folder ID. Pass null to move the folder to the workspace root. Omit to keep the current parent.'),
  new_name: z.string().min(1).optional().describe('Optional new name to apply during the move.'),
};

export const copyFolderInputShape = {
  target_parent_id: z
    .string()
    .uuid()
    .optional()
    .describe('Parent folder ID to copy into. Omit to copy into the workspace root.'),
  new_name: z.string().min(1).optional().describe('Optional name for the copy. Defaults to "<original name> (Copy)".'),
};

export const folderIdsInputShape = {
  folder_ids: z.array(z.string().min(1)).min(1).describe('Folder IDs to operate on. At least one is required.'),
};

export const moveMultipleFoldersInputShape = {
  ...folderIdsInputShape,
  target_parent_id: z
    .string()
    .nullable()
    .optional()
    .describe('New parent folder ID for all folders. Pass null or omit to move them to the workspace root.'),
};

export const copyMultipleFoldersInputShape = {
  ...folderIdsInputShape,
  target_parent_id: z
    .string()
    .nullable()
    .optional()
    .describe('Parent folder ID to copy all folders into. Pass null or omit to copy into the workspace root.'),
};

export const folderDeleteRecursiveOutputSchema = z
  .object({
    message: z.string().min(1),
    deleted_folders_count: z.number().nonnegative(),
    deleted_files_count: z.number().nonnegative(),
    deleted_at: z.string().optional(),
  })
  .strip();

export const folderRestoreOutputSchema = z
  .object({
    message: z.string().min(1),
    restored_folders_count: z.number().nonnegative(),
    restored_files_count: z.number().nonnegative(),
  })
  .strip();

const batchFolderResultItemSchema = z
  .object({
    folderId: z.string().min(1),
    name: z.string().optional(),
    newFolderId: z.string().optional(),
  })
  .strip();

const batchFolderFailureItemSchema = z
  .object({
    folderId: z.string().min(1),
    reason: z.string(),
  })
  .strip();

export const moveMultipleFoldersOutputSchema = z
  .object({
    message: z.string().min(1),
    moved_count: z.number().nonnegative(),
    failed_count: z.number().nonnegative(),
    success: z.array(batchFolderResultItemSchema),
    failed: z.array(batchFolderFailureItemSchema),
  })
  .strip();

export const copyMultipleFoldersOutputSchema = z
  .object({
    message: z.string().min(1),
    copied_count: z.number().nonnegative(),
    failed_count: z.number().nonnegative(),
    success: z.array(batchFolderResultItemSchema),
    failed: z.array(batchFolderFailureItemSchema),
  })
  .strip();

const deleteMultipleFoldersResultItemSchema = z
  .object({
    folderId: z.string().min(1),
    folders_deleted: z.number().nonnegative(),
    files_deleted: z.number().nonnegative(),
  })
  .strip();

export const deleteMultipleFoldersOutputSchema = z
  .object({
    message: z.string().min(1),
    deleted_folders_count: z.number().nonnegative(),
    deleted_files_count: z.number().nonnegative(),
    deleted_at: z.string().optional(),
    success: z.array(deleteMultipleFoldersResultItemSchema),
    failed: z.array(batchFolderFailureItemSchema),
  })
  .strip();

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { idSchema, workspaceIdSchema } from '../schemas/common.js';
import {
  copyFolderInputShape,
  copyMultipleFoldersInputShape,
  copyMultipleFoldersOutputSchema,
  createFolderInputShape,
  deleteMultipleFoldersOutputSchema,
  folderDeleteRecursiveOutputSchema,
  folderIdsInputShape,
  folderOutputSchema,
  folderRestoreOutputSchema,
  foldersListOutputSchema,
  moveFolderInputShape,
  moveMultipleFoldersInputShape,
  moveMultipleFoldersOutputSchema,
  updateFolderInputShape,
} from '../schemas/files.js';
import { normalizeBySchema } from '../services/normalize.js';
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

const destroy = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
};

export function registerFilesTools(server: McpServer, client: NexusApiClient) {
  registerApiTool(server, client, {
    name: 'nexus_create_folder',
    title: 'Create Nexus Folder',
    description:
      'Use this tool when you need to create a new folder in a workspace for organizing files. Provide name (required), and optionally a parent_id to nest it inside another folder.',
    inputSchema: { workspace_id: workspaceIdSchema, ...createFolderInputShape },
    method: 'POST',
    outputSchema: folderOutputSchema,
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/files/folders`,
    body: ({ workspace_id: _workspace_id, response_format: _response_format, ...body }) => body,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });

  registerApiTool(server, client, {
    name: 'nexus_list_folders',
    title: 'List Nexus Folders',
    description:
      'Use this tool when you need to list folders in a workspace. Optionally filter by parent_id to browse a specific folder\'s children (omit for root-level folders), and is_deleted to include soft-deleted folders.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      parent_id: z.string().uuid().optional().describe('Optional parent folder ID to list its direct children. Omit to list root-level folders.'),
      is_deleted: z.boolean().optional().describe('True for deleted folders, false for active folders. Defaults to active folders.'),
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/files/folders`,
    query: ({ parent_id, is_deleted }) => ({ parent_id, is_deleted }),
    outputSchema: foldersListOutputSchema,
    outputTransform: (data) =>
      normalizeBySchema(foldersListOutputSchema, {
        folders: unwrapArray(data),
      }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_folder',
    title: 'Get Nexus Folder',
    description:
      'Use this tool when you need to get detailed information about a specific folder by its ID.',
    inputSchema: { workspace_id: workspaceIdSchema, folder_id: idSchema('Folder') },
    outputSchema: folderOutputSchema,
    path: ({ workspace_id, folder_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/files/folders/${encodeURIComponent(String(folder_id))}`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_update_folder',
    title: 'Update Nexus Folder',
    description:
      'Use this tool when you need to rename a folder by its ID.',
    inputSchema: { workspace_id: workspaceIdSchema, folder_id: idSchema('Folder'), ...updateFolderInputShape },
    method: 'PUT',
    outputSchema: folderOutputSchema,
    path: ({ workspace_id, folder_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/files/folders/${encodeURIComponent(String(folder_id))}`,
    body: ({ workspace_id: _workspace_id, folder_id: _folder_id, response_format: _response_format, ...body }) => body,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_move_folder',
    title: 'Move Nexus Folder',
    description:
      'Use this tool when you need to move a folder to a different parent (or to the workspace root with target_parent_id=null), optionally renaming it in the same call.',
    inputSchema: { workspace_id: workspaceIdSchema, folder_id: idSchema('Folder'), ...moveFolderInputShape },
    method: 'PUT',
    outputSchema: folderOutputSchema,
    path: ({ workspace_id, folder_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/files/folders/${encodeURIComponent(String(folder_id))}/move`,
    body: ({ workspace_id: _workspace_id, folder_id: _folder_id, response_format: _response_format, ...body }) => body,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_delete_folder',
    title: 'Delete Nexus Folder',
    description:
      'Use this tool when you need to soft-delete an empty folder by its ID. Fails if the folder still contains files or subfolders — use nexus_delete_folder_recursive for that case.',
    inputSchema: { workspace_id: workspaceIdSchema, folder_id: idSchema('Folder') },
    method: 'DELETE',
    outputSchema: folderOutputSchema,
    path: ({ workspace_id, folder_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/files/folders/${encodeURIComponent(String(folder_id))}`,
    annotations: destroy,
  });

  registerApiTool(server, client, {
    name: 'nexus_delete_folder_recursive',
    title: 'Delete Nexus Folder Recursively',
    description:
      'Use this tool when you need to soft-delete a folder along with all of its subfolders and files. This is reversible via nexus_restore_folder.',
    inputSchema: { workspace_id: workspaceIdSchema, folder_id: idSchema('Folder') },
    method: 'DELETE',
    outputSchema: folderDeleteRecursiveOutputSchema,
    outputTransform: (data) => normalizeBySchema(folderDeleteRecursiveOutputSchema, data),
    path: ({ workspace_id, folder_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/files/folders/${encodeURIComponent(String(folder_id))}/recursive`,
    annotations: destroy,
  });

  registerApiTool(server, client, {
    name: 'nexus_permanently_delete_folder',
    title: 'Permanently Delete Nexus Folder',
    description:
      'Use this tool when you need to permanently and irreversibly delete an already-deleted (trashed) folder and all its contents. This cannot be undone.',
    inputSchema: { workspace_id: workspaceIdSchema, folder_id: idSchema('Deleted folder') },
    method: 'DELETE',
    outputSchema: folderDeleteRecursiveOutputSchema,
    outputTransform: (data) => normalizeBySchema(folderDeleteRecursiveOutputSchema, data),
    path: ({ workspace_id, folder_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/files/folders/${encodeURIComponent(String(folder_id))}/permanent`,
    annotations: destroy,
  });

  registerApiTool(server, client, {
    name: 'nexus_restore_folder',
    title: 'Restore Nexus Folder',
    description:
      'Use this tool when you need to restore a soft-deleted folder along with all of its subfolders and files.',
    inputSchema: { workspace_id: workspaceIdSchema, folder_id: idSchema('Deleted folder') },
    method: 'POST',
    outputSchema: folderRestoreOutputSchema,
    outputTransform: (data) => normalizeBySchema(folderRestoreOutputSchema, data),
    path: ({ workspace_id, folder_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/files/folders/${encodeURIComponent(String(folder_id))}/restore`,
    body: () => ({}),
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_copy_folder',
    title: 'Copy Nexus Folder',
    description:
      'Use this tool when you need to duplicate a folder along with all of its subfolders and files. Defaults to copying in place with "(Copy)" appended to the name unless target_parent_id/new_name are provided.',
    inputSchema: { workspace_id: workspaceIdSchema, folder_id: idSchema('Folder'), ...copyFolderInputShape },
    method: 'POST',
    outputSchema: folderOutputSchema,
    path: ({ workspace_id, folder_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/files/folders/${encodeURIComponent(String(folder_id))}/copy`,
    body: ({ workspace_id: _workspace_id, folder_id: _folder_id, response_format: _response_format, ...body }) => body,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_move_multiple_folders',
    title: 'Move Multiple Nexus Folders',
    description:
      'Use this tool when you need to move several folders to a new parent (or to the workspace root) in one call. Returns a per-folder report of successes and failures.',
    inputSchema: { workspace_id: workspaceIdSchema, ...moveMultipleFoldersInputShape },
    method: 'PUT',
    outputSchema: moveMultipleFoldersOutputSchema,
    outputTransform: (data) => normalizeBySchema(moveMultipleFoldersOutputSchema, data),
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/files/batch-move-folders`,
    body: ({ workspace_id: _workspace_id, response_format: _response_format, ...body }) => body,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_copy_multiple_folders',
    title: 'Copy Multiple Nexus Folders',
    description:
      'Use this tool when you need to duplicate several folders (with all their contents) into a target parent in one call. Returns a per-folder report of successes and failures.',
    inputSchema: { workspace_id: workspaceIdSchema, ...copyMultipleFoldersInputShape },
    method: 'POST',
    outputSchema: copyMultipleFoldersOutputSchema,
    outputTransform: (data) => normalizeBySchema(copyMultipleFoldersOutputSchema, data),
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/files/folders/batch-copy`,
    body: ({ workspace_id: _workspace_id, response_format: _response_format, ...body }) => body,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_delete_multiple_folders',
    title: 'Delete Multiple Nexus Folders',
    description:
      'Use this tool when you need to soft-delete several folders (with all their subfolders and files) in one call. Returns a per-folder report of successes and failures.',
    inputSchema: { workspace_id: workspaceIdSchema, ...folderIdsInputShape },
    method: 'DELETE',
    outputSchema: deleteMultipleFoldersOutputSchema,
    outputTransform: (data) => normalizeBySchema(deleteMultipleFoldersOutputSchema, data),
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/files/folders`,
    body: ({ workspace_id: _workspace_id, response_format: _response_format, ...body }) => body,
    annotations: destroy,
  });
}

function unwrapArray(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown[] }).data)) {
    return (data as { data: unknown[] }).data;
  }

  return [];
}

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

import { requestBackend, requireWorkspaceId } from "../../backend/client";
import { config } from "../../config";
import { makeToolResult, summarizeCollection } from "../common";
import { registerTool } from "../registry";
import { uuid } from "../schemas";

export const registerFileTools = (server: McpServer) => {
  registerTool(
    server,
    "nexus_list_files",
    "List files in the current workspace.",
    {
      folder_id: z.string().optional(),
      is_deleted: z.boolean().optional(),
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ folder_id, is_deleted, page, limit }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/files`,
        query: {
          folder_id: folder_id as string | undefined,
          is_deleted: is_deleted as boolean | undefined,
          page: page as number | undefined,
          limit: limit as number | undefined,
        },
      });
      return makeToolResult(summarizeCollection("Files", data), data);
    },
  );

  registerTool(
    server,
    "nexus_search_files",
    "Search files in the current workspace.",
    {
      q: z.string().min(1),
      mime_type: z.string().optional(),
      uploaded_by: z.string().optional(),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (query) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/files/search`,
        query: query as Record<string, string | number | boolean | string[] | undefined>,
      });
      return makeToolResult("File search completed.", data);
    },
  );

  registerTool(
    server,
    "nexus_get_file",
    "Get one file by file_id.",
    { file_id: uuid },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ file_id }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/files/${file_id as string}`,
      });
      return makeToolResult("File loaded.", data);
    },
  );

  registerTool(
    server,
    "nexus_get_file_download_link",
    "Return the authenticated backend download URL for a file.",
    { file_id: uuid },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ file_id }) => {
      const workspaceId = requireWorkspaceId();
      const data = {
        workspace_id: workspaceId,
        file_id,
        method: "GET",
        url: `${config.backendBaseUrl}/workspaces/${workspaceId}/files/${file_id as string}/download`,
        requires_bearer_token: true,
      };
      return makeToolResult("Download endpoint prepared.", data);
    },
  );

  registerTool(
    server,
    "nexus_list_folders",
    "List folders in the current workspace.",
    {
      parent_id: z.string().optional(),
      is_deleted: z.boolean().optional(),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ parent_id, is_deleted }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/files/folders`,
        query: {
          parent_id: parent_id as string | undefined,
          is_deleted: is_deleted as boolean | undefined,
        },
      });
      return makeToolResult(summarizeCollection("Folders", data), data);
    },
  );
};

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

import { requestBackend, requireWorkspaceId } from "../../backend/client";
import { makeToolResult, summarizeCollection } from "../common";
import { registerTool } from "../registry";

export const registerSearchTools = (server: McpServer) => {
  registerTool(
    server,
    "nexus_search_workspace",
    "Run universal search in the current workspace.",
    {
      query: z.string().min(1),
      types: z.array(z.string()).optional(),
      page: z.number().int().min(1).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      author: z.string().optional(),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      tags: z.string().optional(),
      project_id: z.string().optional(),
      semantic: z.boolean().optional(),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (query) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/search`,
        query: query as Record<string, string | number | boolean | string[] | undefined>,
      });
      return makeToolResult("Workspace search completed.", data);
    },
  );

  registerTool(
    server,
    "nexus_get_search_suggestions",
    "Get search suggestions for a partial query.",
    {
      q: z.string().min(1),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ q }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/search/suggestions`,
        query: { q: q as string },
      });
      return makeToolResult(summarizeCollection("Search suggestions", data), data);
    },
  );
};

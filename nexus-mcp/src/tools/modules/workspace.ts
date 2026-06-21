import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";

import { requestBackend, requireWorkspaceId } from "../../backend/client";
import { makeToolResult, summarizeCollection } from "../common";
import { registerTool } from "../registry";

export const registerWorkspaceTools = (server: McpServer) => {
  registerTool(
    server,
    "nexus_get_workspace",
    "Get the current workspace details using the request x-workspace-id header.",
    {},
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async () => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({ method: "GET", path: `/workspaces/${workspaceId}` });
      return makeToolResult("Workspace details loaded.", data);
    },
  );

  registerTool(
    server,
    "nexus_get_workspace_members",
    "List members in the current workspace.",
    {},
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async () => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({ method: "GET", path: `/workspaces/${workspaceId}/members` });
      return makeToolResult(summarizeCollection("Workspace members", data), data);
    },
  );

};

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

import { requestBackend, requireWorkspaceId } from "../../backend/client";
import { makeToolResult, summarizeCollection } from "../common";
import { registerTool } from "../registry";
import { noteBodyShape, notePatchShape, uuid } from "../schemas";

export const registerNoteTools = (server: McpServer) => {
  registerTool(
    server,
    "nexus_list_notes",
    "List notes in the current workspace.",
    {
      parent_id: z.string().optional(),
      is_deleted: z.boolean().optional(),
      is_archived: z.boolean().optional(),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ parent_id, is_deleted, is_archived }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/notes`,
        query: {
          parent_id: parent_id as string | undefined,
          is_deleted: is_deleted as boolean | undefined,
          is_archived: is_archived as boolean | undefined,
        },
      });
      return makeToolResult(summarizeCollection("Notes", data), data);
    },
  );

  registerTool(
    server,
    "nexus_search_notes",
    "Search notes in the current workspace.",
    {
      q: z.string().min(1),
      mode: z.enum(["keyword", "semantic", "hybrid"]).optional(),
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ q, mode, limit, offset }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/notes/search`,
        query: {
          q: q as string,
          mode: mode as string | undefined,
          limit: limit as number | undefined,
          offset: offset as number | undefined,
        },
      });
      return makeToolResult("Note search completed.", data);
    },
  );

  registerTool(
    server,
    "nexus_get_note",
    "Get one note by note_id.",
    {
      note_id: uuid,
      include_deleted: z.boolean().optional(),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ note_id, include_deleted }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/notes/${note_id as string}`,
        query: { include_deleted: include_deleted as boolean | undefined },
      });
      return makeToolResult("Note loaded.", data);
    },
  );

  registerTool(
    server,
    "nexus_create_note",
    "Create a note in the current workspace.",
    noteBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (body) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "POST",
        path: `/workspaces/${workspaceId}/notes`,
        body,
      });
      return makeToolResult("Note created.", data);
    },
  );

  registerTool(
    server,
    "nexus_update_note",
    "Update a note in the current workspace.",
    {
      note_id: uuid,
      ...notePatchShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ note_id, ...body }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "PATCH",
        path: `/workspaces/${workspaceId}/notes/${note_id as string}`,
        body,
      });
      return makeToolResult("Note updated.", data);
    },
  );
};

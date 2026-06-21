import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

import { requestBackend, requireWorkspaceId } from "../../backend/client";
import { McpToolError } from "../../errors";
import { makeToolResult, summarizeCollection } from "../common";
import { registerTool } from "../registry";
import { channelCreateBodyShape, channelSendMessageBodyShape, uuid } from "../schemas";

const hasNonEmptyText = (value: unknown): boolean => typeof value === "string" && value.trim().length > 0;

export const registerChatTools = (server: McpServer) => {
  registerTool(
    server,
    "nexus_list_channels",
    "List chat channels in the current workspace.",
    {},
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async () => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/channels`,
      });
      return makeToolResult(summarizeCollection("Channels", data), data);
    },
  );

  registerTool(
    server,
    "nexus_get_channel",
    "Get one chat channel by channel_id in the current workspace.",
    { channel_id: uuid },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ channel_id }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/channels/${channel_id as string}`,
      });
      return makeToolResult("Channel loaded.", data);
    },
  );

  registerTool(
    server,
    "nexus_create_channel",
    "Create a chat channel in the current workspace.",
    channelCreateBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (body) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "POST",
        path: `/workspaces/${workspaceId}/channels`,
        body,
      });
      return makeToolResult("Channel created.", data);
    },
  );

  registerTool(
    server,
    "nexus_list_channel_messages",
    "List messages in a chat channel.",
    {
      channel_id: uuid,
      limit: z.number().int().min(1).max(100).optional(),
      offset: z.number().int().min(0).optional(),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ channel_id, limit, offset }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/channels/${channel_id as string}/messages`,
        query: {
          limit: limit as number | undefined,
          offset: offset as number | undefined,
        },
      });
      return makeToolResult(summarizeCollection("Channel messages", data), data);
    },
  );

  registerTool(
    server,
    "nexus_send_channel_message",
    "Send a plaintext message to a chat channel in the current workspace.",
    {
      channel_id: uuid,
      ...channelSendMessageBodyShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async ({ channel_id, ...body }) => {
      const hasContent =
        hasNonEmptyText(body.content) ||
        hasNonEmptyText(body.content_html) ||
        (Array.isArray(body.attachments) && body.attachments.length > 0) ||
        (Array.isArray(body.linked_content) && body.linked_content.length > 0);

      if (!hasContent) {
        throw new McpToolError(
          "Message body must include content, content_html, attachments, or linked_content.",
          400,
        );
      }

      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "POST",
        path: `/workspaces/${workspaceId}/channels/${channel_id as string}/messages`,
        body,
      });
      return makeToolResult("Message sent.", data);
    },
  );
};

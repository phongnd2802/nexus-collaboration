import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

import { requestBackend, requireWorkspaceId } from "../../backend/client";
import { makeToolResult, summarizeCollection } from "../common";
import { registerTool } from "../registry";
import { eventBodyShape, eventPatchShape, uuid } from "../schemas";

export const registerCalendarTools = (server: McpServer) => {
  registerTool(
    server,
    "nexus_list_events",
    "List calendar events in the current workspace.",
    {
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      search: z.string().optional(),
      categories: z.array(z.string()).optional(),
      priorities: z.array(z.string()).optional(),
      statuses: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      attendees: z.array(z.string()).optional(),
      show_declined: z.boolean().optional(),
      show_cancelled: z.boolean().optional(),
      show_private: z.boolean().optional(),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async (query) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/calendar/events`,
        query: query as Record<string, string | number | boolean | string[] | undefined>,
      });
      return makeToolResult(summarizeCollection("Events", data), data);
    },
  );

  registerTool(
    server,
    "nexus_get_upcoming_events",
    "List upcoming events in the current workspace.",
    {
      days: z.number().int().min(1).max(365).optional(),
    },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ days }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/calendar/upcoming`,
        query: { days: days as number | undefined },
      });
      return makeToolResult(summarizeCollection("Upcoming events", data), data);
    },
  );

  registerTool(
    server,
    "nexus_get_event",
    "Get one calendar event by event_id.",
    { event_id: uuid },
    { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ event_id }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "GET",
        path: `/workspaces/${workspaceId}/calendar/events/${event_id as string}`,
      });
      return makeToolResult("Event loaded.", data);
    },
  );

  registerTool(
    server,
    "nexus_create_event",
    "Create a calendar event using JSON-only fields supported by the backend.",
    eventBodyShape,
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    async (body) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "POST",
        path: `/workspaces/${workspaceId}/calendar/events`,
        body,
      });
      return makeToolResult("Event created.", data);
    },
  );

  registerTool(
    server,
    "nexus_update_event",
    "Update a calendar event using JSON-only fields supported by the backend.",
    {
      event_id: uuid,
      ...eventPatchShape,
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ event_id, ...body }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "PATCH",
        path: `/workspaces/${workspaceId}/calendar/events/${event_id as string}`,
        body,
      });
      return makeToolResult("Event updated.", data);
    },
  );

  registerTool(
    server,
    "nexus_respond_event_invitation",
    "Respond to an event invitation as accepted, declined, or tentative.",
    {
      event_id: uuid,
      response: z.enum(["accepted", "declined", "tentative"]),
    },
    { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    async ({ event_id, response }) => {
      const workspaceId = requireWorkspaceId();
      const data = await requestBackend<unknown>({
        method: "PUT",
        path: `/workspaces/${workspaceId}/calendar/events/${event_id as string}/respond`,
        body: { response },
      });
      return makeToolResult("Event response recorded.", data);
    },
  );
};

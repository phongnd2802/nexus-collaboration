import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { idSchema, workspaceIdSchema } from '../schemas/common.js';
import { calendarEventOutputSchema, createEventInputShape, upcomingEventsOutputSchema } from '../schemas/calendar.js';
import type { NexusApiClient } from '../services/nexus-api.js';
import { registerApiTool } from './register-api-tool.js';

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

export function registerCalendarTools(server: McpServer, client: NexusApiClient) {
  registerApiTool(server, client, {
    name: 'nexus_list_calendar_events',
    title: 'List Nexus Calendar Events',
    description:
      'Use this tool when you need to list or search calendar events in a workspace. Supports filtering by date range (start_date/end_date), text search on title or description, and comma-separated status filters.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      start_date: z.string().optional().describe('Optional ISO start date filter.'),
      end_date: z.string().optional().describe('Optional ISO end date filter.'),
      search: z.string().optional().describe('Optional search query for title or description.'),
      statuses: z.string().optional().describe('Optional comma-separated statuses.'),
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/events`,
    query: ({ start_date, end_date, search, statuses }) => ({ start_date, end_date, search, statuses }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_upcoming_events',
    title: 'Get Nexus Upcoming Events',
    description:
      'Use this tool when you need to fetch upcoming calendar events for a workspace within a configurable number of days ahead (default 7).',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      days: z.number().int().min(1).max(365).default(7).describe('Number of days to look ahead.'),
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/upcoming`,
    query: ({ days }) => ({ days }),
    outputSchema: upcomingEventsOutputSchema,
    outputTransform: (data) => ({ events: data }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_calendar_event',
    title: 'Get Nexus Calendar Event',
    description:
      'Use this tool when you need to get detailed information about a specific calendar event by its ID.',
    inputSchema: { workspace_id: workspaceIdSchema, event_id: idSchema('Calendar event') },
    outputSchema: calendarEventOutputSchema,
    path: ({ workspace_id, event_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/events/${encodeURIComponent(String(event_id))}`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_create_calendar_event',
    title: 'Create Nexus Calendar Event',
    description:
      'Use this tool when you need to create a new calendar event in a workspace. Provide title, start_time, end_time (required), and optionally description, all_day, location, room_id, category_id, attendees, meeting_url, visibility, priority, status, is_recurring, recurrence_rule, reminders, attachments, and description_file_ids. Note: file attachments are not supported by this MCP tool.',
    inputSchema: { workspace_id: workspaceIdSchema, ...createEventInputShape },
    outputSchema: calendarEventOutputSchema,
    method: 'POST',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/events`,
    body: ({ title, start_time, end_time, description, all_day, location, room_id, category_id, attendees, meeting_url, visibility, priority, status, is_recurring, recurrence_rule, reminders, attachments, description_file_ids }) => ({
      title,
      start_time,
      end_time,
      ...(description !== undefined ? { description } : {}),
      ...(all_day !== undefined ? { all_day } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(room_id !== undefined ? { room_id } : {}),
      ...(category_id !== undefined ? { category_id } : {}),
      ...(attendees !== undefined ? { attendees } : {}),
      ...(meeting_url !== undefined ? { meeting_url } : {}),
      ...(visibility !== undefined ? { visibility } : {}),
      ...(priority !== undefined ? { priority } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(is_recurring !== undefined ? { is_recurring } : {}),
      ...(recurrence_rule !== undefined ? { recurrence_rule } : {}),
      ...(reminders !== undefined ? { reminders } : {}),
      ...(attachments !== undefined ? { attachments } : {}),
      ...(description_file_ids !== undefined ? { description_file_ids } : {}),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });
}

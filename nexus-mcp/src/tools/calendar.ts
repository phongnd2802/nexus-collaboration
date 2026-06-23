import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { dataObjectSchema, idSchema, workspaceIdSchema } from '../schemas/common.js';
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
    description: 'List calendar events in a workspace with date range and optional text/status/category filters.',
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
    description: 'Get upcoming calendar events for a workspace.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      days: z.number().int().min(1).max(365).default(7).describe('Number of days to look ahead.'),
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/upcoming`,
    query: ({ days }) => ({ days }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_calendar_event',
    title: 'Get Nexus Calendar Event',
    description: 'Get calendar event details by ID.',
    inputSchema: { workspace_id: workspaceIdSchema, event_id: idSchema('Calendar event') },
    path: ({ workspace_id, event_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/events/${encodeURIComponent(String(event_id))}`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_create_calendar_event',
    title: 'Create Nexus Calendar Event',
    description:
      'Create a calendar event using JSON body fields accepted by CreateEventDto. File attachments are not supported by this MCP tool.',
    inputSchema: { workspace_id: workspaceIdSchema, data: dataObjectSchema },
    method: 'POST',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/events`,
    body: ({ data }) => data,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });
}

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { idSchema, workspaceIdSchema } from '../schemas/common.js';
import {
  calendarDeleteActionOutputSchema,
  calendarEventOutputSchema,
  createEventCategoryInputShape,
  createEventInputShape,
  createMeetingRoomInputShape,
  eventCategoriesListOutputSchema,
  eventCategoryOutputSchema,
  meetingRoomOutputSchema,
  meetingRoomsListOutputSchema,
  roomBookingsListOutputSchema,
  updateEventCategoryInputShape,
  updateEventInputShape,
  updateMeetingRoomInputShape,
  upcomingEventsOutputSchema,
} from '../schemas/calendar.js';
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
      categories: z.string().optional().describe('Optional comma-separated category IDs.'),
      priorities: z.string().optional().describe('Optional comma-separated priorities (low/normal/high/urgent).'),
      tags: z.string().optional().describe('Optional comma-separated tags.'),
      attendees: z.string().optional().describe('Optional comma-separated attendee filters.'),
      show_declined: z.boolean().optional().describe('Include events the user has declined.'),
      show_cancelled: z.boolean().optional().describe('Include cancelled events.'),
      show_private: z.boolean().optional().describe('Include private events.'),
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/events`,
    query: ({ start_date, end_date, search, statuses, categories, priorities, tags, attendees, show_declined, show_cancelled, show_private }) => ({
      start_date,
      end_date,
      search,
      statuses,
      categories,
      priorities,
      tags,
      attendees,
      show_declined,
      show_cancelled,
      show_private,
    }),
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
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_update_calendar_event',
    title: 'Update Nexus Calendar Event',
    description:
      'Use this tool when you need to update an existing calendar event by its ID. All fields are optional — only provided fields will be changed. Note: attendees, reminders, and attachments replace the existing values rather than merging with them. File attachments are not supported by this MCP tool.',
    inputSchema: { workspace_id: workspaceIdSchema, event_id: idSchema('Calendar event'), ...updateEventInputShape },
    outputSchema: calendarEventOutputSchema,
    method: 'PATCH',
    path: ({ workspace_id, event_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/events/${encodeURIComponent(String(event_id))}`,
    body: ({ workspace_id: _workspace_id, event_id: _event_id, response_format: _response_format, ...body }) => body,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_create_meeting_room',
    title: 'Create Nexus Meeting Room',
    description:
      'Use this tool when you need to create a new meeting room in a workspace. Provide name, capacity, and room_type (required), and optionally description, location, equipment, amenities, booking_policy, working_hours, floor, building, room_code, thumbnail_url, and images.',
    inputSchema: { workspace_id: workspaceIdSchema, ...createMeetingRoomInputShape },
    method: 'POST',
    outputSchema: meetingRoomOutputSchema,
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/rooms`,
    body: ({ workspace_id: _workspace_id, response_format: _response_format, ...body }) => body,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_list_meeting_rooms',
    title: 'List Nexus Meeting Rooms',
    description:
      'Use this tool when you need to list meeting rooms in a workspace. Optionally filter to only available rooms, or by a minimum capacity.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      available_only: z.boolean().optional().describe('If true, only return rooms currently marked as available.'),
      capacity: z.number().int().positive().optional().describe('Only return rooms with at least this capacity.'),
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/rooms`,
    query: ({ available_only, capacity }) => ({ available_only, capacity }),
    outputSchema: meetingRoomsListOutputSchema,
    outputTransform: (data) =>
      normalizeBySchema(meetingRoomsListOutputSchema, {
        rooms: unwrapArray(data),
      }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_meeting_room',
    title: 'Get Nexus Meeting Room',
    description:
      'Use this tool when you need to get detailed information about a specific meeting room by its ID, including its current and upcoming bookings.',
    inputSchema: { workspace_id: workspaceIdSchema, room_id: idSchema('Meeting room') },
    outputSchema: meetingRoomOutputSchema,
    path: ({ workspace_id, room_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/rooms/${encodeURIComponent(String(room_id))}`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_update_meeting_room',
    title: 'Update Nexus Meeting Room',
    description:
      'Use this tool when you need to update a meeting room\'s details by its ID. All fields are optional — only provided fields will be changed. Note: equipment, amenities, working_hours, and images replace the existing values rather than merging with them.',
    inputSchema: { workspace_id: workspaceIdSchema, room_id: idSchema('Meeting room'), ...updateMeetingRoomInputShape },
    method: 'PATCH',
    outputSchema: meetingRoomOutputSchema,
    path: ({ workspace_id, room_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/rooms/${encodeURIComponent(String(room_id))}`,
    body: ({ workspace_id: _workspace_id, room_id: _room_id, response_format: _response_format, ...body }) => body,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_create_event_category',
    title: 'Create Nexus Event Category',
    description:
      'Use this tool when you need to create a new calendar event category in a workspace. Provide name and color (hex, required), and optionally description, icon, and description_file_ids.',
    inputSchema: { workspace_id: workspaceIdSchema, ...createEventCategoryInputShape },
    method: 'POST',
    outputSchema: eventCategoryOutputSchema,
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/categories`,
    body: ({ workspace_id: _workspace_id, response_format: _response_format, ...body }) => body,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_list_event_categories',
    title: 'List Nexus Event Categories',
    description:
      'Use this tool when you need to list all calendar event categories in a workspace.',
    inputSchema: { workspace_id: workspaceIdSchema },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/categories`,
    outputSchema: eventCategoriesListOutputSchema,
    outputTransform: (data) =>
      normalizeBySchema(eventCategoriesListOutputSchema, {
        categories: unwrapArray(data),
      }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_event_category',
    title: 'Get Nexus Event Category',
    description:
      'Use this tool when you need to get detailed information about a specific calendar event category by its ID.',
    inputSchema: { workspace_id: workspaceIdSchema, category_id: idSchema('Event category') },
    outputSchema: eventCategoryOutputSchema,
    path: ({ workspace_id, category_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/categories/${encodeURIComponent(String(category_id))}`,
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_update_event_category',
    title: 'Update Nexus Event Category',
    description:
      'Use this tool when you need to update a calendar event category\'s details by its ID. All fields are optional — only provided fields will be changed.',
    inputSchema: { workspace_id: workspaceIdSchema, category_id: idSchema('Event category'), ...updateEventCategoryInputShape },
    method: 'PATCH',
    outputSchema: eventCategoryOutputSchema,
    path: ({ workspace_id, category_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/categories/${encodeURIComponent(String(category_id))}`,
    body: ({ workspace_id: _workspace_id, category_id: _category_id, response_format: _response_format, ...body }) => body,
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_delete_calendar_event',
    title: 'Delete Nexus Calendar Event',
    description:
      'Use this tool when you need to permanently delete a calendar event by its ID. Only the event organizer can delete an event. Pending reminders are cancelled and attendees are notified.',
    inputSchema: { workspace_id: workspaceIdSchema, event_id: idSchema('Calendar event') },
    method: 'DELETE',
    outputSchema: calendarDeleteActionOutputSchema,
    outputTransform: () => ({ success: true, message: 'Calendar event deleted successfully.' }),
    path: ({ workspace_id, event_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/events/${encodeURIComponent(String(event_id))}`,
    annotations: destroy,
  });

  registerApiTool(server, client, {
    name: 'nexus_respond_calendar_event',
    title: 'Respond to Nexus Calendar Event',
    description:
      'Use this tool when you need to respond to a calendar event invitation as the current user. Set response to "accepted", "declined", or "tentative".',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      event_id: idSchema('Calendar event'),
      response: z.enum(['accepted', 'declined', 'tentative']).describe('Invitation response status.'),
    },
    method: 'PUT',
    path: ({ workspace_id, event_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/events/${encodeURIComponent(String(event_id))}/respond`,
    body: ({ response }) => ({ response }),
    annotations: write,
  });

  registerApiTool(server, client, {
    name: 'nexus_delete_meeting_room',
    title: 'Delete Nexus Meeting Room',
    description:
      'Use this tool when you need to delete a meeting room from a workspace by its ID.',
    inputSchema: { workspace_id: workspaceIdSchema, room_id: idSchema('Meeting room') },
    method: 'DELETE',
    outputSchema: calendarDeleteActionOutputSchema,
    outputTransform: () => ({ success: true, message: 'Meeting room deleted successfully.' }),
    path: ({ workspace_id, room_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/rooms/${encodeURIComponent(String(room_id))}`,
    annotations: destroy,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_room_bookings',
    title: 'Get Nexus Meeting Room Bookings',
    description:
      'Use this tool when you need to list bookings for a meeting room, optionally filtered by a start/end date range.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      room_id: idSchema('Meeting room'),
      start_date: z.string().optional().describe('Optional ISO start date filter.'),
      end_date: z.string().optional().describe('Optional ISO end date filter.'),
    },
    path: ({ workspace_id, room_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/rooms/${encodeURIComponent(String(room_id))}/bookings`,
    query: ({ start_date, end_date }) => ({ start_date, end_date }),
    outputSchema: roomBookingsListOutputSchema,
    outputTransform: (data) =>
      normalizeBySchema(roomBookingsListOutputSchema, {
        bookings: unwrapArray(data),
      }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_delete_event_category',
    title: 'Delete Nexus Event Category',
    description:
      'Use this tool when you need to delete a calendar event category from a workspace by its ID.',
    inputSchema: { workspace_id: workspaceIdSchema, category_id: idSchema('Event category') },
    method: 'DELETE',
    outputSchema: calendarDeleteActionOutputSchema,
    outputTransform: () => ({ success: true, message: 'Event category deleted successfully.' }),
    path: ({ workspace_id, category_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/calendar/categories/${encodeURIComponent(String(category_id))}`,
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

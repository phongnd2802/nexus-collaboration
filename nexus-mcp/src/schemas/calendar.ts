import { z } from 'zod';

export const calendarEventAttendeeSchema = z
  .object({
    id: z.string().min(1),
    event_id: z.string().min(1).optional(),
    user_id: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
    is_organizer: z.boolean().optional(),
    is_required: z.boolean().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .strip();

export const calendarEventReminderSchema = z
  .object({
    id: z.string().min(1),
    event_id: z.string().min(1).optional(),
    user_id: z.string().nullable().optional(),
    reminder_time: z.number(),
    notification_type: z.string().nullable().optional(),
    is_sent: z.boolean().optional(),
    scheduled_for: z.string().nullable().optional(),
    created_at: z.string().optional(),
  })
  .strip();

export const calendarEventAttachmentsSchema = z
  .object({
    file_attachment: z.array(z.unknown()).optional(),
    note_attachment: z.array(z.unknown()).optional(),
    event_attachment: z.array(z.unknown()).optional(),
    drive_attachment: z.array(z.unknown()).optional(),
  })
  .strip();

export const calendarEventOutputSchema = z.object({
  id: z.string().min(1),
  workspace_id: z.string().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  all_day: z.boolean().optional(),
  location: z.string().nullable().optional(),
  meeting_url: z.string().nullable().optional(),
  room_id: z.string().nullable().optional(),
  category_id: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  organizer_id: z.string().nullable().optional(),
  status: z.string(),
  visibility: z.string().optional(),
  priority: z.string().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_rule: z.record(z.unknown()).nullable().optional(),
  attendees: z.array(calendarEventAttendeeSchema).optional(),
  reminders: z.array(calendarEventReminderSchema).optional(),
  attachments: calendarEventAttachmentsSchema.optional(),
  drive_attachment: z.array(z.unknown()).optional(),
  is_occurrence: z.boolean().optional(),
  parent_event_id: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
}).strip();

export const upcomingEventsOutputSchema = z.object({
  events: z.array(calendarEventOutputSchema),
});

const eventAttachmentsInputSchema = z.object({
  file_attachment: z.array(z.string().uuid()).optional(),
  note_attachment: z.array(z.string().uuid()).optional(),
  event_attachment: z.array(z.string().uuid()).optional(),
  drive_attachment: z.array(z.object({
    id: z.string().min(1),
    title: z.string().min(1),
    driveFileUrl: z.string().optional(),
    driveThumbnailUrl: z.string().optional(),
    driveMimeType: z.string().optional(),
    driveFileSize: z.number().optional(),
  })).optional(),
});

const eventRecurrenceRuleInputSchema = z.object({
  frequency: z.string(),
  interval: z.number().int().positive().optional(),
  daysOfWeek: z.array(z.string()).optional(),
  byWeekDay: z.array(z.number().int()).optional(),
  endDate: z.string().optional(),
  until: z.string().optional(),
  occurrences: z.number().int().positive().optional(),
});

export const createEventInputShape = {
  title: z.string().min(1).describe('Event title.'),
  start_time: z.string().describe('Event start time in ISO 8601 format.'),
  end_time: z.string().describe('Event end time in ISO 8601 format.'),
  description: z.string().optional().describe('Event description.'),
  all_day: z.boolean().optional().describe('Whether this is an all-day event.'),
  location: z.string().optional().describe('Event location.'),
  room_id: z.string().uuid().optional().describe('Meeting room ID.'),
  category_id: z.string().uuid().optional().describe('Event category ID.'),
  attendees: z.array(z.string()).optional().describe('List of attendee email addresses.'),
  meeting_url: z.string().optional().describe('Meeting URL (Zoom, Teams, etc.).'),
  visibility: z.enum(['private', 'public', 'internal']).optional().describe('Event visibility.'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().describe('Event priority.'),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional().describe('Event status.'),
  is_recurring: z.boolean().optional().describe('Whether this is a recurring event.'),
  recurrence_rule: eventRecurrenceRuleInputSchema.optional().describe('Recurrence rule for recurring events.'),
  reminders: z.array(z.number().int().nonnegative()).optional().describe('Reminder settings in minutes before event.'),
  attachments: eventAttachmentsInputSchema.optional().describe('Unified attachments object.'),
  description_file_ids: z.array(z.string().uuid()).optional().describe('File IDs embedded in description content.'),
};

export const updateEventInputShape = {
  title: z.string().min(1).optional().describe('Updated event title.'),
  description: z.string().optional().describe('Updated event description.'),
  start_time: z.string().optional().describe('Updated event start time in ISO 8601 format.'),
  end_time: z.string().optional().describe('Updated event end time in ISO 8601 format.'),
  all_day: z.boolean().optional().describe('Whether this is an all-day event.'),
  location: z.string().optional().describe('Updated event location.'),
  room_id: z.string().uuid().optional().describe('Updated meeting room ID.'),
  category_id: z.string().uuid().optional().describe('Updated event category ID.'),
  attendees: z.array(z.string()).optional().describe('Updated list of attendee email addresses. Replaces the existing attendee list.'),
  meeting_url: z.string().optional().describe('Updated meeting URL (Zoom, Teams, etc.).'),
  visibility: z.enum(['private', 'public', 'internal']).optional().describe('Updated event visibility.'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().describe('Updated event priority.'),
  status: z.enum(['confirmed', 'tentative', 'cancelled']).optional().describe('Updated event status.'),
  is_recurring: z.boolean().optional().describe('Whether this is a recurring event.'),
  recurrence_rule: eventRecurrenceRuleInputSchema.optional().describe('Updated recurrence rule for recurring events.'),
  reminders: z.array(z.number().int().nonnegative()).optional().describe('Updated reminder settings in minutes before event. Replaces the existing reminders.'),
  attachments: eventAttachmentsInputSchema.optional().describe('Updated unified attachments object. Replaces the existing attachments.'),
  description_file_ids: z.array(z.string().uuid()).optional().describe('Updated file IDs embedded in description content.'),
};

const roomTypeSchema = z.enum(['conference', 'meeting', 'huddle', 'training', 'presentation', 'phone_booth']);
const bookingPolicySchema = z.enum(['open', 'approval_required', 'restricted']);

const workingHoursDaySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  available: z.boolean(),
});

const workingHoursInputSchema = z.record(workingHoursDaySchema);

export const roomBookingOutputSchema = z
  .object({
    id: z.string().min(1),
    room_id: z.string().min(1),
    event_id: z.string().nullable().optional(),
    booked_by: z.string().min(1),
    start_time: z.string(),
    end_time: z.string(),
    status: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .strip();

export const meetingRoomOutputSchema = z
  .object({
    id: z.string().min(1),
    workspace_id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    capacity: z.number().optional(),
    room_type: z.string().optional(),
    equipment: z.array(z.unknown()).optional(),
    amenities: z.array(z.unknown()).optional(),
    status: z.string().optional(),
    booking_policy: z.string().optional(),
    working_hours: z.record(z.unknown()).optional(),
    is_active: z.boolean().optional(),
    room_code: z.string().nullable().optional(),
    floor: z.string().nullable().optional(),
    building: z.string().nullable().optional(),
    thumbnail_url: z.string().nullable().optional(),
    images: z.array(z.unknown()).optional(),
    bookings: z.array(roomBookingOutputSchema).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .strip();

export const meetingRoomsListOutputSchema = z.object({
  rooms: z.array(meetingRoomOutputSchema),
});

export const createMeetingRoomInputShape = {
  name: z.string().min(1).describe('Meeting room name.'),
  capacity: z.number().int().min(1).max(1000).describe('Room capacity (number of people), between 1 and 1000.'),
  room_type: roomTypeSchema.describe('Type of meeting room.'),
  description: z.string().optional().describe('Room description.'),
  location: z.string().optional().describe('Room location/address.'),
  equipment: z.array(z.string()).optional().describe('Available equipment in the room (e.g. projector, whiteboard).'),
  amenities: z.array(z.string()).optional().describe('Room amenities (e.g. coffee_machine, water).'),
  booking_policy: bookingPolicySchema.optional().describe('Booking policy for the room.'),
  working_hours: workingHoursInputSchema.optional().describe('Working hours per day of week, e.g. {"monday": {"start": "09:00", "end": "18:00", "available": true}}.'),
  floor: z.string().optional().describe('Floor number/name.'),
  building: z.string().optional().describe('Building name.'),
  room_code: z.string().optional().describe('Room code for easy identification.'),
  thumbnail_url: z.string().optional().describe('Room thumbnail image URL.'),
  images: z.array(z.string()).optional().describe('Additional room image URLs.'),
};

export const updateMeetingRoomInputShape = {
  name: z.string().min(1).optional().describe('Updated meeting room name.'),
  capacity: z.number().int().min(1).max(1000).optional().describe('Updated room capacity (number of people), between 1 and 1000.'),
  room_type: roomTypeSchema.optional().describe('Updated type of meeting room.'),
  description: z.string().optional().describe('Updated room description.'),
  location: z.string().optional().describe('Updated room location/address.'),
  equipment: z.array(z.string()).optional().describe('Updated available equipment. Replaces the existing list.'),
  amenities: z.array(z.string()).optional().describe('Updated room amenities. Replaces the existing list.'),
  booking_policy: bookingPolicySchema.optional().describe('Updated booking policy for the room.'),
  working_hours: workingHoursInputSchema.optional().describe('Updated working hours per day of week. Replaces the existing schedule.'),
  floor: z.string().optional().describe('Updated floor number/name.'),
  building: z.string().optional().describe('Updated building name.'),
  room_code: z.string().optional().describe('Updated room code.'),
  thumbnail_url: z.string().optional().describe('Updated room thumbnail image URL.'),
  images: z.array(z.string()).optional().describe('Updated room image URLs. Replaces the existing list.'),
};

export const eventCategoryOutputSchema = z
  .object({
    id: z.string().min(1),
    workspace_id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    color: z.string().min(1),
    icon: z.string().nullable().optional(),
    description_file_ids: z.array(z.unknown()).optional(),
    is_default: z.boolean().optional(),
    created_by: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .strip();

export const eventCategoriesListOutputSchema = z.object({
  categories: z.array(eventCategoryOutputSchema),
});

export const createEventCategoryInputShape = {
  name: z.string().min(1).describe('Category name.'),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).describe('Category color in hex format, e.g. "#3b82f6".'),
  description: z.string().optional().describe('Category description.'),
  icon: z.string().optional().describe('Category icon (emoji or icon identifier).'),
  description_file_ids: z.array(z.string().uuid()).optional().describe('File IDs embedded in the description content.'),
};

export const updateEventCategoryInputShape = {
  name: z.string().min(1).optional().describe('Updated category name.'),
  color: z.string().regex(/^#[0-9a-fA-F]{3,8}$/).optional().describe('Updated category color in hex format, e.g. "#3b82f6".'),
  description: z.string().optional().describe('Updated category description.'),
  icon: z.string().optional().describe('Updated category icon (emoji or icon identifier).'),
  description_file_ids: z.array(z.string().uuid()).optional().describe('Updated file IDs embedded in the description content.'),
};

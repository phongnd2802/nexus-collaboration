import { z } from 'zod';

export const videoCallOutputSchema = z
  .object({
    id: z.string().min(1),
    workspace_id: z.string().min(1),
    livekit_room_id: z.string().optional(),
    title: z.string(),
    description: z.string().nullable().optional(),
    host_user_id: z.string().min(1),
    call_type: z.string(),
    is_group_call: z.boolean().optional(),
    status: z.string(),
    scheduled_start_time: z.string().nullable().optional(),
    scheduled_end_time: z.string().nullable().optional(),
    actual_start_time: z.string().nullable().optional(),
    actual_end_time: z.string().nullable().optional(),
    invitees: z.array(z.string()).optional(),
    settings: z.record(z.unknown()).optional(),
    metadata: z.record(z.unknown()).optional(),
    livekit_room: z.record(z.unknown()).optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .strip();

export const scheduleVideoCallInputShape = {
  title: z.string().min(1).max(200).describe('Meeting title/subject.'),
  scheduled_start_time: z.string().describe('Scheduled start time in ISO 8601 format. Required to schedule the meeting for later rather than starting it immediately.'),
  call_type: z.enum(['audio', 'video']).default('video').describe('Type of call. Defaults to "video".'),
  scheduled_end_time: z.string().optional().describe('Scheduled end time in ISO 8601 format. Defaults to 1 hour after scheduled_start_time if omitted.'),
  description: z.string().max(1000).optional().describe('Meeting description.'),
  is_group_call: z.boolean().optional().describe('Whether this is a group call. Defaults to false.'),
  participant_ids: z.array(z.string()).optional().describe('User IDs to invite. They will receive a notification and a linked calendar event.'),
  video_quality: z.enum(['low', 'medium', 'high', 'hd', '4k']).optional().describe('Video quality. Defaults to "hd".'),
  max_participants: z.number().int().min(2).max(500).optional().describe('Maximum participants allowed, between 2 and 500. Defaults to 50.'),
  e2ee_enabled: z.boolean().optional().describe('Enable end-to-end encryption. Defaults to false.'),
  lock_on_join: z.boolean().optional().describe('Lock the room after it starts, preventing new participants from joining. Defaults to false.'),
  reminder_minutes: z
    .array(z.number().int().nonnegative())
    .optional()
    .describe('Reminder times in minutes before the scheduled start (e.g. [10, 60]). Delivered via the linked calendar event.'),
  metadata: z.record(z.unknown()).optional().describe('Additional metadata (AI settings, location, recurrence, etc.).'),
};

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { workspaceIdSchema } from '../schemas/common.js';
import { scheduleVideoCallInputShape, videoCallOutputSchema } from '../schemas/video-calls.js';
import type { NexusApiClient } from '../services/nexus-api.js';
import { registerApiTool } from './register-api-tool.js';

export function registerVideoCallTools(server: McpServer, client: NexusApiClient) {
  registerApiTool(server, client, {
    name: 'nexus_schedule_video_call',
    title: 'Schedule Nexus Video Call',
    description:
      'Use this tool when you need to schedule a video or audio meeting for a future date/time (rather than starting one immediately). Provide title and scheduled_start_time (required); call_type defaults to "video". Optionally provide description, scheduled_end_time, participant_ids to invite, and call settings. Scheduling automatically creates a linked calendar event and notifies invited participants.',
    inputSchema: { workspace_id: workspaceIdSchema, ...scheduleVideoCallInputShape },
    method: 'POST',
    outputSchema: videoCallOutputSchema,
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/video-calls/create`,
    body: ({
      title,
      scheduled_start_time,
      call_type,
      scheduled_end_time,
      description,
      is_group_call,
      participant_ids,
      video_quality,
      max_participants,
      e2ee_enabled,
      lock_on_join,
      metadata,
    }) => ({
      title,
      scheduled_start_time,
      call_type,
      ...(scheduled_end_time !== undefined ? { scheduled_end_time } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(is_group_call !== undefined ? { is_group_call } : {}),
      ...(participant_ids !== undefined ? { participant_ids } : {}),
      ...(video_quality !== undefined ? { video_quality } : {}),
      ...(max_participants !== undefined ? { max_participants } : {}),
      ...(e2ee_enabled !== undefined ? { e2ee_enabled } : {}),
      ...(lock_on_join !== undefined ? { lock_on_join } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });
}

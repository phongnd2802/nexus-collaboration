import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { idSchema, limitSchema, offsetSchema, workspaceIdSchema } from '../schemas/common.js';
import {
  addChannelMembersInputShape,
  addChannelMembersOutputSchema,
  bookmarkMessageOutputSchema,
  channelMessagesOutputSchema,
  channelBookmarkedMessagesOutputSchema,
  createChannelPollInputShape,
  createChannelInputShape,
  createChannelOutputSchema,
  channelUnreadCountOutputSchema,
  channelMembersOutputSchema,
  channelMemberOutputSchema,
  getChannelOutputSchema,
  listChannelsOutputSchema,
  listChannelItemOutputSchema,
  messageOutputSchema,
  scheduleMessageInputShape,
  scheduledMessageActionOutputSchema,
  scheduledMessageCancelOutputSchema,
  scheduledMessageGetOutputSchema,
  scheduledMessagesListOutputSchema,
  scheduledMessageOutputSchema,
  scheduledMessageStatusSchema,
  sendChannelMessageInputShape,
  updateScheduledMessageInputShape,
  updateChannelInputShape,
  updateChannelOutputSchema,
} from '../schemas/chat.js';
import { normalizeBySchema } from '../services/normalize.js';
import type { NexusApiClient } from '../services/nexus-api.js';
import { registerApiTool } from './register-api-tool.js';

const readOnly = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

const pageSchema = z.number().int().min(1).default(1).describe('Page number for paginated results.');

export function registerChatTools(server: McpServer, client: NexusApiClient) {
  registerApiTool(server, client, {
    name: 'nexus_create_channel',
    title: 'Create Nexus Channel',
    description:
      'Create a new channel in a workspace. Accepts name, optional description, optional type, private flag, and optional member IDs for private channels.',
    inputSchema: { workspace_id: workspaceIdSchema, ...createChannelInputShape },
    method: 'POST',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/channels`,
    body: ({ name, description, type, is_private, member_ids }) => ({
      name,
      ...(description !== undefined ? { description } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(is_private !== undefined ? { is_private } : {}),
      ...(member_ids !== undefined ? { member_ids } : {}),
    }),
    outputSchema: createChannelOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });

  registerApiTool(server, client, {
    name: 'nexus_list_channels',
    title: 'List Nexus Channels',
    description: 'List channels in a workspace that the authenticated user can access.',
    inputSchema: { workspace_id: workspaceIdSchema },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/channels`,
    outputSchema: listChannelsOutputSchema,
    outputTransform: (data) => ({
      channels: Array.isArray(data)
        ? data
        : Array.isArray((data as { data?: unknown }).data)
          ? (data as { data: unknown[] }).data
          : [],
    }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_search_private_channels',
    title: 'Search Nexus Private Channels',
    description: 'Search private channels in a workspace by name.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      name: z.string().min(1).describe('Channel name to search for.'),
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/channels/search-private`,
    query: ({ name }) => ({ name }),
    outputSchema: listChannelsOutputSchema,
    outputTransform: (data) => normalizeBySchema(listChannelsOutputSchema, { channels: normalizeChannelListResponse(data) }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_channel',
    title: 'Get Nexus Channel',
    description: 'Get channel details by ID.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      channel_id: idSchema('Channel'),
    },
    path: ({ workspace_id, channel_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/channels/${encodeURIComponent(String(channel_id))}`,
    outputSchema: getChannelOutputSchema,
    outputTransform: (data) => {
      const channel = unwrapChannelResponse(data);
      return normalizeBySchema(getChannelOutputSchema, channel);
    },
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_channel_members',
    title: 'Get Nexus Channel Members',
    description: 'List members of a channel with their user details.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      channel_id: idSchema('Channel'),
    },
    path: ({ workspace_id, channel_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/channels/${encodeURIComponent(String(channel_id))}/members`,
    outputSchema: channelMembersOutputSchema,
    outputTransform: (data) => normalizeBySchema(channelMembersOutputSchema, { members: normalizeChannelMembersResponse(data) }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_update_channel',
    title: 'Update Nexus Channel',
    description:
      'Update a channel with optional name, description, privacy flag, and private member list.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      channel_id: idSchema('Channel'),
      ...updateChannelInputShape,
    },
    method: 'PUT',
    path: ({ workspace_id, channel_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/channels/${encodeURIComponent(String(channel_id))}`,
    body: ({ name, description, is_private, member_ids }) => ({
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(is_private !== undefined ? { is_private } : {}),
      ...(member_ids !== undefined ? { member_ids } : {}),
    }),
    outputSchema: updateChannelOutputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });

  registerApiTool(server, client, {
    name: 'nexus_add_channel_members',
    title: 'Add Nexus Channel Members',
    description: 'Add one or more members to a channel.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      channel_id: idSchema('Channel'),
      ...addChannelMembersInputShape,
    },
    method: 'POST',
    path: ({ workspace_id, channel_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/channels/${encodeURIComponent(String(channel_id))}/members`,
    body: ({ user_id, user_ids, role }) => ({
      ...(user_id !== undefined ? { userId: user_id } : {}),
      ...(user_ids !== undefined ? { userIds: user_ids } : {}),
      ...(role !== undefined ? { role } : {}),
    }),
    outputSchema: addChannelMembersOutputSchema,
    outputTransform: (data) => normalizeBySchema(addChannelMembersOutputSchema, data),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });

  registerApiTool(server, client, {
    name: 'nexus_get_channel_messages',
    title: 'Get Nexus Channel Messages',
    description: 'Get channel messages with limit and offset pagination.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      channel_id: idSchema('Channel'),
      limit: limitSchema,
      offset: offsetSchema,
    },
    path: ({ workspace_id, channel_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/channels/${encodeURIComponent(String(channel_id))}/messages`,
    query: ({ limit, offset }) => ({ limit, offset }),
    outputSchema: channelMessagesOutputSchema,
    outputTransform: (data) => normalizeBySchema(channelMessagesOutputSchema, { messages: normalizeChannelMessagesResponse(data) }),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_send_channel_message',
    title: 'Send Nexus Channel Message',
    description: 'Send a message to a channel.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      channel_id: idSchema('Channel'),
      ...sendChannelMessageInputShape,
    },
    method: 'POST',
    path: ({ workspace_id, channel_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/channels/${encodeURIComponent(String(channel_id))}/messages`,
    body: ({ content, content_html, encrypted_content, encryption_metadata, is_encrypted, thread_id, parent_id, attachments, mentions, linked_content }) => ({
      ...(content !== undefined ? { content } : {}),
      ...(content_html !== undefined ? { content_html } : {}),
      ...(encrypted_content !== undefined ? { encrypted_content } : {}),
      ...(encryption_metadata !== undefined ? { encryption_metadata } : {}),
      ...(is_encrypted !== undefined ? { is_encrypted } : {}),
      ...(thread_id !== undefined ? { thread_id } : {}),
      ...(parent_id !== undefined ? { parent_id } : {}),
      ...(attachments !== undefined ? { attachments } : {}),
      ...(mentions !== undefined ? { mentions } : {}),
      ...(linked_content !== undefined ? { linked_content } : {}),
    }),
    outputSchema: messageOutputSchema,
    outputTransform: (data) => normalizeBySchema(messageOutputSchema, data),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });

  registerApiTool(server, client, {
    name: 'nexus_create_channel_poll',
    title: 'Create Nexus Channel Poll',
    description: 'Create a poll in a channel by sending a message with poll linked content.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      channel_id: idSchema('Channel'),
      ...createChannelPollInputShape,
    },
    method: 'POST',
    path: ({ workspace_id, channel_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/channels/${encodeURIComponent(String(channel_id))}/messages`,
    body: ({ content, content_html, question, options, allow_multiple_choice, show_results_before_voting }) =>
      buildCreatePollBody({
        content,
        content_html,
        question,
        options,
        allow_multiple_choice,
        show_results_before_voting,
      }),
    outputSchema: messageOutputSchema,
    outputTransform: (data) => normalizeBySchema(messageOutputSchema, data),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });

  registerApiTool(server, client, {
    name: 'nexus_get_channel_unread_count',
    title: 'Get Nexus Channel Unread Count',
    description: 'Get unread message count for a channel.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      channel_id: idSchema('Channel'),
    },
    path: ({ workspace_id, channel_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/channels/${encodeURIComponent(String(channel_id))}/unread-count`,
    outputSchema: channelUnreadCountOutputSchema,
    outputTransform: (data) => normalizeBySchema(channelUnreadCountOutputSchema, data),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  });

  registerApiTool(server, client, {
    name: 'nexus_bookmark_message',
    title: 'Bookmark Nexus Message',
    description: 'Bookmark a message in a channel or conversation.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      message_id: idSchema('Message'),
    },
    method: 'POST',
    path: ({ workspace_id, message_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/messages/${encodeURIComponent(String(message_id))}/bookmark`,
    body: () => ({}),
    outputSchema: bookmarkMessageOutputSchema,
    outputTransform: (data) => normalizeBookmarkMessageResponse(data),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });

  registerApiTool(server, client, {
    name: 'nexus_unbookmark_message',
    title: 'Unbookmark Nexus Message',
    description: 'Remove bookmark from a message in a channel or conversation.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      message_id: idSchema('Message'),
    },
    method: 'DELETE',
    path: ({ workspace_id, message_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/messages/${encodeURIComponent(String(message_id))}/bookmark`,
    outputSchema: bookmarkMessageOutputSchema,
    outputTransform: (data) => normalizeBookmarkMessageResponse(data),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });

  registerApiTool(server, client, {
    name: 'nexus_get_channel_bookmarked_messages',
    title: 'Get Nexus Channel Bookmarked Messages',
    description: 'Get bookmarked messages in a channel with pagination.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      channel_id: idSchema('Channel'),
      page: pageSchema,
      limit: limitSchema,
    },
    path: ({ workspace_id, channel_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/channels/${encodeURIComponent(String(channel_id))}/bookmarks`,
    query: ({ page, limit }) => ({ page, limit }),
    outputSchema: channelBookmarkedMessagesOutputSchema,
    outputTransform: (data) => normalizeChannelBookmarkedMessagesResponse(data),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_schedule_message',
    title: 'Schedule Nexus Message',
    description: 'Schedule a channel message to be sent later.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      ...scheduleMessageInputShape,
    },
    method: 'POST',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/scheduled-messages`,
    body: ({ content, contentHtml, channelId, threadId, parentId, attachments, mentions, linkedContent, scheduledAt }) => ({
      content,
      ...(contentHtml !== undefined ? { contentHtml } : {}),
      ...(channelId !== undefined ? { channelId } : {}),
      ...(threadId !== undefined ? { threadId } : {}),
      ...(parentId !== undefined ? { parentId } : {}),
      ...(attachments !== undefined ? { attachments } : {}),
      ...(mentions !== undefined ? { mentions } : {}),
      ...(linkedContent !== undefined ? { linkedContent } : {}),
      scheduledAt,
    }),
    outputSchema: scheduledMessageActionOutputSchema,
    outputTransform: (data) => normalizeScheduledMessageActionResponse(data),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });

  registerApiTool(server, client, {
    name: 'nexus_get_scheduled_messages',
    title: 'Get Nexus Scheduled Messages',
    description: 'List scheduled channel messages for the current user, optionally filtered by status or channel.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      status: scheduledMessageStatusSchema.optional().describe('Optional status filter.'),
      channelId: z.string().uuid().optional().describe('Optional channel filter.'),
      limit: limitSchema,
      offset: offsetSchema,
    },
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/scheduled-messages`,
    query: ({ status, channelId, limit, offset }) => ({
      status,
      channelId,
      limit,
      offset,
    }),
    outputSchema: scheduledMessagesListOutputSchema,
    outputTransform: (data) => normalizeScheduledMessagesListResponse(data),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_get_scheduled_message',
    title: 'Get Nexus Scheduled Message',
    description: 'Get details for a scheduled message by ID.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      scheduled_message_id: idSchema('Scheduled message'),
    },
    path: ({ workspace_id, scheduled_message_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/scheduled-messages/${encodeURIComponent(String(scheduled_message_id))}`,
    outputSchema: scheduledMessageGetOutputSchema,
    outputTransform: (data) => normalizeScheduledMessageGetResponse(data),
    annotations: readOnly,
  });

  registerApiTool(server, client, {
    name: 'nexus_update_scheduled_message',
    title: 'Update Nexus Scheduled Message',
    description: 'Update a pending scheduled message.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      scheduled_message_id: idSchema('Scheduled message'),
      ...updateScheduledMessageInputShape,
    },
    method: 'PUT',
    path: ({ workspace_id, scheduled_message_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/scheduled-messages/${encodeURIComponent(String(scheduled_message_id))}`,
    body: ({ content, contentHtml, attachments, mentions, linkedContent, scheduledAt }) => ({
      ...(content !== undefined ? { content } : {}),
      ...(contentHtml !== undefined ? { contentHtml } : {}),
      ...(attachments !== undefined ? { attachments } : {}),
      ...(mentions !== undefined ? { mentions } : {}),
      ...(linkedContent !== undefined ? { linkedContent } : {}),
      ...(scheduledAt !== undefined ? { scheduledAt } : {}),
    }),
    outputSchema: scheduledMessageActionOutputSchema,
    outputTransform: (data) => normalizeScheduledMessageActionResponse(data),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });

  registerApiTool(server, client, {
    name: 'nexus_cancel_scheduled_message',
    title: 'Cancel Nexus Scheduled Message',
    description: 'Cancel a pending scheduled message.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      scheduled_message_id: idSchema('Scheduled message'),
    },
    method: 'DELETE',
    path: ({ workspace_id, scheduled_message_id }) =>
      `workspaces/${encodeURIComponent(String(workspace_id))}/scheduled-messages/${encodeURIComponent(String(scheduled_message_id))}`,
    outputSchema: scheduledMessageCancelOutputSchema,
    outputTransform: (data) => normalizeBySchema(scheduledMessageCancelOutputSchema, data),
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  });
}

function unwrapChannelResponse(data: unknown): unknown {
  if (data && typeof data === 'object' && 'data' in data) {
    return (data as { data?: unknown }).data;
  }

  return data;
}

function normalizeChannelListResponse(data: unknown): unknown[] {
  const channels = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: unknown }).data)
      ? (data as { data: unknown[] }).data
      : [];

  return channels.map((channel) => normalizeBySchema(listChannelItemOutputSchema, channel));
}

function normalizeChannelMembersResponse(data: unknown): unknown[] {
  const members = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: unknown }).data)
      ? (data as { data: unknown[] }).data
      : [];

  return members.map((member) => normalizeBySchema(channelMemberOutputSchema, member));
}

function normalizeChannelMessagesResponse(data: unknown): unknown[] {
  const messages = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && 'data' in data && Array.isArray((data as { data?: unknown }).data)
      ? (data as { data: unknown[] }).data
      : [];

  return messages.map((message) => normalizeBySchema(messageOutputSchema, message));
}

function buildCreatePollBody(params: {
  content?: unknown;
  content_html?: unknown;
  question: unknown;
  options: unknown;
  allow_multiple_choice?: unknown;
  show_results_before_voting?: unknown;
}) {
  const pollId = crypto.randomUUID();
  const optionTexts = Array.isArray(params.options) ? params.options : [];

  return {
    ...(params.content !== undefined ? { content: params.content } : {}),
    ...(params.content_html !== undefined ? { content_html: params.content_html } : {}),
    linked_content: [
      {
        id: pollId,
        title: String(params.question),
        type: 'poll',
        poll: {
          id: pollId,
          question: String(params.question),
          options: optionTexts.map((text) => ({
            id: crypto.randomUUID(),
            text: String(text),
            voteCount: 0,
          })),
          isOpen: true,
          showResultsBeforeVoting: params.show_results_before_voting ?? true,
          allowMultipleChoice: params.allow_multiple_choice ?? false,
          // Backend should overwrite this with the authenticated user when needed.
          createdBy: 'mcp-user',
          totalVotes: 0,
        },
      },
    ],
  };
}

function normalizeBookmarkMessageResponse(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const result = data as { message?: unknown; data?: unknown };
  return normalizeBySchema(bookmarkMessageOutputSchema, {
    message: result.message,
    data: normalizeBySchema(messageOutputSchema, result.data),
  });
}

function normalizeChannelBookmarkedMessagesResponse(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const result = data as {
    data?: unknown;
    total?: unknown;
    page?: unknown;
    limit?: unknown;
    totalPages?: unknown;
  };

  const messages = Array.isArray(result.data) ? result.data : [];

  return normalizeBySchema(channelBookmarkedMessagesOutputSchema, {
    messages: messages.map((message) => normalizeBySchema(messageOutputSchema, message)),
    total: result.total,
    page: result.page,
    limit: result.limit,
    totalPages: result.totalPages,
  });
}

function normalizeScheduledMessageActionResponse(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const result = data as { message?: unknown; data?: unknown };
  return normalizeBySchema(scheduledMessageActionOutputSchema, {
    message: result.message,
    data: normalizeBySchema(scheduledMessageOutputSchema, result.data),
  });
}

function normalizeScheduledMessagesListResponse(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const result = data as { data?: unknown; total?: unknown };
  const messages = Array.isArray(result.data) ? result.data : [];

  return normalizeBySchema(scheduledMessagesListOutputSchema, {
    messages: messages.map((message) => normalizeBySchema(scheduledMessageOutputSchema, message)),
    total: result.total,
  });
}

function normalizeScheduledMessageGetResponse(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const result = data as { data?: unknown };
  return normalizeBySchema(scheduledMessageGetOutputSchema, {
    data: normalizeBySchema(scheduledMessageOutputSchema, result.data),
  });
}

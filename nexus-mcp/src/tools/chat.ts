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
      'Use this tool when you need to create a new channel in a workspace. Provide a name (required), optional description, channel type ("channel" or "dm"), and set is_private=true with member_ids to create a private channel with specific members.',
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
    description:
      'Use this tool when you need to list all channels in a workspace that the authenticated user has access to. Returns both public and private channels the user is a member of, including member count and membership status.',
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
    description:
      'Use this tool when you need to search for private channels in a workspace by name. Provide a name query string to find matching private channels the user has access to.',
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
    description:
      'Use this tool when you need to get detailed information about a specific channel by its ID. Returns channel metadata including name, description, type, privacy setting, creation info, and collaborative data.',
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
    description:
      'Use this tool when you need to list all members of a channel with their user details. Returns user ID, name, email, and role (admin/moderator/member) for each member.',
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
      'Use this tool when you need to update a channel\'s properties. Supports changing name, description, privacy flag, and the member list for private channels. All fields are optional—only provided fields will be updated.',
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
    description:
      'Use this tool when you need to add one or more members to a channel. Provide a single user_id or an array of user_ids. Optionally assign a role (admin/moderator/member) to the added users.',
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
    description:
      'Use this tool when you need to retrieve messages from a channel with pagination (limit/offset). Returns message objects with content, sender info, timestamps, attachments, mentions, reactions, thread metadata, and bookmark status.',
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
    description:
      'Use this tool when you need to send a message to a channel. Supports plain text, HTML, encrypted content (with encryption_metadata), thread replies (thread_id/parent_id), file attachments, user mentions, and linked content like notes, events, or polls.',
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
    outputTransform: (data) => normalizeBySchema(messageOutputSchema, normalizeRawMessage(data)),
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
    description:
      'Use this tool when you need to create an interactive poll in a channel. Specify the question and between 2-10 options. Optionally configure allow_multiple_choice and show_results_before_voting. An optional message can accompany the poll.',
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
    outputTransform: (data) => normalizeBySchema(messageOutputSchema, normalizeRawMessage(data)),
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
    description:
      'Use this tool when you need to check the number of unread messages in a channel for the current authenticated user.',
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
    description:
      'Use this tool when you need to bookmark a specific message in a channel or conversation for quick retrieval later. Provide the message ID to bookmark.',
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
    description:
      'Use this tool when you need to remove a bookmark from a previously bookmarked message in a channel or conversation. Provide the message ID to unbookmark.',
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
    description:
      'Use this tool when you need to retrieve all bookmarked messages in a channel with pagination (page/limit). Returns message content along with bookmark metadata such as bookmark time and user.',
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
    description:
      'Use this tool when you need to schedule a channel message to be sent at a future date and time. Provide content, channel ID, the scheduledAt ISO timestamp, and optionally thread/parent IDs, attachments, mentions, and linked content.',
    inputSchema: {
      workspace_id: workspaceIdSchema,
      ...scheduleMessageInputShape,
    },
    method: 'POST',
    path: ({ workspace_id }) => `workspaces/${encodeURIComponent(String(workspace_id))}/scheduled-messages`,
    body: ({ content, contentHtml, channelId, threadId, parentId, attachments, mentions, linkedContent, scheduledAt }) => ({
      content,
      ...(contentHtml !== undefined ? { contentHtml } : {}),
      channelId,
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
    description:
      'Use this tool when you need to list all scheduled messages for the current user. Optionally filter by status (pending/sent/cancelled/failed) or channel ID, with pagination (limit/offset).',
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
    description:
      'Use this tool when you need to view the full details of a specific scheduled message by its ID. Returns content, scheduled time, status, channel, and any failure reason.',
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
    description:
      'Use this tool when you need to update the content, attachments, mentions, linked content, or scheduled time of a pending (not yet sent) scheduled message.',
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
    description:
      'Use this tool when you need to cancel a pending scheduled message before it has been sent. Once cancelled, the message will not be delivered.',
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

  return messages.map((message) => normalizeBySchema(messageOutputSchema, normalizeRawMessage(message)));
}

function parseJsonField(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// The bookmark endpoints return raw DB rows where JSONB columns
// (attachments/mentions/linked_content/reactions/encryption_metadata) are still
// JSON strings — parse them before schema validation.
function normalizeRawMessage(message: unknown): unknown {
  if (!message || typeof message !== 'object') {
    return message;
  }

  const raw = message as Record<string, unknown>;
  const attachments = parseJsonField(raw.attachments);
  const mentions = parseJsonField(raw.mentions);
  const linkedContent = parseJsonField(raw.linked_content);
  const reactions = parseJsonField(raw.reactions);
  const encryptionMetadata = parseJsonField(raw.encryption_metadata);

  return {
    ...raw,
    content: raw.content ?? null,
    attachments: Array.isArray(attachments) ? attachments : [],
    mentions: Array.isArray(mentions) ? mentions : [],
    linked_content: Array.isArray(linkedContent) ? linkedContent : [],
    reactions:
      Array.isArray(reactions) || (reactions !== null && typeof reactions === 'object') ? reactions : {},
    encryption_metadata:
      encryptionMetadata !== null && typeof encryptionMetadata === 'object' ? encryptionMetadata : null,
  };
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
    data: normalizeBySchema(messageOutputSchema, normalizeRawMessage(result.data)),
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
    messages: messages.map((message) => normalizeBySchema(messageOutputSchema, normalizeRawMessage(message))),
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

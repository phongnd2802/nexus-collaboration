import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { idSchema, limitSchema, offsetSchema, workspaceIdSchema } from '../schemas/common.js';
import {
  addChannelMembersInputShape,
  addChannelMembersOutputSchema,
  channelMessagesOutputSchema,
  createChannelInputShape,
  createChannelOutputSchema,
  channelUnreadCountOutputSchema,
  channelMembersOutputSchema,
  channelMemberOutputSchema,
  getChannelOutputSchema,
  listChannelsOutputSchema,
  listChannelItemOutputSchema,
  messageOutputSchema,
  sendChannelMessageInputShape,
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

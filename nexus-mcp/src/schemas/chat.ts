import { z } from 'zod';

export const createChannelInputShape = {
  name: z.string().min(1).max(50).describe('Channel name.'),
  description: z.string().max(500).optional().describe('Channel description.'),
  type: z.enum(['channel', 'dm']).default('channel').describe('Channel type.'),
  is_private: z.boolean().default(false).describe('Whether this channel is private.'),
  member_ids: z.array(z.string().uuid()).optional().describe('User IDs to add as members for private channels.'),
};

export const updateChannelInputShape = {
  name: z.string().min(1).max(50).optional().describe('Channel name.'),
  description: z.string().max(500).optional().describe('Channel description.'),
  is_private: z.boolean().optional().describe('Whether this channel is private.'),
  member_ids: z.array(z.string().uuid()).optional().describe('User IDs to set as members for private channels.'),
};

export const addChannelMembersInputShape = {
  user_id: z.string().uuid().optional().describe('Single user ID to add to the channel.'),
  user_ids: z.array(z.string().uuid()).optional().describe('Multiple user IDs to add to the channel.'),
  role: z.enum(['admin', 'moderator', 'member']).optional().describe('Role to assign to added members.'),
};

export const channelOutputSchema = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1),
    description: z.string().nullable(),
    type: z.enum(['channel', 'dm']).or(z.string()),
    is_private: z.boolean(),
    is_archived: z.boolean(),
    archived_at: z.string().datetime().nullable(),
    archived_by: z.string().nullable(),
    created_by: z.string().nullable(),
    collaborative_data: z.record(z.unknown()),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strip();

export const createChannelOutputSchema = channelOutputSchema;

export const updateChannelOutputSchema = channelOutputSchema;

export const getChannelOutputSchema = channelOutputSchema;

export const listChannelItemOutputSchema = channelOutputSchema.extend({
  member_count: z.number().int().nonnegative().optional(),
  is_member: z.boolean().optional(),
});

export const listChannelsOutputSchema = z.object({
  channels: z.array(listChannelItemOutputSchema),
});

export const channelMemberOutputSchema = z
  .object({
    user_id: z.string().uuid(),
    name: z.string().min(1),
    email: z.string().email().nullable(),
    role: z.enum(['admin', 'moderator', 'member']).or(z.string()),
  })
  .strip();

export const channelMembersOutputSchema = z.object({
  members: z.array(channelMemberOutputSchema),
});

export const addChannelMembersOutputSchema = z
  .object({
    success: z.literal(true),
    message: z.string().min(1),
    added_count: z.number().int().nonnegative(),
  })
  .strip();

export const sendChannelMessageAttachmentInputSchema = z
  .object({
    id: z.string().min(1),
    fileName: z.string().min(1),
    url: z.string().min(1),
    mimeType: z.string().min(1),
    fileSize: z.string().min(1),
  })
  .strip();

export const sendChannelMessageLinkedContentInputSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    type: z.enum(['notes', 'events', 'files', 'drive', 'poll']),
    subtitle: z.string().optional(),
    driveFileUrl: z.string().optional(),
    driveThumbnailUrl: z.string().optional(),
    driveMimeType: z.string().optional(),
    driveFileSize: z.number().optional(),
    poll: z
      .object({
        id: z.string().min(1),
        question: z.string().min(1),
        options: z.array(
          z
            .object({
              id: z.string().min(1),
              text: z.string().min(1),
              voteCount: z.number().optional(),
            })
            .strip(),
        ),
        isOpen: z.boolean(),
        showResultsBeforeVoting: z.boolean(),
        allowMultipleChoice: z.boolean().optional(),
        createdBy: z.string().min(1),
        totalVotes: z.number().optional(),
      })
      .strip()
      .optional(),
  })
  .strip();

export const sendChannelMessageInputShape = {
  content: z.string().optional().describe('Plaintext message content, or empty when sending encrypted content.'),
  content_html: z.string().optional().describe('HTML formatted content.'),
  // encrypted_content: z.string().optional().describe('Encrypted message content.'),
  // encryption_metadata: z
  //   .object({
  //     algorithm: z.string().min(1),
  //     version: z.string().min(1),
  //     nonce: z.string().min(1),
  //     conversationId: z.string().min(1),
  //   })
  //   .strip()
  //   .optional()
  //   .describe('Encryption metadata for end-to-end encrypted messages.'),
  // is_encrypted: z.boolean().optional().describe('Whether the message is end-to-end encrypted.'),
  thread_id: z.string().uuid().optional().describe('Thread ID if replying in a thread.'),
  parent_id: z.string().uuid().optional().describe('Parent message ID if replying to a message.'),
  attachments: z.array(sendChannelMessageAttachmentInputSchema).optional().describe('File attachments with metadata.'),
  mentions: z.array(z.string().min(1)).optional().describe('Mentioned user IDs.'),
  linked_content: z
    .array(sendChannelMessageLinkedContentInputSchema)
    .optional()
    .describe('Linked notes, events, files, drive items, or polls.'),
};

export const messageUserOutputSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    email: z.string().nullable().optional(),
  })
  .strip();

export const messageAttachmentOutputSchema = z
  .object({
    id: z.string().min(1).optional(),
    filename: z.string().optional(),
    fileName: z.string().min(1),
    size: z.number().optional(),
    fileSize: z.string().min(1),
    mimeType: z.string().min(1),
    url: z.string().min(1),
  })
  .strip();

export const messageReactionOutputSchema = z
  .object({
    id: z.string().optional(),
    emoji: z.string().min(1),
    users: z.array(z.string().min(1)),
    userId: z.string().optional(),
  })
  .strip();

export const messageLinkedContentOutputSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    type: z.enum(['notes', 'events', 'files', 'drive', 'poll']).or(z.string()),
    subtitle: z.string().optional(),
    driveFileUrl: z.string().optional(),
    driveThumbnailUrl: z.string().optional(),
    driveMimeType: z.string().optional(),
    driveFileSize: z.number().optional(),
    poll: z.record(z.unknown()).optional(),
  })
  .strip();

export const messageOutputSchema = z
  .object({
    id: z.string().min(1),
    channel_id: z.string().min(1).optional(),
    conversation_id: z.string().min(1).nullable().optional(),
    user_id: z.string().min(1),
    content: z.string(),
    content_html: z.string().nullable().optional(),
    // encrypted_content: z.string().nullable().optional(),
    // encryption_metadata: z.record(z.unknown()).nullable().optional(),
    // is_encrypted: z.boolean().optional(),
    thread_id: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
    attachments: z.array(messageAttachmentOutputSchema),
    mentions: z.array(z.string()),
    linked_content: z.array(messageLinkedContentOutputSchema),
    reactions: z.union([z.array(messageReactionOutputSchema), z.record(z.unknown())]),
    read_by_count: z.number().int().nonnegative().optional(),
    reply_count: z.number().int().nonnegative().optional(),
    user: messageUserOutputSchema.nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strip();

export const channelMessagesOutputSchema = z.object({
  messages: z.array(messageOutputSchema),
});

export const channelUnreadCountOutputSchema = z
  .object({
    count: z.number().int().nonnegative(),
  })
  .strip();

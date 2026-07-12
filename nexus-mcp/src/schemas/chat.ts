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
    // user_id is VARCHAR in the DB and may hold non-UUID values (e.g. bot members).
    user_id: z.string().min(1),
    name: z.string().min(1),
    email: z.string().nullable(),
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

export const pollOptionSchema = z
  .object({
    id: z.string().min(1).describe('Unique ID for this poll option (e.g. a UUID or short slug).'),
    text: z.string().min(1).describe('Label shown to voters for this option.'),
    voteCount: z.number().nonnegative().optional().describe('Number of votes this option has received so far. Defaults to 0 for a new poll.'),
  })
  .strip();

export const linkedContentPollSchema = z
  .object({
    id: z.string().min(1).describe('Poll ID. Should match the parent linkedContent item\'s id.'),
    question: z.string().min(1).describe('The poll question shown to users.'),
    options: z.array(pollOptionSchema).min(2).describe('2 or more selectable options for the poll.'),
    isOpen: z.boolean().describe('Whether the poll is still accepting votes (true) or closed (false).'),
    showResultsBeforeVoting: z.boolean().describe('Whether voters can see current results before casting their own vote.'),
    allowMultipleChoice: z.boolean().optional().describe('Whether voters may select more than one option. Defaults to false (single choice).'),
    createdBy: z.string().min(1).describe('User ID of the poll creator.'),
    totalVotes: z.number().nonnegative().optional().describe('Total number of votes cast across all options. Defaults to 0 for a new poll.'),
  })
  .strip();

export const sendChannelMessageLinkedContentInputSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .describe('ID of the linked item: the note/event/file ID being referenced, or (for type="poll") the poll ID. Generate a new UUID when linking a fresh poll.'),
    title: z.string().min(1).describe('Display title shown on the linked-content preview card (e.g. the note title, file name, event title, or poll question).'),
    type: z
      .enum(['notes', 'events', 'files', 'drive', 'poll'])
      .describe(
        'What kind of content this is, which determines which other fields apply: ' +
        '"notes" links to a workspace note (use id + title, optional subtitle; leave drive* and poll unset). ' +
        '"events" links to a calendar event (use id + title, optional subtitle; leave drive* and poll unset). ' +
        '"files" links to an uploaded workspace file (use id + title, optional subtitle; leave drive* and poll unset). ' +
        '"drive" links to an external Drive file/preview (use id + title, and the drive* fields for the preview card; leave poll unset). ' +
        '"poll" embeds an interactive poll in the message (use id + title = the poll question, and fill in the poll object; leave drive* unset).'
      ),
    subtitle: z.string().optional().describe('Optional secondary line shown under the title on the preview card (e.g. a short excerpt, folder name, or date).'),
    driveFileUrl: z.string().optional().describe('Only for type="drive": URL to open/download the Drive file.'),
    driveThumbnailUrl: z.string().optional().describe('Only for type="drive": URL of a thumbnail image to show on the preview card.'),
    driveMimeType: z.string().optional().describe('Only for type="drive": MIME type of the file, e.g. "application/pdf" or "image/png".'),
    driveFileSize: z.number().nonnegative().optional().describe('Only for type="drive": file size in bytes.'),
    poll: linkedContentPollSchema
      .optional()
      .describe('Required when type="poll": the full poll payload (question, options, voting settings). Omit for all other types.'),
  })
  .strip();

const LINKED_CONTENT_DESCRIPTION =
  'Rich content to attach to the message, shown as preview cards. Each item needs id, title, and type ' +
  '("notes" | "events" | "files" | "drive" | "poll"), which determines the other required fields: ' +
  'for "notes"/"events"/"files", only id + title (+ optional subtitle) are needed; ' +
  'for "drive", also set driveFileUrl/driveThumbnailUrl/driveMimeType/driveFileSize; ' +
  'for "poll", also set the poll object (question, options, voting settings) — leave drive* fields unset. ' +
  'To attach a brand-new poll, generate a UUID and use it as both the item id and poll.id.';

export const sendChannelMessageInputShape = {
  content: z.string().optional().describe('Plaintext message content. Usually provided for normal messages.'),
  content_html: z.string().optional().describe('HTML formatted message content for rich text.'),
  encrypted_content: z.string().optional().describe('Encrypted message content for end-to-end encrypted messages. Use with is_encrypted=true.'),
  is_encrypted: z.boolean().optional().describe('Whether this message is end-to-end encrypted.'),
  thread_id: z
    .string()
    .uuid()
    .optional()
    .describe('Root message ID of the thread. For the first reply in a thread, this is usually the same as parent_id.'),
  parent_id: z
    .string()
    .uuid()
    .optional()
    .describe('Direct parent message ID being replied to.'),
  attachments: z.array(sendChannelMessageAttachmentInputSchema).optional().describe('File attachments with metadata.'),
  mentions: z.array(z.string().min(1)).optional().describe('Mentioned user IDs.'),
  linked_content: z
    .array(sendChannelMessageLinkedContentInputSchema)
    .optional()
    .describe(LINKED_CONTENT_DESCRIPTION),
};

export const createChannelPollInputShape = {
  content: z.string().optional().describe('Optional plaintext message that accompanies the poll.'),
  content_html: z.string().optional().describe('Optional HTML message that accompanies the poll.'),
  question: z.string().min(1).max(500).describe('Poll question.'),
  options: z
    .array(z.string().min(1).max(200))
    .min(2)
    .max(10)
    .describe('Poll options. Provide between 2 and 10 non-empty options.'),
  allow_multiple_choice: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether voters can select multiple options.'),
  show_results_before_voting: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether poll results are visible before the user votes.'),
};

export const scheduledMessageStatusSchema = z.enum(['pending', 'sent', 'cancelled', 'failed']);

const SCHEDULED_AT_DESCRIPTION =
  'Scheduled send time as a full ISO 8601 datetime string WITH timezone. ' +
  'Accepted formats: UTC with "Z" suffix (e.g. "2026-07-12T03:10:00Z" or "2026-07-12T03:10:00.000Z") ' +
  'or with an explicit UTC offset (e.g. "2026-07-12T10:10:00+07:00"). ' +
  'Rejected: date-only strings ("2026-07-12"), datetimes without timezone ("2026-07-12T10:10:00"), ' +
  'or non-ISO formats ("2026-07-12 10:10"). ' +
  'When the user gives a local time (e.g. "10:10 AM Vietnam time"), either append their UTC offset ' +
  '(e.g. "+07:00") or convert to UTC before calling. Must be a future time.';

export const scheduleMessageInputShape = {
  content: z.string().min(1).describe('Message content.'),
  contentHtml: z.string().optional().describe('HTML formatted content.'),
  channelId: z.string().uuid().describe('Channel ID for the scheduled message.'),
  threadId: z.string().uuid().optional().describe('Root thread message ID if scheduling a thread reply.'),
  parentId: z.string().uuid().optional().describe('Direct parent message ID if scheduling a reply.'),
  attachments: z.array(sendChannelMessageAttachmentInputSchema).optional().describe('File attachments with metadata.'),
  mentions: z.array(z.string().min(1)).optional().describe('Mentioned user IDs.'),
  linkedContent: z
    .array(sendChannelMessageLinkedContentInputSchema)
    .optional()
    .describe(LINKED_CONTENT_DESCRIPTION),
  scheduledAt: z.string().datetime({ offset: true }).describe(SCHEDULED_AT_DESCRIPTION),
};

export const updateScheduledMessageInputShape = {
  content: z.string().min(1).optional().describe('Updated message content.'),
  contentHtml: z.string().optional().describe('Updated HTML formatted content.'),
  attachments: z.array(sendChannelMessageAttachmentInputSchema).optional().describe('Updated attachments.'),
  mentions: z.array(z.string().min(1)).optional().describe('Updated mentioned user IDs.'),
  linkedContent: z
    .array(sendChannelMessageLinkedContentInputSchema)
    .optional()
    .describe(`Updated linked content. ${LINKED_CONTENT_DESCRIPTION}`),
  scheduledAt: z.string().datetime({ offset: true }).optional().describe(`Updated scheduled send time. ${SCHEDULED_AT_DESCRIPTION}`),
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
    // content is nullable in the DB (attachment-only or E2EE messages).
    content: z.string().nullable(),
    content_html: z.string().nullable().optional(),
    encrypted_content: z.string().nullable().optional(),
    encryption_metadata: z.record(z.unknown()).nullable().optional(),
    is_encrypted: z.boolean().optional(),
    thread_id: z.string().nullable().optional(),
    parent_id: z.string().nullable().optional(),
    attachments: z.array(messageAttachmentOutputSchema),
    mentions: z.array(z.string()),
    linked_content: z.array(messageLinkedContentOutputSchema),
    reactions: z.union([z.array(messageReactionOutputSchema), z.record(z.unknown())]),
    read_by_count: z.number().int().nonnegative().optional(),
    reply_count: z.number().int().nonnegative().optional(),
    is_bookmarked: z.boolean().optional(),
    bookmarked_at: z.string().datetime().nullable().optional(),
    bookmarked_by: z.string().nullable().optional(),
    is_pinned: z.boolean().optional(),
    pinned_at: z.string().datetime().nullable().optional(),
    pinned_by: z.string().nullable().optional(),
    user: messageUserOutputSchema.nullable().optional(),
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

export const bookmarkMessageOutputSchema = z
  .object({
    message: z.string().min(1),
    data: messageOutputSchema,
  })
  .strip();

export const channelBookmarkedMessagesOutputSchema = z
  .object({
    messages: z.array(messageOutputSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    totalPages: z.number().int().nonnegative(),
  })
  .strip();

export const scheduledMessageOutputSchema = z
  .object({
    id: z.string().min(1),
    workspaceId: z.string().min(1),
    channelId: z.string().nullable(),
    userId: z.string().min(1),
    content: z.string(),
    contentHtml: z.string().nullable(),
    attachments: z.array(sendChannelMessageAttachmentInputSchema),
    mentions: z.array(z.string()),
    linkedContent: z.array(sendChannelMessageLinkedContentInputSchema),
    threadId: z.string().nullable(),
    parentId: z.string().nullable(),
    scheduledAt: z.string().datetime(),
    status: scheduledMessageStatusSchema,
    sentAt: z.string().datetime().nullable(),
    sentMessageId: z.string().nullable(),
    failureReason: z.string().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    destinationName: z.string().optional(),
    destinationType: z.enum(['channel', 'conversation']).optional(),
  })
  .strip();

export const scheduledMessageActionOutputSchema = z
  .object({
    message: z.string().min(1),
    data: scheduledMessageOutputSchema,
  })
  .strip();

export const scheduledMessagesListOutputSchema = z
  .object({
    messages: z.array(scheduledMessageOutputSchema),
    total: z.number().int().nonnegative(),
  })
  .strip();

export const scheduledMessageGetOutputSchema = z
  .object({
    data: scheduledMessageOutputSchema,
  })
  .strip();

export const scheduledMessageCancelOutputSchema = z
  .object({
    message: z.string().min(1),
  })
  .strip();

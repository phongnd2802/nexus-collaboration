import { z } from "zod";

export const successSchema = z.object({
  ok: z.literal(true),
  summary: z.string(),
  data: z.any(),
});

export const uuid = z.string().min(1);
export const optionalStringArray = z.array(z.string()).optional();
export const uuidArray = z.array(uuid).optional();

export const attachmentsSchema = z
  .object({
    note_attachment: optionalStringArray,
    file_attachment: optionalStringArray,
    event_attachment: optionalStringArray,
    drive_attachment: optionalStringArray,
  })
  .partial()
  .optional();

export const projectCreateAttachmentsSchema = z
  .object({
    note_attachment: optionalStringArray,
    file_attachment: optionalStringArray,
    event_attachment: optionalStringArray,
  })
  .partial()
  .optional();

export const projectCreateBodyShape = {
  name: z.string().min(1),
  description: z.string().optional(),
  owner_id: z.string().optional(),
  lead_id: z.string().min(1),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  kanban_stages: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        order: z.number(),
        color: z.string(),
      }),
    )
    .optional(),
  attachments: projectCreateAttachmentsSchema,
  collaborative_data: z.object({
    default_assignee_ids: z.array(z.string()),
  }),
} satisfies z.ZodRawShape;

export const projectUpdateBodyShape = {
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  owner_id: z.string().optional(),
  lead_id: z.string().optional(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  kanban_stages: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        order: z.number(),
        color: z.string(),
      }),
    )
    .optional(),
  attachments: projectCreateAttachmentsSchema,
  collaborative_data: z.record(z.string(), z.any()).optional(),
} satisfies z.ZodRawShape;

export const taskBodyShape = {
  title: z.string().min(1),
  description: z.string().optional(),
  task_type: z.enum(["task", "story", "bug", "epic", "subtask"]).optional(),
  status: z.string().optional(),
  priority: z.enum(["lowest", "low", "medium", "high", "highest"]).optional(),
  sprint_id: z.string().optional(),
  parent_task_id: z.string().optional(),
  assigned_to: z.array(z.string()).optional(),
  assignee_team_member_id: z.string().optional(),
  reporter_team_member_id: z.string().optional(),
  due_date: z.string().optional(),
  story_points: z.number().optional(),
  labels: z.array(z.string()).optional(),
  attachments: attachmentsSchema,
  custom_fields: z.array(z.record(z.string(), z.any())).optional(),
} satisfies z.ZodRawShape;

export const noteBodyShape = {
  title: z.string().min(1),
  content: z.string().min(1),
  parent_id: z.string().optional(),
  template_id: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cover_image: z.string().optional(),
  icon: z.string().optional(),
  is_public: z.boolean().optional(),
  attachments: attachmentsSchema,
} satisfies z.ZodRawShape;

export const notePatchShape = {
  title: z.string().optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
  cover_image: z.string().optional(),
  icon: z.string().optional(),
  is_public: z.boolean().optional(),
  is_favorite: z.boolean().optional(),
  attachments: attachmentsSchema,
} satisfies z.ZodRawShape;

export const eventBodyShape = {
  title: z.string().min(1),
  description: z.string().optional(),
  start_time: z.string(),
  end_time: z.string(),
  all_day: z.boolean().optional(),
  location: z.string().optional(),
  room_id: z.string().optional(),
  category_id: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  meeting_url: z.string().optional(),
  visibility: z.enum(["private", "public", "internal"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  status: z.enum(["confirmed", "tentative", "cancelled"]).optional(),
  is_recurring: z.boolean().optional(),
  recurrence_rule: z.record(z.string(), z.any()).optional(),
  reminders: z.array(z.number()).optional(),
  attachments: attachmentsSchema,
  description_file_ids: z.array(z.string()).optional(),
} satisfies z.ZodRawShape;

export const channelCreateBodyShape = {
  name: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
  type: z.string().optional(),
  is_private: z.boolean().optional(),
  member_ids: uuidArray,
} satisfies z.ZodRawShape;

export const channelMessageAttachmentShape = {
  id: z.string().min(1),
  fileName: z.string().min(1),
  url: z.string().min(1),
  mimeType: z.string().min(1),
  fileSize: z.string().min(1),
} satisfies z.ZodRawShape;

export const pollOptionShape = {
  id: z.string().min(1),
  text: z.string().min(1),
  voteCount: z.number().optional(),
} satisfies z.ZodRawShape;

export const pollShape = {
  id: z.string().min(1),
  question: z.string().min(1),
  options: z.array(z.object(pollOptionShape)).min(1),
  isOpen: z.boolean(),
  showResultsBeforeVoting: z.boolean(),
  createdBy: z.string().min(1),
  totalVotes: z.number().optional(),
} satisfies z.ZodRawShape;

export const channelLinkedContentShape = {
  id: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["notes", "events", "files", "poll"]),
  subtitle: z.string().optional(),
  poll: z.object(pollShape).optional(),
} satisfies z.ZodRawShape;

export const channelSendMessageBodyShape = {
  content: z.string().optional(),
  content_html: z.string().optional(),
  parent_id: uuid.optional(),
  thread_id: uuid.optional(),
  attachments: z.array(z.object(channelMessageAttachmentShape)).optional(),
  mentions: uuidArray,
  linked_content: z.array(z.object(channelLinkedContentShape)).optional(),
} satisfies z.ZodRawShape;

export const optionalizeShape = (shape: z.ZodRawShape): z.ZodRawShape => {
  return Object.fromEntries(
    Object.entries(shape).map(([key, schema]) => [key, (schema as z.ZodTypeAny).optional()]),
  ) as z.ZodRawShape;
};

export const projectPatchShape = optionalizeShape(projectUpdateBodyShape);
export const taskPatchShape = {
  ...optionalizeShape(taskBodyShape),
  actual_hours: z.number().optional(),
  completed_by: z.string().optional(),
} satisfies z.ZodRawShape;
export const eventPatchShape = optionalizeShape(eventBodyShape);

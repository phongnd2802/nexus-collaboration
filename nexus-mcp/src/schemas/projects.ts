import { z } from 'zod';

const projectTypeSchema = z.enum(['kanban', 'scrum', 'bug_tracking', 'feature', 'research']);
const projectStatusSchema = z.enum(['active', 'on_hold', 'completed', 'archived']);
const projectPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
const taskTypeSchema = z.enum(['task', 'story', 'bug', 'epic', 'subtask']);
const taskPrioritySchema = z.enum(['lowest', 'low', 'medium', 'high', 'highest']);
const customFieldTypeSchema = z.enum([
  'text',
  'number',
  'date',
  'select',
  'multi_select',
  'checkbox',
  'url',
  'email',
  'phone',
  'person',
  'relation',
]);

const projectAttachmentGroupSchema = z
  .object({
    note_attachment: z.array(z.unknown()),
    file_attachment: z.array(z.unknown()),
    event_attachment: z.array(z.unknown()),
  })
  .strip();

export const projectAttachmentsInputSchema = z
  .object({
    note_attachment: z.array(z.string().uuid()).optional(),
    file_attachment: z.array(z.string().uuid()).optional(),
    event_attachment: z.array(z.string().uuid()).optional(),
  })
  .strip();

export const kanbanStageSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    order: z.number(),
    color: z.string().min(1),
  })
  .strip();

export const createProjectCollaborativeDataSchema = z
  .object({
    default_assignee_ids: z.array(z.string().uuid()).optional(),
  })
  .strip();

export const projectOutputSchema = z
  .object({
    id: z.string().min(1),
    workspace_id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    type: projectTypeSchema.or(z.string()).nullable().optional(),
    status: projectStatusSchema.or(z.string()).nullable().optional(),
    priority: projectPrioritySchema.or(z.string()).nullable().optional(),
    owner_id: z.string().min(1).nullable().optional(),
    lead_id: z.string().min(1).nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
    estimated_hours: z.number().nullable().optional(),
    actual_hours: z.number().nullable().optional(),
    budget: z.number().nullable().optional(),
    is_template: z.boolean().nullable().optional(),
    kanban_stages: z.array(kanbanStageSchema),
    attachments: projectAttachmentGroupSchema,
    collaborative_data: z.record(z.unknown()),
    archived_at: z.string().nullable().optional(),
    archived_by: z.string().nullable().optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strip();

export const projectsListOutputSchema = z.object({
  projects: z.array(projectOutputSchema),
});

export const createProjectInputShape = {
  name: z.string().min(1).max(255).describe('Project name.'),
  description: z.string().optional().describe('Project description.'),
  priority: projectPrioritySchema.optional().describe('Project priority.'),
  lead_id: z.string().uuid().optional().describe('Lead user ID.'),
  kanban_stages: z.array(kanbanStageSchema).optional().describe('Custom kanban stages.'),
  attachments: projectAttachmentsInputSchema.optional().describe('Linked notes, files, and events.'),
  collaborative_data: createProjectCollaborativeDataSchema.optional().describe('Additional collaborative project metadata (default assignee IDs).'),
};

export const updateProjectInputShape = {
  name: z.string().min(1).max(255).optional().describe('Project name.'),
  description: z.string().optional().describe('Project description.'),
  type: projectTypeSchema.optional().describe('Project type.'),
  status: projectStatusSchema.optional().describe('Project status.'),
  priority: projectPrioritySchema.optional().describe('Project priority.'),
  owner_id: z.string().uuid().optional().describe('Owner user ID.'),
  lead_id: z.string().uuid().optional().describe('Lead user ID.'),
  start_date: z.string().datetime().optional().describe('Project start date in ISO 8601 format.'),
  end_date: z.string().datetime().optional().describe('Project end date in ISO 8601 format.'),
  estimated_hours: z.number().nonnegative().optional().describe('Estimated hours for the project.'),
  budget: z.number().nonnegative().optional().describe('Project budget.'),
  is_template: z.boolean().optional().describe('Whether the project is a template.'),
  kanban_stages: z.array(kanbanStageSchema).optional().describe('Updated kanban stages.'),
  attachments: projectAttachmentsInputSchema.optional().describe('Updated note, file, and event links.'),
  collaborative_data: z.record(z.unknown()).optional().describe('Updated collaborative metadata.'),
};

const projectMemberUserSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email().nullable(),
    avatar_url: z.string().nullable().optional(),
  })
  .strip();

export const projectMemberOutputSchema = z
  .object({
    id: z.string().min(1),
    project_id: z.string().min(1),
    user_id: z.string().min(1),
    role: z.string().min(1),
    joined_at: z.string().datetime(),
    user: projectMemberUserSchema.nullable(),
  })
  .strip();

export const projectMembersOutputSchema = z.object({
  members: z.array(projectMemberOutputSchema),
});

const taskUserSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    email: z.string().email().nullable(),
    avatar_url: z.string().nullable().optional(),
  })
  .strip();

export const taskCustomFieldOptionSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    color: z.string().nullable().optional(),
  })
  .strip();

export const taskCustomFieldValueSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    fieldType: customFieldTypeSchema.or(z.string()),
    value: z.unknown().optional(),
    options: z.array(taskCustomFieldOptionSchema).optional(),
  })
  .strip();

export const taskOutputSchema = z
  .object({
    id: z.string().min(1),
    project_id: z.string().min(1),
    title: z.string().min(1),
    description: z.string().nullable().optional(),
    task_type: taskTypeSchema.or(z.string()).nullable().optional(),
    status: z.string().min(1),
    priority: taskPrioritySchema.or(z.string()).nullable().optional(),
    sprint_id: z.string().nullable().optional(),
    parent_task_id: z.string().nullable().optional(),
    assigned_to: z.array(z.string()),
    assignees: z.array(taskUserSchema).optional(),
    assignee_team_member_id: z.string().nullable().optional(),
    reporter_team_member_id: z.string().nullable().optional(),
    due_date: z.string().nullable().optional(),
    story_points: z.number().nullable().optional(),
    actual_hours: z.number().nullable().optional(),
    labels: z.array(z.string()),
    attachments: projectAttachmentGroupSchema,
    custom_fields: z.array(taskCustomFieldValueSchema),
    collaborative_data: z.record(z.unknown()),
    created_by: z.string().nullable().optional(),
    updated_by: z.string().nullable().optional(),
    completed_by: z.string().nullable().optional(),
    completed_at: z.string().nullable().optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    updated_by_user: taskUserSchema.nullable().optional(),
    created_by_user: taskUserSchema.nullable().optional(),
  })
  .strip();

export const projectTasksListOutputSchema = z.object({
  tasks: z.array(taskOutputSchema),
});

export const workspaceTaskSummaryOutputSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().min(1),
    description: z.string(),
    status: z.string().min(1),
    projectId: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strip();

export const workspaceTasksListOutputSchema = z.object({
  tasks: z.array(workspaceTaskSummaryOutputSchema),
});

export const createTaskInputShape = {
  title: z.string().min(1).max(255).describe('Task title.'),
  description: z.string().optional().describe('Task description.'),
  task_type: taskTypeSchema.optional().describe('Task type.'),
  status: z.string().optional().describe('Task status or kanban stage ID.'),
  priority: taskPrioritySchema.optional().describe('Task priority.'),
  sprint_id: z.string().uuid().optional().describe('Sprint ID.'),
  parent_task_id: z.string().uuid().optional().describe('Parent task ID.'),
  assigned_to: z.array(z.string().uuid()).optional().describe('Assigned user IDs.'),
  assignee_team_member_id: z.string().uuid().optional().describe('Assignee team member ID.'),
  reporter_team_member_id: z.string().uuid().optional().describe('Reporter team member ID.'),
  due_date: z.string().datetime().optional().describe('Task due date in ISO 8601 format.'),
  story_points: z.number().nonnegative().optional().describe('Story points.'),
  labels: z.array(z.string()).optional().describe('Task labels.'),
  attachments: projectAttachmentsInputSchema.optional().describe('Linked notes, files, and events.'),
  custom_fields: z.array(taskCustomFieldValueSchema).optional().describe('Per-task custom fields.'),
};

export const updateTaskInputShape = {
  title: z.string().min(1).max(255).optional().describe('Task title.'),
  description: z.string().optional().describe('Task description.'),
  task_type: taskTypeSchema.optional().describe('Task type.'),
  status: z.string().optional().describe('Task status or kanban stage ID.'),
  priority: taskPrioritySchema.optional().describe('Task priority.'),
  sprint_id: z.string().uuid().optional().describe('Sprint ID.'),
  parent_task_id: z.string().uuid().optional().describe('Parent task ID.'),
  assigned_to: z.array(z.string().uuid()).optional().describe('Assigned user IDs.'),
  assignee_team_member_id: z.string().uuid().optional().describe('Assignee team member ID.'),
  reporter_team_member_id: z.string().uuid().optional().describe('Reporter team member ID.'),
  due_date: z.string().datetime().optional().describe('Task due date in ISO 8601 format.'),
  story_points: z.number().nonnegative().optional().describe('Story points.'),
  actual_hours: z.number().nonnegative().optional().describe('Actual hours spent.'),
  labels: z.array(z.string()).optional().describe('Task labels.'),
  attachments: projectAttachmentsInputSchema.optional().describe('Linked notes, files, and events.'),
  custom_fields: z.array(taskCustomFieldValueSchema).optional().describe('Per-task custom fields.'),
  completed_by: z.string().uuid().optional().describe('User ID who completed the task.'),
};

export const deleteActionOutputSchema = z
  .object({
    success: z.literal(true),
    message: z.string().min(1),
  })
  .strip();

const taskCommentAuthorSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    email: z.string().nullable().optional(),
    avatar_url: z.string().nullable().optional(),
  })
  .strip();

export const taskCommentOutputSchema = z
  .object({
    id: z.string().min(1),
    task_id: z.string().min(1),
    user_id: z.string().min(1),
    content: z.string(),
    content_html: z.string().nullable().optional(),
    attachments: z.array(z.string()),
    is_edited: z.boolean().optional(),
    is_deleted: z.boolean().optional(),
    user: taskCommentAuthorSchema.nullable().optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
  })
  .strip();

export const taskCommentsListOutputSchema = z.object({
  comments: z.array(taskCommentOutputSchema),
});

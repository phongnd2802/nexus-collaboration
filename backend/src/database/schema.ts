/**
 * Nexus Database Schema Definition
 * Using database's migration system (working format)
 */

export const schema = {
  // ==================== WORKSPACES ====================
  workspaces: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'logo', type: 'text', nullable: true },
      { name: 'website', type: 'text', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'owner_id', type: 'string', nullable: false },
      { name: 'settings', type: 'jsonb', default: '{}' },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [{ columns: ['owner_id'] }, { columns: ['is_active'] }, { columns: ['created_at'] }],
  },

  workspace_members: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'role', type: 'string', nullable: false, default: 'member' },
      { name: 'permissions', type: 'jsonb', default: '[]' },
      { name: 'joined_at', type: 'timestamptz', default: 'now()' },
      { name: 'invited_at', type: 'timestamptz', nullable: true },
      { name: 'invited_by', type: 'string', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
    ],
    indexes: [
      { columns: ['workspace_id', 'user_id'], unique: true },
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['role'] },
      { columns: ['is_active'] },
    ],
  },

  workspace_invites: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'email', type: 'string', nullable: false },
      { name: 'role', type: 'string', default: 'member' },
      { name: 'invited_by', type: 'string', nullable: false },
      { name: 'token', type: 'string', unique: true, nullable: false },
      { name: 'expires_at', type: 'timestamptz', nullable: false },
      { name: 'status', type: 'string', default: 'pending' },
      { name: 'accepted_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['email'] },
      { columns: ['status'] },
      { columns: ['expires_at'] },
      { columns: ['token'], unique: true },
    ],
  },

  // ==================== CHANNELS ====================
  channels: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'type', type: 'string', default: 'channel' },
      { name: 'is_private', type: 'boolean', default: false },
      { name: 'is_archived', type: 'boolean', default: false },
      { name: 'created_by', type: 'string', nullable: true },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['type'] },
      { columns: ['is_private'] },
      { columns: ['is_archived'] },
      { columns: ['created_by'] },
    ],
  },

  // ==================== MESSAGES ====================
  messages: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'channel_id', type: 'uuid', nullable: true, references: { table: 'channels' } },
      {
        name: 'conversation_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'conversations' },
      },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'content', type: 'text', nullable: true }, // Nullable for E2EE messages
      { name: 'content_html', type: 'text', nullable: true },
      { name: 'encrypted_content', type: 'text', nullable: true }, // E2EE encrypted message content
      { name: 'encryption_metadata', type: 'jsonb', nullable: true }, // Encryption algorithm, nonce, version
      { name: 'is_encrypted', type: 'boolean', default: false }, // Flag for encrypted messages
      { name: 'thread_id', type: 'uuid', nullable: true, references: { table: 'messages' } },
      { name: 'parent_id', type: 'uuid', nullable: true, references: { table: 'messages' } },
      { name: 'reply_count', type: 'integer', default: 0 },
      { name: 'attachments', type: 'jsonb', default: '[]' },
      { name: 'mentions', type: 'jsonb', default: '[]' },
      { name: 'linked_content', type: 'jsonb', default: '[]' },
      { name: 'reactions', type: 'jsonb', default: '{}' },
      { name: 'is_edited', type: 'boolean', default: false },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'is_bookmarked', type: 'boolean', default: false },
      { name: 'bookmarked_at', type: 'timestamptz', nullable: true },
      { name: 'bookmarked_by', type: 'string', nullable: true },
      { name: 'is_pinned', type: 'boolean', default: false },
      { name: 'pinned_at', type: 'timestamptz', nullable: true },
      { name: 'pinned_by', type: 'string', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['channel_id', 'created_at'] },
      { columns: ['conversation_id', 'created_at'] },
      { columns: ['user_id'] },
      { columns: ['thread_id'] },
      { columns: ['parent_id'] },
      { columns: ['is_deleted'] },
      { columns: ['is_bookmarked'] },
      { columns: ['conversation_id', 'is_bookmarked'] },
      { columns: ['is_pinned'] },
      { columns: ['conversation_id', 'is_pinned'] },
      { columns: ['channel_id', 'is_pinned'] },
    ],
  },

  message_reactions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'message_id', type: 'uuid', nullable: false, references: { table: 'messages' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'emoji', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['message_id', 'user_id', 'emoji'], unique: true },
      { columns: ['message_id'] },
      { columns: ['user_id'] },
    ],
  },

  message_read_receipts: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'message_id', type: 'uuid', nullable: false, references: { table: 'messages' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'read_at', type: 'timestamptz', default: 'now()' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['message_id', 'user_id'], unique: true },
      { columns: ['message_id'] },
      { columns: ['user_id'] },
      { columns: ['read_at'] },
    ],
  },

  // Poll votes - tracks individual votes on polls (one vote per user per poll)
  poll_votes: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'message_id', type: 'uuid', nullable: false, references: { table: 'messages' } },
      { name: 'poll_id', type: 'string', nullable: false },
      { name: 'option_id', type: 'string', nullable: false },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['message_id'] },
      { columns: ['poll_id'] },
      { columns: ['user_id'] },
      { columns: ['message_id', 'poll_id', 'user_id'], unique: true },
    ],
  },

  // Scheduled messages - messages to be sent at a future time
  scheduled_messages: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'channel_id', type: 'uuid', nullable: true, references: { table: 'channels' } },
      {
        name: 'conversation_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'conversations' },
      },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'content_html', type: 'text', nullable: true },
      { name: 'attachments', type: 'jsonb', default: '[]' },
      { name: 'mentions', type: 'jsonb', default: '[]' },
      { name: 'linked_content', type: 'jsonb', default: '[]' },
      { name: 'thread_id', type: 'uuid', nullable: true, references: { table: 'messages' } },
      { name: 'parent_id', type: 'uuid', nullable: true, references: { table: 'messages' } },
      { name: 'scheduled_at', type: 'timestamptz', nullable: false },
      { name: 'status', type: 'string', default: 'pending' },
      { name: 'sent_at', type: 'timestamptz', nullable: true },
      { name: 'sent_message_id', type: 'uuid', nullable: true, references: { table: 'messages' } },
      { name: 'failure_reason', type: 'text', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['channel_id'] },
      { columns: ['conversation_id'] },
      { columns: ['user_id'] },
      { columns: ['scheduled_at'] },
      { columns: ['status'] },
      { columns: ['status', 'scheduled_at'] },
    ],
  },

  // ==================== PROJECTS ====================
  projects: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'type', type: 'string', default: 'kanban' },
      { name: 'status', type: 'string', default: 'active' },
      { name: 'priority', type: 'string', nullable: true },
      { name: 'owner_id', type: 'string', nullable: true },
      { name: 'lead_id', type: 'string', nullable: true },
      { name: 'start_date', type: 'date', nullable: true },
      { name: 'end_date', type: 'date', nullable: true },
      { name: 'estimated_hours', type: 'numeric', nullable: true },
      { name: 'budget', type: 'numeric', nullable: true },
      { name: 'is_template', type: 'boolean', default: false },
      {
        name: 'kanban_stages',
        type: 'jsonb',
        default:
          '[{"id": "todo", "name": "To Do", "order": 1, "color": "#3B82F6"}, {"id": "in_progress", "name": "In Progress", "order": 2, "color": "#F59E0B"}, {"id": "done", "name": "Done", "order": 3, "color": "#10B981"}]',
      },
      {
        name: 'attachments',
        type: 'jsonb',
        default: '{"note_attachment": [], "file_attachment": [], "event_attachment": []}',
      },
      { name: 'archived_at', type: 'timestamptz', nullable: true },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['status'] },
      { columns: ['owner_id'] },
      { columns: ['type'] },
      { columns: ['priority'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== PROJECT MEMBERS ====================
  project_members: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'project_id', type: 'uuid', nullable: false, references: { table: 'projects' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'role', type: 'string', default: 'member' },
      { name: 'permissions', type: 'jsonb', default: '[]' },
      { name: 'joined_at', type: 'timestamptz', default: 'now()' },
      { name: 'invited_by', type: 'string', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['project_id', 'user_id'], unique: true },
      { columns: ['project_id'] },
      { columns: ['user_id'] },
      { columns: ['role'] },
      { columns: ['is_active'] },
      { columns: ['joined_at'] },
    ],
  },

  // ==================== TASKS ====================
  tasks: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'project_id', type: 'uuid', nullable: false, references: { table: 'projects' } },
      { name: 'sprint_id', type: 'uuid', nullable: true },
      { name: 'parent_task_id', type: 'uuid', nullable: true, references: { table: 'tasks' } },
      { name: 'task_type', type: 'string', nullable: false, default: 'task' },
      { name: 'title', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'status', type: 'string', default: 'todo' },
      { name: 'priority', type: 'string', default: 'medium' },
      { name: 'assigned_to', type: 'jsonb', nullable: true }, // Array of user IDs
      { name: 'assignee_team_member_id', type: 'uuid', nullable: true },
      { name: 'reporter_team_member_id', type: 'uuid', nullable: true },
      { name: 'due_date', type: 'timestamptz', nullable: true },
      { name: 'due_time', type: 'string', nullable: true }, // HH:MM 24h; NULL = use 07:00 default
      { name: 'reminder_settings', type: 'jsonb', nullable: true }, // { enabled, intervals }
      { name: 'completed_at', type: 'timestamptz', nullable: true },
      { name: 'completed_by', type: 'string', nullable: true },
      { name: 'story_points', type: 'integer', nullable: true },
      { name: 'labels', type: 'jsonb', default: '[]' },
      {
        name: 'attachments',
        type: 'jsonb',
        default: '{"note_attachment": [], "file_attachment": [], "event_attachment": []}',
      },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'custom_fields', type: 'jsonb', default: '[]' }, // Per-task custom fields: array of { id, name, fieldType, value, options? }
      { name: 'created_by', type: 'string', nullable: true },
      { name: 'updated_by', type: 'string', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['project_id'] },
      { columns: ['sprint_id'] },
      { columns: ['assigned_to'] },
      { columns: ['assignee_team_member_id'] },
      { columns: ['reporter_team_member_id'] },
      { columns: ['status'] },
      { columns: ['priority'] },
      { columns: ['due_date'] },
      { columns: ['parent_task_id'] },
      { columns: ['task_type'] },
    ],
  },

  // ==================== TASK CUSTOM FIELD DEFINITIONS ====================
  // Project-level custom field definitions (like Notion properties)
  task_custom_field_definitions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'project_id', type: 'uuid', nullable: false, references: { table: 'projects' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'field_type', type: 'string', nullable: false }, // text, number, date, select, multi_select, checkbox, url, email, phone, person, relation
      { name: 'description', type: 'text', nullable: true },
      { name: 'options', type: 'jsonb', default: '[]' }, // For select/multi_select: [{ id, label, color }]
      { name: 'default_value', type: 'jsonb', nullable: true }, // Default value for the field
      { name: 'is_required', type: 'boolean', default: false },
      { name: 'is_visible', type: 'boolean', default: true },
      { name: 'sort_order', type: 'integer', default: 0 },
      { name: 'settings', type: 'jsonb', default: '{}' }, // Additional settings (e.g., number format, date format)
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['project_id'] },
      { columns: ['project_id', 'name'], unique: true },
      { columns: ['field_type'] },
      { columns: ['is_visible'] },
      { columns: ['sort_order'] },
      { columns: ['created_at'] },
    ],
  },

  task_comments: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'task_id', type: 'uuid', nullable: false, references: { table: 'tasks' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'content_html', type: 'text', nullable: true },
      { name: 'attachments', type: 'jsonb', default: '[]' },
      { name: 'is_edited', type: 'boolean', default: false },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['task_id'] },
      { columns: ['user_id'] },
      { columns: ['created_at'] },
      { columns: ['is_deleted'] },
    ],
  },

  // ==================== FILES & FOLDERS ====================
  folders: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'parent_id', type: 'uuid', nullable: true, references: { table: 'folders' } },
      { name: 'created_by', type: 'string', nullable: true },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'deleted_by', type: 'string', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['parent_id'] },
      { columns: ['is_deleted'] },
      { columns: ['created_by'] },
      { columns: ['created_at'] },
    ],
  },

  files: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'storage_path', type: 'text', nullable: false },
      { name: 'url', type: 'text', nullable: true },
      { name: 'mime_type', type: 'string', nullable: true },
      { name: 'size', type: 'bigint', nullable: true },
      { name: 'uploaded_by', type: 'string', nullable: true },
      { name: 'folder_id', type: 'uuid', nullable: true, references: { table: 'folders' } },
      { name: 'parent_folder_ids', type: 'jsonb', default: '{}' },
      { name: 'version', type: 'integer', default: 1 },
      { name: 'file_hash', type: 'string', nullable: true },
      { name: 'virus_scan_status', type: 'string', default: 'pending' },
      { name: 'extracted_text', type: 'text', nullable: true },
      { name: 'is_ai_generated', type: 'boolean', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'starred', type: 'boolean', default: false },
      { name: 'last_opened_at', type: 'timestamptz', nullable: true },
      { name: 'last_opened_by', type: 'string', nullable: true },
      { name: 'open_count', type: 'integer', default: 0 },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['folder_id'] },
      { columns: ['uploaded_by'] },
      { columns: ['is_deleted'] },
      { columns: ['mime_type'] },
      { columns: ['file_hash'] },
      { columns: ['starred'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== FILE SHARES ====================
  file_shares: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'file_id', type: 'uuid', nullable: false, references: { table: 'files' } },
      { name: 'shared_by', type: 'string', nullable: false },
      { name: 'shared_with', type: 'string', nullable: true }, // null for public links
      { name: 'share_token', type: 'string', unique: true, nullable: false },
      { name: 'share_type', type: 'string', default: 'user' }, // 'link' | 'user' - public link vs specific user
      { name: 'access_level', type: 'string', default: 'view' }, // 'view' | 'download' | 'edit'
      { name: 'permissions', type: 'jsonb', default: '{}' }, // Legacy: detailed permissions
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      { name: 'password', type: 'string', nullable: true }, // Password protection for links
      { name: 'max_downloads', type: 'integer', nullable: true }, // Download limit
      { name: 'download_count', type: 'integer', default: 0 },
      { name: 'view_count', type: 'integer', default: 0 }, // Track views
      { name: 'last_accessed_at', type: 'timestamptz', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['file_id'] },
      { columns: ['shared_by'] },
      { columns: ['shared_with'] },
      { columns: ['share_token'], unique: true },
      { columns: ['share_type'] },
      { columns: ['expires_at'] },
      { columns: ['is_active'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== CHANNEL MEMBERS ====================
  channel_members: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'channel_id', type: 'uuid', nullable: false, references: { table: 'channels' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'role', type: 'string', default: 'member' },
      { name: 'permissions', type: 'jsonb', default: '[]' },
      { name: 'joined_at', type: 'timestamptz', default: 'now()' },
      { name: 'added_by', type: 'string', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_read_at', type: 'timestamptz', nullable: true },
      { name: 'notification_settings', type: 'jsonb', default: '{}' },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
    ],
    indexes: [
      { columns: ['channel_id', 'user_id'], unique: true },
      { columns: ['channel_id'] },
      { columns: ['user_id'] },
      { columns: ['role'] },
      { columns: ['is_active'] },
      { columns: ['joined_at'] },
    ],
  },

  // ==================== CONVERSATIONS ====================
  conversations: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'type', type: 'string', default: 'direct' },
      { name: 'name', type: 'string', nullable: true },
      { name: 'description', type: 'text', nullable: true },
      { name: 'participants', type: 'jsonb', nullable: false },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'is_archived', type: 'boolean', default: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['type'] },
      { columns: ['created_by'] },
      { columns: ['is_active'] },
      { columns: ['is_archived'] },
      { columns: ['created_at'] },
    ],
  },

  conversation_members: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'conversation_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'conversations' },
      },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'role', type: 'string', default: 'member' },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'is_starred', type: 'boolean', default: false },
      { name: 'starred_at', type: 'timestamptz', nullable: true },
      { name: 'last_read_at', type: 'timestamptz', nullable: true },
      { name: 'last_read_message_id', type: 'uuid', nullable: true },
      { name: 'joined_at', type: 'timestamptz', default: 'now()' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['conversation_id', 'user_id'], unique: true },
      { columns: ['conversation_id'] },
      { columns: ['user_id'] },
      { columns: ['is_active'] },
      { columns: ['is_starred'] },
      { columns: ['joined_at'] },
    ],
  },

  // ==================== CALENDAR & EVENTS ====================
  // ==================== EVENT CATEGORIES ====================
  event_categories: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'color', type: 'string', nullable: false },
      { name: 'icon', type: 'string', nullable: true },
      { name: 'description_file_ids', type: 'jsonb', default: '[]' },
      { name: 'is_default', type: 'boolean', default: false },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['workspace_id', 'name'], unique: true },
      { columns: ['created_by'] },
    ],
  },

  // ==================== MEETING ROOMS ====================
  meeting_rooms: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'location', type: 'string', nullable: true },
      { name: 'capacity', type: 'integer', default: 10 },
      { name: 'room_type', type: 'string', default: 'conference' },
      { name: 'equipment', type: 'jsonb', default: '[]' },
      { name: 'amenities', type: 'jsonb', default: '[]' },
      { name: 'status', type: 'string', default: 'available' },
      { name: 'booking_policy', type: 'string', default: 'open' },
      { name: 'working_hours', type: 'jsonb', default: '{}' },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'room_code', type: 'string', nullable: true },
      { name: 'floor', type: 'string', nullable: true },
      { name: 'building', type: 'string', nullable: true },
      { name: 'thumbnail_url', type: 'text', nullable: true },
      { name: 'images', type: 'jsonb', default: '[]' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['status'] },
      { columns: ['capacity'] },
      { columns: ['room_type'] },
      { columns: ['is_active'] },
      { columns: ['room_code'] },
    ],
  },

  calendar_events: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: true },
      { name: 'title', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'start_time', type: 'timestamptz', nullable: false },
      { name: 'end_time', type: 'timestamptz', nullable: false },
      { name: 'all_day', type: 'boolean', default: false },
      { name: 'location', type: 'string', nullable: true },
      { name: 'organizer_id', type: 'string', nullable: true },
      { name: 'attendees', type: 'jsonb', default: '[]' },
      { name: 'recurrence_rule', type: 'jsonb', nullable: true },
      { name: 'is_recurring', type: 'boolean', default: false },
      {
        name: 'parent_event_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'calendar_events' },
      },
      { name: 'meeting_url', type: 'text', nullable: true },
      { name: 'visibility', type: 'string', default: 'private' },
      { name: 'busy_status', type: 'string', default: 'busy' },
      { name: 'priority', type: 'string', default: 'normal' },
      { name: 'status', type: 'string', default: 'confirmed' },
      { name: 'room_id', type: 'uuid', nullable: true },
      { name: 'category_id', type: 'uuid', nullable: true },
      {
        name: 'attachments',
        type: 'jsonb',
        default: '{"file_attachment": [], "note_attachment": [], "event_attachment": []}',
      },
      { name: 'drive_attachment', type: 'jsonb', default: '[]' },
      { name: 'description_file_ids', type: 'jsonb', default: '[]' },
      { name: 'last_modified_by', type: 'string', nullable: true },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['organizer_id'] },
      { columns: ['start_time'] },
      { columns: ['end_time'] },
      { columns: ['all_day'] },
      { columns: ['is_recurring'] },
      { columns: ['parent_event_id'] },
      { columns: ['room_id'] },
      { columns: ['status'] },
    ],
  },

  // Room bookings table
  room_bookings: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'room_id', type: 'uuid', nullable: false, references: { table: 'meeting_rooms' } },
      { name: 'event_id', type: 'uuid', nullable: true, references: { table: 'calendar_events' } },
      { name: 'booked_by', type: 'string', nullable: false },
      { name: 'start_time', type: 'timestamptz', nullable: false },
      { name: 'end_time', type: 'timestamptz', nullable: false },
      { name: 'status', type: 'string', default: 'confirmed' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['room_id'] },
      { columns: ['start_time', 'end_time'] },
      { columns: ['status'] },
      { columns: ['event_id'] },
    ],
  },

  // Event attendees table
  event_attendees: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'event_id', type: 'uuid', nullable: false, references: { table: 'calendar_events' } },
      { name: 'user_id', type: 'string', nullable: true },
      { name: 'email', type: 'string', nullable: true },
      { name: 'name', type: 'string', nullable: true },
      { name: 'status', type: 'string', default: 'pending' }, // pending, accepted, declined, tentative
      { name: 'is_organizer', type: 'boolean', default: false },
      { name: 'is_required', type: 'boolean', default: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['event_id'] },
      { columns: ['user_id'] },
      { columns: ['status'] },
      { columns: ['event_id', 'user_id'], unique: true },
    ],
  },

  // Event reminders table
  event_reminders: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'event_id', type: 'uuid', nullable: false, references: { table: 'calendar_events' } },
      { name: 'user_id', type: 'string', nullable: true },
      { name: 'reminder_time', type: 'integer', nullable: false }, // minutes before event
      { name: 'notification_type', type: 'string', default: 'email' }, // email, push, in-app
      { name: 'is_sent', type: 'boolean', default: false },
      { name: 'scheduled_for', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['event_id'] },
      { columns: ['user_id'] },
      { columns: ['is_sent'] },
      { columns: ['scheduled_for'] },
    ],
  },

  // ==================== NOTES ====================
  notes: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'title', type: 'string', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'content_text', type: 'text', nullable: true },
      { name: 'parent_id', type: 'uuid', nullable: true, references: { table: 'notes' } },
      { name: 'author_id', type: 'string', nullable: true },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'last_edited_by', type: 'string', nullable: true },
      { name: 'view_count', type: 'integer', default: 0 },
      { name: 'is_published', type: 'boolean', default: false },
      { name: 'cover_image', type: 'text', nullable: true },
      { name: 'icon', type: 'string', nullable: true },
      { name: 'tags', type: 'jsonb', default: '[]' },
      {
        name: 'attachments',
        type: 'jsonb',
        default: '{"note_attachment": [], "file_attachment": [], "event_attachment": []}',
      },
      { name: 'is_public', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'archived_at', type: 'timestamptz', nullable: true },
      { name: 'is_favorite', type: 'boolean', default: false },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['created_by'] },
      { columns: ['parent_id'] },
      { columns: ['is_favorite'] },
      { columns: ['is_published'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== USER SETTINGS & AUTH TOKENS ====================
  user_settings: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', unique: true, nullable: false },
      { name: 'theme', type: 'string', default: 'light' },
      { name: 'language', type: 'string', default: 'en' },
      { name: 'date_format', type: 'string', default: 'MM/dd/yyyy' },
      { name: 'time_format', type: 'string', default: '12h' },
      { name: 'notifications', type: 'jsonb', default: '{}' },
      { name: 'privacy', type: 'jsonb', default: '{}' },
      { name: 'editor_preferences', type: 'jsonb', default: '{}' },
      { name: 'dashboard_layout', type: 'jsonb', default: '{}' },
      { name: 'sidebar_collapsed', type: 'boolean', default: false },
      // { name: 'tab_arrangement', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'], unique: true },
      { columns: ['theme'] },
      { columns: ['language'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== ENHANCED FEATURES ====================
  task_dependencies: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'task_id', type: 'uuid', nullable: false, references: { table: 'tasks' } },
      { name: 'depends_on_task_id', type: 'uuid', nullable: false, references: { table: 'tasks' } },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['task_id', 'depends_on_task_id'], unique: true },
      { columns: ['task_id'] },
      { columns: ['depends_on_task_id'] },
    ],
  },

  // ==================== VIDEO CALLS ====================
  video_calls: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'livekit_room_id', type: 'string', nullable: false },
      { name: 'title', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'host_user_id', type: 'string', nullable: false },
      { name: 'call_type', type: 'string', nullable: false, default: 'video' }, // 'audio' | 'video'
      { name: 'is_group_call', type: 'boolean', default: false },
      { name: 'status', type: 'string', default: 'scheduled' }, // 'scheduled' | 'active' | 'ended' | 'cancelled'
      { name: 'scheduled_start_time', type: 'timestamptz', nullable: true },
      { name: 'scheduled_end_time', type: 'timestamptz', nullable: true },
      { name: 'actual_start_time', type: 'timestamptz', nullable: true },
      { name: 'actual_end_time', type: 'timestamptz', nullable: true },
      { name: 'invitees', type: 'jsonb', default: '[]' }, // Array of user IDs (host + attendees)
      { name: 'settings', type: 'jsonb', default: '{}' }, // videoQuality, maxParticipants, etc.
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['host_user_id'] },
      { columns: ['status'] },
      { columns: ['call_type'] },
      { columns: ['livekit_room_id'], unique: true },
      { columns: ['scheduled_start_time'] },
      { columns: ['actual_start_time'] },
      { columns: ['created_at'] },
    ],
  },

  video_call_join_requests: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'video_call_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'video_calls' },
      },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'display_name', type: 'string', nullable: false },
      { name: 'message', type: 'text', nullable: true },
      { name: 'status', type: 'string', default: 'pending' }, // 'pending' | 'accepted' | 'rejected'
      { name: 'requested_at', type: 'timestamptz', default: 'now()' },
      { name: 'responded_at', type: 'timestamptz', nullable: true },
      { name: 'responded_by', type: 'string', nullable: true },
    ],
    indexes: [
      { columns: ['video_call_id'] },
      { columns: ['user_id'] },
      { columns: ['status'] },
      { columns: ['requested_at'] },
      { columns: ['video_call_id', 'user_id'], unique: true },
    ],
  },

  video_call_participants: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'video_call_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'video_calls' },
      },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'display_name', type: 'string', nullable: true },
      { name: 'role', type: 'string', default: 'participant' }, // 'host' | 'participant'
      { name: 'status', type: 'string', default: 'invited' }, // 'invited' | 'declined' | 'joined' | 'left'
      { name: 'joined_at', type: 'timestamptz', nullable: true },
      { name: 'left_at', type: 'timestamptz', nullable: true },
      { name: 'duration_seconds', type: 'integer', default: 0 },
      { name: 'is_audio_muted', type: 'boolean', default: false },
      { name: 'is_video_muted', type: 'boolean', default: false },
      { name: 'is_screen_sharing', type: 'boolean', default: false },
      { name: 'is_hand_raised', type: 'boolean', default: false },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['video_call_id'] },
      { columns: ['user_id'] },
      { columns: ['video_call_id', 'user_id'] },
      { columns: ['joined_at'] },
      { columns: ['left_at'] },
      { columns: ['status'] },
    ],
  },

  // ==================== SEARCH HISTORY ====================
  search_history: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'query', type: 'string', nullable: false },
      { name: 'result_count', type: 'integer', default: 0 },
      { name: 'content_types', type: 'jsonb', default: '[]' }, // types searched
      { name: 'filters', type: 'jsonb', default: '{}' }, // applied filters
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id', 'user_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id'] },
      { columns: ['created_at'] },
      { columns: ['query'] },
    ],
  },

  // Saved Searches - User-saved search queries with filters and results
  saved_searches: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'name', type: 'string', nullable: false }, // User-defined name for the saved search
      { name: 'query', type: 'string', nullable: false }, // The search query
      { name: 'type', type: 'string', nullable: false }, // Search type: all, messages, files, etc.
      { name: 'mode', type: 'string', nullable: false }, // Search mode: full-text, semantic, hybrid
      { name: 'filters', type: 'jsonb', default: '{}' }, // Applied filters
      { name: 'results_snapshot', type: 'jsonb', default: '[]' }, // Snapshot of search results at time of saving
      { name: 'result_count', type: 'integer', default: 0 }, // Number of results when saved
      { name: 'tags', type: 'jsonb', default: '[]' }, // User tags for organization
      { name: 'is_notification_enabled', type: 'boolean', default: false }, // Enable notifications for new results
      { name: 'shared_with', type: 'jsonb', default: '[]' }, // Array of user IDs this search is shared with
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id', 'user_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== NOTIFICATIONS SYSTEM ====================
  notifications: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'workspace_id', type: 'uuid', nullable: true, references: { table: 'workspaces' } },
      { name: 'type', type: 'string', nullable: false }, // SYSTEM, REMINDER, PROJECT, TASK, CALENDAR, FILE, MESSAGE, etc.
      { name: 'title', type: 'string', nullable: false },
      { name: 'message', type: 'text', nullable: true },
      { name: 'data', type: 'jsonb', default: '{}' }, // Additional metadata
      { name: 'action_url', type: 'string', nullable: true }, // Click action URL
      { name: 'priority', type: 'string', default: 'normal' }, // low, normal, high, urgent
      { name: 'category', type: 'string', nullable: true }, // projects, tasks, calendar, files, messages, etc.
      { name: 'entity_type', type: 'string', nullable: true }, // project, task, event, file, message
      { name: 'entity_id', type: 'uuid', nullable: true }, // ID of the related entity
      { name: 'actor_id', type: 'string', nullable: true }, // User who triggered the notification
      { name: 'is_read', type: 'boolean', default: false },
      { name: 'is_archived', type: 'boolean', default: false },
      { name: 'read_at', type: 'timestamptz', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      // Scheduled notification fields
      { name: 'scheduled_at', type: 'timestamptz', nullable: true }, // When to send the notification (null = send immediately)
      { name: 'is_scheduled', type: 'boolean', default: false }, // Whether this is a scheduled notification
      { name: 'is_sent', type: 'boolean', default: false }, // Whether the scheduled notification has been sent
      { name: 'sent_at', type: 'timestamptz', nullable: true }, // When the notification was actually sent
      { name: 'schedule_status', type: 'string', default: 'pending' }, // pending, sent, failed, cancelled
      { name: 'retry_count', type: 'integer', default: 0 }, // Number of retry attempts for failed sends
      { name: 'max_retries', type: 'integer', default: 3 }, // Maximum retry attempts
      { name: 'last_retry_at', type: 'timestamptz', nullable: true }, // Last retry attempt timestamp
      { name: 'failure_reason', type: 'text', nullable: true }, // Reason for failure if any
      { name: 'sent_via', type: 'jsonb', default: '{}' }, // Channels used
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'] },
      { columns: ['workspace_id'] },
      { columns: ['type'] },
      { columns: ['category'] },
      { columns: ['is_read'] },
      { columns: ['is_archived'] },
      { columns: ['priority'] },
      { columns: ['entity_type', 'entity_id'] },
      { columns: ['user_id', 'is_read'] },
      { columns: ['user_id', 'workspace_id', 'is_read'] },
      { columns: ['created_at'] },
      { columns: ['expires_at'] },
      // Scheduled notification indexes for efficient cron job queries
      { columns: ['scheduled_at'] },
      { columns: ['is_scheduled', 'is_sent'] },
      { columns: ['is_scheduled', 'schedule_status'] },
      { columns: ['scheduled_at', 'is_sent', 'schedule_status'] }, // Composite index for pending scheduled notifications
    ],
  },

  // ==================== SUBSCRIPTION MANAGEMENT ====================
  // Subscription and payment management is handled by database platform
  // Nexus queries subscription data via database (single source of truth)
  // No local subscription/payment tables needed

  // ==================== INTEGRATION FRAMEWORK ====================
  // Scalable integration system supporting 170+ third-party apps
  // Config-driven approach: Add new integrations via JSON config, not code

  // Integration Catalog - Available integrations in the marketplace
  integration_catalog: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'slug', type: 'string', nullable: false }, // e.g., 'slack', 'github'
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'category', type: 'string', nullable: false }, // COMMUNICATION, FILE_STORAGE, CALENDAR, etc.
      { name: 'provider', type: 'string', nullable: true }, // e.g., 'Google', 'Microsoft', 'Slack'
      { name: 'logo_url', type: 'text', nullable: true },
      { name: 'website', type: 'text', nullable: true },
      { name: 'documentation_url', type: 'text', nullable: true },
      { name: 'version', type: 'string', default: '1.0.0' },
      // Authentication Configuration (JSON with provider-specific settings)
      { name: 'auth_type', type: 'string', nullable: false }, // oauth2, oauth1, api_key, webhook_only, basic_auth
      { name: 'auth_config', type: 'jsonb', default: '{}' },
      // auth_config for OAuth2: { authorizationUrl, tokenUrl, revokeUrl, userInfoUrl, scopes, clientIdEnvKey, clientSecretEnvKey, extraAuthParams }
      // API Configuration
      { name: 'api_base_url', type: 'text', nullable: true },
      { name: 'api_config', type: 'jsonb', default: '{}' }, // { defaultHeaders, rateLimiting, retryConfig }
      // Webhook Configuration
      { name: 'supports_webhooks', type: 'boolean', default: false },
      { name: 'webhook_config', type: 'jsonb', default: '{}' }, // { events, signatureHeader, signatureAlgorithm }
      // Capabilities & Features
      { name: 'capabilities', type: 'jsonb', default: '[]' }, // ['read_files', 'write_files', 'send_messages']
      { name: 'required_permissions', type: 'jsonb', default: '[]' },
      { name: 'features', type: 'jsonb', default: '[]' }, // Human-readable feature list for UI
      { name: 'config_schema', type: 'jsonb', default: '{}' }, // JSON Schema for user configuration form
      { name: 'screenshots', type: 'jsonb', default: '[]' },
      // Marketplace Metadata
      { name: 'pricing_type', type: 'string', default: 'free' }, // free, freemium, paid
      { name: 'pricing_details', type: 'jsonb', default: '{}' },
      { name: 'is_verified', type: 'boolean', default: false },
      { name: 'is_featured', type: 'boolean', default: false },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'install_count', type: 'integer', default: 0 },
      { name: 'rating', type: 'numeric', nullable: true },
      { name: 'review_count', type: 'integer', default: 0 },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['slug'], unique: true },
      { columns: ['category'] },
      { columns: ['auth_type'] },
      { columns: ['provider'] },
      { columns: ['is_active'] },
      { columns: ['is_featured'] },
      { columns: ['is_verified'] },
      { columns: ['install_count'] },
    ],
  },

  // Integration Connections - User connections to integrations (unified storage)
  integration_connections: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      {
        name: 'integration_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'integration_catalog' },
      },

      // Authentication Credentials (encrypted at rest)
      { name: 'auth_type', type: 'string', nullable: false }, // mirrors integration auth_type
      { name: 'access_token', type: 'text', nullable: true },
      { name: 'refresh_token', type: 'text', nullable: true },
      { name: 'token_type', type: 'string', default: 'Bearer' },
      { name: 'scope', type: 'text', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      { name: 'api_key', type: 'text', nullable: true }, // For API key auth
      { name: 'credentials', type: 'jsonb', default: '{}' }, // Flexible field for other auth methods

      // Provider Account Info
      { name: 'external_id', type: 'string', nullable: true }, // Provider's user/account ID
      { name: 'external_email', type: 'string', nullable: true },
      { name: 'external_name', type: 'string', nullable: true },
      { name: 'external_avatar', type: 'text', nullable: true },
      { name: 'external_metadata', type: 'jsonb', default: '{}' },

      // Connection State
      { name: 'status', type: 'string', default: 'active' }, // active, expired, revoked, error
      { name: 'error_message', type: 'text', nullable: true },
      { name: 'last_error_at', type: 'timestamptz', nullable: true },

      // User Configuration
      { name: 'config', type: 'jsonb', default: '{}' }, // User settings for this connection
      { name: 'settings', type: 'jsonb', default: '{}' },

      // Sync Tracking
      { name: 'last_synced_at', type: 'timestamptz', nullable: true },
      { name: 'sync_cursor', type: 'text', nullable: true }, // For incremental sync

      { name: 'is_active', type: 'boolean', default: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['integration_id'] },
      { columns: ['workspace_id', 'user_id', 'integration_id'], unique: true },
      { columns: ['status'] },
      { columns: ['is_active'] },
      { columns: ['external_email'] },
      { columns: ['expires_at'] },
    ],
  },

  // ==================== PROJECT TEMPLATES ====================

  // ===========================================
  // SUPER AGENT MEMORY TABLES
  // ===========================================

  /**
   * Agent Memory - Stores episodic, preference, and long-term memories for Super Agents
   * Enables agents to remember context, learn from interactions, and make intelligent decisions
   */

  /**
   * Agent Memory Preferences - Stores learned user preferences and behavior patterns
   * Allows agents to personalize responses based on observed user patterns
   */
  /**Â Â Â Â Â * Autopilot Alerts - Proactive deadline and reminder alertsÂ Â Â Â Â * Monitors tasks and events to alert users before deadlinesÂ Â Â Â Â */
  // ============================================
  // ADVANCED WORKFLOW AUTOMATION SYSTEM
  // ============================================

  /**
   * Workflows - Container for multi-step automations
   * This extends the existing bots system with more advanced capabilities
   */
  workflows: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'icon', type: 'string', nullable: true },
      { name: 'color', type: 'string', nullable: true },
      { name: 'is_active', type: 'boolean', default: 'true' },
      { name: 'trigger_type', type: 'string', nullable: false }, // entity_change, schedule, webhook, manual
      { name: 'trigger_config', type: 'jsonb', default: '{}' },
      { name: 'run_count', type: 'integer', default: '0' },
      { name: 'success_count', type: 'integer', default: '0' },
      { name: 'failure_count', type: 'integer', default: '0' },
      { name: 'last_run_at', type: 'timestamptz', nullable: true },
      { name: 'last_run_status', type: 'string', nullable: true }, // success, failed
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['created_by'] },
      { columns: ['is_active'] },
      { columns: ['trigger_type'] },
      { columns: ['workspace_id', 'is_active'] },
    ],
  },

  /**
   * Workflow Steps - Individual nodes in the workflow
   * Supports: action, condition, delay, loop, parallel, set_variable
   */
  workflow_steps: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workflow_id', type: 'uuid', nullable: false, references: { table: 'workflows' } },
      { name: 'step_order', type: 'integer', nullable: false },
      { name: 'step_type', type: 'string', nullable: false }, // action, condition, delay, loop, parallel, set_variable, stop
      { name: 'step_name', type: 'string', nullable: true },
      { name: 'step_config', type: 'jsonb', default: '{}' },
      {
        name: 'parent_step_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'workflow_steps' },
      }, // For branching
      { name: 'branch_path', type: 'string', nullable: true }, // 'true', 'false', or loop index
      { name: 'is_active', type: 'boolean', default: 'true' },
      { name: 'position_x', type: 'integer', default: '0' }, // For visual builder canvas
      { name: 'position_y', type: 'integer', default: '0' }, // For visual builder canvas
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workflow_id'] },
      { columns: ['parent_step_id'] },
      { columns: ['workflow_id', 'step_order'] },
    ],
  },

  /**
   * Workflow Executions - Track each workflow run
   */
  workflow_executions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workflow_id', type: 'uuid', nullable: false, references: { table: 'workflows' } },
      { name: 'triggered_by', type: 'string', nullable: true }, // User ID or 'system'
      { name: 'trigger_source', type: 'string', nullable: true }, // entity_change, schedule, manual, webhook
      { name: 'trigger_data', type: 'jsonb', default: '{}' }, // Data that triggered the workflow
      { name: 'status', type: 'string', default: 'pending' }, // pending, running, completed, failed, cancelled
      { name: 'current_step_id', type: 'uuid', nullable: true },
      { name: 'context', type: 'jsonb', default: '{}' }, // Variables passed between steps
      { name: 'error_message', type: 'text', nullable: true },
      { name: 'steps_completed', type: 'integer', default: '0' },
      { name: 'steps_total', type: 'integer', default: '0' },
      { name: 'started_at', type: 'timestamptz', nullable: true },
      { name: 'completed_at', type: 'timestamptz', nullable: true },
      { name: 'execution_time_ms', type: 'integer', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workflow_id'] },
      { columns: ['status'] },
      { columns: ['triggered_by'] },
      { columns: ['created_at'] },
      { columns: ['workflow_id', 'status'] },
    ],
  },

  /**
   * Workflow Step Executions - Track each step execution within a run
   */
  workflow_step_executions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'execution_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'workflow_executions' },
      },
      { name: 'step_id', type: 'uuid', nullable: false, references: { table: 'workflow_steps' } },
      { name: 'status', type: 'string', default: 'pending' }, // pending, running, completed, failed, skipped
      { name: 'input_data', type: 'jsonb', default: '{}' },
      { name: 'output_data', type: 'jsonb', default: '{}' },
      { name: 'condition_result', type: 'boolean', nullable: true }, // For condition steps
      { name: 'error_message', type: 'text', nullable: true },
      { name: 'retry_count', type: 'integer', default: '0' },
      { name: 'started_at', type: 'timestamptz', nullable: true },
      { name: 'completed_at', type: 'timestamptz', nullable: true },
      { name: 'execution_time_ms', type: 'integer', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['execution_id'] },
      { columns: ['step_id'] },
      { columns: ['status'] },
      { columns: ['execution_id', 'step_id'] },
    ],
  },

  /**
   * Entity Subscriptions - For entity-based triggers (task/note/event changes)
   */
  workflow_entity_subscriptions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workflow_id', type: 'uuid', nullable: false, references: { table: 'workflows' } },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'entity_type', type: 'string', nullable: false }, // task, note, event, file, project, message, approval
      { name: 'event_type', type: 'string', nullable: false }, // created, updated, deleted, status_changed, assigned, completed, etc.
      { name: 'filter_config', type: 'jsonb', default: '{}' }, // Filter by project, assignee, status, etc.
      { name: 'is_active', type: 'boolean', default: 'true' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workflow_id'] },
      { columns: ['workspace_id'] },
      { columns: ['entity_type', 'event_type'] },
      { columns: ['is_active'] },
      { columns: ['workspace_id', 'entity_type', 'event_type', 'is_active'] },
    ],
  },

  /**
   * Workflow Scheduled Jobs - For time-based workflow triggers
   */
  workflow_scheduled_jobs: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workflow_id', type: 'uuid', nullable: false, references: { table: 'workflows' } },
      { name: 'cron_expression', type: 'string', nullable: false },
      { name: 'timezone', type: 'string', default: 'UTC' },
      { name: 'next_run_at', type: 'timestamptz', nullable: false },
      { name: 'last_run_at', type: 'timestamptz', nullable: true },
      { name: 'is_active', type: 'boolean', default: 'true' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workflow_id'] },
      { columns: ['next_run_at'] },
      { columns: ['is_active'] },
      { columns: ['is_active', 'next_run_at'] },
    ],
  },

  /**
   * Workflow Webhooks - For webhook-triggered workflows
   */
  workflow_webhooks: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workflow_id', type: 'uuid', nullable: false, references: { table: 'workflows' } },
      { name: 'webhook_key', type: 'string', nullable: false }, // Unique key for webhook URL
      { name: 'secret', type: 'string', nullable: true }, // For signature verification
      { name: 'allowed_ips', type: 'jsonb', default: '[]' }, // IP whitelist
      { name: 'is_active', type: 'boolean', default: 'true' },
      { name: 'last_triggered_at', type: 'timestamptz', nullable: true },
      { name: 'trigger_count', type: 'integer', default: '0' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workflow_id'] },
      { columns: ['webhook_key'], unique: true },
      { columns: ['is_active'] },
    ],
  },

  // ==================== END-TO-END ENCRYPTION (E2EE) ====================

  /**
   * Stores users' public keys for end-to-end encryption
   * Each user can have multiple devices with different keys
   */
  user_keys: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'public_key', type: 'text', nullable: false },
      { name: 'device_id', type: 'string', nullable: false },
      { name: 'device_name', type: 'string', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_used_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'] },
      { columns: ['user_id', 'device_id'], unique: true },
      { columns: ['is_active'] },
    ],
  },

  /**
   * Stores encrypted conversation keys for group chats
   */
  conversation_keys: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'conversation_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'conversations' },
      },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'encrypted_key', type: 'text', nullable: false },
      { name: 'created_by', type: 'string', nullable: true },
      { name: 'key_version', type: 'integer', default: 1 },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['conversation_id', 'user_id'], unique: true },
      { columns: ['conversation_id'] },
      { columns: ['user_id'] },
    ],
  },

  /**
   * Tracks encryption key rotation history
   */
};

export default schema;

-- =====================================================
-- Nexus Database Schema - Initial Migration
-- Auto-generated from schema.ts
-- Generated: 2026-04-09T14:11:02.126Z
-- Updated: 2026-06-11 - Refactored to include migrations 002-013
-- Tables: 136 (removed: budgets, feedback, bots, forms, etc.)
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== WORKSPACES ====================
CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "logo" TEXT,
  "website" TEXT,
  "is_active" BOOLEAN DEFAULT true,
  "owner_id" VARCHAR(255) NOT NULL,
  "settings" JSONB DEFAULT '{}',
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workspaces_owner_id" ON "workspaces" ("owner_id");
CREATE INDEX IF NOT EXISTS "idx_workspaces_is_active" ON "workspaces" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_workspaces_created_at" ON "workspaces" ("created_at");

-- ==================== WORKSPACE_MEMBERS ====================
CREATE TABLE IF NOT EXISTS "workspace_members" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "role" VARCHAR(255) NOT NULL DEFAULT 'member',
  "permissions" JSONB DEFAULT '[]',
  "joined_at" TIMESTAMPTZ DEFAULT now(),
  "invited_at" TIMESTAMPTZ,
  "invited_by" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_workspace_members_workspace_id_user_id" ON "workspace_members" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_members_workspace_id" ON "workspace_members" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_members_user_id" ON "workspace_members" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_members_role" ON "workspace_members" ("role");
CREATE INDEX IF NOT EXISTS "idx_workspace_members_is_active" ON "workspace_members" ("is_active");

-- ==================== WORKSPACE_INVITES ====================
CREATE TABLE IF NOT EXISTS "workspace_invites" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "email" VARCHAR(255) NOT NULL,
  "role" VARCHAR(255) DEFAULT 'member',
  "invited_by" VARCHAR(255) NOT NULL,
  "token" VARCHAR(255) NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "status" VARCHAR(255) DEFAULT 'pending',
  "accepted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workspace_invites_workspace_id" ON "workspace_invites" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_invites_email" ON "workspace_invites" ("email");
CREATE INDEX IF NOT EXISTS "idx_workspace_invites_status" ON "workspace_invites" ("status");
CREATE INDEX IF NOT EXISTS "idx_workspace_invites_expires_at" ON "workspace_invites" ("expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_workspace_invites_token" ON "workspace_invites" ("token");

-- ==================== CHANNELS ====================
CREATE TABLE IF NOT EXISTS "channels" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "type" VARCHAR(255) DEFAULT 'channel',
  "is_private" BOOLEAN DEFAULT false,
  "is_archived" BOOLEAN DEFAULT false,
  "created_by" VARCHAR(255),
  "collaborative_data" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_channels_workspace_id" ON "channels" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_channels_type" ON "channels" ("type");
CREATE INDEX IF NOT EXISTS "idx_channels_is_private" ON "channels" ("is_private");
CREATE INDEX IF NOT EXISTS "idx_channels_is_archived" ON "channels" ("is_archived");
CREATE INDEX IF NOT EXISTS "idx_channels_created_by" ON "channels" ("created_by");

-- ==================== MESSAGES ====================
CREATE TABLE IF NOT EXISTS "messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "channel_id" UUID REFERENCES "channels"(id) ON DELETE CASCADE,
  "conversation_id" UUID,
  "user_id" VARCHAR(255) NOT NULL,
  "content" TEXT,
  "content_html" TEXT,
  "encrypted_content" TEXT,
  "encryption_metadata" JSONB,
  "is_encrypted" BOOLEAN DEFAULT false,
  "thread_id" UUID REFERENCES "messages"(id) ON DELETE CASCADE,
  "parent_id" UUID REFERENCES "messages"(id) ON DELETE CASCADE,
  "reply_count" INTEGER DEFAULT 0,
  "attachments" JSONB DEFAULT '[]',
  "mentions" JSONB DEFAULT '[]',
  "linked_content" JSONB DEFAULT '[]',
  "reactions" JSONB DEFAULT '{}',
  "is_edited" BOOLEAN DEFAULT false,
  "is_deleted" BOOLEAN DEFAULT false,
  "is_bookmarked" BOOLEAN DEFAULT false,
  "bookmarked_at" TIMESTAMPTZ,
  "bookmarked_by" VARCHAR(255),
  "is_pinned" BOOLEAN DEFAULT false,
  "pinned_at" TIMESTAMPTZ,
  "pinned_by" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_messages_channel_id_created_at" ON "messages" ("channel_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id_created_at" ON "messages" ("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_messages_user_id" ON "messages" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_messages_thread_id" ON "messages" ("thread_id");
CREATE INDEX IF NOT EXISTS "idx_messages_parent_id" ON "messages" ("parent_id");
CREATE INDEX IF NOT EXISTS "idx_messages_is_deleted" ON "messages" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_messages_is_bookmarked" ON "messages" ("is_bookmarked");
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id_is_bookmarked" ON "messages" ("conversation_id", "is_bookmarked");
CREATE INDEX IF NOT EXISTS "idx_messages_is_pinned" ON "messages" ("is_pinned");
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id_is_pinned" ON "messages" ("conversation_id", "is_pinned");
CREATE INDEX IF NOT EXISTS "idx_messages_channel_id_is_pinned" ON "messages" ("channel_id", "is_pinned");

-- ==================== MESSAGE_REACTIONS ====================
CREATE TABLE IF NOT EXISTS "message_reactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL REFERENCES "messages"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "emoji" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_message_reactions_message_id_user_id_emoji" ON "message_reactions" ("message_id", "user_id", "emoji");
CREATE INDEX IF NOT EXISTS "idx_message_reactions_message_id" ON "message_reactions" ("message_id");
CREATE INDEX IF NOT EXISTS "idx_message_reactions_user_id" ON "message_reactions" ("user_id");

-- ==================== MESSAGE_READ_RECEIPTS ====================
CREATE TABLE IF NOT EXISTS "message_read_receipts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL REFERENCES "messages"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "read_at" TIMESTAMPTZ DEFAULT now(),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_message_read_receipts_message_id_user_id" ON "message_read_receipts" ("message_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_message_read_receipts_message_id" ON "message_read_receipts" ("message_id");
CREATE INDEX IF NOT EXISTS "idx_message_read_receipts_user_id" ON "message_read_receipts" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_message_read_receipts_read_at" ON "message_read_receipts" ("read_at");

-- ==================== POLL_VOTES ====================
CREATE TABLE IF NOT EXISTS "poll_votes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL REFERENCES "messages"(id) ON DELETE CASCADE,
  "poll_id" VARCHAR(255) NOT NULL,
  "option_id" VARCHAR(255) NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_poll_votes_message_id" ON "poll_votes" ("message_id");
CREATE INDEX IF NOT EXISTS "idx_poll_votes_poll_id" ON "poll_votes" ("poll_id");
CREATE INDEX IF NOT EXISTS "idx_poll_votes_user_id" ON "poll_votes" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_poll_votes_message_id_poll_id_user_id_option_id" ON "poll_votes" ("message_id", "poll_id", "user_id", "option_id");

-- ==================== SCHEDULED_MESSAGES ====================
CREATE TABLE IF NOT EXISTS "scheduled_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "channel_id" UUID REFERENCES "channels"(id) ON DELETE CASCADE,
  "conversation_id" UUID,
  "user_id" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "content_html" TEXT,
  "attachments" JSONB DEFAULT '[]',
  "mentions" JSONB DEFAULT '[]',
  "linked_content" JSONB DEFAULT '[]',
  "thread_id" UUID REFERENCES "messages"(id) ON DELETE CASCADE,
  "parent_id" UUID REFERENCES "messages"(id) ON DELETE CASCADE,
  "scheduled_at" TIMESTAMPTZ NOT NULL,
  "status" VARCHAR(255) DEFAULT 'pending',
  "sent_at" TIMESTAMPTZ,
  "sent_message_id" UUID REFERENCES "messages"(id) ON DELETE CASCADE,
  "failure_reason" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_scheduled_messages_workspace_id" ON "scheduled_messages" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_scheduled_messages_channel_id" ON "scheduled_messages" ("channel_id");
CREATE INDEX IF NOT EXISTS "idx_scheduled_messages_conversation_id" ON "scheduled_messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_scheduled_messages_user_id" ON "scheduled_messages" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_scheduled_messages_scheduled_at" ON "scheduled_messages" ("scheduled_at");
CREATE INDEX IF NOT EXISTS "idx_scheduled_messages_status" ON "scheduled_messages" ("status");
CREATE INDEX IF NOT EXISTS "idx_scheduled_messages_status_scheduled_at" ON "scheduled_messages" ("status", "scheduled_at");

-- ==================== PROJECTS ====================
CREATE TABLE IF NOT EXISTS "projects" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "type" VARCHAR(255) DEFAULT 'kanban',
  "status" VARCHAR(255) DEFAULT 'active',
  "priority" VARCHAR(255),
  "owner_id" VARCHAR(255),
  "lead_id" VARCHAR(255),
  "start_date" DATE,
  "end_date" DATE,
  "estimated_hours" TEXT,
  "budget" TEXT,
  "is_template" BOOLEAN DEFAULT false,
  "kanban_stages" JSONB DEFAULT '[{"id": "todo", "name": "To Do", "order": 1, "color": "#3B82F6"}, {"id": "in_progress", "name": "In Progress", "order": 2, "color": "#F59E0B"}, {"id": "done", "name": "Done", "order": 3, "color": "#10B981"}]',
  "attachments" JSONB DEFAULT '{"note_attachment": [], "file_attachment": [], "event_attachment": []}',
  "archived_at" TIMESTAMPTZ,
  "collaborative_data" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_projects_workspace_id" ON "projects" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_projects_status" ON "projects" ("status");
CREATE INDEX IF NOT EXISTS "idx_projects_owner_id" ON "projects" ("owner_id");
CREATE INDEX IF NOT EXISTS "idx_projects_type" ON "projects" ("type");
CREATE INDEX IF NOT EXISTS "idx_projects_priority" ON "projects" ("priority");
CREATE INDEX IF NOT EXISTS "idx_projects_created_at" ON "projects" ("created_at");

-- ==================== PROJECT_MEMBERS ====================
CREATE TABLE IF NOT EXISTS "project_members" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "projects"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "role" VARCHAR(255) DEFAULT 'member',
  "permissions" JSONB DEFAULT '[]',
  "joined_at" TIMESTAMPTZ DEFAULT now(),
  "invited_by" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_project_members_project_id_user_id" ON "project_members" ("project_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_project_members_project_id" ON "project_members" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_members_user_id" ON "project_members" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_project_members_role" ON "project_members" ("role");
CREATE INDEX IF NOT EXISTS "idx_project_members_is_active" ON "project_members" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_project_members_joined_at" ON "project_members" ("joined_at");

-- ==================== TASKS ====================
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "projects"(id) ON DELETE CASCADE,
  "sprint_id" UUID,
  "parent_task_id" UUID REFERENCES "tasks"(id) ON DELETE CASCADE,
  "task_type" VARCHAR(255) NOT NULL DEFAULT 'task',
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(255) DEFAULT 'todo',
  "priority" VARCHAR(255) DEFAULT 'medium',
  "assigned_to" JSONB,
  "assignee_team_member_id" UUID,
  "reporter_team_member_id" UUID,
  "due_date" TIMESTAMPTZ,
  "due_time" VARCHAR(5) DEFAULT NULL,
  "reminder_settings" JSONB DEFAULT NULL,
  "completed_at" TIMESTAMPTZ,
  "completed_by" VARCHAR(255),
  "story_points" INTEGER,
  "labels" JSONB DEFAULT '[]',
  "attachments" JSONB DEFAULT '{"note_attachment": [], "file_attachment": [], "event_attachment": []}',
  "collaborative_data" JSONB DEFAULT '{}',
  "custom_fields" JSONB DEFAULT '[]',
  "created_by" VARCHAR(255),
  "updated_by" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_tasks_project_id" ON "tasks" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_sprint_id" ON "tasks" ("sprint_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_assigned_to" ON "tasks" ("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_tasks_assignee_team_member_id" ON "tasks" ("assignee_team_member_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_reporter_team_member_id" ON "tasks" ("reporter_team_member_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "tasks" ("status");
CREATE INDEX IF NOT EXISTS "idx_tasks_priority" ON "tasks" ("priority");
CREATE INDEX IF NOT EXISTS "idx_tasks_due_date" ON "tasks" ("due_date");
CREATE INDEX IF NOT EXISTS "idx_tasks_parent_task_id" ON "tasks" ("parent_task_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_task_type" ON "tasks" ("task_type");

-- ==================== TASK_CUSTOM_FIELD_DEFINITIONS ====================
CREATE TABLE IF NOT EXISTS "task_custom_field_definitions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "projects"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "field_type" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "options" JSONB DEFAULT '[]',
  "default_value" JSONB,
  "is_required" BOOLEAN DEFAULT false,
  "is_visible" BOOLEAN DEFAULT true,
  "sort_order" INTEGER DEFAULT 0,
  "settings" JSONB DEFAULT '{}',
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_task_custom_field_definitions_project_id" ON "task_custom_field_definitions" ("project_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_task_custom_field_definitions_project_id_name" ON "task_custom_field_definitions" ("project_id", "name");
CREATE INDEX IF NOT EXISTS "idx_task_custom_field_definitions_field_type" ON "task_custom_field_definitions" ("field_type");
CREATE INDEX IF NOT EXISTS "idx_task_custom_field_definitions_is_visible" ON "task_custom_field_definitions" ("is_visible");
CREATE INDEX IF NOT EXISTS "idx_task_custom_field_definitions_sort_order" ON "task_custom_field_definitions" ("sort_order");
CREATE INDEX IF NOT EXISTS "idx_task_custom_field_definitions_created_at" ON "task_custom_field_definitions" ("created_at");

-- ==================== TASK_COMMENTS ====================
CREATE TABLE IF NOT EXISTS "task_comments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" UUID NOT NULL REFERENCES "tasks"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "content_html" TEXT,
  "attachments" JSONB DEFAULT '[]',
  "is_edited" BOOLEAN DEFAULT false,
  "is_deleted" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_task_comments_task_id" ON "task_comments" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_comments_user_id" ON "task_comments" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_task_comments_created_at" ON "task_comments" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_task_comments_is_deleted" ON "task_comments" ("is_deleted");

-- ==================== FOLDERS ====================
CREATE TABLE IF NOT EXISTS "folders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "parent_id" UUID REFERENCES "folders"(id) ON DELETE CASCADE,
  "created_by" VARCHAR(255),
  "collaborative_data" JSONB DEFAULT '{}',
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "deleted_by" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_folders_workspace_id" ON "folders" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_folders_parent_id" ON "folders" ("parent_id");
CREATE INDEX IF NOT EXISTS "idx_folders_is_deleted" ON "folders" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_folders_created_by" ON "folders" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_folders_created_at" ON "folders" ("created_at");

-- ==================== FILES ====================
CREATE TABLE IF NOT EXISTS "files" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "storage_path" TEXT NOT NULL,
  "url" TEXT,
  "mime_type" VARCHAR(255),
  "size" BIGINT,
  "uploaded_by" VARCHAR(255),
  "folder_id" UUID REFERENCES "folders"(id) ON DELETE CASCADE,
  "parent_folder_ids" JSONB DEFAULT '{}',
  "version" INTEGER DEFAULT 1,
  "file_hash" VARCHAR(255),
  "virus_scan_status" VARCHAR(255) DEFAULT 'pending',
  "extracted_text" TEXT,
  "is_ai_generated" BOOLEAN,
  "metadata" JSONB DEFAULT '{}',
  "collaborative_data" JSONB DEFAULT '{}',
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "starred" BOOLEAN DEFAULT false,
  "last_opened_at" TIMESTAMPTZ,
  "last_opened_by" VARCHAR(255),
  "open_count" INTEGER DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_files_workspace_id" ON "files" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_files_folder_id" ON "files" ("folder_id");
CREATE INDEX IF NOT EXISTS "idx_files_uploaded_by" ON "files" ("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_files_is_deleted" ON "files" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_files_mime_type" ON "files" ("mime_type");
CREATE INDEX IF NOT EXISTS "idx_files_file_hash" ON "files" ("file_hash");
CREATE INDEX IF NOT EXISTS "idx_files_starred" ON "files" ("starred");
CREATE INDEX IF NOT EXISTS "idx_files_created_at" ON "files" ("created_at");

-- ==================== FILE_SHARES ====================
CREATE TABLE IF NOT EXISTS "file_shares" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "file_id" UUID NOT NULL REFERENCES "files"(id) ON DELETE CASCADE,
  "shared_by" VARCHAR(255) NOT NULL,
  "shared_with" VARCHAR(255),
  "share_token" VARCHAR(255) NOT NULL UNIQUE,
  "share_type" VARCHAR(255) DEFAULT 'user',
  "access_level" VARCHAR(255) DEFAULT 'view',
  "permissions" JSONB DEFAULT '{}',
  "expires_at" TIMESTAMPTZ,
  "password" VARCHAR(255),
  "max_downloads" INTEGER,
  "download_count" INTEGER DEFAULT 0,
  "view_count" INTEGER DEFAULT 0,
  "last_accessed_at" TIMESTAMPTZ,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_file_shares_file_id" ON "file_shares" ("file_id");
CREATE INDEX IF NOT EXISTS "idx_file_shares_shared_by" ON "file_shares" ("shared_by");
CREATE INDEX IF NOT EXISTS "idx_file_shares_shared_with" ON "file_shares" ("shared_with");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_file_shares_share_token" ON "file_shares" ("share_token");
CREATE INDEX IF NOT EXISTS "idx_file_shares_share_type" ON "file_shares" ("share_type");
CREATE INDEX IF NOT EXISTS "idx_file_shares_expires_at" ON "file_shares" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_file_shares_is_active" ON "file_shares" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_file_shares_created_at" ON "file_shares" ("created_at");

-- ==================== CHANNEL_MEMBERS ====================
CREATE TABLE IF NOT EXISTS "channel_members" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "channel_id" UUID NOT NULL REFERENCES "channels"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "role" VARCHAR(255) DEFAULT 'member',
  "permissions" JSONB DEFAULT '[]',
  "joined_at" TIMESTAMPTZ DEFAULT now(),
  "added_by" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "last_read_at" TIMESTAMPTZ,
  "notification_settings" JSONB DEFAULT '{}',
  "collaborative_data" JSONB DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_channel_members_channel_id_user_id" ON "channel_members" ("channel_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_channel_members_channel_id" ON "channel_members" ("channel_id");
CREATE INDEX IF NOT EXISTS "idx_channel_members_user_id" ON "channel_members" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_channel_members_role" ON "channel_members" ("role");
CREATE INDEX IF NOT EXISTS "idx_channel_members_is_active" ON "channel_members" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_channel_members_joined_at" ON "channel_members" ("joined_at");

-- ==================== CONVERSATIONS ====================
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "type" VARCHAR(255) DEFAULT 'direct',
  "name" VARCHAR(255),
  "description" TEXT,
  "participants" JSONB NOT NULL,
  "created_by" VARCHAR(255) NOT NULL,
  "is_active" BOOLEAN DEFAULT true,
  "is_archived" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_conversations_workspace_id" ON "conversations" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_conversations_type" ON "conversations" ("type");
CREATE INDEX IF NOT EXISTS "idx_conversations_created_by" ON "conversations" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_conversations_is_active" ON "conversations" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_conversations_is_archived" ON "conversations" ("is_archived");
CREATE INDEX IF NOT EXISTS "idx_conversations_created_at" ON "conversations" ("created_at");

-- Add foreign keys to tables referencing conversations after it is created
ALTER TABLE "messages" ADD CONSTRAINT "fk_messages_conversation_id" FOREIGN KEY ("conversation_id") REFERENCES "conversations"(id) ON DELETE CASCADE;
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "fk_scheduled_messages_conversation_id" FOREIGN KEY ("conversation_id") REFERENCES "conversations"(id) ON DELETE CASCADE;

-- ==================== CONVERSATION_MEMBERS ====================
CREATE TABLE IF NOT EXISTS "conversation_members" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL REFERENCES "conversations"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "role" VARCHAR(255) DEFAULT 'member',
  "is_active" BOOLEAN DEFAULT true,
  "is_starred" BOOLEAN DEFAULT false,
  "starred_at" TIMESTAMPTZ,
  "last_read_at" TIMESTAMPTZ,
  "last_read_message_id" UUID,
  "joined_at" TIMESTAMPTZ DEFAULT now(),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_conversation_members_conversation_id_user_id" ON "conversation_members" ("conversation_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_members_conversation_id" ON "conversation_members" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_members_user_id" ON "conversation_members" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_members_is_active" ON "conversation_members" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_conversation_members_is_starred" ON "conversation_members" ("is_starred");
CREATE INDEX IF NOT EXISTS "idx_conversation_members_joined_at" ON "conversation_members" ("joined_at");

-- ==================== EVENT_CATEGORIES ====================
CREATE TABLE IF NOT EXISTS "event_categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "color" VARCHAR(255) NOT NULL,
  "icon" VARCHAR(255),
  "description_file_ids" JSONB DEFAULT '[]',
  "is_default" BOOLEAN DEFAULT false,
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_event_categories_workspace_id" ON "event_categories" ("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_event_categories_workspace_id_name" ON "event_categories" ("workspace_id", "name");
CREATE INDEX IF NOT EXISTS "idx_event_categories_created_by" ON "event_categories" ("created_by");

-- ==================== MEETING_ROOMS ====================
CREATE TABLE IF NOT EXISTS "meeting_rooms" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "location" VARCHAR(255),
  "capacity" INTEGER DEFAULT 10,
  "room_type" VARCHAR(255) DEFAULT 'conference',
  "equipment" JSONB DEFAULT '[]',
  "amenities" JSONB DEFAULT '[]',
  "status" VARCHAR(255) DEFAULT 'available',
  "booking_policy" VARCHAR(255) DEFAULT 'open',
  "working_hours" JSONB DEFAULT '{}',
  "is_active" BOOLEAN DEFAULT true,
  "room_code" VARCHAR(255),
  "floor" VARCHAR(255),
  "building" VARCHAR(255),
  "thumbnail_url" TEXT,
  "images" JSONB DEFAULT '[]',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_meeting_rooms_workspace_id" ON "meeting_rooms" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_meeting_rooms_status" ON "meeting_rooms" ("status");
CREATE INDEX IF NOT EXISTS "idx_meeting_rooms_capacity" ON "meeting_rooms" ("capacity");
CREATE INDEX IF NOT EXISTS "idx_meeting_rooms_room_type" ON "meeting_rooms" ("room_type");
CREATE INDEX IF NOT EXISTS "idx_meeting_rooms_is_active" ON "meeting_rooms" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_meeting_rooms_room_code" ON "meeting_rooms" ("room_code");

-- ==================== CALENDAR_EVENTS ====================
CREATE TABLE IF NOT EXISTS "calendar_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255),
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "start_time" TIMESTAMPTZ NOT NULL,
  "end_time" TIMESTAMPTZ NOT NULL,
  "all_day" BOOLEAN DEFAULT false,
  "location" VARCHAR(255),
  "organizer_id" VARCHAR(255),
  "attendees" JSONB DEFAULT '[]',
  "recurrence_rule" JSONB,
  "is_recurring" BOOLEAN DEFAULT false,
  "parent_event_id" UUID REFERENCES "calendar_events"(id) ON DELETE CASCADE,
  "meeting_url" TEXT,
  "visibility" VARCHAR(255) DEFAULT 'private',
  "busy_status" VARCHAR(255) DEFAULT 'busy',
  "priority" VARCHAR(255) DEFAULT 'normal',
  "status" VARCHAR(255) DEFAULT 'confirmed',
  "room_id" UUID,
  "category_id" UUID,
  "attachments" JSONB DEFAULT '{"file_attachment": [], "note_attachment": [], "event_attachment": []}',
  "drive_attachment" JSONB DEFAULT '[]',
  "description_file_ids" JSONB DEFAULT '[]',
  "last_modified_by" VARCHAR(255),
  "collaborative_data" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_calendar_events_workspace_id" ON "calendar_events" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_organizer_id" ON "calendar_events" ("organizer_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_start_time" ON "calendar_events" ("start_time");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_end_time" ON "calendar_events" ("end_time");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_all_day" ON "calendar_events" ("all_day");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_is_recurring" ON "calendar_events" ("is_recurring");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_parent_event_id" ON "calendar_events" ("parent_event_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_room_id" ON "calendar_events" ("room_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_status" ON "calendar_events" ("status");



-- ==================== ROOM_BOOKINGS ====================
CREATE TABLE IF NOT EXISTS "room_bookings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "room_id" UUID NOT NULL REFERENCES "meeting_rooms"(id) ON DELETE CASCADE,
  "event_id" UUID REFERENCES "calendar_events"(id) ON DELETE CASCADE,
  "booked_by" VARCHAR(255) NOT NULL,
  "start_time" TIMESTAMPTZ NOT NULL,
  "end_time" TIMESTAMPTZ NOT NULL,
  "status" VARCHAR(255) DEFAULT 'confirmed',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_room_bookings_room_id" ON "room_bookings" ("room_id");
CREATE INDEX IF NOT EXISTS "idx_room_bookings_start_time_end_time" ON "room_bookings" ("start_time", "end_time");
CREATE INDEX IF NOT EXISTS "idx_room_bookings_status" ON "room_bookings" ("status");
CREATE INDEX IF NOT EXISTS "idx_room_bookings_event_id" ON "room_bookings" ("event_id");

-- ==================== EVENT_ATTENDEES ====================
CREATE TABLE IF NOT EXISTS "event_attendees" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL REFERENCES "calendar_events"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255),
  "email" VARCHAR(255),
  "name" VARCHAR(255),
  "status" VARCHAR(255) DEFAULT 'pending',
  "is_organizer" BOOLEAN DEFAULT false,
  "is_required" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_event_attendees_event_id" ON "event_attendees" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_event_attendees_user_id" ON "event_attendees" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_event_attendees_status" ON "event_attendees" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_event_attendees_event_id_user_id" ON "event_attendees" ("event_id", "user_id");

-- ==================== EVENT_REMINDERS ====================
CREATE TABLE IF NOT EXISTS "event_reminders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL REFERENCES "calendar_events"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255),
  "reminder_time" INTEGER NOT NULL,
  "notification_type" VARCHAR(255) DEFAULT 'email',
  "is_sent" BOOLEAN DEFAULT false,
  "scheduled_for" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_event_reminders_event_id" ON "event_reminders" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_event_reminders_user_id" ON "event_reminders" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_event_reminders_is_sent" ON "event_reminders" ("is_sent");
CREATE INDEX IF NOT EXISTS "idx_event_reminders_scheduled_for" ON "event_reminders" ("scheduled_for");

-- ==================== NOTES ====================
CREATE TABLE IF NOT EXISTS "notes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "title" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "content_text" TEXT,
  "parent_id" UUID REFERENCES "notes"(id) ON DELETE CASCADE,
  "author_id" VARCHAR(255),
  "created_by" VARCHAR(255) NOT NULL,
  "last_edited_by" VARCHAR(255),
  "view_count" INTEGER DEFAULT 0,
  "is_published" BOOLEAN DEFAULT false,
  "cover_image" TEXT,
  "icon" VARCHAR(255),
  "tags" JSONB DEFAULT '[]',
  "attachments" JSONB DEFAULT '{"note_attachment": [], "file_attachment": [], "event_attachment": []}',
  "is_public" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "archived_at" TIMESTAMPTZ,
  "is_favorite" BOOLEAN DEFAULT false,
  "collaborative_data" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_notes_workspace_id" ON "notes" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_notes_created_by" ON "notes" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_notes_parent_id" ON "notes" ("parent_id");
CREATE INDEX IF NOT EXISTS "idx_notes_is_favorite" ON "notes" ("is_favorite");
CREATE INDEX IF NOT EXISTS "idx_notes_is_published" ON "notes" ("is_published");
CREATE INDEX IF NOT EXISTS "idx_notes_created_at" ON "notes" ("created_at");

-- ==================== NOTE_ACCESS_REQUESTS ====================
CREATE TABLE IF NOT EXISTS "note_access_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "note_id" UUID NOT NULL REFERENCES "notes"(id) ON DELETE CASCADE,
  "requester_id" VARCHAR(255) NOT NULL,
  "owner_id" VARCHAR(255) NOT NULL,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "requested_permission" VARCHAR(20) NOT NULL DEFAULT 'read'
    CHECK ("requested_permission" IN ('read', 'write')),
  "message" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "responded_at" TIMESTAMPTZ,
  CONSTRAINT "note_access_requests_status_check" CHECK ("status" IN ('pending', 'approved', 'denied'))
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_note_access_requests_note_requester"
  ON "note_access_requests" ("note_id", "requester_id");
CREATE INDEX IF NOT EXISTS "idx_note_access_requests_note_id" ON "note_access_requests" ("note_id");
CREATE INDEX IF NOT EXISTS "idx_note_access_requests_requester_id" ON "note_access_requests" ("requester_id");
CREATE INDEX IF NOT EXISTS "idx_note_access_requests_owner_id" ON "note_access_requests" ("owner_id");
CREATE INDEX IF NOT EXISTS "idx_note_access_requests_status" ON "note_access_requests" ("status");
CREATE INDEX IF NOT EXISTS "idx_note_access_requests_workspace_id" ON "note_access_requests" ("workspace_id");

-- ==================== USER_SETTINGS ====================
CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL UNIQUE,
  "theme" VARCHAR(255) DEFAULT 'light',
  "language" VARCHAR(255) DEFAULT 'en',
  "date_format" VARCHAR(255) DEFAULT 'MM/dd/yyyy',
  "time_format" VARCHAR(255) DEFAULT '12h',
  "notifications" JSONB DEFAULT '{}',
  "privacy" JSONB DEFAULT '{}',
  "editor_preferences" JSONB DEFAULT '{}',
  "dashboard_layout" JSONB DEFAULT '{}',
  "sidebar_collapsed" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_settings_user_id" ON "user_settings" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_settings_theme" ON "user_settings" ("theme");
CREATE INDEX IF NOT EXISTS "idx_user_settings_language" ON "user_settings" ("language");
CREATE INDEX IF NOT EXISTS "idx_user_settings_created_at" ON "user_settings" ("created_at");

-- ==================== TASK_DEPENDENCIES ====================
CREATE TABLE IF NOT EXISTS "task_dependencies" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" UUID NOT NULL REFERENCES "tasks"(id) ON DELETE CASCADE,
  "depends_on_task_id" UUID NOT NULL REFERENCES "tasks"(id) ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_task_dependencies_task_id_depends_on_task_id" ON "task_dependencies" ("task_id", "depends_on_task_id");
CREATE INDEX IF NOT EXISTS "idx_task_dependencies_task_id" ON "task_dependencies" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_dependencies_depends_on_task_id" ON "task_dependencies" ("depends_on_task_id");

-- ==================== VIDEO_CALLS ====================
CREATE TABLE IF NOT EXISTS "video_calls" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "livekit_room_id" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "host_user_id" VARCHAR(255) NOT NULL,
  "call_type" VARCHAR(255) NOT NULL DEFAULT 'video',
  "is_group_call" BOOLEAN DEFAULT false,
  "status" VARCHAR(255) DEFAULT 'scheduled',
  "scheduled_start_time" TIMESTAMPTZ,
  "scheduled_end_time" TIMESTAMPTZ,
  "actual_start_time" TIMESTAMPTZ,
  "actual_end_time" TIMESTAMPTZ,
  "invitees" JSONB DEFAULT '[]',
  "settings" JSONB DEFAULT '{}',
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_video_calls_workspace_id" ON "video_calls" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_video_calls_host_user_id" ON "video_calls" ("host_user_id");
CREATE INDEX IF NOT EXISTS "idx_video_calls_status" ON "video_calls" ("status");
CREATE INDEX IF NOT EXISTS "idx_video_calls_call_type" ON "video_calls" ("call_type");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_video_calls_livekit_room_id" ON "video_calls" ("livekit_room_id");
CREATE INDEX IF NOT EXISTS "idx_video_calls_scheduled_start_time" ON "video_calls" ("scheduled_start_time");
CREATE INDEX IF NOT EXISTS "idx_video_calls_actual_start_time" ON "video_calls" ("actual_start_time");
CREATE INDEX IF NOT EXISTS "idx_video_calls_created_at" ON "video_calls" ("created_at");

-- ==================== VIDEO_CALL_JOIN_REQUESTS ====================
CREATE TABLE IF NOT EXISTS "video_call_join_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_call_id" UUID NOT NULL REFERENCES "video_calls"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "display_name" VARCHAR(255) NOT NULL,
  "message" TEXT,
  "status" VARCHAR(255) DEFAULT 'pending',
  "requested_at" TIMESTAMPTZ DEFAULT now(),
  "responded_at" TIMESTAMPTZ,
  "responded_by" VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS "idx_video_call_join_requests_video_call_id" ON "video_call_join_requests" ("video_call_id");
CREATE INDEX IF NOT EXISTS "idx_video_call_join_requests_user_id" ON "video_call_join_requests" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_video_call_join_requests_status" ON "video_call_join_requests" ("status");
CREATE INDEX IF NOT EXISTS "idx_video_call_join_requests_requested_at" ON "video_call_join_requests" ("requested_at");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_video_call_join_requests_video_call_id_user_id" ON "video_call_join_requests" ("video_call_id", "user_id");

-- ==================== VIDEO_CALL_PARTICIPANTS ====================
CREATE TABLE IF NOT EXISTS "video_call_participants" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_call_id" UUID NOT NULL REFERENCES "video_calls"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "display_name" VARCHAR(255),
  "role" VARCHAR(255) DEFAULT 'participant',
  "status" VARCHAR(255) DEFAULT 'invited',
  "joined_at" TIMESTAMPTZ,
  "left_at" TIMESTAMPTZ,
  "duration_seconds" INTEGER DEFAULT 0,
  "is_audio_muted" BOOLEAN DEFAULT false,
  "is_video_muted" BOOLEAN DEFAULT false,
  "is_screen_sharing" BOOLEAN DEFAULT false,
  "is_hand_raised" BOOLEAN DEFAULT false,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_video_call_participants_video_call_id" ON "video_call_participants" ("video_call_id");
CREATE INDEX IF NOT EXISTS "idx_video_call_participants_user_id" ON "video_call_participants" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_video_call_participants_video_call_id_user_id" ON "video_call_participants" ("video_call_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_video_call_participants_joined_at" ON "video_call_participants" ("joined_at");
CREATE INDEX IF NOT EXISTS "idx_video_call_participants_left_at" ON "video_call_participants" ("left_at");
CREATE INDEX IF NOT EXISTS "idx_video_call_participants_status" ON "video_call_participants" ("status");

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "workspace_id" UUID REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "type" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT,
  "data" JSONB DEFAULT '{}',
  "action_url" VARCHAR(255),
  "priority" VARCHAR(255) DEFAULT 'normal',
  "category" VARCHAR(255),
  "entity_type" VARCHAR(255),
  "entity_id" UUID,
  "actor_id" VARCHAR(255),
  "is_read" BOOLEAN DEFAULT false,
  "is_archived" BOOLEAN DEFAULT false,
  "read_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "scheduled_at" TIMESTAMPTZ,
  "is_scheduled" BOOLEAN DEFAULT false,
  "is_sent" BOOLEAN DEFAULT false,
  "sent_at" TIMESTAMPTZ,
  "schedule_status" VARCHAR(255) DEFAULT 'pending',
  "retry_count" INTEGER DEFAULT 0,
  "max_retries" INTEGER DEFAULT 3,
  "last_retry_at" TIMESTAMPTZ,
  "failure_reason" TEXT,
  "sent_via" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_workspace_id" ON "notifications" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_type" ON "notifications" ("type");
CREATE INDEX IF NOT EXISTS "idx_notifications_category" ON "notifications" ("category");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "notifications" ("is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_archived" ON "notifications" ("is_archived");
CREATE INDEX IF NOT EXISTS "idx_notifications_priority" ON "notifications" ("priority");
CREATE INDEX IF NOT EXISTS "idx_notifications_entity_type_entity_id" ON "notifications" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id_is_read" ON "notifications" ("user_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id_workspace_id_is_read" ON "notifications" ("user_id", "workspace_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_expires_at" ON "notifications" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_scheduled_at" ON "notifications" ("scheduled_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_scheduled_is_sent" ON "notifications" ("is_scheduled", "is_sent");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_scheduled_schedule_status" ON "notifications" ("is_scheduled", "schedule_status");
CREATE INDEX IF NOT EXISTS "idx_notifications_scheduled_at_is_sent_schedule_status" ON "notifications" ("scheduled_at", "is_sent", "schedule_status");

-- ==================== INTEGRATION_CATALOG ====================
CREATE TABLE IF NOT EXISTS "integration_catalog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(255) NOT NULL,
  "provider" VARCHAR(255),
  "logo_url" TEXT,
  "website" TEXT,
  "documentation_url" TEXT,
  "version" VARCHAR(255) DEFAULT '1.0.0',
  "auth_type" VARCHAR(255) NOT NULL,
  "auth_config" JSONB DEFAULT '{}',
  "api_base_url" TEXT,
  "api_config" JSONB DEFAULT '{}',
  "supports_webhooks" BOOLEAN DEFAULT false,
  "webhook_config" JSONB DEFAULT '{}',
  "capabilities" JSONB DEFAULT '[]',
  "required_permissions" JSONB DEFAULT '[]',
  "features" JSONB DEFAULT '[]',
  "config_schema" JSONB DEFAULT '{}',
  "screenshots" JSONB DEFAULT '[]',
  "pricing_type" VARCHAR(255) DEFAULT 'free',
  "pricing_details" JSONB DEFAULT '{}',
  "is_verified" BOOLEAN DEFAULT false,
  "is_featured" BOOLEAN DEFAULT false,
  "is_active" BOOLEAN DEFAULT true,
  "install_count" INTEGER DEFAULT 0,
  "rating" TEXT,
  "review_count" INTEGER DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_integration_catalog_slug" ON "integration_catalog" ("slug");
CREATE INDEX IF NOT EXISTS "idx_integration_catalog_category" ON "integration_catalog" ("category");
CREATE INDEX IF NOT EXISTS "idx_integration_catalog_auth_type" ON "integration_catalog" ("auth_type");
CREATE INDEX IF NOT EXISTS "idx_integration_catalog_provider" ON "integration_catalog" ("provider");
CREATE INDEX IF NOT EXISTS "idx_integration_catalog_is_active" ON "integration_catalog" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_integration_catalog_is_featured" ON "integration_catalog" ("is_featured");
CREATE INDEX IF NOT EXISTS "idx_integration_catalog_is_verified" ON "integration_catalog" ("is_verified");
CREATE INDEX IF NOT EXISTS "idx_integration_catalog_install_count" ON "integration_catalog" ("install_count");

-- ==================== INTEGRATION_CONNECTIONS ====================
CREATE TABLE IF NOT EXISTS "integration_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "integration_id" UUID NOT NULL REFERENCES "integration_catalog"(id) ON DELETE CASCADE,
  "auth_type" VARCHAR(255) NOT NULL,
  "access_token" TEXT,
  "refresh_token" TEXT,
  "token_type" VARCHAR(255) DEFAULT 'Bearer',
  "scope" TEXT,
  "expires_at" TIMESTAMPTZ,
  "api_key" TEXT,
  "credentials" JSONB DEFAULT '{}',
  "external_id" VARCHAR(255),
  "external_email" VARCHAR(255),
  "external_name" VARCHAR(255),
  "external_avatar" TEXT,
  "external_metadata" JSONB DEFAULT '{}',
  "status" VARCHAR(255) DEFAULT 'active',
  "error_message" TEXT,
  "last_error_at" TIMESTAMPTZ,
  "config" JSONB DEFAULT '{}',
  "settings" JSONB DEFAULT '{}',
  "last_synced_at" TIMESTAMPTZ,
  "sync_cursor" TEXT,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_integration_connections_workspace_id" ON "integration_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_integration_connections_user_id" ON "integration_connections" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_integration_connections_integration_id" ON "integration_connections" ("integration_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_integration_connections_workspace_id_user_id_integration_id" ON "integration_connections" ("workspace_id", "user_id", "integration_id");
CREATE INDEX IF NOT EXISTS "idx_integration_connections_status" ON "integration_connections" ("status");
CREATE INDEX IF NOT EXISTS "idx_integration_connections_is_active" ON "integration_connections" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_integration_connections_external_email" ON "integration_connections" ("external_email");
CREATE INDEX IF NOT EXISTS "idx_integration_connections_expires_at" ON "integration_connections" ("expires_at");












-- ==================== WORKFLOWS ====================
CREATE TABLE IF NOT EXISTS "workflows" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "created_by" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "icon" VARCHAR(255),
  "color" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT 'true',
  "trigger_type" VARCHAR(255) NOT NULL,
  "trigger_config" JSONB DEFAULT '{}',
  "run_count" INTEGER DEFAULT '0',
  "success_count" INTEGER DEFAULT '0',
  "failure_count" INTEGER DEFAULT '0',
  "last_run_at" TIMESTAMPTZ,
  "last_run_status" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflows_workspace_id" ON "workflows" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workflows_created_by" ON "workflows" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_workflows_is_active" ON "workflows" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_workflows_trigger_type" ON "workflows" ("trigger_type");
CREATE INDEX IF NOT EXISTS "idx_workflows_workspace_id_is_active" ON "workflows" ("workspace_id", "is_active");

-- ==================== WORKFLOW_STEPS ====================
CREATE TABLE IF NOT EXISTS "workflow_steps" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id" UUID NOT NULL REFERENCES "workflows"(id) ON DELETE CASCADE,
  "step_order" INTEGER NOT NULL,
  "step_type" VARCHAR(255) NOT NULL,
  "step_name" VARCHAR(255),
  "step_config" JSONB DEFAULT '{}',
  "parent_step_id" UUID REFERENCES "workflow_steps"(id) ON DELETE CASCADE,
  "branch_path" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT 'true',
  "position_x" INTEGER DEFAULT '0',
  "position_y" INTEGER DEFAULT '0',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_steps_workflow_id" ON "workflow_steps" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_steps_parent_step_id" ON "workflow_steps" ("parent_step_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_steps_workflow_id_step_order" ON "workflow_steps" ("workflow_id", "step_order");

-- ==================== WORKFLOW_EXECUTIONS ====================
CREATE TABLE IF NOT EXISTS "workflow_executions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id" UUID NOT NULL REFERENCES "workflows"(id) ON DELETE CASCADE,
  "triggered_by" VARCHAR(255),
  "trigger_source" VARCHAR(255),
  "trigger_data" JSONB DEFAULT '{}',
  "status" VARCHAR(255) DEFAULT 'pending',
  "current_step_id" UUID,
  "context" JSONB DEFAULT '{}',
  "error_message" TEXT,
  "steps_completed" INTEGER DEFAULT '0',
  "steps_total" INTEGER DEFAULT '0',
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "execution_time_ms" INTEGER,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_executions_workflow_id" ON "workflow_executions" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_executions_status" ON "workflow_executions" ("status");
CREATE INDEX IF NOT EXISTS "idx_workflow_executions_triggered_by" ON "workflow_executions" ("triggered_by");
CREATE INDEX IF NOT EXISTS "idx_workflow_executions_created_at" ON "workflow_executions" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_workflow_executions_workflow_id_status" ON "workflow_executions" ("workflow_id", "status");

-- ==================== WORKFLOW_STEP_EXECUTIONS ====================
CREATE TABLE IF NOT EXISTS "workflow_step_executions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "execution_id" UUID NOT NULL REFERENCES "workflow_executions"(id) ON DELETE CASCADE,
  "step_id" UUID NOT NULL REFERENCES "workflow_steps"(id) ON DELETE CASCADE,
  "status" VARCHAR(255) DEFAULT 'pending',
  "input_data" JSONB DEFAULT '{}',
  "output_data" JSONB DEFAULT '{}',
  "condition_result" BOOLEAN,
  "error_message" TEXT,
  "retry_count" INTEGER DEFAULT '0',
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "execution_time_ms" INTEGER,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_step_executions_execution_id" ON "workflow_step_executions" ("execution_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_step_executions_step_id" ON "workflow_step_executions" ("step_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_step_executions_status" ON "workflow_step_executions" ("status");
CREATE INDEX IF NOT EXISTS "idx_workflow_step_executions_execution_id_step_id" ON "workflow_step_executions" ("execution_id", "step_id");

-- ==================== WORKFLOW_ENTITY_SUBSCRIPTIONS ====================
CREATE TABLE IF NOT EXISTS "workflow_entity_subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id" UUID NOT NULL REFERENCES "workflows"(id) ON DELETE CASCADE,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "entity_type" VARCHAR(255) NOT NULL,
  "event_type" VARCHAR(255) NOT NULL,
  "filter_config" JSONB DEFAULT '{}',
  "is_active" BOOLEAN DEFAULT 'true',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_entity_subscriptions_workflow_id" ON "workflow_entity_subscriptions" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_entity_subscriptions_workspace_id" ON "workflow_entity_subscriptions" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_entity_subscriptions_entity_type_event_type" ON "workflow_entity_subscriptions" ("entity_type", "event_type");
CREATE INDEX IF NOT EXISTS "idx_workflow_entity_subscriptions_is_active" ON "workflow_entity_subscriptions" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_workflow_entity_subscriptions_workspace_id_entity_type_event_type_is_active" ON "workflow_entity_subscriptions" ("workspace_id", "entity_type", "event_type", "is_active");

-- ==================== WORKFLOW_SCHEDULED_JOBS ====================
CREATE TABLE IF NOT EXISTS "workflow_scheduled_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id" UUID NOT NULL REFERENCES "workflows"(id) ON DELETE CASCADE,
  "cron_expression" VARCHAR(255) NOT NULL,
  "timezone" VARCHAR(255) DEFAULT 'UTC',
  "next_run_at" TIMESTAMPTZ NOT NULL,
  "last_run_at" TIMESTAMPTZ,
  "is_active" BOOLEAN DEFAULT 'true',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_scheduled_jobs_workflow_id" ON "workflow_scheduled_jobs" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_scheduled_jobs_next_run_at" ON "workflow_scheduled_jobs" ("next_run_at");
CREATE INDEX IF NOT EXISTS "idx_workflow_scheduled_jobs_is_active" ON "workflow_scheduled_jobs" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_workflow_scheduled_jobs_is_active_next_run_at" ON "workflow_scheduled_jobs" ("is_active", "next_run_at");

-- ==================== WORKFLOW_WEBHOOKS ====================
CREATE TABLE IF NOT EXISTS "workflow_webhooks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id" UUID NOT NULL REFERENCES "workflows"(id) ON DELETE CASCADE,
  "webhook_key" VARCHAR(255) NOT NULL,
  "secret" VARCHAR(255),
  "allowed_ips" JSONB DEFAULT '[]',
  "is_active" BOOLEAN DEFAULT 'true',
  "last_triggered_at" TIMESTAMPTZ,
  "trigger_count" INTEGER DEFAULT '0',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_webhooks_workflow_id" ON "workflow_webhooks" ("workflow_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_workflow_webhooks_webhook_key" ON "workflow_webhooks" ("webhook_key");
CREATE INDEX IF NOT EXISTS "idx_workflow_webhooks_is_active" ON "workflow_webhooks" ("is_active");

-- ==================== USER_KEYS ====================
CREATE TABLE IF NOT EXISTS "user_keys" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "public_key" TEXT NOT NULL,
  "device_id" VARCHAR(255) NOT NULL,
  "device_name" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "last_used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_user_keys_user_id" ON "user_keys" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_keys_user_id_device_id" ON "user_keys" ("user_id", "device_id");
CREATE INDEX IF NOT EXISTS "idx_user_keys_is_active" ON "user_keys" ("is_active");

-- ==================== CONVERSATION_KEYS ====================
CREATE TABLE IF NOT EXISTS "conversation_keys" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL REFERENCES "conversations"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "encrypted_key" TEXT NOT NULL,
  "created_by" VARCHAR(255),
  "key_version" INTEGER DEFAULT 1,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_conversation_keys_conversation_id_user_id" ON "conversation_keys" ("conversation_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_keys_conversation_id" ON "conversation_keys" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_keys_user_id" ON "conversation_keys" ("user_id");


-- Cleanup Phần B3 (outputs/remove_table_B3_impact.md): bỏ các FIELD không dùng trong bảng đang sống,
-- và DROP các bảng chết phát hiện thêm. Áp dụng cho database đã provision.
-- GIỮ LẠI (nhóm 🔴 đang dùng, KHÔNG drop): users.banned_until, files.starred, files.collaborative_data,
--   project_members.permissions/invited_by/is_active, video_call_participants media columns + duration_seconds,
--   notes.view_count, notes.archived_at, conversation_members.is_starred/starred_at.

-- ========== DROP COLUMN — field không dùng (bảng vẫn sống) ==========

-- channels
ALTER TABLE "channels" DROP COLUMN IF EXISTS "archived_at";
ALTER TABLE "channels" DROP COLUMN IF EXISTS "archived_by";

-- conversations
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "archived_at";
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "archived_by";
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "last_message_at";
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "message_count";
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "settings";
ALTER TABLE "conversations" DROP COLUMN IF EXISTS "collaborative_data";

-- conversation_members  (GIỮ is_starred, starred_at)
ALTER TABLE "conversation_members" DROP COLUMN IF EXISTS "left_at";
ALTER TABLE "conversation_members" DROP COLUMN IF EXISTS "notifications_enabled";
ALTER TABLE "conversation_members" DROP COLUMN IF EXISTS "collaborative_data";

-- projects  (GIỮ estimated_hours, archived_at, collaborative_data)
ALTER TABLE "projects" DROP COLUMN IF EXISTS "actual_hours";
ALTER TABLE "projects" DROP COLUMN IF EXISTS "archived_by";
ALTER TABLE "projects" DROP COLUMN IF EXISTS "settings";

-- project_members  (GIỮ permissions, invited_by, is_active)
ALTER TABLE "project_members" DROP COLUMN IF EXISTS "notification_settings";

-- tasks
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "estimated_hours";
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "actual_hours";

-- task_dependencies  (GIỮ task_id, depends_on_task_id)
ALTER TABLE "task_dependencies" DROP COLUMN IF EXISTS "dependency_type";
ALTER TABLE "task_dependencies" DROP COLUMN IF EXISTS "lag_days";
ALTER TABLE "task_dependencies" DROP COLUMN IF EXISTS "is_critical_path";
ALTER TABLE "task_dependencies" DROP COLUMN IF EXISTS "created_by";

-- files  (GIỮ starred, collaborative_data)
ALTER TABLE "files" DROP COLUMN IF EXISTS "previous_version_id";
ALTER TABLE "files" DROP COLUMN IF EXISTS "virus_scan_at";
ALTER TABLE "files" DROP COLUMN IF EXISTS "ocr_status";
ALTER TABLE "files" DROP COLUMN IF EXISTS "starred_at";
ALTER TABLE "files" DROP COLUMN IF EXISTS "starred_by";

-- event_attendees
ALTER TABLE "event_attendees" DROP COLUMN IF EXISTS "response_message";
ALTER TABLE "event_attendees" DROP COLUMN IF EXISTS "responded_at";

-- video_call_participants  (GIỮ duration_seconds, is_audio_muted, is_video_muted, is_screen_sharing, is_hand_raised)
ALTER TABLE "video_call_participants" DROP COLUMN IF EXISTS "livekit_participant_id";
ALTER TABLE "video_call_participants" DROP COLUMN IF EXISTS "connection_quality";

-- video_call_recordings
ALTER TABLE "video_call_recordings" DROP COLUMN IF EXISTS "transcript_url";

-- notes  (GIỮ view_count, archived_at, is_published)
ALTER TABLE "notes" DROP COLUMN IF EXISTS "position";
ALTER TABLE "notes" DROP COLUMN IF EXISTS "published_at";
ALTER TABLE "notes" DROP COLUMN IF EXISTS "slug";

-- activity_logs  (GIỮ action, entity_type, entity_id, metadata)
ALTER TABLE "activity_logs" DROP COLUMN IF EXISTS "old_values";
ALTER TABLE "activity_logs" DROP COLUMN IF EXISTS "new_values";
ALTER TABLE "activity_logs" DROP COLUMN IF EXISTS "ip_address";
ALTER TABLE "activity_logs" DROP COLUMN IF EXISTS "user_agent";

-- users  (chỉ users.is_active; GIỮ banned_until vì đang dùng trong ban/login)
-- View auth.users = "SELECT * FROM public.users" (migration 002) bám vào mọi cột,
-- nên phải drop view trước, drop cột, rồi tạo lại view (CREATE OR REPLACE không cho bớt cột).
DROP VIEW IF EXISTS "auth"."users";
ALTER TABLE "users" DROP COLUMN IF EXISTS "is_active";
CREATE OR REPLACE VIEW "auth"."users" AS SELECT * FROM public."users";

-- ========== DROP TABLE — bảng chết (token thật lưu ở cột trên users; logs/stats không ghi ở đâu) ==========
DROP TABLE IF EXISTS "password_reset_tokens" CASCADE;     -- token lưu ở users.password_reset_token
DROP TABLE IF EXISTS "email_verification_tokens" CASCADE; -- token lưu ở users.email_verification_token
DROP TABLE IF EXISTS "user_activity_logs" CASCADE;        -- 0 insert/select trong toàn codebase
DROP TABLE IF EXISTS "ai_usage_stats" CASCADE;            -- AI chạy ở nexus-ai riêng; bảng chỉ id/user_id

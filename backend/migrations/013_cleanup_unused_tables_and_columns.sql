-- Cleanup các bảng & cột không được dùng (mức 🟢 an toàn trong outputs/remove_table.md).
-- Đã verify không có tham chiếu trong backend/src, nexus-ai, nexus-mcp.
-- Áp dụng cho các database đã provision.

-- ===== Bảng không dùng (dead / nexus-ai dùng kho lưu trữ riêng) =====
DROP TABLE IF EXISTS "key_rotation_history" CASCADE;
DROP TABLE IF EXISTS "project_templates" CASCADE;
DROP TABLE IF EXISTS "meeting_bookings" CASCADE;   -- trùng vai trò với room_bookings (bảng thực sự dùng)
DROP TABLE IF EXISTS "scheduled_actions" CASCADE;  -- lịch workflow dùng workflow_scheduled_jobs
DROP TABLE IF EXISTS "chat_messages" CASCADE;      -- nexus-ai lưu hội thoại ở SQLite riêng
DROP TABLE IF EXISTS "agent_memory" CASCADE;       -- nexus-ai dùng SQLite riêng (memories)
DROP TABLE IF EXISTS "agent_memory_preferences" CASCADE;
DROP TABLE IF EXISTS "autopilot_briefings" CASCADE;
DROP TABLE IF EXISTS "autopilot_alerts" CASCADE;

-- ===== Cột không dùng =====
-- collaborative_data (Yjs/CRDT) chưa kích hoạt cho các bảng dưới; max_storage_gb không đọc từ DB.
-- LƯU Ý: folders.collaborative_data ĐƯỢC GIỮ vì đang dùng trong files.service.ts.
ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "max_storage_gb";
ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "collaborative_data";
ALTER TABLE "workspace_members" DROP COLUMN IF EXISTS "collaborative_data";
ALTER TABLE "messages" DROP COLUMN IF EXISTS "collaborative_data";
ALTER TABLE "folders" DROP COLUMN IF EXISTS "parent_ids";
ALTER TABLE "event_reminders" DROP COLUMN IF EXISTS "sent_at";
ALTER TABLE "video_call_join_requests" DROP COLUMN IF EXISTS "metadata";

-- chat_sessions: nexus-ai lưu hội thoại ở SQLite riêng; bảng Postgres chỉ còn id + user_id.
ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "title";
ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "context";
ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "personality";
ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "metadata";
ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "created_at";
ALTER TABLE "chat_sessions" DROP COLUMN IF EXISTS "updated_at";

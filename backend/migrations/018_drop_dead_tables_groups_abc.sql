-- Drop các bảng CHẾT/VỎ RỖNG/ORPHAN nhóm A, B, C
-- (outputs/detail_database/06_deletable_tables_review.md).
-- Đã verify zero writer/reader trong backend/src, zero tham chiếu frontend.
-- Idempotent (IF EXISTS) — an toàn chạy lại trên mọi database đã provision.

-- ===== Nhóm B — vỏ rỗng (còn sống trong schema/initial) =====
-- chat_sessions: hội thoại đã chuyển sang nexus-ai (SQLite riêng); bảng Postgres chỉ còn id + user_id.
-- Không bảng nào FK trỏ tới → drop an toàn.
DROP TABLE IF EXISTS "chat_sessions" CASCADE;

-- ===== Nhóm A — bảng chết (đa số đã drop ở migration 014/016; re-assert cho DB cũ) =====
DROP TABLE IF EXISTS "note_permission_change_requests" CASCADE;  -- flow đổi quyền note dùng bảng notifications
DROP TABLE IF EXISTS "ai_usage_stats" CASCADE;                   -- AI quota chưa làm; chạy ở nexus-ai riêng
DROP TABLE IF EXISTS "email_verification_tokens" CASCADE;        -- token lưu ở cột users.email_verification_token

-- ===== Nhóm C — orphan (không có trong code này; nếu DB còn sót thì là rác) =====
DROP TABLE IF EXISTS "autopilot_sessions" CASCADE;              -- autopilot xử lý bởi nexus-ai
DROP TABLE IF EXISTS "autopilot_suggestions_cache" CASCADE;     -- như trên
DROP TABLE IF EXISTS "openai_connections" CASCADE;             -- OpenAI dùng qua env OPENAI_API_KEY, không lưu DB

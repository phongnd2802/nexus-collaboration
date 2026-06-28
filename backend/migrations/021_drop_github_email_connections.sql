-- Xóa tính năng GitHub integration (repos/issues) và Email integration (Gmail/SMTP/IMAP + AI priority).
-- KHÔNG đụng tới: đăng nhập GitHub OAuth (auth login) và bộ gửi email hệ thống (modules/email).
-- Đã verify đã gỡ hết code backend/frontend tham chiếu các bảng này.
-- Áp dụng cho database đã provision. CASCADE để dọn FK phụ thuộc.

-- email_priorities phụ thuộc FK vào email_connections → drop trước (CASCADE cũng tự lo).
DROP TABLE IF EXISTS "email_priorities" CASCADE;   -- AI phân tích độ ưu tiên email (gắn với email_connections)
DROP TABLE IF EXISTS "email_connections" CASCADE;  -- kết nối Gmail/SMTP/IMAP của user (inbox in-app)

DROP TABLE IF EXISTS "github_connections" CASCADE; -- kết nối GitHub repos/issues (integration). Login GitHub giữ nguyên.

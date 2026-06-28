-- Gỡ 3 tính năng + bảng theo yêu cầu (đã gỡ code service/controller/DTO/frontend tương ứng):
--   1. github_issue_links     — tính năng liên kết task <-> GitHub issue/PR
--   2. device_tokens          — FCM mobile push (Flutter)
--   3. automation_templates   — thư viện mẫu workflow
-- Áp dụng cho database đã provision. Các bảng GitHub connections / workflows / notifications giữ nguyên.

DROP TABLE IF EXISTS "github_issue_links" CASCADE;
DROP TABLE IF EXISTS "device_tokens" CASCADE;
DROP TABLE IF EXISTS "automation_templates" CASCADE;

-- Cleanup 8 bảng ở Phần B1 (outputs/remove_table.md) — không có query nào chạm vào.
-- Đã verify không có tham chiếu trong backend/src, frontend (chỉ UI mồ côi gọi endpoint không tồn tại),
-- nexus-ai, nexus-mcp. Áp dụng cho các database đã provision.

-- ===== 🟢 An toàn — không ảnh hưởng runtime =====
DROP TABLE IF EXISTS "workspace_subscriptions" CASCADE;          -- billing query bảng "subscriptions" khác tên (fail im lặng)
DROP TABLE IF EXISTS "workspace_settings" CASCADE;               -- settings lưu ở cột JSONB workspaces.settings
DROP TABLE IF EXISTS "meeting_summaries" CASCADE;                -- tóm tắt họp sinh on-the-fly / lưu vào bảng notes
DROP TABLE IF EXISTS "workflow_variables" CASCADE;               -- không service automation nào dùng
DROP TABLE IF EXISTS "integration_sync_history" CASCADE;         -- không code, không endpoint
DROP TABLE IF EXISTS "note_permission_change_requests" CASCADE;  -- flow đổi quyền note dùng bảng notifications

-- ===== 🟡 An toàn về runtime; UI integrations gọi các bảng này là mồ côi (endpoint backend chưa tồn tại) =====
DROP TABLE IF EXISTS "integration_webhooks" CASCADE;             -- IntegrationWebhooks.tsx gọi endpoint không tồn tại (404)
DROP TABLE IF EXISTS "integration_logs" CASCADE;                 -- IntegrationLogs.tsx gọi endpoint không tồn tại (404)

-- ===== Phần B2: bảng gần như chết (chỉ user_id) — dữ liệu thật lưu nơi khác =====
DROP TABLE IF EXISTS "notification_preferences" CASCADE;         -- preferences lưu ở user_settings.notifications (JSONB) / health_metrics
DROP TABLE IF EXISTS "push_subscriptions" CASCADE;               -- Web Push lưu ở health_metrics; push mobile dùng device_tokens (FCM)

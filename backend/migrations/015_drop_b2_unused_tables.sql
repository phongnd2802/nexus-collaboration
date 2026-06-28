
-- ===== Phần B2: bảng gần như chết (chỉ user_id) — dữ liệu thật lưu nơi khác =====
DROP TABLE IF EXISTS "notification_preferences" CASCADE;         -- preferences lưu ở user_settings.notifications (JSONB) / health_metrics
DROP TABLE IF EXISTS "push_subscriptions" CASCADE;     
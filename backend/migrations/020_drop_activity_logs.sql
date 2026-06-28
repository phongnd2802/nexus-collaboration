-- Gỡ bảng activity_logs + tính năng liên quan.
-- Đã gỡ code: Activity Feed (events.service getActivityFeed/getActivityStats + endpoint /activity-feed),
--   ghi log (events.service createActivityLog + call trong createEvent),
--   analytics đọc activity_logs (getActivityAnalytics + endpoint /analytics/activity; rewire
--   getUserAnalytics/getUserStats/overview sang workspace_members),
--   và gỡ 'activity_logs' khỏi mảng cleanup xóa user (auth.service).
-- Áp dụng cho database đã provision. Không bảng nào tham chiếu ngược activity_logs.

DROP TABLE IF EXISTS "activity_logs" CASCADE;

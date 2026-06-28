-- Xóa chức năng ghi hình cuộc họp và AI hỗ trợ trong cuộc họp (transcription/summary).
-- Bỏ 2 bảng recording/transcript và cột is_recording trên video_calls.
-- Đã verify không còn tham chiếu trong backend/src (service/controller/gateway/scheduler/search indexer)
-- và frontend (component AI/recording đã gỡ). Áp dụng cho các database đã provision.

-- ===== Bảng ghi hình + transcript (AI in-call) =====
DROP TABLE IF EXISTS "video_call_recordings" CASCADE;   -- recording cuộc họp (egress LiveKit + cron xử lý) đã gỡ
DROP TABLE IF EXISTS "video_call_transcripts" CASCADE;  -- transcript/summary AI trong cuộc họp đã gỡ

-- ===== Cột cờ recording trên video_calls =====
ALTER TABLE "video_calls" DROP COLUMN IF EXISTS "is_recording";

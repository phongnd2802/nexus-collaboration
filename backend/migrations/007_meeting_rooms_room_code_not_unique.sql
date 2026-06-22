-- Remove unique constraint on room_code in meeting_rooms
DROP INDEX IF EXISTS "idx_meeting_rooms_room_code";

ALTER TABLE "meeting_rooms" DROP CONSTRAINT IF EXISTS "meeting_rooms_room_code_key";

CREATE INDEX IF NOT EXISTS "idx_meeting_rooms_room_code" ON "meeting_rooms" ("room_code");

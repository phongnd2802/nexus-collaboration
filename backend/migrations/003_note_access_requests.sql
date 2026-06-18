-- =====================================================
-- Migration 003: Note Access Requests
-- Created: 2026-06-19
-- Description: Table to store note access requests from users
--              who don't have permission to view a note.
-- =====================================================

-- ==================== NOTE_ACCESS_REQUESTS ====================
CREATE TABLE IF NOT EXISTS "note_access_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "note_id" UUID NOT NULL REFERENCES "notes"(id) ON DELETE CASCADE,
  "requester_id" VARCHAR(255) NOT NULL,
  "owner_id" VARCHAR(255) NOT NULL,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "message" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  "responded_at" TIMESTAMPTZ,
  CONSTRAINT "note_access_requests_status_check" CHECK ("status" IN ('pending', 'approved', 'denied'))
);

-- One pending request per user per note
CREATE UNIQUE INDEX IF NOT EXISTS "idx_note_access_requests_note_requester"
  ON "note_access_requests" ("note_id", "requester_id");

CREATE INDEX IF NOT EXISTS "idx_note_access_requests_note_id"
  ON "note_access_requests" ("note_id");

CREATE INDEX IF NOT EXISTS "idx_note_access_requests_requester_id"
  ON "note_access_requests" ("requester_id");

CREATE INDEX IF NOT EXISTS "idx_note_access_requests_owner_id"
  ON "note_access_requests" ("owner_id");

CREATE INDEX IF NOT EXISTS "idx_note_access_requests_status"
  ON "note_access_requests" ("status");

CREATE INDEX IF NOT EXISTS "idx_note_access_requests_workspace_id"
  ON "note_access_requests" ("workspace_id");

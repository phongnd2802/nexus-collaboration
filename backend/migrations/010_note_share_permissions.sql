-- =====================================================
-- Migration 010: Note Share Permissions
-- Created: 2026-06-24
-- Description: Add requested_permission to note_access_requests,
--              create note_permission_change_requests table.
-- =====================================================

-- Add requested_permission to existing note_access_requests table
ALTER TABLE "note_access_requests"
  ADD COLUMN IF NOT EXISTS "requested_permission" VARCHAR(20) NOT NULL DEFAULT 'read'
    CHECK ("requested_permission" IN ('read', 'write'));

-- ==================== NOTE_PERMISSION_CHANGE_REQUESTS ====================
CREATE TABLE IF NOT EXISTS "note_permission_change_requests" (
  "id"                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "note_id"              UUID NOT NULL REFERENCES "notes"(id) ON DELETE CASCADE,
  "requester_id"         VARCHAR(255) NOT NULL,
  "owner_id"             VARCHAR(255) NOT NULL,
  "workspace_id"         UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "current_permission"   VARCHAR(20) NOT NULL CHECK ("current_permission" IN ('read', 'write')),
  "requested_permission" VARCHAR(20) NOT NULL CHECK ("requested_permission" IN ('read', 'write')),
  "status"               VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK ("status" IN ('pending', 'approved', 'denied', 'cancelled')),
  "message"              TEXT,
  "created_at"           TIMESTAMPTZ DEFAULT now(),
  "updated_at"           TIMESTAMPTZ DEFAULT now(),
  "responded_at"         TIMESTAMPTZ,
  CONSTRAINT "note_permission_change_requests_different_permission"
    CHECK ("current_permission" <> "requested_permission")
);

-- One active (pending) request per user per note
CREATE UNIQUE INDEX IF NOT EXISTS "idx_note_perm_change_req_note_requester_pending"
  ON "note_permission_change_requests" ("note_id", "requester_id")
  WHERE "status" = 'pending';

CREATE INDEX IF NOT EXISTS "idx_note_perm_change_req_note_id"
  ON "note_permission_change_requests" ("note_id");

CREATE INDEX IF NOT EXISTS "idx_note_perm_change_req_requester_id"
  ON "note_permission_change_requests" ("requester_id");

CREATE INDEX IF NOT EXISTS "idx_note_perm_change_req_owner_id"
  ON "note_permission_change_requests" ("owner_id");

CREATE INDEX IF NOT EXISTS "idx_note_perm_change_req_status"
  ON "note_permission_change_requests" ("status");

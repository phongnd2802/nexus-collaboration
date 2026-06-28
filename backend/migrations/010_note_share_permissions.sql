-- =====================================================
-- Migration 010: Note Share Permissions
-- Created: 2026-06-24
-- Description: Add requested_permission to note_access_requests.
-- =====================================================

-- Add requested_permission to existing note_access_requests table
ALTER TABLE "note_access_requests"
  ADD COLUMN IF NOT EXISTS "requested_permission" VARCHAR(20) NOT NULL DEFAULT 'read'
    CHECK ("requested_permission" IN ('read', 'write'));

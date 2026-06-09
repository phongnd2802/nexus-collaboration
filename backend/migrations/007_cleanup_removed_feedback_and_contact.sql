-- Cleanup migration: Remove feedback module tables
-- Modules removed: feedback, contact
-- Date: 2026-02-23

DROP TABLE IF EXISTS "feedback_responses" CASCADE;
DROP TABLE IF EXISTS "feedback" CASCADE;
DROP TABLE IF EXISTS "account_deletion_feedback" CASCADE;

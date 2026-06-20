-- Migration: Remove document builder tables
-- Module `documents` has been removed from the codebase.
-- Drop tables in dependency order (child tables first).

DROP TABLE IF EXISTS "document_activity_logs" CASCADE;
DROP TABLE IF EXISTS "document_signatures" CASCADE;
DROP TABLE IF EXISTS "document_recipients" CASCADE;
DROP TABLE IF EXISTS "documents" CASCADE;
DROP TABLE IF EXISTS "document_templates" CASCADE;
DROP TABLE IF EXISTS "user_signatures" CASCADE;

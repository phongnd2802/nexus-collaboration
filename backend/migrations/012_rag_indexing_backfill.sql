-- =====================================================
-- Migration 012: RAG indexing schema backfill
-- Created: 2026-06-25
-- Description: Ensure rag_* tables have the latest columns for deployments
--              that created the tables before the schema stabilized.
-- =====================================================

ALTER TABLE IF EXISTS "rag_documents"
  ADD COLUMN IF NOT EXISTS "chunking_strategy" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "embedding_model" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "error_message" TEXT,
  ADD COLUMN IF NOT EXISTS "indexed_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT now();

ALTER TABLE IF EXISTS "rag_indexing_jobs"
  ADD COLUMN IF NOT EXISTS "max_attempts" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "error_message" TEXT,
  ADD COLUMN IF NOT EXISTS "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS "claimed_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "finished_at" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS "idx_rag_documents_workspace_status"
  ON "rag_documents" ("workspace_id", "status");

CREATE INDEX IF NOT EXISTS "idx_rag_documents_file"
  ON "rag_documents" ("file_id");

CREATE INDEX IF NOT EXISTS "idx_rag_jobs_workspace_status_created"
  ON "rag_indexing_jobs" ("workspace_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "idx_rag_jobs_file"
  ON "rag_indexing_jobs" ("file_id");

-- =====================================================
-- Migration 011: RAG file indexing jobs
-- Created: 2026-06-25
-- Description: Track async file RAG indexing state.
-- =====================================================

CREATE TABLE IF NOT EXISTS "rag_documents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "file_id" UUID NOT NULL REFERENCES "files"(id) ON DELETE CASCADE,
  "file_hash" VARCHAR(255),
  "status" VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK ("status" IN ('queued', 'processing', 'indexed', 'failed', 'skipped', 'deleted')),
  "chunking_strategy" VARCHAR(100),
  "embedding_model" VARCHAR(255),
  "error_message" TEXT,
  "indexed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT "rag_documents_workspace_file_unique" UNIQUE ("workspace_id", "file_id")
);

CREATE TABLE IF NOT EXISTS "rag_indexing_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "file_id" UUID NOT NULL REFERENCES "files"(id) ON DELETE CASCADE,
  "reason" VARCHAR(50) NOT NULL DEFAULT 'file_uploaded',
  "status" VARCHAR(20) NOT NULL DEFAULT 'queued'
    CHECK ("status" IN ('queued', 'processing', 'indexed', 'failed', 'skipped', 'cancelled')),
  "file_hash" VARCHAR(255),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "max_attempts" INTEGER NOT NULL DEFAULT 3,
  "error_message" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "claimed_at" TIMESTAMPTZ,
  "finished_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_rag_documents_workspace_status"
  ON "rag_documents" ("workspace_id", "status");

CREATE INDEX IF NOT EXISTS "idx_rag_documents_file"
  ON "rag_documents" ("file_id");

CREATE INDEX IF NOT EXISTS "idx_rag_jobs_workspace_status_created"
  ON "rag_indexing_jobs" ("workspace_id", "status", "created_at");

CREATE INDEX IF NOT EXISTS "idx_rag_jobs_file"
  ON "rag_indexing_jobs" ("file_id");

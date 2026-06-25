-- Remove workspace member limit (max_members)
-- Workspaces are unlimited; the column is no longer used by application code.
ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "max_members";

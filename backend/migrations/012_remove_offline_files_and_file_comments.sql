-- Remove "offline file" and "file comment" features.
-- Both features were removed from backend and frontend; their tables are no
-- longer referenced by application code. Drop them for already-provisioned databases.
-- Indexes are dropped automatically with the tables.
DROP TABLE IF EXISTS "offline_files" CASCADE;
DROP TABLE IF EXISTS "file_comments" CASCADE;

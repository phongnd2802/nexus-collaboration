-- Migration: Cleanup removed google-drive and google-sheets modules
-- Removes all google-drive and google-sheets related tables
-- Date: 2026-06-10

-- Drop tables in reverse dependency order
-- google_sheets_syncs depends on google_sheets_connections
DROP TABLE IF EXISTS google_sheets_syncs CASCADE;
DROP TABLE IF EXISTS google_sheets_connections CASCADE;
DROP TABLE IF EXISTS google_drive_connections CASCADE;

-- Migration: Cleanup removed dropbox module
-- Removes dropbox_connections table
-- Date: 2026-06-10

DROP TABLE IF EXISTS dropbox_connections CASCADE;

-- Migration: Cleanup removed youtube module
-- Removes all youtube-related tables
-- Date: 2026-06-10

DROP TABLE IF EXISTS youtube_connections CASCADE;

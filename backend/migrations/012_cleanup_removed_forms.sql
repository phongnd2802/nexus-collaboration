-- Migration: Cleanup removed forms module
-- Removes form-related tables (form_templates, form_responses, form_file_uploads, form_share_links, form_notifications, form_analytics)
-- Date: 2026-06-11

DROP TABLE IF EXISTS form_analytics CASCADE;
DROP TABLE IF EXISTS form_notifications CASCADE;
DROP TABLE IF EXISTS form_share_links CASCADE;
DROP TABLE IF EXISTS form_file_uploads CASCADE;
DROP TABLE IF EXISTS form_responses CASCADE;
DROP TABLE IF EXISTS form_templates CASCADE;

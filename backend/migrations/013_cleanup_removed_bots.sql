-- Migration: Cleanup removed bots module
-- Removes bot-related tables
-- Date: 2026-06-11

DROP TABLE IF EXISTS bot_scheduled_jobs CASCADE;
DROP TABLE IF EXISTS bot_user_cooldowns CASCADE;
DROP TABLE IF EXISTS bot_execution_logs CASCADE;
DROP TABLE IF EXISTS bot_installations CASCADE;
DROP TABLE IF EXISTS bot_actions CASCADE;
DROP TABLE IF EXISTS bot_triggers CASCADE;
DROP TABLE IF EXISTS project_bot_assignments CASCADE;
DROP TABLE IF EXISTS event_bot_assignments CASCADE;
DROP TABLE IF EXISTS bots CASCADE;

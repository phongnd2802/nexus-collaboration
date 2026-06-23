-- Migration 009: Add due_time and reminder_settings to tasks table
-- due_time: HH:MM 24h format, used when user selects a specific time for their deadline.
--           When NULL, the system treats 07:00 local time as the effective deadline hour.
-- reminder_settings: per-task reminder config { "enabled": boolean, "intervals": string[] }
--           intervals is a subset of ["3d","1d","12h","3h","1h"].
--           NULL means reminders are disabled (user has not configured them).

ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "due_time" VARCHAR(5) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS "reminder_settings" JSONB DEFAULT NULL;

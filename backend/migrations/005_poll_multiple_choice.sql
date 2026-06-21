-- Migration 005: Add multiple choice support to polls
-- Allow users to vote for multiple options by changing unique constraint
-- from (message_id, poll_id, user_id) → (message_id, poll_id, user_id, option_id)

DROP INDEX IF EXISTS "idx_poll_votes_message_id_poll_id_user_id";

CREATE UNIQUE INDEX IF NOT EXISTS "idx_poll_votes_message_id_poll_id_user_id_option_id"
  ON "poll_votes" ("message_id", "poll_id", "user_id", "option_id");

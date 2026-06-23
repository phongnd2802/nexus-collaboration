-- Remove timezone column from user_settings table
ALTER TABLE "user_settings" DROP COLUMN IF EXISTS "timezone";

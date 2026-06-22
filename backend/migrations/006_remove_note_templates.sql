-- Remove note templates feature

ALTER TABLE "notes" DROP CONSTRAINT IF EXISTS "fk_notes_template_id";

DROP INDEX IF EXISTS "idx_notes_is_template";
DROP INDEX IF EXISTS "idx_notes_template_id";

ALTER TABLE "notes" DROP COLUMN IF EXISTS "template_id";
ALTER TABLE "notes" DROP COLUMN IF EXISTS "is_template";

DROP INDEX IF EXISTS "idx_note_templates_workspace_id";
DROP INDEX IF EXISTS "idx_note_templates_created_by";
DROP INDEX IF EXISTS "idx_note_templates_category";
DROP INDEX IF EXISTS "idx_note_templates_is_public";
DROP INDEX IF EXISTS "idx_note_templates_created_at";

DROP TABLE IF EXISTS "note_templates";

-- Fix missing defaults on ppk/pp id and timestamps
ALTER TABLE ppk ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE ppk ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE ppk ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE pp ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE pp ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE pp ALTER COLUMN updated_at SET DEFAULT now();

-- Backfill existing null rows
UPDATE ppk SET id = gen_random_uuid() WHERE id IS NULL;
UPDATE ppk SET created_at = now() WHERE created_at IS NULL;
UPDATE ppk SET updated_at = now() WHERE updated_at IS NULL;

UPDATE pp SET id = gen_random_uuid() WHERE id IS NULL;
UPDATE pp SET created_at = now() WHERE created_at IS NULL;
UPDATE pp SET updated_at = now() WHERE updated_at IS NULL;

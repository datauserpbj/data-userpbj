-- Migration: make ppk_id and pp_id TEXT in history tables and re-enable triggers
-- Run this in the Supabase SQL Editor.

-- 1. Change ppk_id to TEXT so client queries work without casts
ALTER TABLE IF EXISTS ppk_history
  ALTER COLUMN ppk_id TYPE TEXT;

-- 2. Recreate the PPK history trigger with TEXT cast
CREATE OR REPLACE FUNCTION log_ppk_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.jabatan IS DISTINCT FROM NEW.jabatan OR OLD.satker IS DISTINCT FROM NEW.satker OR OLD.nama_bidang IS DISTINCT FROM NEW.nama_bidang) THEN
    INSERT INTO ppk_history (ppk_id, jabatan, satker, bidang)
    VALUES (NEW.id::TEXT, NEW.jabatan, NEW.satker, NEW.nama_bidang);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ppk_changes_trigger ON ppk;
CREATE TRIGGER ppk_changes_trigger
AFTER UPDATE ON ppk
FOR EACH ROW
EXECUTE FUNCTION log_ppk_changes();

-- 3. RLS policies so the trigger can insert
ALTER TABLE IF EXISTS ppk_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ppk_history_select_all" ON ppk_history;
CREATE POLICY "ppk_history_select_all" ON ppk_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "ppk_history_insert_auth" ON ppk_history;
CREATE POLICY "ppk_history_insert_auth" ON ppk_history FOR INSERT WITH CHECK (true);
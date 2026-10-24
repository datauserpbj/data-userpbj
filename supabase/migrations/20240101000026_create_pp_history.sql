-- Migration: create pp_history table (mirrors ppk_history) and add RLS policies.
-- Run this in the Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS pp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pp_id TEXT,
  jabatan TEXT,
  satker TEXT,
  bidang TEXT,
  changed_at TIMESTAMPTZ DEFAULT now(),
  changed_by UUID
);

CREATE INDEX IF NOT EXISTS idx_pp_history_pp_id ON pp_history(pp_id);

-- RLS
ALTER TABLE IF EXISTS pp_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pp_history_select_all" ON pp_history;
CREATE POLICY "pp_history_select_all" ON pp_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "pp_history_insert_auth" ON pp_history;
CREATE POLICY "pp_history_insert_auth" ON pp_history FOR INSERT WITH CHECK (true);

-- Trigger to log PP changes
CREATE OR REPLACE FUNCTION log_pp_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.jabatan IS DISTINCT FROM NEW.jabatan OR OLD.satker IS DISTINCT FROM NEW.satker OR OLD.nama_bidang IS DISTINCT FROM NEW.nama_bidang) THEN
    INSERT INTO pp_history (pp_id, jabatan, satker, bidang)
    VALUES (NEW.id::TEXT, NEW.jabatan, NEW.satker, NEW.nama_bidang);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pp_changes_trigger ON pp;
CREATE TRIGGER pp_changes_trigger
AFTER UPDATE ON pp
FOR EACH ROW
EXECUTE FUNCTION log_pp_changes();
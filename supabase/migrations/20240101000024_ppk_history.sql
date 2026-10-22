-- Migration: create PPK history table to track changes to jabatan, satker, bidang
CREATE TABLE IF NOT EXISTS ppk_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ppk_id UUID,
  jabatan TEXT,
  satker TEXT,
  bidang TEXT,
  changed_at TIMESTAMPTZ DEFAULT now(),
  changed_by UUID
);

CREATE INDEX IF NOT EXISTS idx_ppk_history_ppk_id ON ppk_history(ppk_id);

-- Trigger to log changes
CREATE OR REPLACE FUNCTION log_ppk_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.jabatan IS DISTINCT FROM NEW.jabatan OR OLD.satker IS DISTINCT FROM NEW.satker OR OLD.nama_bidang IS DISTINCT FROM NEW.nama_bidang) THEN
    INSERT INTO ppk_history (ppk_id, jabatan, satker, bidang)
    VALUES (NEW.id, NEW.jabatan, NEW.satker, NEW.nama_bidang);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ppk_changes_trigger ON ppk;
CREATE TRIGGER ppk_changes_trigger
AFTER UPDATE ON ppk
FOR EACH ROW
EXECUTE FUNCTION log_ppk_changes();

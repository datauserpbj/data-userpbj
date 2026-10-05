CREATE OR REPLACE FUNCTION sync_pp_from_pengajuan()
RETURNS TRIGGER AS $$
DECLARE
  existing_id UUID;
BEGIN
  IF NEW.jabatan ILIKE '%Pejabat Pengadaan%' OR NEW.jabatan ILIKE '%PP%' THEN
    IF NEW.status = 'verified' THEN
      SELECT id INTO existing_id FROM pp WHERE nip = NEW.nip LIMIT 1;

      IF existing_id IS NULL THEN
        INSERT INTO pp (nama_lengkap, nip, jabatan, satker, status_aktif, created_at, updated_at)
        VALUES (NEW.nama_lengkap, NEW.nip, NEW.jabatan, NEW.satker, 'aktif', NOW(), NOW());
      ELSE
        UPDATE pp SET
          nama_lengkap = NEW.nama_lengkap,
          jabatan = NEW.jabatan,
          satker = NEW.satker,
          updated_at = NOW()
        WHERE id = existing_id;
      END IF;
    ELSE
      DELETE FROM pp WHERE nip = NEW.nip;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_pp_from_pengajuan()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.jabatan ILIKE '%Pejabat Pengadaan%' OR OLD.jabatan ILIKE '%PP%' THEN
    DELETE FROM pp WHERE nip = OLD.nip;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_pp_from_pengajuan ON formulir_pengajuan;
DROP TRIGGER IF EXISTS trigger_delete_pp_from_pengajuan ON formulir_pengajuan;

CREATE TRIGGER trigger_sync_pp_from_pengajuan
AFTER INSERT OR UPDATE ON formulir_pengajuan
FOR EACH ROW EXECUTE FUNCTION sync_pp_from_pengajuan();

CREATE TRIGGER trigger_delete_pp_from_pengajuan
AFTER DELETE ON formulir_pengajuan
FOR EACH ROW EXECUTE FUNCTION delete_pp_from_pengajuan();

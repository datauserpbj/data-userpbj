CREATE OR REPLACE FUNCTION sync_ppk_from_pengajuan()
RETURNS TRIGGER AS $$
DECLARE
  existing_id UUID;
BEGIN
  IF NEW.jabatan ILIKE '%PPK%' OR NEW.jabatan ILIKE '%Pejabat Pembuat Komitmen%' THEN
    IF NEW.status = 'verified' THEN
      SELECT id INTO existing_id FROM ppk WHERE nip = NEW.nip LIMIT 1;

      IF existing_id IS NULL THEN
        INSERT INTO ppk (nama_lengkap, nip, jabatan, satker, status_aktif, created_at, updated_at)
        VALUES (NEW.nama_lengkap, NEW.nip, NEW.jabatan, NEW.satker, 'aktif', NOW(), NOW());
      ELSE
        UPDATE ppk SET
          nama_lengkap = NEW.nama_lengkap,
          jabatan = NEW.jabatan,
          satker = NEW.satker,
          updated_at = NOW()
        WHERE id = existing_id;
      END IF;
    ELSE
      DELETE FROM ppk WHERE nip = NEW.nip;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION delete_ppk_from_pengajuan()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.jabatan ILIKE '%PPK%' OR OLD.jabatan ILIKE '%Pejabat Pembuat Komitmen%' THEN
    DELETE FROM ppk WHERE nip = OLD.nip;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_ppk_from_pengajuan ON formulir_pengajuan;
DROP TRIGGER IF EXISTS trigger_delete_ppk_from_pengajuan ON formulir_pengajuan;

CREATE TRIGGER trigger_sync_ppk_from_pengajuan
AFTER INSERT OR UPDATE ON formulir_pengajuan
FOR EACH ROW EXECUTE FUNCTION sync_ppk_from_pengajuan();

CREATE TRIGGER trigger_delete_ppk_from_pengajuan
AFTER DELETE ON formulir_pengajuan
FOR EACH ROW EXECUTE FUNCTION delete_ppk_from_pengajuan();

INSERT INTO ppk (nama_lengkap, nip, jabatan, satker, status_aktif, created_at, updated_at)
SELECT DISTINCT ON (nip)
  nama_lengkap,
  nip,
  jabatan,
  satker,
  'aktif',
  created_at,
  NOW()
FROM formulir_pengajuan fp
WHERE jabatan ILIKE '%PPK%' OR jabatan ILIKE '%Pejabat Pembuat Komitmen%'
  AND status = 'verified'
  AND NOT EXISTS (SELECT 1 FROM ppk WHERE ppk.nip = fp.nip)
ORDER BY nip, created_at DESC;

DELETE FROM ppk
WHERE nip IN (
  SELECT ppk.nip
  FROM ppk
  LEFT JOIN formulir_pengajuan fp ON fp.nip = ppk.nip
  WHERE fp.nip IS NULL
     OR (fp.jabatan NOT ILIKE '%PPK%' AND fp.jabatan NOT ILIKE '%Pejabat Pembuat Komitmen%')
     OR fp.status != 'verified'
);

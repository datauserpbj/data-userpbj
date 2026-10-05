-- 1. Buat fungsi trigger untuk mencegah duplikasi silang antar tabel PP dan PPK
CREATE OR REPLACE FUNCTION prevent_cross_table_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Jika mencoba insert ke tabel PP, cek apakah NIP sudah ada di tabel PPK
  IF TG_TABLE_NAME = 'pp' THEN
    IF EXISTS (SELECT 1 FROM ppk WHERE nip = NEW.nip) THEN
      RAISE EXCEPTION 'NIP % sudah terdaftar di tabel PPK. Data PP tidak dapat ditambahkan.', NEW.nip;
    END IF;
  END IF;

  -- Jika mencoba insert ke tabel PPK, cek apakah NIP sudah ada di tabel PP
  IF TG_TABLE_NAME = 'ppk' THEN
    IF EXISTS (SELECT 1 FROM pp WHERE nip = NEW.nip) THEN
      RAISE EXCEPTION 'NIP % sudah terdaftar di tabel PP. Data PPK tidak dapat ditambahkan.', NEW.nip;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Buat trigger BEFORE INSERT pada tabel PP
DROP TRIGGER IF EXISTS prevent_pp_insert ON pp;
CREATE TRIGGER prevent_pp_insert
  BEFORE INSERT ON pp
  FOR EACH ROW
  EXECUTE FUNCTION prevent_cross_table_insert();

-- 3. Buat trigger BEFORE INSERT pada tabel PPK
DROP TRIGGER IF EXISTS prevent_ppk_insert ON ppk;
CREATE TRIGGER prevent_ppk_insert
  BEFORE INSERT ON ppk
  FOR EACH ROW
  EXECUTE FUNCTION prevent_cross_table_insert();

-- 4. Opsional: Buat trigger BEFORE UPDATE untuk mencegah update yang menyebabkan duplikasi
DROP TRIGGER IF EXISTS prevent_pp_update ON pp;
CREATE TRIGGER prevent_pp_update
  BEFORE UPDATE OF nip ON pp
  FOR EACH ROW
  EXECUTE FUNCTION prevent_cross_table_insert();

DROP TRIGGER IF EXISTS prevent_ppk_update ON ppk;
CREATE TRIGGER prevent_ppk_update
  BEFORE UPDATE OF nip ON ppk
  FOR EACH ROW
  EXECUTE FUNCTION prevent_cross_table_insert();

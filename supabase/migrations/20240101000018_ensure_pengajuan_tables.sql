-- ============================================
-- Pastikan tabel pengajuan (formulir_pengajuan + dokumen)
-- tersedia di project Supabase yang aktif.
--
-- Jalankan script ini di Supabase Dashboard > SQL Editor:
--   https://supabase.com/dashboard/project/azentykpgtqlsgwhstkm/editor
--
-- Script bersifat idempotent (aman dijalankan berkali-kali) dan
-- mengakhiri dengan reload schema PostgREST supaya tabel langsung
-- terbaca oleh aplikasi.
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Tabel utama pengajuan
-- ============================================
CREATE TABLE IF NOT EXISTS formulir_pengajuan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_lengkap TEXT NOT NULL,
  nip TEXT NOT NULL,
  jabatan TEXT,
  satker TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'verified', 'rejected')),
  alasan_ditolak TEXT,
  alasan_revisi TEXT,
  revisi_selesai BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Tabel dokumen (berkas yang diunggah)
-- ============================================
CREATE TABLE IF NOT EXISTS dokumen (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  formulir_id UUID NOT NULL REFERENCES formulir_pengajuan(id) ON DELETE CASCADE,
  jenis_dokumen TEXT NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  bucket TEXT,
  path TEXT,
  size_bytes INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Migration kolom bertahap (aman untuk tabel yang sudah ada)
-- ============================================
ALTER TABLE formulir_pengajuan ADD COLUMN IF NOT EXISTS nama_lengkap TEXT;
ALTER TABLE formulir_pengajuan ADD COLUMN IF NOT EXISTS nip TEXT;
ALTER TABLE formulir_pengajuan ADD COLUMN IF NOT EXISTS jabatan TEXT;
ALTER TABLE formulir_pengajuan ADD COLUMN IF NOT EXISTS satker TEXT;
ALTER TABLE formulir_pengajuan ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE formulir_pengajuan ADD COLUMN IF NOT EXISTS alasan_ditolak TEXT;
ALTER TABLE formulir_pengajuan ADD COLUMN IF NOT EXISTS alasan_revisi TEXT;
ALTER TABLE formulir_pengajuan ADD COLUMN IF NOT EXISTS revisi_selesai BOOLEAN DEFAULT FALSE;
ALTER TABLE formulir_pengajuan ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE formulir_pengajuan ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE dokumen ADD COLUMN IF NOT EXISTS jenis_dokumen TEXT;
ALTER TABLE dokumen ADD COLUMN IF NOT EXISTS filename TEXT;
ALTER TABLE dokumen ADD COLUMN IF NOT EXISTS filepath TEXT;
ALTER TABLE dokumen ADD COLUMN IF NOT EXISTS bucket TEXT;
ALTER TABLE dokumen ADD COLUMN IF NOT EXISTS path TEXT;
ALTER TABLE dokumen ADD COLUMN IF NOT EXISTS size_bytes INTEGER;
ALTER TABLE dokumen ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Pastikan foreign key dokumen -> formulir_pengajuan tersedia
-- (dipakai oleh query embedded `dokumen (*)`).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'dokumen'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) LIKE '%formulir_pengajuan%'
  ) THEN
    ALTER TABLE dokumen
      ADD CONSTRAINT dokumen_formulir_id_fkey
      FOREIGN KEY (formulir_id) REFERENCES formulir_pengajuan(id) ON DELETE CASCADE;
  END IF;
END;
$$;

-- ============================================
-- Index untuk performa query laporan
-- ============================================
CREATE INDEX IF NOT EXISTS idx_formulir_status ON formulir_pengajuan(status);
CREATE INDEX IF NOT EXISTS idx_formulir_nip ON formulir_pengajuan(nip);
CREATE INDEX IF NOT EXISTS idx_formulir_created_at ON formulir_pengajuan(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dokumen_formulir ON dokumen(formulir_id);

-- ============================================
-- Otomatis memperbarui updated_at setiap perubahan data
-- ============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_updated_at_formulir ON formulir_pengajuan;
CREATE TRIGGER trigger_set_updated_at_formulir
BEFORE UPDATE ON formulir_pengajuan
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================
-- Trigger sinkronisasi PPK & PP dari pengajuan terverifikasi
-- ============================================
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

-- Trigger hanya dipasang bila tabel ppk tersedia (aman untuk database baru).
DO $$
BEGIN
  IF to_regclass('public.ppk') IS NOT NULL THEN
    CREATE TRIGGER trigger_sync_ppk_from_pengajuan
    AFTER INSERT OR UPDATE ON formulir_pengajuan
    FOR EACH ROW EXECUTE FUNCTION sync_ppk_from_pengajuan();

    CREATE TRIGGER trigger_delete_ppk_from_pengajuan
    AFTER DELETE ON formulir_pengajuan
    FOR EACH ROW EXECUTE FUNCTION delete_ppk_from_pengajuan();
  END IF;
END;
$$;

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

-- Trigger hanya dipasang bila tabel pp tersedia (aman untuk database baru).
DO $$
BEGIN
  IF to_regclass('public.pp') IS NOT NULL THEN
    CREATE TRIGGER trigger_sync_pp_from_pengajuan
    AFTER INSERT OR UPDATE ON formulir_pengajuan
    FOR EACH ROW EXECUTE FUNCTION sync_pp_from_pengajuan();

    CREATE TRIGGER trigger_delete_pp_from_pengajuan
    AFTER DELETE ON formulir_pengajuan
    FOR EACH ROW EXECUTE FUNCTION delete_pp_from_pengajuan();
  END IF;
END;
$$;

-- ============================================
-- Reload schema PostgREST supaya tabel baru langsung bisa diakses API
-- ============================================
NOTIFY pgrst, 'reload schema';

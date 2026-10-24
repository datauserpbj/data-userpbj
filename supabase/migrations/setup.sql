-- ============================================
-- Supabase Database Setup for Verifikasi Berkas
-- Run this entire script in the Supabase Dashboard SQL Editor:
--   https://supabase.com/dashboard/project/azentykpgtqlsgwhstkm/editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: formulir_pengajuan
-- ============================================
CREATE TABLE IF NOT EXISTS formulir_pengajuan (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_lengkap TEXT NOT NULL,
  nip TEXT NOT NULL,
  jabatan TEXT,
  satker TEXT,
  status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'verified', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Table: dokumen
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
-- Table: admin_data
-- ============================================
CREATE TABLE IF NOT EXISTS admin_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nama_lengkap TEXT NOT NULL,
  role TEXT DEFAULT 'verifikator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Admin accounts
-- ============================================
-- Jalankan migration ini untuk reset akun admin.
-- Password default: admin123 (akan di-hash otomatis oleh aplikasi saat login pertama)

TRUNCATE TABLE admin_data RESTART IDENTITY;

INSERT INTO admin_data (email, password_hash, nama_lengkap, role)
VALUES
  ('kantorpbj1@gmail.com', 'admin123', 'Junaidi', 'verifikator'),
  ('admin@lpse.bungo.go.id', 'admin123', 'Administrator LPSE', 'verifikator');

-- ============================================
-- Table: satker
-- ============================================
CREATE TABLE IF NOT EXISTS satker (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_satker TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Table: ppk
-- ============================================
CREATE TABLE IF NOT EXISTS ppk (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_lengkap TEXT NOT NULL,
  nip TEXT NOT NULL,
  jabatan TEXT,
  satker TEXT,
  status_aktif TEXT DEFAULT 'aktif' CHECK(status_aktif IN ('aktif', 'non-aktif')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Table: pp
-- ============================================
CREATE TABLE IF NOT EXISTS pp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_lengkap TEXT NOT NULL,
  nip TEXT NOT NULL,
  jabatan TEXT,
  satker TEXT,
  status_aktif TEXT DEFAULT 'aktif' CHECK(status_aktif IN ('aktif', 'non-aktif')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Additional columns
-- ============================================
ALTER TABLE formulir_pengajuan ADD COLUMN IF NOT EXISTS alasan_ditolak TEXT;
ALTER TABLE formulir_pengajuan ADD COLUMN IF NOT EXISTS alasan_revisi TEXT;
ALTER TABLE formulir_pengajuan ADD COLUMN IF NOT EXISTS revisi_selesai BOOLEAN DEFAULT FALSE;
ALTER TABLE ppk ADD COLUMN IF NOT EXISTS alasan_penonaktifan TEXT;
ALTER TABLE pp ADD COLUMN IF NOT EXISTS alasan_penonaktifan TEXT;

-- ============================================
-- Table: bidang (linked to satker)
-- ============================================
CREATE TABLE IF NOT EXISTS bidang (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode_satker INTEGER,
  nama_satker TEXT NOT NULL,
  nama_bidang TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (kode_satker, nama_bidang)
);

CREATE INDEX IF NOT EXISTS idx_bidang_satker ON bidang(nama_satker);

-- Seed sample bidang/bagian for every existing satker
INSERT INTO bidang (kode_satker, nama_satker, nama_bidang)
SELECT s kode_satker, s,nama_satker, b,nama_bidang
FROM satker s
CROSS JOIN (VALUES
  ('Bidang Umum'),
  ('Bidang Keuangan'),
  ('Bidang Pengadaan'),
  ('Bidang Perencanaan')
) AS b(nama_bidang)
ON CONFLICT (kode_satker, nama_bidang) DO NOTHING;

-- RLS for bidang
ALTER TABLE bidang ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bidang_select_all" ON bidang;
CREATE POLICY "bidang_select_all" ON bidang
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "bidang_insert_auth" ON bidang;
CREATE POLICY "bidang_insert_auth" ON bidang
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "bidang_update_auth" ON bidang;
CREATE POLICY "bidang_update_auth" ON bidang
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "bidang_delete_auth" ON bidang;
CREATE POLICY "bidang_delete_auth" ON bidang
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- Add nama_bidang column to ppk and pp
-- ============================================
ALTER TABLE ppk ADD COLUMN IF NOT EXISTS nama_bidang TEXT;
ALTER TABLE pp ADD COLUMN IF NOT EXISTS nama_bidang TEXT;

-- Backfill nama_bidang on existing ppk/pp rows based on their satker
UPDATE ppk
SET nama_bidang = (
  SELECT b.nama_bidang
  FROM bidang b
  WHERE b.nama_satker = ppk.satker
  ORDER BY b.nama_bidang
  LIMIT 1
)
WHERE nama_bidang IS NULL;

UPDATE pp
SET nama_bidang = (
  SELECT b,nama_bidang
  FROM bidang b
  WHERE b,nama_satker = pp.satker
  ORDER BY b,nama_bidang
  LIMIT 1
)
WHERE nama_bidang IS NULL;

-- ============================================
-- Fix missing defaults on ppk/pp id and timestamps
-- ============================================
ALTER TABLE ppk ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE ppk ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE ppk ALTER COLUMN updated_at SET DEFAULT now();

ALTER TABLE pp ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE pp ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE pp ALTER COLUMN updated_at SET DEFAULT now();

UPDATE ppk SET id = gen_random_uuid() WHERE id IS NULL;
UPDATE ppk SET created_at = now() WHERE created_at IS NULL;
UPDATE ppk SET updated_at = now() WHERE updated_at IS NULL;

UPDATE pp SET id = gen_random_uuid() WHERE id IS NULL;
UPDATE pp SET created_at = now() WHERE created_at IS NULL;
UPDATE pp SET updated_at = now() WHERE updated_at IS NULL;

-- ============================================
-- Table: ppk_history
-- ============================================
CREATE TABLE IF NOT EXISTS ppk_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ppk_id TEXT,
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

-- ============================================
-- RLS for ppk_history and pp_history
-- ============================================
ALTER TABLE IF EXISTS ppk_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ppk_history_select_all" ON ppk_history;
CREATE POLICY "ppk_history_select_all" ON ppk_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "ppk_history_insert_auth" ON ppk_history;
CREATE POLICY "ppk_history_insert_auth" ON ppk_history FOR INSERT WITH CHECK (true);

ALTER TABLE IF EXISTS pp_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pp_history_select_all" ON pp_history;
CREATE POLICY "pp_history_select_all" ON pp_history FOR SELECT USING (true);
DROP POLICY IF EXISTS "pp_history_insert_auth" ON pp_history;
CREATE POLICY "pp_history_insert_auth" ON pp_history FOR INSERT WITH CHECK (true);

-- ============================================
-- Unique constraints
-- ============================================
ALTER TABLE pp ADD CONSTRAINT IF NOT EXISTS pp_nip_unique UNIQUE (nip);
ALTER TABLE ppk ADD CONSTRAINT IF NOT EXISTS ppk_nip_unique UNIQUE (nip);

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_formulir_status ON formulir_pengajuan(status);
CREATE INDEX IF NOT EXISTS idx_formulir_nip ON formulir_pengajuan(nip);
CREATE INDEX IF NOT EXISTS idx_dokumen_formulir ON dokumen(formulir_id);
CREATE INDEX IF NOT EXISTS idx_admin_data_email ON admin_data(email);
CREATE INDEX IF NOT EXISTS idx_satker_nama ON satker(nama_satker);

-- ============================================
-- Triggers: Sync PPK from pengajuan
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

CREATE TRIGGER trigger_sync_ppk_from_pengajuan
AFTER INSERT OR UPDATE ON formulir_pengajuan
FOR EACH ROW EXECUTE FUNCTION sync_ppk_from_pengajuan();

CREATE TRIGGER trigger_delete_ppk_from_pengajuan
AFTER DELETE ON formulir_pengajuan
FOR EACH ROW EXECUTE FUNCTION delete_ppk_from_pengajuan();

-- ============================================
-- Triggers: Sync PP from pengajuan
-- ============================================
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

-- ============================================
-- Reload schema PostgREST supaya tabel langsung terbaca oleh API
-- ============================================
NOTIFY pgrst, 'reload schema';

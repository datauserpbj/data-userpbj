-- ============================================
-- Supabase Database Setup for Verifikasi Berkas
-- Run this entire script in the Supabase Dashboard SQL Editor:
--   https://supabase.com/dashboard/project/ahxnszpgszbohssthveb/editor
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
-- Table: admin_verifikator
-- ============================================
CREATE TABLE IF NOT EXISTS admin_verifikator (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nama_lengkap TEXT NOT NULL,
  role TEXT DEFAULT 'verifikator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Table: admin_pemohon
-- ============================================
CREATE TABLE IF NOT EXISTS admin_pemohon (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nama_lengkap TEXT NOT NULL,
  satker TEXT,
  role TEXT DEFAULT 'pemohon',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
CREATE INDEX IF NOT EXISTS idx_admin_verifikator_email ON admin_verifikator(email);
CREATE INDEX IF NOT EXISTS idx_admin_pemohon_email ON admin_pemohon(email);
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

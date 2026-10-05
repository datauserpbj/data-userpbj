-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Formulir Pengajuan Table
-- Fields mapped from halaman Formulir Pengajuan
-- - Bagian Data Diri Pemohon:
--     nama_lengkap, nip, jabatan, satker
-- - Status pengajuan: draft | submitted | verified | rejected
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
-- Dokumen Table
-- Fields mapped dari Pusat Unggah Dokumen:
--     surat_permohonan, pakta_integritas, sk_terbaru
-- ============================================
CREATE TABLE IF NOT EXISTS dokumen (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  formulir_id UUID NOT NULL REFERENCES formulir_pengajuan(id) ON DELETE CASCADE,
  jenis_dokumen TEXT NOT NULL,
  filename TEXT NOT NULL,
  filepath TEXT NOT NULL,
  size_bytes INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Verifikator Table
CREATE TABLE IF NOT EXISTS admin_verifikator (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  nama_lengkap TEXT NOT NULL,
  role TEXT DEFAULT 'verifikator',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Pemohon Table
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

-- Row Level Security (RLS) disabled for backend API access.
-- Enable and add policies in Supabase Dashboard when ready.
-- ALTER TABLE formulir_pengajuan ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dokumen ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE admin_verifikator ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE admin_pemohon ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_formulir_status ON formulir_pengajuan(status);
CREATE INDEX IF NOT EXISTS idx_formulir_nip ON formulir_pengajuan(nip);
CREATE INDEX IF NOT EXISTS idx_dokumen_formulir ON dokumen(formulir_id);
CREATE INDEX IF NOT EXISTS idx_admin_verifikator_email ON admin_verifikator(email);
CREATE INDEX IF NOT EXISTS idx_admin_pemohon_email ON admin_pemohon(email);

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

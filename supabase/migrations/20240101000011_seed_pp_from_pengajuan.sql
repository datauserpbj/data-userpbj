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

ALTER TABLE pp ADD COLUMN IF NOT EXISTS alasan_penonaktifan TEXT;

INSERT INTO pp (nama_lengkap, nip, jabatan, satker, status_aktif, created_at, updated_at)
SELECT DISTINCT ON (nip)
  nama_lengkap,
  nip,
  jabatan,
  satker,
  'aktif',
  created_at,
  NOW()
FROM formulir_pengajuan
WHERE jabatan ILIKE '%PP%' OR jabatan ILIKE '%Pejabat Pengadaan%'
ORDER BY nip, created_at DESC
ON CONFLICT DO NOTHING;

-- Migration: create bidang/bagian table linked to satker
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
SELECT s.kode_satker, s.nama_satker, b.nama_bidang
FROM satker s
CROSS JOIN (VALUES
  ('Bidang Umum'),
  ('Bidang Keuangan'),
  ('Bidang Pengadaan'),
  ('Bidang Perencanaan')
) AS b(nama_bidang)
ON CONFLICT (kode_satker, nama_bidang) DO NOTHING;

-- RLS
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

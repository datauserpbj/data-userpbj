CREATE TABLE IF NOT EXISTS satker (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nama_satker TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_satker_nama ON satker(nama_satker);

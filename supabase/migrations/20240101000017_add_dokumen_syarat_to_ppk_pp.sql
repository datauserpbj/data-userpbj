-- ============================================
-- Dokumen Persyaratan PPK & PP
-- Menyimpan daftar dokumen yang sudah lengkap
-- untuk setiap Pejabat Pembuat Komitmen (PPK) dan
-- Pejabat Pengadaan (PP) pada tabel ppk dan pp.
-- Nilai disimpan sebagai daftar key dipisahkan koma:
-- surat_permohonan,sk_ppk,sertifikat_pbj_sk_kpa,pakta_integritas
-- ============================================
ALTER TABLE ppk ADD COLUMN IF NOT EXISTS dokumen_syarat TEXT DEFAULT '';

ALTER TABLE pp ADD COLUMN IF NOT EXISTS dokumen_syarat TEXT DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_ppk_dokumen_syarat ON ppk(dokumen_syarat);

CREATE INDEX IF NOT EXISTS idx_pp_dokumen_syarat ON pp(dokumen_syarat);

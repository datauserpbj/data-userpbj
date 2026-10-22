-- ============================================
-- Pastikan tabel admin_data bisa dibaca oleh aplikasi (RLS)
-- dan sediakan akun login yang diketahui.
--
-- Jalankan di Supabase Dashboard > SQL Editor:
--   https://supabase.com/dashboard/project/azentykpgtqlsgwhstkm/editor
-- ============================================

-- Nonaktifkan RLS agar frontend (anon key) bisa membaca akun verifikator.
-- (Sesuai setup.sql project ini yang menonaktifkan RLS.)
ALTER TABLE admin_data DISABLE ROW LEVEL SECURITY;

-- Hapus semua data lalu masukkan data baru.
TRUNCATE TABLE admin_data RESTART IDENTITY;

INSERT INTO admin_data (email, password_hash, nama_lengkap, role)
VALUES
  ('kantorpbj1@gmail.com', 'admin123', 'Junaidi', 'verifikator'),
  ('admin@lpse.bungo.go.id', 'admin123', 'Administrator LPSE', 'verifikator');

-- Reload schema PostgREST (cache).
NOTIFY pgrst, 'reload schema';

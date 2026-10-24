-- Migration: fix RLS policies on bidang table
-- The app does not establish a real Supabase Auth session (signIn only validates
-- manually and stores to localStorage), so policies requiring
-- `auth.role() = 'authenticated'` silently reject insert/update/delete.
DROP POLICY IF EXISTS "bidang_insert_auth" ON bidang;
CREATE POLICY "bidang_insert_all" ON bidang
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "bidang_update_auth" ON bidang;
CREATE POLICY "bidang_update_all" ON bidang
  FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "bidang_delete_auth" ON bidang;
CREATE POLICY "bidang_delete_all" ON bidang
  FOR DELETE USING (true);

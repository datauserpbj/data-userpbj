-- Migration: add nama_bidang column to ppk and pp
ALTER TABLE ppk ADD COLUMN IF NOT EXISTS nama_bidang TEXT;
ALTER TABLE pp ADD COLUMN IF NOT EXISTS nama_bidang TEXT;

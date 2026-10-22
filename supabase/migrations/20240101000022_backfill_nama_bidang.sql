-- Backfill nama_bidang on existing ppk/pp rows based on their satker
UPDATE ppk
SET nama_bidang = (
  SELECT b.nama_bidang
  FROM bidang b
  WHERE b.nama_satker = ppk.satker
  ORDER BY b.nama_bidang
  LIMIT 1
)
WHERE nama_bidang IS NULL;

UPDATE pp
SET nama_bidang = (
  SELECT b.nama_bidang
  FROM bidang b
  WHERE b.nama_satker = pp.satker
  ORDER BY b.nama_bidang
  LIMIT 1
)
WHERE nama_bidang IS NULL;

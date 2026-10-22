export const DOKUMEN_SYARAT_KEYS = [
  'surat_permohonan',
  'sk_ppk',
  'sertifikat_pbj_sk_kpa',
  'pakta_integritas',
  'surat_rekomendasi',
  'sk_pp',
  'sertifikat_pbj',
]

export function serializeDokumenSyarat(list) {
  if (!list) return ''
  const keys = Array.isArray(list) ? list : String(list).split(',')
  return DOKUMEN_SYARAT_KEYS.filter(key => keys.includes(key)).join(',')
}

export function isMissingDokumenColumn(error) {
  if (!error) return false
  const code = error.code || ''
  const message = (error.message || '').toLowerCase()
  return code === 'PGRST204' || code === '42703' || message.includes('dokumen_syarat')
}

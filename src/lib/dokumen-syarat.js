export const DOKUMEN_SYARAT_PPK = [
  { key: 'surat_permohonan', label: 'Surat Permohonan' },
  { key: 'sk_ppk', label: 'SK PPK' },
  { key: 'sertifikat_pbj_sk_kpa', label: 'Sertifikat PBJ/SK KPA' },
  { key: 'pakta_integritas', label: 'Pakta Integritas' },
]

export const DOKUMEN_SYARAT_PP = [
  { key: 'surat_rekomendasi', label: 'Surat Rekomendasi' },
  { key: 'surat_permohonan', label: 'Surat Permohonan' },
  { key: 'sk_pp', label: 'SK PP' },
  { key: 'sertifikat_pbj', label: 'Sertifikat PBJ' },
  { key: 'pakta_integritas', label: 'Pakta Integritas' },
]

export const DOKUMEN_SYARAT_KEYS = Array.from(
  new Set([...DOKUMEN_SYARAT_PPK, ...DOKUMEN_SYARAT_PP].map(doc => doc.key))
)

export function isJabatanPp(jabatan) {
  const value = String(jabatan || '').trim().toLowerCase()
  if (!value) return false
  if (value.includes('pembuat komitmen')) return false
  if (value.includes('pengadaan')) return true
  return /(^|[^a-z0-9])pp([^a-z0-9]|$)/.test(value)
}

export function getDokumenSyaratList(jabatan, jenis) {
  if (jenis === 'pp') return DOKUMEN_SYARAT_PP
  if (jenis === 'ppk') return DOKUMEN_SYARAT_PPK
  return isJabatanPp(jabatan) ? DOKUMEN_SYARAT_PP : DOKUMEN_SYARAT_PPK
}

export function serializeDokumenSyarat(list) {
  if (!Array.isArray(list)) return ''
  return DOKUMEN_SYARAT_KEYS.filter(key => list.includes(key)).join(',')
}

export function parseDokumenSyarat(value) {
  if (!value) return []
  const list = Array.isArray(value) ? value : String(value).split(',')
  return list
    .map(item => String(item).trim())
    .filter(key => DOKUMEN_SYARAT_KEYS.includes(key))
}

export function getRingkasanDokumen(value, jabatan, jenis) {
  const selected = parseDokumenSyarat(value)
  const list = getDokumenSyaratList(jabatan, jenis)
  return {
    total: list.length,
    lengkap: list.filter(doc => selected.includes(doc.key)).length,
    labels: list.filter(doc => selected.includes(doc.key)).map(doc => doc.label),
  }
}

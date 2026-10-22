import { supabase } from './supabase'
import { serializeDokumenSyarat } from './dokumen-syarat'

function isMissingDokumenColumn(error) {
  if (!error) return false
  const code = error.code || ''
  const message = (error.message || '').toLowerCase()
  return code === 'PGRST204' || code === '42703' || message.includes('dokumen_syarat')
}

async function insertWithDokumen(table, body, dokumenSyarat) {
  const payload = { ...body, dokumen_syarat: serializeDokumenSyarat(dokumenSyarat) }
  const result = await supabase.from(table).insert(payload).select().single()

  if (!result.error) return result

  if (isMissingDokumenColumn(result.error)) {
    console.warn(
      `Kolom dokumen_syarat belum tersedia pada tabel ${table}. Daftar dokumen tidak disimpan sampai migration 20240101000017_add_dokumen_syarat_to_ppk_pp.sql dijalankan.`
    )
    return supabase.from(table).insert(body).select().single()
  }

  return result
}

async function updateWithDokumen(table, id, updatePayload, dokumenSyarat) {
  if (dokumenSyarat === undefined) {
    return supabase.from(table).update(updatePayload).eq('id', id).select().single()
  }

  const payload = { ...updatePayload, dokumen_syarat: serializeDokumenSyarat(dokumenSyarat) }
  const result = await supabase.from(table).update(payload).eq('id', id).select().single()

  if (!result.error) return result

  if (isMissingDokumenColumn(result.error)) {
    console.warn(
      `Kolom dokumen_syarat belum tersedia pada tabel ${table}. Daftar dokumen tidak disimpan sampai migration 20240101000017_add_dokumen_syarat_to_ppk_pp.sql dijalankan.`
    )
    return supabase.from(table).update(updatePayload).eq('id', id).select().single()
  }

  return result
}

export async function getSatkerList() {
  const { data, error } = await supabase
    .from('satker')
    .select('nama_satker')
    .order('nama_satker', { ascending: true })

  if (error) {
    console.error('Error fetching satker:', error)
    throw new Error('Gagal memuat data satuan kerja')
  }

  return (data || []).map((item, index) => ({
    id: String(index + 1),
    nama: item.nama_satker,
  }))
}

export async function getBidangList(satkerNama) {
  if (!satkerNama) return []
  const { data, error } = await supabase
    .from('bidang')
    .select('nama_bidang')
    .eq('nama_satker', satkerNama)
    .order('nama_bidang', { ascending: true })

  if (error) {
    console.error('Error fetching bidang:', error)
    return []
  }

  return (data || []).map((item, index) => ({
    id: String(index + 1),
    nama: item.nama_bidang,
  }))
}

export async function getJabatanList(table) {
  const { data, error } = await supabase
    .from(table)
    .select('jabatan')

  if (error) {
    console.error('Error fetching jabatan:', error)
    return []
  }

  const unique = Array.from(new Set((data || []).map(d => d.jabatan).filter(Boolean)))
  return unique.map((nama, index) => ({ id: String(index + 1), nama }))
}

export async function createPengajuan(payload) {
  const { nama_lengkap, nip, jabatan, satker, dokumen } = payload

  if (!nama_lengkap || !nip) {
    throw new Error('Nama Lengkap dan NIP wajib diisi')
  }

  const { data: formulir, error: formulirError } = await supabase
    .from('formulir_pengajuan')
    .insert({
      nama_lengkap,
      nip,
      jabatan: jabatan || null,
      satker: satker || null,
      status: 'submitted',
    })
    .select()
    .single()

  if (formulirError || !formulir) {
    console.error('Formulir insert error:', formulirError)
    throw formulirError || new Error('Gagal menyimpan formulir')
  }

  if (dokumen && dokumen.length > 0) {
    await upsertDokumen(formulir.id, dokumen)
  }

  return {
    message: 'Pengajuan berhasil dikirim. Silahkan Cek Status Pengajuan secara berkala untuk melihat status verifikasi.',
    pengajuanId: formulir.id,
    pemohonId: formulir.id,
  }
}

export async function updatePengajuan(id, payload) {
  const { nama_lengkap, nip, jabatan, satker, dokumen } = payload

  const { data: existing, error: fetchError } = await supabase
    .from('formulir_pengajuan')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    throw new Error('Formulir tidak ditemukan')
  }

  const updatePayload = {
    nama_lengkap: nama_lengkap || existing.nama_lengkap,
    nip: nip || existing.nip,
    jabatan: jabatan || existing.jabatan,
    satker: satker || existing.satker,
    status: 'submitted',
    alasan_revisi: null,
    alasan_ditolak: null,
    revisi_selesai: true,
    updated_at: new Date().toISOString(),
  }

  const { data: updatedFormulir, error: updateError } = await supabase
    .from('formulir_pengajuan')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (updateError || !updatedFormulir) {
    console.error('Update formulir error:', updateError)
    throw new Error('Gagal memperbarui data formulir')
  }

  if (dokumen && dokumen.length > 0) {
    await upsertDokumen(id, dokumen)
  }

  return {
    message: 'Pengajuan berhasil diperbarui.',
    pengajuanId: id,
    pemohonId: id,
  }
}

export async function updatePengajuanStatus(id, statusPayload) {
  const { status, alasan_ditolak, alasan_revisi } = statusPayload

  if (!['draft', 'submitted', 'verified', 'rejected'].includes(status)) {
    throw new Error('Status tidak valid')
  }

  const { data: existing, error: fetchError } = await supabase
    .from('formulir_pengajuan')
    .select('status, jabatan')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    throw new Error('Pengajuan tidak ditemukan')
  }

  const updatePayload = { status, updated_at: new Date().toISOString() }
  if (status === 'rejected') {
    updatePayload.alasan_ditolak = alasan_ditolak || null
    updatePayload.revisi_selesai = false
  }
  if (status === 'submitted' && alasan_revisi) {
    updatePayload.alasan_revisi = alasan_revisi
    updatePayload.revisi_selesai = false
  }
  if (status === 'verified') {
    updatePayload.revisi_selesai = false
  }
  if (status === 'submitted' && !alasan_revisi) {
    updatePayload.revisi_selesai = false
  }

  const { data, error } = await supabase
    .from('formulir_pengajuan')
    .update(updatePayload)
    .eq('id', id)
    .select()

  if (error) {
    console.error('Supabase update error:', error)
    throw new Error('Gagal memperbarui status di database')
  }

  if (!data || data.length === 0) {
    throw new Error('Pengajuan tidak ditemukan')
  }

  const formulir = data[0]
  return { message: 'Status diperbarui', status, formulir }
}

export async function getPengajuanList() {
  const { data, error } = await supabase
    .from('formulir_pengajuan')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching formulir_pengajuan:', error)
    throw new Error(buildPengajuanQueryError(error))
  }

  const list = data || []
  if (list.length === 0) return list

  const formulirIds = list.map((item) => item.id).filter(Boolean)

  let dokumenByFormulir = new Map()
  if (formulirIds.length > 0) {
    const { data: dokumenData, error: dokumenError } = await supabase
      .from('dokumen')
      .select('*')
      .in('formulir_id', formulirIds)

    if (dokumenError) {
      console.warn('Gagal memuat dokumen terkait pengajuan:', dokumenError)
    } else {
      dokumenByFormulir = groupDokumenByFormulir(dokumenData || [])
    }
  }

  return list.map((item) => ({
    ...item,
    dokumen: dokumenByFormulir.get(item.id) || [],
  }))
}

function groupDokumenByFormulir(dokumenList) {
  return dokumenList.reduce((map, doc) => {
    const key = doc.formulir_id
    if (!key) return map
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(doc)
    return map
  }, new Map())
}

function buildPengajuanQueryError(error) {
  const code = error?.code || ''
  const message = error?.message || ''

  if (code === 'PGRST205' || code === '42P01') {
    return 'Tabel pengajuan belum tersedia di database. Jalankan migration setup pengajuan pada Supabase SQL Editor.'
  }
  if (code === 'PGRST202') {
    return 'Relasi tabel pengajuan belum lengkap di database. Periksa kembali foreign key tabel dokumen.'
  }
  if (code === '42501' || code === 'PGRST301') {
    return 'Akses ke data pengajuan ditolak. Periksa kebijakan RLS dan kunci API yang digunakan.'
  }
  return message || 'Gagal memuat data pengajuan dari database.'
}

export async function getPengajuanDetail(id) {
  const { data: formulir, error: formulirError } = await supabase
    .from('formulir_pengajuan')
    .select('*')
    .eq('id', id)
    .single()

  if (formulirError || !formulir) {
    throw new Error('Formulir tidak ditemukan')
  }

  let dokumen = []
  try {
    const { data: dokumenData, error: dokumenError } = await supabase
      .from('dokumen')
      .select('*')
      .eq('formulir_id', id)

    if (!dokumenError && dokumenData) {
      dokumen = dokumenData
    }
  } catch (e) {
    console.error('Failed to fetch dokumen:', e)
  }

  return { formulir, dokumen }
}

const bucketByJenis = {
  surat_permohonan: 'Surat Permohonan',
  pakta_integritas: 'Pakta Integritas',
  sk_terbaru: 'SK Terbaru',
  surat_rekomendasi_ukpbj: 'Surat Rekomendasi UKPBJ',
  sertifikat_level1: 'Sertifikat Level 1',
  sk_kpa_sertifikat_pbj: 'SK KPA atau Sertifikat PBJ Level-1',
}

function sanitizeFilenamePart(str) {
  return String(str || '')
    .replace(/[^a-zA-Z0-9 \-_.]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'tanpa-nama'
}

function buildStorageFilename(namaLengkap, jabatan, satker, jenisDokumen) {
  const nama = sanitizeFilenamePart(namaLengkap)
  const jab = sanitizeFilenamePart(jabatan)
  const sat = sanitizeFilenamePart(satker)
  const jenis = sanitizeFilenamePart(jenisDokumen)
  return `${jenis} - ${nama} - ${jab} - ${sat}.pdf`
}

async function upsertDokumen(formulirId, dokumenList) {
  const dokumenTypes = ['surat_permohonan', 'pakta_integritas', 'sk_terbaru', 'surat_rekomendasi_ukpbj', 'sertifikat_level1', 'sk_kpa_sertifikat_pbj']
  const incomingTypes = new Set((dokumenList || []).map(d => d.jenis_dokumen))

  const { error: deleteError } = await supabase
    .from('dokumen')
    .delete()
    .eq('formulir_id', formulirId)
    .in('jenis_dokumen', Array.from(incomingTypes))

  if (deleteError) {
    console.error('Delete old dokumen error:', deleteError)
  }

  for (const doc of dokumenList || []) {
    if (!dokumenTypes.includes(doc.jenis_dokumen)) continue

    const bucket = bucketByJenis[doc.jenis_dokumen]
    const storagePath = doc.path
    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
    let publicUrl = publicUrlData?.publicUrl

    if (!publicUrl) {
      const supabaseUrl = supabase.supabaseUrl || ''
      publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${storagePath}`
    }

    if (!publicUrl) {
      throw new Error(`Gagal mendapatkan URL publik untuk ${doc.jenis_dokumen}`)
    }

    const { error: dokumenError } = await supabase
      .from('dokumen')
      .insert({
        formulir_id: formulirId,
        jenis_dokumen: doc.jenis_dokumen,
        filename: doc.filename || storagePath.split('/').pop(),
        filepath: publicUrl,
        bucket,
        path: storagePath,
        size_bytes: doc.size_bytes || null,
      })

    if (dokumenError) {
      console.error('Database error:', dokumenError)
      throw new Error(`Gagal menyimpan data ${doc.jenis_dokumen}: ${dokumenError.message}`)
    }
  }
}

export async function getPpkList() {
  const { data, error } = await supabase
    .from('ppk')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

export async function createPpk(payload) {
  const { nama_lengkap, nip, jabatan, satker, bidang, status_aktif, dokumen_syarat } = payload

  if (!nama_lengkap || !nip) {
    throw new Error('Nama Lengkap dan NIP wajib diisi')
  }

  const body = {
    nama_lengkap,
    nip,
    jabatan: jabatan || null,
    satker: satker || null,
    nama_bidang: Array.isArray(bidang) ? (bidang.length ? bidang.join(', ') : null) : (bidang || null),
    status_aktif: status_aktif || 'aktif',
  }

  const { data, error } = await insertWithDokumen('ppk', body, dokumen_syarat || [])

  if (error || !data) {
    console.error('Insert ppk error:', error)
    throw new Error('Gagal menyimpan data PPK')
  }

  return data
}

export async function updatePpk(id, payload) {
  const { nama_lengkap, nip, jabatan, satker, bidang, status_aktif, alasan_penonaktifan, dokumen_syarat } = payload

  const { data: existing, error: fetchError } = await supabase
    .from('ppk')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    console.error('Fetch existing error:', fetchError)
    throw new Error('Data PPK tidak ditemukan')
  }

  const updatePayload = {
    nama_lengkap: nama_lengkap || existing.nama_lengkap,
    nip: nip || existing.nip,
    jabatan: jabatan ?? existing.jabatan,
    satker: satker ?? existing.satker,
    nama_bidang: bidang ?? existing.nama_bidang,
    status_aktif: status_aktif || existing.status_aktif,
    updated_at: new Date().toISOString(),
  }

  if (status_aktif === 'non-aktif') {
    updatePayload.alasan_penonaktifan = alasan_penonaktifan || null
  }

  const { data, error } = await updateWithDokumen('ppk', id, updatePayload, dokumen_syarat)

  if (error) {
    console.error('Update ppk error:', error)
    throw new Error('Gagal memperbarui data PPK: ' + error.message)
  }

  if (!data) {
    console.error('Update ppk empty data')
    throw new Error('Gagal memperbarui data PPK: data kosong')
  }

  return data
}

export async function mutatePpk(id, payload) {
  const { satker, bidang, status_aktif, catatan } = payload

  const { data: existing, error: fetchError } = await supabase
    .from('ppk')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    throw new Error('Data PPK tidak ditemukan')
  }

  const updatePayload = {
    updated_at: new Date().toISOString(),
  }

  if (satker !== undefined) {
    updatePayload.satker = satker
  }
  if (bidang !== undefined) {
    updatePayload.nama_bidang = bidang
  }
  if (status_aktif !== undefined) {
    updatePayload.status_aktif = status_aktif
  }

  const { data, error } = await supabase
    .from('ppk')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    console.error('Mutasi ppk error:', error)
    throw new Error('Gagal melakukan mutasi PPK')
  }

  return { message: 'Mutasi berhasil', ppk: data }
}

export async function syncPpkFromPengajuan() {
  const { data: pengajuanList, error: pengajuanError } = await supabase
    .from('formulir_pengajuan')
    .select('nama_lengkap, nip, jabatan, satker, created_at')
    .eq('status', 'verified')
    .order('created_at', { ascending: false })

  if (pengajuanError) {
    throw pengajuanError
  }

  const ppkCandidates = (pengajuanList || []).filter((item) => {
    const jabatan = (item.jabatan || '').toLowerCase()
    return jabatan.includes('ppk') || jabatan.includes('pejabat pembuat komitmen')
  })

  const map = new Map()
  for (const item of ppkCandidates) {
    const key = item.nip
    if (!map.has(key)) {
      map.set(key, item)
    }
  }

  let inserted = 0
  for (const item of map.values()) {
    const { data: existing } = await supabase
      .from('ppk')
      .select('id, status_aktif, alasan_penonaktifan')
      .eq('nip', item.nip)
      .maybeSingle()

    const { data: existingPp } = await supabase
      .from('pp')
      .select('id')
      .eq('nip', item.nip)
      .maybeSingle()

    if (existingPp) {
      continue
    }

    const basePayload = {
      nama_lengkap: item.nama_lengkap,
      nip: item.nip,
      jabatan: item.jabatan,
      satker: item.satker,
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from('ppk')
        .update(basePayload)
        .eq('id', existing.id)

      if (updateError) {
        console.error('Sync update error:', updateError)
      } else {
        inserted++
      }
    } else {
      const { error: insertError } = await supabase
        .from('ppk')
        .insert(basePayload)

      if (insertError) {
        console.error('Sync insert error:', insertError)
      } else {
        inserted++
      }
    }
  }

  return { message: `Sinkronisasi selesai`, inserted }
}

export async function getPpList() {
  const { data, error } = await supabase
    .from('pp')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

export async function createPp(payload) {
  const { nama_lengkap, nip, jabatan, satker, bidang, status_aktif, dokumen_syarat } = payload

  if (!nama_lengkap || !nip) {
    throw new Error('Nama Lengkap dan NIP wajib diisi')
  }

  const body = {
    nama_lengkap,
    nip,
    jabatan: jabatan || null,
    satker: satker || null,
    nama_bidang: Array.isArray(bidang) ? (bidang.length ? bidang.join(', ') : null) : (bidang || null),
    status_aktif: status_aktif || 'aktif',
  }

  const { data, error } = await insertWithDokumen('pp', body, dokumen_syarat || [])
  if (error || !data) {
    console.error('Insert pp error:', error)
    throw new Error('Gagal menyimpan data PP')
  }

  return data
}

export async function updatePp(id, payload) {
  const { nama_lengkap, nip, jabatan, satker, bidang, status_aktif, alasan_penonaktifan, dokumen_syarat } = payload

  const { data: existing, error: fetchError } = await supabase
    .from('pp')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    throw new Error('Data PP tidak ditemukan')
  }

  const updatePayload = {
    nama_lengkap: nama_lengkap || existing.nama_lengkap,
    nip: nip || existing.nip,
    jabatan: jabatan ?? existing.jabatan,
    satker: satker ?? existing.satker,
    nama_bidang: bidang ?? existing.nama_bidang,
    status_aktif: status_aktif || existing.status_aktif,
    updated_at: new Date().toISOString(),
  }

  if (status_aktif === 'non-aktif') {
    updatePayload.alasan_penonaktifan = alasan_penonaktifan || null
  } else {
    updatePayload.alasan_penonaktifan = null
  }

  const { data, error } = await updateWithDokumen('pp', id, updatePayload, dokumen_syarat)

  if (error || !data) {
    console.error('Update pp error:', error)
    throw new Error('Gagal memperbarui data PP')
  }

  return data
}

export async function mutatePp(id, payload) {
  const { satker, status_aktif, catatan } = payload

  const { data: existing, error: fetchError } = await supabase
    .from('pp')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !existing) {
    throw new Error('Data PP tidak ditemukan')
  }

  const updatePayload = {
    updated_at: new Date().toISOString(),
  }

  if (satker !== undefined) {
    updatePayload.satker = satker
  }
  if (status_aktif !== undefined) {
    updatePayload.status_aktif = status_aktif
  }

  const { data, error } = await supabase
    .from('pp')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    console.error('Mutasi pp error:', error)
    throw new Error('Gagal melakukan mutasi PP')
  }

  return { message: 'Mutasi berhasil', pp: data }
}

export async function syncPpFromPengajuan() {
  const { data: pengajuanList, error: pengajuanError } = await supabase
    .from('formulir_pengajuan')
    .select('nama_lengkap, nip, jabatan, satker, created_at')
    .eq('status', 'verified')

  if (pengajuanError) {
    throw pengajuanError
  }

  const ppCandidates = (pengajuanList || []).filter((item) => {
    const jabatan = (item.jabatan || '').toLowerCase()
    const isPengadaan = jabatan.includes('pejabat pengadaan')
    const isPpk = jabatan.includes('ppk') || jabatan.includes('pembuat komitmen')
    return isPengadaan && !isPpk
  })

  const map = new Map()
  for (const item of ppCandidates) {
    const key = item.nip
    if (!map.has(key)) {
      map.set(key, item)
    }
  }

  let inserted = 0
  for (const item of map.values()) {
    const { data: existingPp } = await supabase
      .from('pp')
      .select('id, status_aktif, alasan_penonaktifan')
      .eq('nip', item.nip)
      .maybeSingle()

    const { data: existingPpk } = await supabase
      .from('ppk')
      .select('id')
      .eq('nip', item.nip)
      .maybeSingle()

    if (existingPpk) {
      continue
    }

    const basePayload = {
      nama_lengkap: item.nama_lengkap,
      nip: item.nip,
      jabatan: item.jabatan,
      satker: item.satker,
      updated_at: new Date().toISOString(),
    }

    if (existingPp) {
      const { error: updateError } = await supabase
        .from('pp')
        .update(basePayload)
        .eq('id', existingPp.id)

      if (updateError) {
        console.error('Sync update error:', updateError)
      } else {
        inserted++
      }
    } else {
      const { error: insertError } = await supabase
        .from('pp')
        .insert(basePayload)

      if (insertError) {
        console.error('Sync insert error:', insertError)
      } else {
        inserted++
      }
    }
  }

  return { message: `Sinkronisasi selesai`, inserted }
}

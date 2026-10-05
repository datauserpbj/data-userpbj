import { supabase } from './supabase'

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
    .select(`
      *,
      dokumen (*)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
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
    const publicUrl = publicUrlData?.publicUrl

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
  const { nama_lengkap, nip, jabatan, satker, status_aktif } = payload

  if (!nama_lengkap || !nip) {
    throw new Error('Nama Lengkap dan NIP wajib diisi')
  }

  const { data, error } = await supabase
    .from('ppk')
    .insert({
      nama_lengkap,
      nip,
      jabatan: jabatan || null,
      satker: satker || null,
      status_aktif: status_aktif || 'aktif',
    })
    .select()
    .single()

  if (error || !data) {
    console.error('Insert ppk error:', error)
    throw new Error('Gagal menyimpan data PPK')
  }

  return data
}

export async function updatePpk(id, payload) {
  const { nama_lengkap, nip, jabatan, satker, status_aktif, alasan_penonaktifan } = payload

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
    status_aktif: status_aktif || existing.status_aktif,
    updated_at: new Date().toISOString(),
  }

  if (status_aktif === 'non-aktif') {
    updatePayload.alasan_penonaktifan = alasan_penonaktifan || null
  }

  const { data, error } = await supabase
    .from('ppk')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

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
  const { satker, status_aktif, catatan } = payload

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
  const { nama_lengkap, nip, jabatan, satker, status_aktif } = payload

  if (!nama_lengkap || !nip) {
    throw new Error('Nama Lengkap dan NIP wajib diisi')
  }

  const { data, error } = await supabase
    .from('pp')
    .insert({
      nama_lengkap,
      nip,
      jabatan: jabatan || null,
      satker: satker || null,
      status_aktif: status_aktif || 'aktif',
    })
    .select()
    .single()

  if (error || !data) {
    console.error('Insert pp error:', error)
    throw new Error('Gagal menyimpan data PP')
  }

  return data
}

export async function updatePp(id, payload) {
  const { nama_lengkap, nip, jabatan, satker, status_aktif, alasan_penonaktifan } = payload

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
    status_aktif: status_aktif || existing.status_aktif,
    updated_at: new Date().toISOString(),
  }

  if (status_aktif === 'non-aktif') {
    updatePayload.alasan_penonaktifan = alasan_penonaktifan || null
  } else {
    updatePayload.alasan_penonaktifan = null
  }

  const { data, error } = await supabase
    .from('pp')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single()

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

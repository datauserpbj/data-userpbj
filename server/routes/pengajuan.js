import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import multer from 'multer'
import path from 'path'

const router = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Only PDF files are allowed'), false)
    }
  },
})

const FILE_LIMITS = {
  surat_permohonan: 5 * 1024 * 1024,
  pakta_integritas: 2 * 1024 * 1024,
  sk_terbaru: 10 * 1024 * 1024,
  surat_rekomendasi_ukpbj: 2 * 1024 * 1024,
  sertifikat_level1: 2 * 1024 * 1024,
  sk_kpa_sertifikat_pbj: 5 * 1024 * 1024,
}

const FILE_LABELS = {
  surat_permohonan: 'Surat Permohonan Verifikasi',
  pakta_integritas: 'Pakta Integritas',
  sk_terbaru: 'SK PP/PPK/PA Terbaru',
  surat_rekomendasi_ukpbj: 'Surat Rekomendasi UKPBJ',
  sertifikat_level1: 'Sertifikat PBJ Level-1',
  sk_kpa_sertifikat_pbj: 'SK KPA / Sertifikat PBJ Level-1',
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

router.post('/pengajuan', upload.fields([
  { name: 'surat_permohonan', maxCount: 1 },
  { name: 'pakta_integritas', maxCount: 1 },
  { name: 'sk_terbaru', maxCount: 1 },
  { name: 'surat_rekomendasi_ukpbj', maxCount: 1 },
  { name: 'sertifikat_level1', maxCount: 1 },
  { name: 'sk_kpa_sertifikat_pbj', maxCount: 1 },
]), async (req, res) => {
  try {
    console.log('Received pengajuan request')
    console.log('Body fields:', { nama_lengkap: req.body.nama_lengkap, nip: req.body.nip, jabatan: req.body.jabatan, satker: req.body.satker })
    console.log('Files received:', Object.keys(req.files || {}))

    const { nama_lengkap, nip, jabatan, satker } = req.body

    if (!nama_lengkap || !nip) {
      return res.status(400).json({ error: 'Nama Lengkap dan NIP wajib diisi' })
    }

    const { data: formulir, error: formulirError } = await supabase
      .from('formulir_pengajuan')
      .insert({
        nama_lengkap,
        nip,
        jabatan: jabatan || null,
        satker: satker || null,
        status: 'submitted'
      })
      .select()
      .single()

    if (formulirError || !formulir) {
      console.error('Formulir insert error:', formulirError)
      throw formulirError || new Error('Gagal menyimpan formulir')
    }

    const formulirId = formulir.id

    const dokumenTypes = ['surat_permohonan', 'pakta_integritas', 'sk_terbaru', 'surat_rekomendasi_ukpbj', 'sertifikat_level1', 'sk_kpa_sertifikat_pbj']
    for (const jenis of dokumenTypes) {
      const file = req.files?.[jenis]?.[0]
      if (!file) continue

      console.log(`Processing ${jenis}:`, file.size, 'bytes')

      const limit = FILE_LIMITS[jenis]
      if (limit && file.size > limit) {
        return res.status(400).json({
          error: `Ukuran file ${FILE_LABELS[jenis] || jenis} melebihi batas maksimal ${Math.round(limit / 1024 / 1024)}MB`
        })
      }

      const bucket = bucketByJenis[jenis]
      const filename = buildStorageFilename(nama_lengkap, jabatan, satker, jenis)
      const storagePath = `${formulirId}/${filename}`

      console.log(`Uploading ${jenis} to bucket ${bucket}, path ${storagePath}`)

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return res.status(500).json({ error: `Gagal mengupload ${FILE_LABELS[jenis] || jenis}: ${uploadError.message}` })
      }

      console.log(`Upload success: ${jenis}`)

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath)

      const { error: dokumenError } = await supabase
        .from('dokumen')
        .insert({
          formulir_id: formulirId,
          jenis_dokumen: jenis,
          filename,
          filepath: publicUrlData.publicUrl,
          bucket,
          path: storagePath,
          size_bytes: file.size
        })

      if (dokumenError) {
        console.error('Database error:', dokumenError)
        return res.status(500).json({ error: `Gagal menyimpan data ${FILE_LABELS[jenis] || jenis}: ${dokumenError.message}` })
      }

      console.log(`Database insert success: ${jenis}`)
    }

    res.status(201).json({
      message: 'Pengajuan berhasil dikirim. Silahkan Cek Status Pengajuan secara berkala untuk melihat status verifikasi.',
      pengajuanId: formulirId,
      pemohonId: formulirId,
    })
  } catch (error) {
    console.error('Error submitting pengajuan:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ error: 'Gagal menyimpan pengajuan: ' + (error.message || 'Unknown error') })
  }
})

router.get('/pengajuan', async (req, res) => {
  try {
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

    res.json(data || [])
  } catch (error) {
    console.error('Error fetching pengajuan:', error)
    res.status(500).json({ error: 'Gagal mengambil data' })
  }
})

router.get('/pengajuan/export/xlsx', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('formulir_pengajuan')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Rekap Pengajuan')

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Nama Lengkap', key: 'nama_lengkap', width: 25 },
      { header: 'NIP', key: 'nip', width: 20 },
      { header: 'Jabatan', key: 'jabatan', width: 25 },
      { header: 'Satuan Kerja', key: 'satker', width: 25 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Tanggal Pengajuan', key: 'created_at', width: 22 },
      { header: 'Tanggal Selesai', key: 'updated_at', width: 22 },
      { header: 'Waktu Proses (Hari)', key: 'process_days', width: 20 },
      { header: 'Alasan Penolakan', key: 'alasan_ditolak', width: 35 },
      { header: 'Alasan Revisi', key: 'alasan_revisi', width: 35 },
    ]

    worksheet.getRow(1).font = { bold: true }
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }

    const rows = (data || []).map(item => {
      const created = item.created_at || ''
      const updated = item.updated_at || ''
      const processDays = created && updated ? Math.floor((new Date(updated) - new Date(created)) / (1000 * 60 * 60 * 24)) : ''
      return {
        id: item.id,
        nama_lengkap: item.nama_lengkap,
        nip: item.nip,
        jabatan: item.jabatan || '',
        satker: item.satker || '',
        status: item.status,
        created_at: created,
        updated_at: updated,
        process_days: processDays,
        alasan_ditolak: item.alasan_ditolak || '',
        alasan_revisi: item.alasan_revisi || '',
      }
    })

    rows.forEach(row => worksheet.addRow(row))

    const buffer = await workbook.xlsx.writeBuffer()

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="rekap-pengajuan-${new Date().toISOString().slice(0, 10)}.xlsx"`)
    res.send(Buffer.from(buffer))
  } catch (error) {
    console.error('Error exporting pengajuan:', error)
    res.status(500).json({ error: 'Gagal mengekspor data' })
  }
})

router.get('/pengajuan/:id', async (req, res) => {
  try {
    const { id } = req.params

    const { data: formulir, error: formulirError } = await supabase
      .from('formulir_pengajuan')
      .select('*')
      .eq('id', id)
      .single()

    if (formulirError || !formulir) {
      return res.status(404).json({ error: 'Formulir tidak ditemukan' })
    }

    const { data: dokumen, error: dokumenError } = await supabase
      .from('dokumen')
      .select('*')
      .eq('formulir_id', id)

    if (dokumenError) {
      throw dokumenError
    }

    res.json({ formulir, dokumen: dokumen || [] })
  } catch (error) {
    console.error('Error fetching detail:', error)
    res.status(500).json({ error: 'Gagal mengambil detail' })
  }
})

router.put('/pengajuan/:id', upload.fields([
  { name: 'surat_permohonan', maxCount: 1 },
  { name: 'pakta_integritas', maxCount: 1 },
  { name: 'sk_terbaru', maxCount: 1 },
  { name: 'surat_rekomendasi_ukpbj', maxCount: 1 },
  { name: 'sertifikat_level1', maxCount: 1 },
  { name: 'sk_kpa_sertifikat_pbj', maxCount: 1 },
]), async (req, res) => {
  try {
    const { id } = req.params
    const { nama_lengkap, nip, jabatan, satker } = req.body

    const { data: existing, error: fetchError } = await supabase
      .from('formulir_pengajuan')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Formulir tidak ditemukan' })
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
      return res.status(500).json({ error: 'Gagal memperbarui data formulir' })
    }

    const dokumenTypes = ['surat_permohonan', 'pakta_integritas', 'sk_terbaru', 'surat_rekomendasi_ukpbj', 'sertifikat_level1', 'sk_kpa_sertifikat_pbj']
    for (const jenis of dokumenTypes) {
      const file = req.files?.[jenis]?.[0]
      if (!file) continue

      const limit = FILE_LIMITS[jenis]
      if (limit && file.size > limit) {
        return res.status(400).json({
          error: `Ukuran file ${FILE_LABELS[jenis] || jenis} melebihi batas maksimal ${Math.round(limit / 1024 / 1024)}MB`
        })
      }

      const bucket = bucketByJenis[jenis]
      const filename = buildStorageFilename(updatePayload.nama_lengkap, updatePayload.jabatan, updatePayload.satker, jenis)
      const storagePath = `${id}/${filename}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return res.status(500).json({ error: `Gagal mengupload ${FILE_LABELS[jenis] || jenis}` })
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(storagePath)

      const { error: deleteOld } = await supabase
        .from('dokumen')
        .delete()
        .eq('formulir_id', id)
        .eq('jenis_dokumen', jenis)

      if (deleteOld) {
        console.error('Delete old document error:', deleteOld)
      }

      const { error: dokumenError } = await supabase
        .from('dokumen')
        .insert({
          formulir_id: id,
          jenis_dokumen: jenis,
          filename,
          filepath: publicUrlData.publicUrl,
          bucket,
          path: storagePath,
          size_bytes: file.size
        })

      if (dokumenError) {
        console.error('Database error:', dokumenError)
        return res.status(500).json({ error: `Gagal menyimpan data ${FILE_LABELS[jenis] || jenis}` })
      }
    }

    res.status(200).json({
      message: 'Pengajuan berhasil diperbarui.',
      pengajuanId: id,
      pemohonId: id,
    })
  } catch (error) {
    console.error('Error updating pengajuan:', error)
    res.status(500).json({ error: 'Gagal memperbarui pengajuan' })
  }
})

router.put('/pengajuan/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status, alasan_ditolak, alasan_revisi } = req.body

    console.log('=== Status Update Request ===')
    console.log('ID:', id)
    console.log('Status:', status)
    console.log('Alasan Ditolak:', alasan_ditolak)
    console.log('Alasan Revisi:', alasan_revisi)
    console.log('Body:', req.body)

    if (!['draft', 'submitted', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status tidak valid' })
    }

    const { data: existing, error: fetchError } = await supabase
      .from('formulir_pengajuan')
      .select('status, jabatan')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Pengajuan tidak ditemukan' })
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

    console.log('Update status result:', { data, error })

    if (error) {
      console.error('Supabase update error:', error)
      return res.status(500).json({ error: 'Gagal memperbarui status di database' })
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Pengajuan tidak ditemukan' })
    }

    const formulir = data[0]

    res.json({ message: 'Status diperbarui', status, formulir })
  } catch (error) {
    console.error('Error updating status:', error)
    res.status(500).json({ error: 'Gagal memperbarui status' })
  }
})

router.get('/satker', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('satker')
      .select('nama_satker')
      .order('nama_satker', { ascending: true })

    if (error) {
      console.error('Error fetching satker:', error)
      return res.status(500).json({ error: 'Gagal memuat data satuan kerja' })
    }

    const mapped = (data || []).map((item, index) => ({
      id: String(index + 1),
      nama: item.nama_satker,
    }))

    res.json(mapped)
  } catch (error) {
    console.error('Error fetching satker:', error)
    res.status(500).json({ error: 'Gagal memuat data satuan kerja' })
  }
})

export default router

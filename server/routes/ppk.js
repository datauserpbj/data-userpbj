import { Router } from 'express'
import { supabase } from '../lib/supabase.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('ppk')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    res.json(data || [])
  } catch (error) {
    console.error('Error fetching ppk:', error)
    res.status(500).json({ error: 'Gagal mengambil data PPK' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { nama_lengkap, nip, jabatan, satker, status_aktif } = req.body

    if (!nama_lengkap || !nip) {
      return res.status(400).json({ error: 'Nama Lengkap dan NIP wajib diisi' })
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
      return res.status(500).json({ error: 'Gagal menyimpan data PPK' })
    }

    res.status(201).json(data)
  } catch (error) {
    console.error('Error creating ppk:', error)
    res.status(500).json({ error: 'Gagal menyimpan data PPK' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { nama_lengkap, nip, jabatan, satker, status_aktif, alasan_penonaktifan } = req.body

    const { data: existing, error: fetchError } = await supabase
      .from('ppk')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      console.error('Fetch existing error:', fetchError)
      return res.status(404).json({ error: 'Data PPK tidak ditemukan' })
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
      return res.status(500).json({ error: 'Gagal memperbarui data PPK: ' + error.message })
    }

    if (!data) {
      console.error('Update ppk empty data')
      return res.status(500).json({ error: 'Gagal memperbarui data PPK: data kosong' })
    }

    res.json(data)
  } catch (error) {
    console.error('Error updating ppk:', error)
    res.status(500).json({ error: 'Gagal memperbarui data PPK' })
  }
})

router.post('/:id/mutasi', async (req, res) => {
  try {
    const { id } = req.params
    const { satker, status_aktif, catatan } = req.body

    const { data: existing, error: fetchError } = await supabase
      .from('ppk')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return res.status(404).json({ error: 'Data PPK tidak ditemukan' })
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
      return res.status(500).json({ error: 'Gagal melakukan mutasi PPK' })
    }

    res.json({ message: 'Mutasi berhasil', ppk: data })
  } catch (error) {
    console.error('Error mutating ppk:', error)
    res.status(500).json({ error: 'Gagal melakukan mutasi PPK' })
  }
})

router.post('/sync', async (req, res) => {
  try {
    const { data: pengajuanList, error: pengajuanError } = await supabase
      .from('formulir_pengajuan')
      .select('nama_lengkap, nip, jabatan, satker, created_at')
      .eq('status', 'verified')

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

    res.json({ message: `Sinkronisasi selesai`, inserted })
  } catch (error) {
    console.error('Error syncing ppk:', error)
    res.status(500).json({ error: 'Gagal sinkronisasi data PPK' })
  }
})

export default router

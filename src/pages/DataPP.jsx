import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  getSatkerList,
  getBidangList,
  getJabatanList,
  getPpList,
  createPp,
  updatePp,
  mutatePp,
  syncPpFromPengajuan,
} from '../lib/supabase-helpers'
import DokumenSyaratField, { DokumenSyaratBadges } from '../components/DokumenSyaratField'
import { parseDokumenSyarat } from '../lib/dokumen-syarat'
import Toast from '../components/Toast'

export default function DataPP() {
  const [ppList, setPpList] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [mutasiOpen, setMutasiOpen] = React.useState(false)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [selectedPp, setSelectedPp] = React.useState(null)
  const [selectedDetail, setSelectedDetail] = React.useState(null)
  const [form, setForm] = React.useState({ nama_lengkap: '', nip: '', jabatan: '', satker: '', bidang: [], status_aktif: 'aktif', dokumen: [] })
  const [mutasiForm, setMutasiForm] = React.useState({ satker: '', status_aktif: 'aktif', catatan: '' })
  const [alasanPenonaktifan, setAlasanPenonaktifan] = React.useState('')
  const [satkerList, setSatkerList] = React.useState([])
  const [jabatanList, setJabatanList] = React.useState([])
  const [bidangList, setBidangList] = React.useState([])
  const [loadingSatker, setLoadingSatker] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [openMenuId, setOpenMenuId] = React.useState(null)
  const [syncing, setSyncing] = React.useState(false)
  const [toast, setToast] = React.useState({ open: false, message: '', type: 'success' })
  const [historyOpen, setHistoryOpen] = React.useState(false)
  const [historyData, setHistoryData] = React.useState([])
  const [historyLoading, setHistoryLoading] = React.useState(false)
  const ITEMS_PER_PAGE = 5
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getPpList()
      setPpList(data || [])
    } catch (err) {
      console.error('Failed to load PP data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncPpFromPengajuan()
      setToast({ open: true, message: 'Sinkronisasi PP selesai', type: 'success' })
      loadData()
    } catch (err) {
      setToast({ open: true, message: err.message || 'Gagal sinkronisasi data PP', type: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/loginverifikator')
      return
    }
    loadData()
  }, [user, authLoading, navigate])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  const openAdd = () => {
    setSelectedPp(null)
    setForm({ nama_lengkap: '', nip: '', jabatan: '', satker: '', status_aktif: 'aktif', dokumen: [] })
    setModalOpen(true)
  }

  const openEdit = async (pp) => {
    setSelectedPp(pp)
    setForm({
      nama_lengkap: pp.nama_lengkap || '',
      nip: pp.nip || '',
      jabatan: pp.jabatan || '',
      satker: pp.satker || '',
      bidang: pp.nama_bidang ? pp.nama_bidang.split(',').map((s) => s.trim()).filter(Boolean) : [],
      status_aktif: pp.status_aktif || 'aktif',
      dokumen: parseDokumenSyarat(pp.dokumen_syarat),
    })
    setAlasanPenonaktifan('')
    setModalOpen(true)
    if (pp.satker) {
      try {
        const data = await getBidangList(pp.satker)
        setBidangList(data || [])
      } catch (e) { setBidangList([]) }
    } else {
      setBidangList([])
    }
    try {
      const data = await getSatkerList()
      setSatkerList(data || [])
    } catch (e) {}
  }

  const openMutasi = async (pp) => {
    setSelectedPp(pp)
    setMutasiForm({
      satker: pp.satker || '',
      status_aktif: pp.status_aktif || 'aktif',
      catatan: '',
    })
    setMutasiOpen(true)
    setLoadingSatker(true)
      try {
        const data = await getSatkerList()
        setSatkerList(data || [])
        const jData = await getJabatanList('pp')
        setJabatanList(jData || [])
      } catch (err) {
      console.error('Failed to load satker:', err)
    } finally {
      setLoadingSatker(false)
    }
  }

  const openDetail = (pp) => {
    setSelectedDetail(pp)
    setDetailOpen(true)
  }

  const openHistory = async (pp) => {
    setOpenMenuId(null)
    setHistoryLoading(true)
    setHistoryOpen(true)
    try {
      const { data, error } = await supabase.from('pp_history').select('*').eq('pp_id::text', String(pp.id)).order('changed_at', { ascending: false })
      if (!error && data && data.length > 0) {
        setHistoryData(data)
      } else {
        setHistoryData([{ changed_at: pp.updated_at, jabatan: pp.jabatan, satker: pp.satker, bidang: pp.nilai_bidang || pp.bidang, catatan: pp.catatan_mutasi || 'Data PP tercatat' }])
      }
    } catch (e) {
      setHistoryData([{ changed_at: pp.updated_at, jabatan: pp.jabatan, satker: pp.satker, bidang: pp.nilai_bidang || pp.bidang, catatan: pp.catatan_mutasi || 'Data PP tercatat' }])
    } finally {
      setHistoryLoading(false)
    }
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedPp(null)
    setForm({ nama_lengkap: '', nip: '', jabatan: '', satker: '', status_aktif: 'aktif', dokumen: [] })
  }

  const closeMutasi = () => {
    setMutasiOpen(false)
    setSelectedPp(null)
    setMutasiForm({ satker: '', status_aktif: 'aktif', catatan: '' })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nama_lengkap || !form.nip) return

    const payload = { ...form, dokumen_syarat: form.dokumen }
    if (form.status_aktif === 'non-aktif') {
      payload.alasan_penonaktifan = alasanPenonaktifan
    }

    try {
      if (selectedPp) {
        await updatePp(selectedPp.id, payload)
      } else {
        await createPp(payload)
      }
      closeModal()
      loadData()
      setToast({ open: true, message: 'Data PP berhasil disimpan', type: 'success' })
    } catch (err) {
      setToast({ open: true, message: err.message || 'Gagal menyimpan data', type: 'error' })
    }
  }

  const handleMutasi = async (e) => {
    e.preventDefault()
    if (!selectedPp) return

    try {
      await mutatePp(selectedPp.id, mutasiForm)
      closeMutasi()
      loadData()
      setToast({ open: true, message: 'Mutasi berhasil dilakukan', type: 'success' })
    } catch (err) {
      setToast({ open: true, message: err.message || 'Gagal melakukan mutasi', type: 'error' })
    }
  }

  const getStatusBadge = (status) => {
    if (status === 'aktif') {
      return 'bg-green-50 text-green-700 border border-green-200'
    }
    return 'bg-red-50 text-red-700 border border-red-200'
  }

  const filteredPpList = React.useMemo(() => {
    let result = ppList
    if (statusFilter !== 'all') {
      result = result.filter(item => item.status_aktif === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(item => {
        return (
          (item.nama_lengkap || '').toLowerCase().includes(q) ||
          (item.nip || '').toLowerCase().includes(q) ||
          (item.jabatan || '').toLowerCase().includes(q) ||
          (item.satker || '').toLowerCase().includes(q)
        )
      })
    }
    return result
  }, [ppList, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredPpList.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE
  const paginatedItems = filteredPpList.slice(startIdx, startIdx + ITEMS_PER_PAGE)

  return (
    <div className="w-full max-w-[1280px] pb-16 md:pb-0">
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, open: false })} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-xs">Kelola Data PP</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Kelola data Pejabat Pengadaan (PP) dan catat mutasi pergantian instansi atau status non-aktif.
          </p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm mb-16">
        <div className="p-3 md:p-md border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-sm">
          <div>
            <h3 className="text-headline-sm font-headline-sm text-primary">Daftar PP</h3>
            <p className="text-body-sm text-on-surface-variant">Daftar Pejabat Pengadaan yang terdaftar dalam sistem.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-sm">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center justify-center gap-xs px-md py-sm bg-primary text-white rounded-lg text-label-sm font-medium hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-sm">{syncing ? 'progress_activity' : 'sync'}</span>
              {syncing ? 'Menyinkronkan...' : 'Sinkronisasi'}
            </button>
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NIP, jabatan..."
                className="w-full pl-9 pr-md py-sm bg-surface border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-outline-variant rounded-md pl-sm pr-lg py-xs text-label-sm text-on-surface-variant focus:ring-primary focus:border-primary cursor-pointer w-full sm:w-auto"
              >
                <option value="all">Semua Status</option>
                <option value="aktif">Aktif</option>
                <option value="non-aktif">Non-Aktif</option>
              </select>
              <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-sm">expand_more</span>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low text-label-md text-primary font-bold uppercase tracking-wider sticky top-0">
              <tr>
                <th className="px-2 md:px-md py-sm border-b border-outline-variant">Nama PP</th>
                <th className="px-2 md:px-md py-sm border-b border-outline-variant hidden lg:table-cell">NIP</th>
                <th className="px-2 md:px-md py-sm border-b border-outline-variant hidden md:table-cell">Jabatan</th>
                <th className="px-2 md:px-md py-sm border-b border-outline-variant hidden sm:table-cell">Satuan Kerja</th>
                <th className="px-2 md:px-md py-sm border-b border-outline-variant text-left">Status</th>
                <th className="px-2 md:px-md py-sm border-b border-outline-variant">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-body-sm text-on-surface divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-2 md:px-md py-sm text-center text-on-surface-variant">
                    Memuat data...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 md:px-md py-sm text-center text-on-surface-variant">
                    {searchQuery ? 'Tidak ada hasil pencarian.' : 'Belum ada data PP.'}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-2 md:px-md py-sm">
                      <p className="font-bold">{item.nama_lengkap}</p>
                    </td>
                    <td className="px-2 md:px-md py-sm hidden lg:table-cell">{item.nip}</td>
                    <td className="px-2 md:px-md py-sm hidden md:table-cell">{item.jabatan || '-'}</td>
                    <td className="px-2 md:px-md py-sm hidden sm:table-cell">{item.satker || '-'}</td>
                    <td className="px-2 md:px-md py-sm text-left align-middle">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center gap-xs px-sm py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(item.status_aktif)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.status_aktif === 'aktif' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          {item.status_aktif === 'aktif' ? 'Aktif' : 'Non-Aktif'}
                        </span>
                      </div>
                    </td>
<td className="px-2 md:px-md py-sm flex items-center justify-center">
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === item.id ? null : item.id)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-surface-container-low transition-all text-on-surface-variant"
                          title="Aksi"
                        >
                          <span className="material-symbols-outlined text-sm">more_vert</span>
                        </button>
                        {openMenuId === item.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-surface border border-outline-variant rounded-lg shadow-lg z-30 overflow-hidden">
                            {item.status_aktif === 'aktif' ? (
                              <>
                                <button
                                  onClick={() => { openEdit(item); setOpenMenuId(null) }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">edit</span>
                                  Edit
                                </button>
                                <button
                                  onClick={() => openHistory(item)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">history</span>
                                  Riwayat
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => { openDetail(item); setOpenMenuId(null) }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">visibility</span>
                                  Detail
                                </button>
                                <button
                                  onClick={() => openHistory(item)}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">history</span>
                                  Riwayat
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={closeModal}>
          <div className="w-full md:w-[520px] max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">edit</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-800">{selectedPp ? 'Edit Data PP' : 'Tambah PP'}</h3>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined text-slate-500 text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-xs">
                <label className="text-label-sm text-on-surface-variant">Nama Lengkap</label>
                <input
                  type="text"
                  value={form.nama_lengkap}
                  onChange={(e) => setForm({ ...form, nama_lengkap: e.target.value })}
                  className="w-full px-md py-sm bg-white border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                  disabled={false}
                />
              </div>
              <div className="space-y-xs">
                <label className="text-label-sm text-on-surface-variant">NIP</label>
                <input
                  type="text"
                  value={form.nip}
                  onChange={(e) => setForm({ ...form, nip: e.target.value })}
                  className="w-full px-md py-sm bg-white border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                  disabled={false}
                />
              </div>
              <div className="space-y-xs">
                <label className="text-label-sm text-on-surface-variant">Jabatan</label>
                <select
                  value={form.jabatan}
                  onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                  className="w-full px-md py-sm bg-white border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  {jabatanList.length > 0 ? (
                    jabatanList.map((item) => (
                      <option key={item.id} value={item.nama}>
                        {item.nama}
                      </option>
                    ))
                   ) : (
                     <>
                       <option value="Pejabat Pengadaan (PP)">Pejabat Pengadaan (PP)</option>
                       <option value="Pejabat Pembuat Komitmen (PPK)">Pejabat Pembuat Komitmen (PPK)</option>
                     </>
                   )}
                </select>
              </div>
              <div className="space-y-xs">
                <label className="text-label-sm text-on-surface-variant">Satuan Kerja</label>
                <select
                  value={form.satker}
                  onChange={async (e) => {
                    const v = e.target.value
                    setForm({ ...form, satker: v, bidang: [] })
                    if (v) {
                      try {
                        const data = await getBidangList(v)
                        setBidangList(data || [])
                      } catch (err) { setBidangList([]) }
                    } else {
                      setBidangList([])
                    }
                  }}
                  className="w-full px-md py-sm bg-white border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Pilih Satuan Kerja</option>
                  {satkerList.map((item) => (
                    <option key={item.id} value={item.nama}>
                      {item.nama}
                    </option>
                  ))}
                </select>
              </div>
                {!(form.satker || '').toLowerCase().includes('kecamatan') && !(form.satker || '').toLowerCase().includes('upt puskesmas') && (
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                    {bidangList.map((item) => (
                      <label key={item.id} className="flex items-center gap-2.5 cursor-pointer group">
                        <input type="checkbox" checked={Array.isArray(form.bidang) && form.bidang.includes(item.nama)} onChange={(e) => { const checked = e.target.checked; setForm((prev) => ({ ...prev, bidang: checked ? [...(prev.bidang || []), item.nama] : (prev.bidang || []).filter((b) => b !== item.nama) })) }} className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary/30" />
                        <span className="text-sm text-slate-700 group-hover:text-slate-900">{item.nama}</span>
                      </label>
                    ))}
                     {bidangList.length === 0 && (<p className="text-sm text-slate-500">Pilih Satuan Kerja terlebih dahulu</p>)}
                  </div>
                 )}
                <div className="space-y-xs">
                <label className="text-label-sm text-on-surface-variant">Status Aktif</label>
                <select
                  value={form.status_aktif}
                  onChange={(e) => setForm({ ...form, status_aktif: e.target.value })}
                  className="w-full px-md py-sm bg-white border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="aktif">Aktif</option>
                  <option value="non-aktif">Non-Aktif</option>
                </select>
              </div>
              {form.status_aktif === 'non-aktif' && (
                <div className="space-y-xs">
                  <label className="text-label-sm text-on-surface-variant">Alasan Penonaktifan</label>
                  <textarea
                    value={alasanPenonaktifan}
                    onChange={(e) => setAlasanPenonaktifan(e.target.value)}
                    rows={3}
                    className="w-full px-md py-sm bg-white border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                    placeholder="Masukkan alasan penonaktifan..."
                  />
                </div>
              )}

              {form.status_aktif !== 'non-aktif' && (
                <DokumenSyaratField
                  value={form.dokumen}
                  onChange={(dokumen) => setForm({ ...form, dokumen })}
                  jenis="pp"
                />
              )}
              <div className="flex flex-col md:flex-row items-center justify-end gap-sm">
                <button type="button" onClick={closeModal} className="w-full md:w-auto px-md py-xs rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors">
                  Batal
                </button>
                <button type="submit" className="w-full md:w-auto px-md py-xs rounded-lg bg-primary text-on-primary font-bold hover:bg-primary-container transition-colors">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mutasi Modal */}
      {mutasiOpen && selectedPp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-0" onClick={closeMutasi}>
          <div className="w-full md:w-[500px] max-h-[90vh] flex flex-col bg-surface-container-lowest rounded-lg shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 md:p-md border-b border-outline-variant">
              <div>
                <h3 className="text-headline-sm font-headline-sm text-primary">Mutasi PP</h3>
                <p className="text-body-sm text-on-surface-variant">{selectedPp.nama_lengkap}</p>
              </div>
              <button onClick={closeMutasi} className="p-xs hover:bg-surface-container-low rounded-lg transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
             <form onSubmit={handleMutasi} className="p-3 md:p-md space-y-md">
              <div className="space-y-xs">
                <label className="text-label-sm text-on-surface-variant">Satuan Kerja Baru</label>
                <select
                  value={mutasiForm.satker}
                  onChange={(e) => setMutasiForm({ ...mutasiForm, satker: e.target.value })}
                  className="w-full px-md py-sm bg-white border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  disabled={loadingSatker}
                >
                  <option value="">Pilih Satuan Kerja</option>
                  {satkerList.map((item) => (
                    <option key={item.id} value={item.nama}>
                      {item.nama}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-xs">
                <label className="text-label-sm text-on-surface-variant">Status Aktif</label>
                <select
                  value={mutasiForm.status_aktif}
                  onChange={(e) => setMutasiForm({ ...mutasiForm, status_aktif: e.target.value })}
                  className="w-full px-md py-sm bg-white border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="aktif">Aktif</option>
                  <option value="non-aktif">Non-Aktif</option>
                </select>
              </div>
              <div className="space-y-xs">
                <label className="text-label-sm text-on-surface-variant">Catatan Mutasi</label>
                <textarea
                  value={mutasiForm.catatan}
                  onChange={(e) => setMutasiForm({ ...mutasiForm, catatan: e.target.value })}
                  rows={3}
                  className="w-full px-md py-sm bg-white border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                  placeholder="Contoh: Mutasi ke Dinas Kesehatan..."
                />
              </div>
              <div className="flex flex-col md:flex-row items-center justify-end gap-sm">
                <button type="button" onClick={closeMutasi} className="w-full md:w-auto px-md py-xs rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors">
                  Batal
                </button>
                <button type="submit" className="w-full md:w-auto px-md py-xs rounded-lg bg-primary text-on-primary font-bold hover:bg-primary-container transition-colors">
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailOpen && selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-0" onClick={() => setDetailOpen(false)}>
          <div className="w-full md:w-[520px] max-h-[90vh] flex flex-col bg-surface-container-lowest rounded-lg shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 md:p-md border-b border-outline-variant">
              <h3 className="text-headline-sm font-headline-sm text-primary">Detail Data PP</h3>
              <button onClick={() => setDetailOpen(false)} className="p-xs hover:bg-surface-container-low rounded-lg transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="p-3 md:p-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-secondary">
                    {selectedDetail.nama_lengkap ? selectedDetail.nama_lengkap.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
                  </span>
                </div>
                <div>
                  <p className="font-body-md text-body-md text-on-surface font-bold">{selectedDetail.nama_lengkap}</p>
                  <p className="text-label-sm text-on-surface-variant">NIP: {selectedDetail.nip}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-label-xs text-on-surface-variant mb-1">Jabatan</p>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium">{selectedDetail.jabatan || '-'}</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-label-xs text-on-surface-variant mb-1">Satuan Kerja</p>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium">{selectedDetail.satker || '-'}</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-label-xs text-on-surface-variant mb-1">Status Aktif</p>
                  <span className={`inline-flex items-center gap-xs px-sm py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(selectedDetail.status_aktif)}`}>
                    {selectedDetail.status_aktif === 'aktif' ? 'Aktif' : 'Non-Aktif'}
                  </span>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-label-xs text-on-surface-variant mb-1">Dibuat</p>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium">{selectedDetail.created_at ? new Date(selectedDetail.created_at).toLocaleString('id-ID') : '-'}</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3 md:col-span-2">
                  <p className="text-label-xs text-on-surface-variant mb-1">Diperbarui</p>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium">{selectedDetail.updated_at ? new Date(selectedDetail.updated_at).toLocaleString('id-ID') : '-'}</p>
                </div>
              </div>

              <DokumenSyaratBadges value={selectedDetail.dokumen_syarat} jenis="pp" />

              {selectedDetail.status_aktif === 'non-aktif' && selectedDetail.alasan_penonaktifan && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-label-xs text-red-700 mb-1 font-semibold">Alasan Penonaktifan</p>
                  <p className="font-body-sm text-body-sm text-red-800">{selectedDetail.alasan_penonaktifan}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Riwayat Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={() => setHistoryOpen(false)}>
          <div className="w-full md:w-[520px] max-h-[90vh] flex flex-col bg-surface-container-lowest rounded-2xl shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-low/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">history</span>
                </div>
                <h3 className="text-lg font-semibold text-on-surface">Riwayat Perubahan PP</h3>
              </div>
              <button onClick={() => setHistoryOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant text-[20px]">close</span>
              </button>
            </div>
            <div className="p-4 md:p-5 space-y-3 overflow-y-auto">
              {historyLoading ? (
                <p className="text-body-sm text-on-surface-variant text-center py-6">Memuat riwayat...</p>
              ) : historyData.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant text-center py-6">Belum ada riwayat perubahan.</p>
              ) : (
                historyData.map((h, i) => (
                  <div key={i} className="border border-outline-variant rounded-lg p-3 bg-surface-container-lowest">
                    <p className="text-[11px] text-on-surface-variant mb-1">
                      {h.changed_at ? new Date(h.changed_at).toLocaleString('id-ID') : '-'}
                    </p>
                    <div className="grid grid-cols-1 gap-1.5 text-body-sm">
                      <p><span className="text-on-surface-variant">Jabatan:</span> <span className="text-on-surface font-medium">{h.jabatan || '-'}</span></p>
                      <p><span className="text-on-surface-variant">Satuan Kerja:</span> <span className="text-on-surface font-medium">{h.satker || '-'}</span></p>
                      <p><span className="text-on-surface-variant">Bidang/Bagian:</span> <span className="text-on-surface font-medium">{h.bidang || '-'}</span></p>
                      {h.catatan && <p className="text-on-surface-variant"><span>Catatan:</span> {h.catatan}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  getSatkerList,
  getBidangList,
  getJabatanList,
  getPpkList,
  createPpk,
  updatePpk,
  mutatePpk,
  syncPpkFromPengajuan,
} from '../lib/supabase-helpers'
import DokumenSyaratField, { DokumenSyaratBadges } from '../components/DokumenSyaratField'
import { parseDokumenSyarat } from '../lib/dokumen-syarat'
import Toast from '../components/Toast'

export default function DataPPK() {
  const [ppkList, setPpkList] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [mutasiOpen, setMutasiOpen] = React.useState(false)
  const [selectedPpk, setSelectedPpk] = React.useState(null)
  const [selectedDetail, setSelectedDetail] = React.useState(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const [form, setForm] = React.useState({ nama_lengkap: '', nip: '', jabatan: '', satker: '', bidang: [], status_aktif: 'aktif', dokumen: [] })
  const [mutasiForm, setMutasiForm] = React.useState({ satker: '', bidang: '', status_aktif: 'aktif', catatan: '' })
  const [alasanPenonaktifan, setAlasanPenonaktifan] = React.useState('')
  const [satkerList, setSatkerList] = React.useState([])
  const [bidangList, setBidangList] = React.useState([])
  const [ppkHistory, setPpkHistory] = React.useState([])
  const [jabatanList, setJabatanList] = React.useState([])
  const [loadingSatker, setLoadingSatker] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [currentPage, setCurrentPage] = React.useState(1)
  const [openMenuId, setOpenMenuId] = React.useState(null)
  const [syncing, setSyncing] = React.useState(false)
  const [toast, setToast] = React.useState({ open: false, message: '', type: 'success' })
  const ITEMS_PER_PAGE = 5
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

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

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getPpkList()
      setPpkList(data || [])
    } catch (err) {
      console.error('Failed to load PPK data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await syncPpkFromPengajuan()
      setToast({ open: true, message: 'Sinkronisasi PPK selesai', type: 'success' })
      loadData()
    } catch (err) {
      setToast({ open: true, message: err.message || 'Gagal sinkronisasi data PPK', type: 'error' })
    } finally {
      setSyncing(false)
    }
  }

  const openAdd = () => {
    setSelectedPpk(null)
    setForm({ nama_lengkap: '', nip: '', jabatan: '', satker: '', status_aktif: 'aktif', dokumen: [] })
    setModalOpen(true)
  }

  const openEdit = async (ppk) => {
    setSelectedPpk(ppk)
    setForm({
      nama_lengkap: ppk.nama_lengkap || '',
      nip: ppk.nip || '',
      jabatan: ppk.jabatan || '',
      satker: ppk.satker || '',
      bidang: ppk.nama_bidang ? ppk.nama_bidang.split(',').map((s) => s.trim()).filter(Boolean) : [],
      status_aktif: ppk.status_aktif || 'aktif',
      dokumen: parseDokumenSyarat(ppk.dokumen_syarat),
    })
    setAlasanPenonaktifan('')
    setModalOpen(true)
    if (ppk.satker) {
      try {
        const data = await getBidangList(ppk.satker)
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

  const openMutasi = async (ppk) => {
    setSelectedPpk(ppk)
    setMutasiForm({
      satker: ppk.satker || '',
      bidang: ppk.nama_bidang || '',
      status_aktif: ppk.status_aktif || 'aktif',
      catatan: '',
    })
    if (ppk.satker) {
      try {
        const data = await getBidangList(ppk.satker)
        setBidangList(data || [])
      } catch (e) { setBidangList([]) }
    } else {
      setBidangList([])
    }
    setMutasiOpen(true)
    setLoadingSatker(true)
      try {
        const data = await getSatkerList()
        setSatkerList(data || [])
        const jData = await getJabatanList('ppk')
        setJabatanList(jData || [])
      } catch (err) {
      console.error('Failed to load satker:', err)
    } finally {
      setLoadingSatker(false)
    }
  }

  const openDetail = (ppk) => {
    setSelectedDetail(ppk)
    setDetailOpen(true)
    setPpkHistory([])
    ;(async () => {
      try {
        const { data } = await supabase.from('ppk_history').select('*').eq('ppk_id', ppk.id).order('changed_at', { ascending: false })
        setPpkHistory(data || [])
      } catch (e) { setPpkHistory([]) }
    })()
  }

  const closeModal = () => {
    setModalOpen(false)
    setSelectedPpk(null)
    setForm({ nama_lengkap: '', nip: '', jabatan: '', satker: '', status_aktif: 'aktif', dokumen: [] })
  }

  const closeMutasi = () => {
    setMutasiOpen(false)
    setSelectedPpk(null)
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
      if (selectedPpk) {
        await updatePpk(selectedPpk.id, payload)
      } else {
        await createPpk(payload)
      }
      closeModal()
      loadData()
      setToast({ open: true, message: 'Data PPK berhasil disimpan', type: 'success' })
    } catch (err) {
      setToast({ open: true, message: err.message || 'Gagal menyimpan data', type: 'error' })
    }
  }

const handleMutasi = async (e) => {
    e.preventDefault()
    if (!selectedPpk) return

    try {
      await mutatePpk(selectedPpk.id, mutasiForm)
      closeMutasi()
      loadData()
      setToast({ open: true, message: 'Mutasi melakukan', type: 'success' })
    } catch (err) {
      setToast({ open: true, message: err.message || 'Gagal melakukan mutasi', type: 'error' })
    }
  }

  const handleNonaktifkan = async (ppk) => {
    if (!window.confirm(`Yakin ingin menonaktifkan PPK: ${ppk.nama_lengkap}?`)) return
    try {
      await updatePpk(ppk.id, { status_aktif: 'non-aktif', alasan_penonaktifan: alasanPenonaktifan || 'Dinonaktifkan oleh administrator' })
      loadData()
      setToast({ open: true, message: 'PPK telah dinonaktifkan', type: 'success' })
    } catch (err) {
setToast({ open: true, message: err.message || 'Gagal menonaktifkan PPK', type: 'error' })
    }
  }

  const getStatusBadge = (status) => {
    if (status === 'aktif') {
      return 'bg-green-50 text-green-700 border border-green-200'
    }
    return 'bg-red-50 text-red-700 border border-red-200'
  }

  const filteredPpkList = React.useMemo(() => {
    let result = ppkList
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
  }, [ppkList, searchQuery, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredPpkList.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE
  const paginatedItems = filteredPpkList.slice(startIdx, startIdx + ITEMS_PER_PAGE)

  return (
    <div className="w-full max-w-[1280px] pb-16 md:pb-0">
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, open: false })} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-xs">Kelola Data PPK</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Kelola data Pejabat Pembuat Komitmen (PPK) dan catat mutasi pergantian instansi atau status non-aktif.
          </p>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm mb-16">
        <div className="p-3 md:p-md border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-sm">
          <div>
            <h3 className="text-headline-sm font-headline-sm text-primary">Daftar PPK</h3>
            <p className="text-body-sm text-on-surface-variant">Daftar Pejabat Pembuat Komitmen yang terdaftar dalam sistem.</p>
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
                <th className="px-2 md:px-md py-sm border-b border-outline-variant">Nama PPK</th>
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
                    {searchQuery || statusFilter !== 'all' ? 'Tidak ada hasil pencarian.' : 'Belum ada data PPK.'}
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
                          onClick={() => (item.status_aktif === 'aktif' ? openEdit(item) : openDetail(item))}
                          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-surface-container-low transition-all"
                          title="Update"
                        >
                          <span className="material-symbols-outlined text-sm">update</span>
                        </button>
{openMenuId === item.id && (
                            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 w-36 bg-surface border border-outline-variant rounded-lg shadow-lg z-30 overflow-hidden">
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
                                    onClick={() => { handleNonaktifkan(item); setOpenMenuId(null) }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-sm">block</span>
                                    Non-aktifkan
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => { openDetail(item); setOpenMenuId(null) }}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-body-sm text-on-surface hover:bg-surface-container-low transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">visibility</span>
                                  Detail
                                </button>
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
        {filteredPpkList.length > ITEMS_PER_PAGE && (
          <div className="p-md bg-surface-container-low border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0">
            <p className="text-label-xs md:text-label-sm text-on-surface-variant text-center md:text-left">Menampilkan {paginatedItems.length} dari {filteredPpkList.length} data PPK</p>
            <div className="flex items-center gap-1 md:gap-base">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant bg-white text-on-surface-variant disabled:opacity-50 hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded text-label-sm font-bold ${
                    page === safePage
                      ? 'bg-primary text-on-primary'
                      : 'border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container transition-colors'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={closeModal}>
          <div className="w-full md:w-[520px] max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">edit</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-800">{selectedPpk ? 'Edit Data PPK' : 'Tambah PPK'}</h3>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined text-slate-500 text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-3 md:p-md space-y-md">
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
                      <option value="Pejabat Pembuat Komitmen (PPK)">Pejabat Pembuat Komitmen (PPK)</option>
                      <option value="Pejabat Pengadaan (PP)">Pejabat Pengadaan (PP)</option>
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
                  jenis="ppk"
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
      {mutasiOpen && selectedPpk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-0" onClick={closeMutasi}>
          <div className="w-full md:w-[500px] max-h-[90vh] flex flex-col bg-surface-container-lowest rounded-lg shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 md:p-md border-b border-outline-variant">
              <div>
                <h3 className="text-headline-sm font-headline-sm text-primary">Mutasi PPK</h3>
                <p className="text-body-sm text-on-surface-variant">{selectedPpk.nama_lengkap}</p>
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
                    onChange={async (e) => {
                      const v = e.target.value
                      setMutasiForm({ ...mutasiForm, satker: v, bidang: '' })
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
                <label className="text-label-sm text-on-surface-variant">Bidang/Bagian</label>
                <select
                  value={mutasiForm.bidang}
                  onChange={(e) => setMutasiForm({ ...mutasiForm, bidang: e.target.value })}
                  className="w-full px-md py-sm bg-white border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="">Pilih Bidang/Bagian</option>
                  {bidangList.map((item) => (
                    <option key={item.id} value={item.nama}>
                      {item.nama}
                    </option>
                  ))}
                </select>
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
              <h3 className="text-headline-sm font-headline-sm text-primary">Detail Data PPK</h3>
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
                  <p className="text-label-sm text-on-surface-variant">Bidang/Bagian: {selectedDetail.nama_bidang || '-'}</p>
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
                   <p className="text-label-xs text-on-surface-variant mb-1">Bidang/Bagian</p>
                   <p className="font-body-sm text-body-sm text-on-surface font-medium">{selectedDetail.nama_bidang || '-'}</p>
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

               <div className="mt-3">
                 <p className="text-label-xs text-on-surface-variant mb-1">Riwayat Perubahan</p>
                 {ppkHistory.length === 0 ? (
                   <p className="text-body-sm text-on-surface-variant">Belum ada riwayat.</p>
                 ) : (
                   <ul className="space-y-2">
                     {ppkHistory.map((h) => (
                       <li key={h.id} className="bg-surface-container-low rounded-lg p-3 text-body-sm">
                         <p className="text-[11px] text-on-surface-variant">{new Date(h.changed_at).toLocaleString('id-ID')}</p>
                         <p>Jabatan: {h.jabatan || '-'}</p>
                         <p>Satuan Kerja: {h.satker || '-'}</p>
                         <p>Bidang/Bagian: {h.bidang || '-'}</p>
                       </li>
                     ))}
                   </ul>
                 )}
               </div>

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
    </div>
  )
}

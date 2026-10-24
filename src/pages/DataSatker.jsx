import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import Toast from '../components/Toast'

export default function DataSatker() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [satkerList, setSatkerList] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [modalOpen, setModalOpen] = React.useState(false)
  const [form, setForm] = React.useState({ nama_satker: '' })
  const [editingId, setEditingId] = React.useState(null)
  const [toast, setToast] = React.useState({ open: false, message: '', type: 'success' })
  const [searchQuery, setSearchQuery] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)
  const ITEMS_PER_PAGE = 10

  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/loginverifikator')
      return
    }
    loadData()
  }, [user, authLoading, navigate])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('satker').select('*').order('nama_satker', { ascending: true })
      if (error) throw error
      setSatkerList(data || [])
    } catch (err) {
      console.error('Failed to load satker:', err)
      setToast({ open: true, message: err.message || 'Gagal memuat data satker', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditingId(null)
    setForm({ nama_satker: '' })
    setModalOpen(true)
  }

  const openEdit = (satker) => {
    setEditingId(satker.id)
    setForm({ nama_satker: satker.nama_satker || '' })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setForm({ nama_satker: '' })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.nama_satker) return
    try {
      if (editingId) {
        await supabase.from('satker').update({ nama_satker: form.nama_satker }).eq('id', editingId)
      } else {
        await supabase.from('satker').insert({ nama_satker: form.nama_satker })
      }
      closeModal()
      loadData()
      setToast({ open: true, message: 'Data satker berhasil disimpan', type: 'success' })
    } catch (err) {
      setToast({ open: true, message: err.message || 'Gagal menyimpan data', type: 'error' })
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data satker ini?')) return
    try {
      await supabase.from('satker').delete().eq('id', id)
      loadData()
      setToast({ open: true, message: 'Data satker dihapus', type: 'success' })
    } catch (err) {
      setToast({ open: true, message: err.message || 'Gagal menghapus data', type: 'error' })
    }
  }

  const filtered = satkerList.filter((s) => {
    const q = searchQuery.toLowerCase()
    return (s.nama_satker || '').toLowerCase().includes(q)
  })
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE
  const paginated = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE)

  return (
    <div className="w-full max-w-[1280px] pb-16 md:pb-0">
      <Toast open={toast.open} message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, open: false })} />
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-xs">Kelola Data Satker</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Kelola data satuan kerja (satker) yang tersedia dalam sistem.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center justify-center gap-xs px-md py-sm bg-primary text-white rounded-lg text-label-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Tambah Satker
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        <div className="p-3 md:p-md border-b border-outline-variant flex flex-col sm:flex-row items-stretch sm:items-center gap-sm">
          <div>
            <h3 className="text-headline-sm font-headline-sm text-primary">Daftar Satuan Kerja</h3>
          </div>
          <div className="relative w-full sm:w-72">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              placeholder="Cari nama satker..."
              className="w-full pl-9 pr-md py-sm bg-surface border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low text-label-md text-primary font-bold uppercase tracking-wider sticky top-0">
              <tr>
                <th className="px-2 md:px-md py-sm border-b border-outline-variant">Nama Satker</th>
                <th className="px-2 md:px-md py-sm border-b border-outline-variant text-left">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-body-sm text-on-surface divide-y divide-outline-variant">
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-2 md:px-md py-sm text-center text-on-surface-variant">Memuat data...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-2 md:px-md py-sm text-center text-on-surface-variant">
                    {searchQuery ? 'Tidak ada hasil pencarian.' : 'Belum ada data satker.'}
                  </td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr key={item.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-2 md:px-md py-sm">{item.nama_satker || '-'}</td>
                    <td className="px-2 md:px-md py-sm flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container transition-colors"
                        title="Edit"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container transition-colors"
                        title="Hapus"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > ITEMS_PER_PAGE && (
          <div className="p-md bg-surface-container-low border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0">
            <p className="text-label-xs md:text-label-sm text-on-surface-variant text-center md:text-left">
              Menampilkan {paginated.length} dari {filtered.length} data satker
            </p>
            <div className="flex items-center gap-1 md:gap-base">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant bg-white text-on-surface-variant disabled:opacity-50 hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
                className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant bg-white text-on-surface-variant disabled:opacity-50 hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-0" onClick={closeModal}>
          <div className="w-full md:w-[500px] max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">edit</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-800">{editingId ? 'Edit Satker' : 'Tambah Satker'}</h3>
              </div>
              <button onClick={closeModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined text-slate-500 text-[20px]">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-3 md:p-md space-y-md">
              <div className="space-y-xs">
                <label className="text-label-sm text-on-surface-variant">Nama Satuan Kerja</label>
                <input
                  type="text"
                  value={form.nama_satker}
                  onChange={(e) => setForm({ ...form, nama_satker: e.target.value })}
                  className="w-full px-md py-sm bg-white border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                />
              </div>
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
    </div>
  )
}

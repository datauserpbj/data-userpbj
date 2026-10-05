import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import {
  getPengajuanList,
  getPengajuanDetail,
  updatePengajuanStatus,
} from '../lib/supabase-helpers'
import ProfilPopup from '../components/ProfilPopup'

export default function PengajuanMasuk() {
  const [pengajuanList, setPengajuanList] = React.useState([])
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [selectedItem, setSelectedItem] = React.useState(null)
  const [detailData, setDetailData] = React.useState(null)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [loadingDetail, setLoadingDetail] = React.useState(false)
  const [currentPage, setCurrentPage] = React.useState(1)
  const [profileOpen, setProfileOpen] = React.useState(false)
  const ITEMS_PER_PAGE = 5
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (loading) return
    if (!user) {
      navigate('/loginverifikator')
      return
    }
    loadData()
  }, [user, loading, navigate])

  React.useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  const loadData = async () => {
    try {
      const data = await getPengajuanList()
      setPengajuanList(data || [])
    } catch (err) {
      console.error('Failed to load pengajuan:', err)
    }
  }

  const stats = {
    total: pengajuanList.length,
    baru: pengajuanList.filter(i => i.status === 'submitted').length,
    verified: pengajuanList.filter(i => i.status === 'verified').length,
    rejected: pengajuanList.filter(i => i.status === 'rejected').length,
  }

  const isToday = (dateStr) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const now = new Date()
    return date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
  }

  const selesaiHariIni = pengajuanList.filter(i => (i.status === 'verified' || i.status === 'rejected') && isToday(i.updated_at)).length

  const filtered = statusFilter === 'all'
    ? pengajuanList
    : pengajuanList.filter(item => item.status === statusFilter)

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE
  const paginatedItems = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE)

  const openDetail = async (item) => {
    setSelectedItem(item)
    setIsModalOpen(true)
    setLoadingDetail(true)
    try {
      const data = await getPengajuanDetail(item.id)
      setDetailData(data)
    } catch (err) {
      setDetailData(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedItem(null)
    setDetailData(null)
    setShowRejectForm(false)
    setRejectReason('')
    setShowRevisionForm(false)
    setRevisionNote('')
  }

  const [loadingAction, setLoadingAction] = React.useState(false)
  const [showRejectForm, setShowRejectForm] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState('')
  const [showRevisionForm, setShowRevisionForm] = React.useState(false)
  const [revisionNote, setRevisionNote] = React.useState('')

  const REVISION_RECOMMENDATIONS = [
    'SK Pejabat Pengadaan',
    'SK PPK',
    'SK PA',
    'Sertifikat PBJ Level-1',
    'SK KPA',
    'Pakta Integritas',
    'Surat Rekomendasi',
    'Surat Permohonan',
  ]

  const insertRevisionRecommendation = (text) => {
    setRevisionNote((prev) => {
      if (!prev.trim()) return text
      if (prev.endsWith(' ') || prev.endsWith('\n')) return prev + text
      return prev + ' ' + text
    })
  }

  const updateStatus = async (status, alasanDitolak = null, alasanRevisi = null) => {
    if (!selectedItem) return
    setLoadingAction(true)
    try {
      await updatePengajuanStatus(selectedItem.id, { status, alasan_ditolak: alasanDitolak, alasan_revisi: alasanRevisi })
      closeModal()
      loadData()
      setShowRejectForm(false)
      setRejectReason('')
      setShowRevisionForm(false)
      setRevisionNote('')
    } catch (err) {
      alert(`Gagal memperbarui status: ${err.message}`)
    } finally {
      setLoadingAction(false)
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const getInitials = (nama) => {
    if (!nama) return '??'
    return nama
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isRevisionRequested = (item) => item.status === 'submitted' && !!item.alasan_revisi

  const getLatestActivity = (item) => {
    if (!item) return null
    if (item.status === 'draft') {
      return {
        aktivitas: 'Simpan Draft',
        status: 'Selesai',
        statusWarna: 'on-surface-variant',
        keterangan: 'Draft pengajuan diperbarui',
      }
    }
    if (isRevisionRequested(item)) {
      return {
        aktivitas: 'Minta Revisi',
        status: 'Minta Revisi',
        statusWarna: 'orange-600',
        keterangan: item.alasan_revisi || 'Dokumen perlu direvisi sesuai catatan verifikator',
      }
    }
    if (item.status === 'submitted' && item.revisi_selesai) {
      return {
        aktivitas: 'Revisi Pemohon',
        status: 'Selesai Diperbaiki',
        statusWarna: 'green-600',
        keterangan: 'Pemohon telah menyelesaikan revisi dan menunggu verifikasi ulang',
      }
    }
    switch (item.status) {
      case 'submitted':
        return {
          aktivitas: 'Verifikasi Dokumen',
          status: 'Menunggu Verifikasi',
          statusWarna: 'secondary',
          keterangan: 'Menunggu antrean verifikator LPSE',
        }
      case 'verified':
        return {
          aktivitas: 'Verifikasi Dokumen',
          status: 'Terverifikasi',
          statusWarna: 'green-600',
          keterangan: 'Pengajuan telah diverifikasi dan disetujui',
        }
      case 'rejected':
        return {
          aktivitas: 'Verifikasi Dokumen',
          status: 'Ditolak',
          statusWarna: 'red-600',
          keterangan: item.alasan_ditolak ? `Pengajuan ditolak: ${item.alasan_ditolak}` : 'Pengajuan ditolak',
        }
      default:
        return null
    }
  }

  const getStatusBadge = (item) => {
    const latest = getLatestActivity(item)
    if (!latest) {
      if (isRevisionRequested(item)) {
        return 'bg-orange-50 text-orange-700 border border-orange-200'
      }
      switch (item.status) {
        case 'submitted':
          return 'bg-secondary-container/10 text-on-secondary-container border border-secondary-container/30'
        case 'verified':
          return 'bg-green-50 text-green-700 border border-green-200'
        case 'rejected':
          return 'bg-error-container/10 text-on-error-container border border-error-container/30'
        default:
          return 'bg-surface-container-low text-on-surface-variant border border-outline-variant'
      }
    }
    switch (latest.statusWarna) {
      case 'green-600':
        return 'bg-green-50 text-green-700 border border-green-200'
      case 'red-600':
        return 'bg-error-container/10 text-on-error-container border border-error-container/30'
      case 'orange-600':
        return 'bg-orange-50 text-orange-700 border border-orange-200'
      case 'secondary':
        return 'bg-secondary-container/10 text-on-secondary-container border border-secondary-container/30'
      default:
        return 'bg-surface-container-low text-on-surface-variant border border-outline-variant'
    }
  }

  const getStatusLabel = (item) => {
    const latest = getLatestActivity(item)
    if (latest) return latest.status
    if (isRevisionRequested(item)) {
      return 'Minta Revisi'
    }
    switch (item.status) {
      case 'submitted':
        return 'Menunggu Verifikasi'
      case 'verified':
        return 'Terverifikasi'
      case 'rejected':
        return 'Ditolak'
      case 'draft':
        return 'Draft'
      default:
        return item.status
    }
  }

  return (
    <div className="w-full max-w-[1280px] pb-16 md:pb-0">
      {/* Page Header */}
      <div className="mb-lg flex flex-col md:flex-row md:items-end justify-between gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-xs">Pengajuan Masuk</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Pantau dan kelola antrean pengajuan berkas yang masuk secara real-time.
          </p>
        </div>
        <div className="flex items-center gap-xs px-sm py-base bg-surface-container-high rounded-full border border-outline-variant">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
          </span>
          <span className="text-label-sm text-secondary font-semibold">Real-time Update</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-md mb-lg">
        {/* Total Card */}
        <div className="bg-surface-container-lowest p-3 md:p-md border border-outline-variant rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-sm">
            <span className="p-xs bg-surface-container rounded-lg text-primary">
              <span className="material-symbols-outlined text-lg md:text-xl">all_inbox</span>
            </span>
            <span className="text-[10px] md:text-label-sm text-on-surface-variant hidden md:inline">+12% vs Kemarin</span>
          </div>
          <p className="text-label-xs md:text-label-md font-label-md text-on-surface-variant">Total Pengajuan</p>
          <h3 className="text-headline-sm md:text-headline-md font-headline-sm md:font-headline-md text-primary">{stats.total.toLocaleString('id-ID')}</h3>
        </div>

        {/* Perlu Verifikasi (Highlighted) */}
        <div className="bg-primary-container p-3 md:p-md border border-primary rounded-lg shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 md:p-lg opacity-10">
            <span className="material-symbols-outlined text-[40px] md:text-[64px]" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
          </div>
          <div className="flex justify-between items-start mb-sm">
            <span className="p-xs bg-white/10 rounded-lg text-white">
              <span className="material-symbols-outlined text-lg md:text-xl">pending_actions</span>
            </span>
            <span className="text-[10px] md:text-label-sm text-primary-fixed hidden md:inline">High Priority</span>
          </div>
          <p className="text-label-xs md:text-label-md font-label-md text-on-surface-variant">Pengajuan Baru</p>
          <h3 className="text-headline-sm md:text-headline-md font-headline-sm md:font-headline-md text-primary">{stats.baru}</h3>
        </div>

        {/* Sedang Diproses */}
        <div className="bg-surface-container-lowest p-3 md:p-md border border-outline-variant rounded-lg shadow-sm">
          <div className="flex justify-between items-start mb-sm">
            <span className="p-xs bg-secondary-container/20 rounded-lg text-secondary">
              <span className="material-symbols-outlined text-lg md:text-xl">sync</span>
            </span>
          </div>
          <p className="text-label-xs md:text-label-md font-label-md text-on-surface-variant">Sudah Diverifikasi</p>
          <h3 className="text-headline-sm md:text-headline-md font-headline-sm md:font-headline-md text-primary">{stats.verified}</h3>
        </div>

        {/* Selesai Hari Ini */}
        <div className="bg-surface-container-lowest p-3 md:p-md border border-outline-variant rounded-lg shadow-sm">
          <div className="flex justify-between items-start mb-sm">
            <span className="p-xs bg-green-100 rounded-lg text-green-700">
              <span className="material-symbols-outlined text-lg md:text-xl">check_circle</span>
            </span>
          </div>
          <p className="text-label-xs md:text-label-md font-label-md text-on-surface-variant">Selesai Hari Ini</p>
          <h3 className="text-headline-sm md:text-headline-md font-headline-sm md:font-headline-md text-primary">{selesaiHariIni}</h3>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm">
        {/* Table Header & Filters */}
        <div className="p-md md:p-lg border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-md bg-surface-container-lowest">
          <div>
            <h3 className="text-headline-sm font-headline-sm text-primary">Antrean Verifikasi</h3>
            <p className="text-body-sm text-on-surface-variant">Daftar pemohon yang menunggu Verifikasi Berkas.</p>
          </div>
          <div className="flex flex-wrap items-center gap-xs">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none bg-white border border-outline-variant rounded-md pl-sm pr-lg py-xs text-label-sm text-on-surface-variant focus:ring-primary focus:border-primary cursor-pointer"
              >
                <option value="all">Semua Status</option>
                <option value="submitted">Menunggu Verifikasi</option>
                <option value="verified">Terverifikasi</option>
                <option value="rejected">Ditolak</option>
              </select>
              <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-sm">expand_more</span>
            </div>
            <button className="flex items-center gap-xs px-sm py-xs bg-surface border border-outline-variant rounded-md font-label-sm text-on-surface-variant hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Filter Lanjutan
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-label-md text-primary font-bold uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="pl-4 md:pl-md pr-2 md:pr-md py-sm border-b border-outline-variant">Nama Pemohon</th>
                  <th className="px-2 md:px-md py-sm border-b border-outline-variant hidden md:table-cell">Instansi/Satuan Kerja</th>
                  <th className="px-2 md:px-md py-sm border-b border-outline-variant hidden md:table-cell">Jabatan</th>
                  <th className="px-2 md:px-md py-sm border-b border-outline-variant hidden sm:table-cell">Tanggal Pengajuan</th>
                  <th className="px-2 md:px-md py-sm border-b border-outline-variant text-center">Status</th>
                  <th className="pl-4 md:pl-md pr-2 md:pr-md py-sm border-b border-outline-variant text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-body-sm text-on-surface divide-y divide-outline-variant">
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 md:px-md py-sm text-center text-on-surface-variant">
                      Tidak ada data untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map(item => (
                    <tr key={item.id} className="hover:bg-surface-container-low transition-colors group">
                       <td className="pl-4 md:pl-md pr-2 md:pr-md py-sm">
                         <div className="min-w-0">
                           <p className="font-bold whitespace-normal">{item.nama_lengkap}</p>
                           <p className="text-[10px] text-on-surface-variant">ID: {item.id.slice(0, 8).toUpperCase()}</p>
                         </div>
                       </td>
                      <td className="px-2 md:px-md py-sm hidden md:table-cell">{item.satker || '-'}</td>
                      <td className="px-2 md:px-md py-sm hidden md:table-cell">{item.jabatan || '-'}</td>
                      <td className="px-2 md:px-md py-sm hidden sm:table-cell">{formatDateTime(item.created_at)}</td>
                      <td className="px-2 md:px-md py-sm text-center">
                        <span
                          className={`inline-flex items-center gap-xs px-sm py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(item)}`}
                        >
                           <span
                             className={`w-1.5 h-1.5 rounded-full ${
                               (() => {
                                 const latest = getLatestActivity(item)
                                 if (!latest) return isRevisionRequested(item) ? 'bg-orange-500' : item.status === 'verified' ? 'bg-green-500' : item.status === 'rejected' ? 'bg-error' : 'bg-secondary'
                                 switch (latest.statusWarna) {
                                   case 'green-600': return 'bg-green-500'
                                   case 'red-600': return 'bg-error'
                                   case 'orange-600': return 'bg-orange-500'
                                   default: return 'bg-secondary'
                                 }
                               })()
                             }`}
                           ></span>
                          {getStatusLabel(item)}
                        </span>
                      </td>
                      <td className="pl-4 md:pl-md pr-2 md:pr-md py-sm text-center">
                        <button
                          onClick={() => openDetail(item)}
                          className={
                            item.status === 'verified' || item.status === 'rejected' || isRevisionRequested(item)
                              ? 'inline-flex items-center justify-center w-8 h-8 rounded hover:bg-surface-container-low transition-all md:w-auto md:h-auto md:px-md md:py-1.5'
                              : 'inline-flex items-center justify-center w-8 h-8 bg-primary text-on-primary rounded hover:bg-primary-container shadow-sm active:scale-95 transition-all md:w-auto md:h-auto md:px-md md:py-1.5 md:rounded-md'
                          }
                          title={item.status === 'verified' || item.status === 'rejected' || isRevisionRequested(item) ? 'Lihat' : 'Periksa'}
                        >
                          {item.status === 'verified' || item.status === 'rejected' || isRevisionRequested(item) ? (
                            <span className="material-symbols-outlined text-sm md:text-sm">visibility</span>
                          ) : (
                            <span className="material-symbols-outlined text-sm md:text-sm">search</span>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="p-md bg-surface-container-low border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0">
          <p className="text-label-xs md:text-label-sm text-on-surface-variant text-center md:text-left">Menampilkan {paginatedItems.length} dari {filtered.length} permohonan</p>
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
      </div>

      {/* Contextual Information Footer */}
      <div className="mt-lg p-md bg-surface-container-low rounded-lg border border-outline-variant flex items-center gap-md">
        <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
        <p className="text-body-sm text-on-surface-variant">
          Sistem akan otomatis melakukan pencatatan pada pengajuan yang masuk untuk memudahkan proses distribusi tugas antar verifikator.
        </p>
      </div>

      {/* Mobile Nav Bar (Bottom) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant flex justify-around items-center py-xs z-50">
        <button onClick={() => navigate('/verifikator')} className="flex flex-col items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px]">Beranda</span>
        </button>
        <button onClick={() => {}} className="flex flex-col items-center gap-1 text-primary">
          <span className="material-symbols-outlined">description</span>
          <span className="text-[10px] font-bold">Berkas</span>
        </button>
        <button onClick={() => navigate('/laporanverifikator')} className="flex flex-col items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined">history</span>
          <span className="text-[10px]">Riwayat</span>
        </button>
        <button onClick={() => setProfileOpen((prev) => !prev)} className="flex flex-col items-center gap-1 text-on-surface-variant relative">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px]">Profil</span>
        </button>
      </nav>

      <ProfilPopup open={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Detail Modal */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 md:p-0" onClick={closeModal}>
          <div className="w-full md:w-[50vw] max-h-[90vh] flex flex-col bg-surface-container-lowest rounded-lg shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3 md:p-md border-b border-outline-variant">
                <div className="flex items-center gap-sm">
                  <h3 className="text-headline-sm md:text-headline-sm font-headline-sm text-primary">Detail Pengajuan</h3>
                  <span className={`px-sm py-1 md:py-base text-xs font-semibold rounded-full ${getStatusBadge(selectedItem)}`}>
                    {getStatusLabel(selectedItem)}
                  </span>
                </div>
              <button onClick={closeModal} className="p-xs hover:bg-surface-container-low rounded-lg transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto flex" style={{ minHeight: '0' }}>
              {/* Left Pane: Personal Data */}
              <section className="w-full flex flex-col">
                <div className="p-3 md:p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low/30">
                  <h3 className="text-label-md font-bold text-primary flex items-center gap-xs">
                    <span className="material-symbols-outlined text-sm">badge</span>
                    DATA DIRI PEMOHON
                  </h3>
                   
                </div>
                <div className="flex-1 overflow-y-auto p-3 md:p-md space-y-md custom-scrollbar">
                  {loadingDetail ? (
                    <div className="flex items-center justify-center py-xl">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : detailData && detailData.formulir ? (
                    <div className="grid grid-cols-1 gap-sm">
                      <div className="space-y-xs">
                        <label className="text-label-sm text-on-surface-variant">Nomor Induk Pegawai (NIP)</label>
                        <div className="px-xs py-xs bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-semibold text-primary">
                          {detailData.formulir.nip || '-'}
                        </div>
                      </div>
                      <div className="space-y-xs">
                        <label className="text-label-sm text-on-surface-variant">Nama Lengkap</label>
                        <div className="px-xs py-xs bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-medium text-primary">
                          {detailData.formulir.nama_lengkap || '-'}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                        <div className="space-y-xs">
                          <label className="text-label-sm text-on-surface-variant">Jabatan</label>
                          <div className="px-xs py-xs bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-medium text-primary">
                            {detailData.formulir.jabatan || '-'}
                          </div>
                        </div>
                        <div className="space-y-xs">
                          <label className="text-label-sm text-on-surface-variant">Satuan Kerja</label>
                          <div className="px-xs py-xs bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-medium text-primary">
                            {detailData.formulir.satker || '-'}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-xs">
                        <label className="text-label-sm text-on-surface-variant">Tanggal Pengajuan</label>
                        <div className="px-xs py-xs bg-surface-container-lowest border border-outline-variant rounded text-body-sm font-medium text-primary">
                          {formatDateTime(detailData.formulir.created_at)}
                        </div>
                      </div>
                      <div className="space-y-sm mt-md">
                        <label className="text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">Pratinjau Dokumen</label>
                        <div className="space-y-xs">
                          {detailData.dokumen && detailData.dokumen.length > 0 ? (
                            detailData.dokumen.map((doc, idx) => {
                               const docInfo = {
                                 surat_permohonan: { label: 'Surat Permohonan Verifikasi', icon: 'description' },
                                 pakta_integritas: { label: 'Pakta Integritas', icon: 'verified' },
                                 sk_terbaru: { label: 'SK PP/PPK/PA', icon: 'assignment_ind' },
                                 sertifikat_level1: { label: 'Sertifikat PBJ Level-1', icon: 'verified' },
                                 sk_kpa_sertifikat_pbj: { label: 'SK KPA / Sertifikat PBJ Level-1', icon: 'verified' },
                               }[doc.jenis_dokumen] || { label: doc.jenis_dokumen.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace(/Ukpbj/g, 'UKPBJ'), icon: 'description' }
                              return (
                                <div key={idx} className="flex items-center justify-between p-sm bg-surface-container-lowest border border-outline-variant rounded hover:bg-surface-container-low transition-colors cursor-pointer">
                                  <div className="flex items-center gap-sm">
                                    <span className="material-symbols-outlined text-primary text-sm">{docInfo.icon}</span>
                                    <span className="text-body-sm font-medium text-primary">{docInfo.label}</span>
                                  </div>
                                  <a href={doc.filepath} target="_blank" rel="noopener noreferrer">
                                    <span className="material-symbols-outlined text-sm text-on-surface-variant">visibility</span>
                                  </a>
                                </div>
                              )
                            })
                          ) : (
                            <p className="text-body-sm text-on-surface-variant">Tidak ada dokumen terlampir.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-xl">
                      <p className="text-body-sm text-on-surface-variant">Gagal memuat data pengajuan.</p>
                    </div>
                  )}
                  <div className="mt-xl p-sm bg-surface-container-low rounded-lg border border-primary/10">
                    <h4 className="text-xs font-bold text-primary mb-xs uppercase">Catatan Keamanan</h4>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      Seluruh data telah melalui tahap validasi awal sistem. Harap periksa kesesuaian antara dokumen fisik yang diunggah dengan data input di atas.
                    </p>
                  </div>

                  {selectedItem?.status === 'verified' ? (
                    <div className="flex items-center justify-center py-md">
                      <span className="text-label-md font-bold text-green-700 flex items-center gap-xs">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        Pengajuan sudah disetujui — {formatDateTime(selectedItem.updated_at || selectedItem.created_at)}
                      </span>
                    </div>
                  ) : selectedItem?.status === 'rejected' ? (
                    <div className="flex flex-col items-center gap-sm">
                      <span className="text-label-md font-bold text-red-700 flex items-center gap-xs">
                        <span className="material-symbols-outlined text-sm">cancel</span>
                        Pengajuan sudah ditolak — {formatDateTime(selectedItem.updated_at || selectedItem.created_at)}
                      </span>
                      {selectedItem.alasan_ditolak && (
                        <p className="text-body-sm text-on-surface-variant text-center max-w-2xl">
                          <span className="font-semibold">Alasan:</span> {selectedItem.alasan_ditolak}
                        </p>
                      )}
                    </div>
                  ) : isRevisionRequested(selectedItem) ? (
                    <div className="flex flex-col items-center gap-sm">
                      <span className="text-label-md font-bold text-orange-700 flex items-center gap-xs">
                        <span className="material-symbols-outlined text-sm">edit</span>
                        Permintaan Revisi — {formatDateTime(selectedItem.updated_at || selectedItem.created_at)}
                      </span>
                      {selectedItem.alasan_revisi && (
                        <p className="text-body-sm text-on-surface-variant text-center max-w-2xl">
                          <span className="font-semibold">Catatan Revisi:</span> {selectedItem.alasan_revisi}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-sm">
                      <div className="flex flex-col md:flex-row items-center justify-center md:justify-end gap-2 md:gap-sm">
                        <button
                          type="button"
                          onClick={() => setShowRejectForm((prev) => !prev)}
                          disabled={loadingAction}
                          className="w-full md:w-auto px-md py-xs border border-error text-error font-bold rounded-md hover:bg-error-container/10 transition-colors uppercase text-xs tracking-wide disabled:opacity-50"
                        >
                          <span className="material-symbols-outlined text-sm align-middle mr-xs">close</span>
                          Tolak
                        </button>
                         <button
                           type="button"
                           onClick={() => setShowRevisionForm((prev) => !prev)}
                           disabled={loadingAction}
                           className="w-full md:w-auto px-md py-xs border border-secondary text-secondary font-bold rounded-md hover:bg-surface-container-low transition-colors uppercase text-xs tracking-wide disabled:opacity-50"
                         >
                           <span className="material-symbols-outlined text-sm align-middle mr-xs">edit</span>
                           Minta Revisi
                         </button>
                        <button onClick={() => updateStatus('verified')} disabled={loadingAction} className="w-full md:w-auto px-md py-xs bg-primary text-white font-bold rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-xs uppercase text-xs tracking-wide disabled:opacity-50 disabled:cursor-not-allowed">
                          <span className="material-symbols-outlined text-sm">verified</span>
                          Setujui
                        </button>
                      </div>
                      {showRejectForm && (
                        <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
                          <label className="block text-label-sm text-on-surface-variant font-semibold mb-xs">
                            Alasan Penolakan
                          </label>
                          <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={3}
                            className="w-full px-md py-sm bg-white border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                            placeholder="Masukkan alasan penolakan..."
                          />
                           <div className="flex flex-col md:flex-row items-center justify-end gap-sm mt-sm">
                             <button
                               type="button"
                               onClick={() => { setShowRejectForm(false); setRejectReason('') }}
                               disabled={loadingAction}
                               className="w-full md:w-auto px-md py-xs rounded-lg border border-outline-variant text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-low transition-colors disabled:opacity-50"
                             >
                               Batal
                             </button>
                             <button
                               type="button"
                               onClick={() => updateStatus('rejected', rejectReason)}
                               disabled={loadingAction || !rejectReason.trim()}
                               className="w-full md:w-auto px-md py-xs rounded-lg bg-error text-on-error font-label-md text-label-md hover:opacity-90 transition-colors disabled:opacity-50"
                             >
                               {loadingAction ? 'Menyimpan...' : 'Kirim Penolakan'}
                             </button>
                           </div>
                        </div>
                      )}
                       {showRevisionForm && (
                         <div className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
                           <label className="block text-label-sm text-on-surface-variant font-semibold mb-xs">
                             Catatan Revisi
                           </label>
                           <div className="flex flex-wrap gap-2 mb-2">
                             {REVISION_RECOMMENDATIONS.map((text) => (
                               <button
                                 key={text}
                                 type="button"
                                 onClick={() => insertRevisionRecommendation(text)}
                                 className="px-3 py-1 rounded-full border border-outline-variant bg-white text-label-sm text-on-surface hover:bg-surface-container-low transition-colors"
                               >
                                 {text}
                               </button>
                             ))}
                           </div>
                           <textarea
                             value={revisionNote}
                             onChange={(e) => setRevisionNote(e.target.value)}
                             rows={3}
                             className="w-full px-md py-sm bg-white border border-outline-variant rounded-lg text-body-sm focus:ring-2 focus:ring-primary focus:border-primary resize-none"
                             placeholder="Masukkan catatan revisi untuk pemohon..."
                           />
                            <div className="flex flex-col md:flex-row items-center justify-end gap-sm mt-sm">
                             <button
                               type="button"
                               onClick={() => { setShowRevisionForm(false); setRevisionNote('') }}
                               disabled={loadingAction}
                               className="w-full md:w-auto px-md py-xs rounded-lg border border-outline-variant text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-low transition-colors disabled:opacity-50"
                             >
                               Batal
                             </button>
                             <button
                               type="button"
                               onClick={() => updateStatus('submitted', null, revisionNote)}
                               disabled={loadingAction || !revisionNote.trim()}
                               className="w-full md:w-auto px-md py-xs rounded-lg bg-secondary text-white font-label-md text-label-md hover:opacity-90 transition-colors disabled:opacity-50"
                             >
                               {loadingAction ? 'Menyimpan...' : 'Kirim Revisi'}
                             </button>
                           </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

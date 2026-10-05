import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getPengajuanList } from '../lib/supabase-helpers'

export default function DashboardVerifikator() {
  const [pengajuanList, setPengajuanList] = React.useState([])
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [selectedItem, setSelectedItem] = React.useState(null)
  const [detailOpen, setDetailOpen] = React.useState(false)
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (loading) return
    if (!user) {
      navigate('/login/verifikator')
      return
    }
    loadData()
  }, [user, loading, navigate])

   const loadData = async () => {
    try {
      const data = await getPengajuanList()
      setPengajuanList(data || [])
    } catch (err) {
      console.error('Failed to load pengajuan:', err)
    }
  }

  const openDetail = (item) => {
    setSelectedItem(item)
    setDetailOpen(true)
  }

  const closeModal = () => {
    setDetailOpen(false)
    setSelectedItem(null)
  }

  const stats = {
    total: pengajuanList.length,
    pending: pengajuanList.filter(i => i.status === 'submitted').length,
    verified: pengajuanList.filter(i => i.status === 'verified').length,
    rejected: pengajuanList.filter(i => i.status === 'rejected').length,
    revision: pengajuanList.filter(i => i.status === 'submitted' && !!i.alasan_revisi).length,
  }

  const filtered = statusFilter === 'all'
    ? pengajuanList
    : pengajuanList.filter(item => item.status === statusFilter)

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

  const getStatusBadge = (status, item) => {
    if (item && item.status === 'submitted' && item.alasan_revisi) {
      return 'bg-orange-100 text-orange-800 border border-orange-200'
    }
    switch (status) {
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

  const getStatusLabel = (status, item) => {
    if (item && item.status === 'submitted' && item.alasan_revisi) {
      return 'Minta Revisi'
    }
    switch (status) {
      case 'submitted':
        return 'Menunggu Verifikasi'
      case 'verified':
        return 'Terverifikasi'
      case 'rejected':
        return 'Ditolak'
      case 'draft':
        return 'Draft'
      default:
        return status
    }
  }

   const [activityPage, setActivityPage] = React.useState(1)
   const ACTIVITY_PER_PAGE = 3

   const allActivities = pengajuanList
     .filter(i => i.status !== 'submitted' && i.status !== 'draft')
     .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))

   const totalActivityPages = Math.max(1, Math.ceil(allActivities.length / ACTIVITY_PER_PAGE))
   const safeActivityPage = Math.min(activityPage, totalActivityPages)
   const activityStartIdx = (safeActivityPage - 1) * ACTIVITY_PER_PAGE
   const paginatedActivities = allActivities.slice(activityStartIdx, activityStartIdx + ACTIVITY_PER_PAGE)

  return (
    <div>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-xs">Ringkasan Verifikator</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Selamat datang kembali, {user?.nama_lengkap || 'Pengguna'}. Pantau dan kelola antrean verifikasi Anda di sini.
          </p>
        </div>
        <div className="flex items-center gap-sm text-label-sm text-on-surface-variant bg-surface-container-low px-sm py-xs rounded border border-outline-variant">
          <span className="material-symbols-outlined text-sm">calendar_today</span>
          <span>{formatDate(new Date().toISOString())}</span>
        </div>
      </div>

       {/* Stats Grid (Bento Style) */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-sm mb-xl">
        {/* Stat 1 */}
        <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-[64px]">pending_actions</span>
          </div>
          <p className="text-label-md font-bold text-on-surface-variant mb-xs">Total Antrean</p>
          <div className="flex items-baseline gap-sm">
            <span className="text-headline-lg font-black text-primary">{String(stats.total).padStart(2, '0')}</span>
            <span className="text-label-sm text-secondary">+3 berkas baru hari ini</span>
          </div>
          <div className="mt-md h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary transition-all duration-500"
              style={{ width: `${stats.total ? ((stats.pending / stats.total) * 100) : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-[64px] text-orange-500">edit</span>
          </div>
          <p className="text-label-md font-bold text-on-surface-variant mb-xs">Perlu Revisi</p>
          <div className="flex items-baseline gap-sm">
            <span className="text-headline-lg font-black text-orange-500">{String(stats.revision).padStart(2, '0')}</span>
            <span className="text-label-sm text-on-surface-variant">Membutuhkan perhatian segera</span>
          </div>
          <div className="mt-md h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 transition-all duration-500"
              style={{ width: `${stats.total ? ((stats.revision / stats.total) * 100) : 0}%` }}
            ></div>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <span className="material-symbols-outlined text-[64px] text-green-600">task_alt</span>
          </div>
          <p className="text-label-md font-bold text-on-surface-variant mb-xs">Selesai Hari Ini</p>
          <div className="flex items-baseline gap-sm">
            <span className="text-headline-lg font-black text-green-700">{String(stats.verified).padStart(2, '0')}</span>
            <span className="text-label-sm text-green-600">85% dari target harian</span>
          </div>
          <div className="mt-md h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{ width: `${stats.total ? ((stats.verified / stats.total) * 100) : 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      

      {/* Dashboard Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg mb-xl">
        {/* Performa Verifikasi */}
        <div className="bg-white border border-outline-variant rounded-xl p-lg shadow-sm">
          <h3 className="text-headline-sm font-headline-sm text-primary mb-md">Performa Verifikasi</h3>
          <div className="space-y-md">
            <div>
              <div className="flex justify-between text-label-md mb-xs">
                <span className="text-on-surface-variant">Terverifikasi</span>
                <span className="font-bold text-primary">{stats.verified} dari {stats.total}</span>
              </div>
              <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${stats.total ? ((stats.verified / stats.total) * 100) : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-label-md mb-xs">
                <span className="text-on-surface-variant">Menunggu</span>
                <span className="font-bold text-primary">{stats.pending} dari {stats.total}</span>
              </div>
              <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-secondary transition-all duration-500" style={{ width: `${stats.total ? ((stats.pending / stats.total) * 100) : 0}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-label-md mb-xs">
                <span className="text-on-surface-variant">Ditolak</span>
                <span className="font-bold text-primary">{stats.rejected} dari {stats.total}</span>
              </div>
              <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-error transition-all duration-500" style={{ width: `${stats.total ? ((stats.rejected / stats.total) * 100) : 0}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Laporan Verifikasi Bulanan */}
        <div className="bg-white border border-outline-variant rounded-xl p-lg shadow-sm">
          <h3 className="text-headline-sm font-headline-sm text-primary mb-md">Laporan Verifikasi Bulanan</h3>
           <div className="flex items-end justify-between gap-1 h-32 md:h-48 overflow-x-auto">
             {['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'].map((month, idx) => {
               const monthData = pengajuanList.filter(item => {
                 if (!item.created_at) return false
                 const date = new Date(item.created_at)
                 return date.getMonth() === idx
               })
               const verified = monthData.filter(i => i.status === 'verified').length
               const rejected = monthData.filter(i => i.status === 'rejected').length
               const total = monthData.length
               const maxVal = Math.max(total, 1)
               return (
                 <div key={month} className="flex-1 min-w-[12px] md:min-w-[20px] flex flex-col items-center gap-0.5">
                   <div className="w-full flex flex-col items-center">
                     <span className="text-[9px] md:text-[10px] font-bold text-on-surface-variant">{total}</span>
                     <div className="w-full rounded-t-sm relative" style={{ height: `${Math.max(4, (total / maxVal) * 100)}%`, minHeight: '4px' }}>
                       <div className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-sm" style={{ height: `${total ? (verified / total) * 100 : 0}%` }}></div>
                       <div className="absolute bottom-0 left-0 right-0 bg-error rounded-b-sm" style={{ height: `${total ? (rejected / total) * 100 : 0}%` }}></div>
                     </div>
                   </div>
                   <span className="text-[9px] md:text-[10px] text-on-surface-variant font-medium">{month}</span>
                 </div>
               )
             })}
           </div>
           <div className="flex items-center justify-center gap-2 mt-sm">
             <div className="flex items-center gap-1">
               <span className="w-2 h-2 md:w-3 md:h-3 rounded-sm bg-primary"></span>
               <span className="text-[9px] md:text-[10px] text-on-surface-variant">Terverifikasi</span>
             </div>
             <div className="flex items-center gap-1">
               <span className="w-2 h-2 md:w-3 md:h-3 rounded-sm bg-error"></span>
               <span className="text-[9px] md:text-[10px] text-on-surface-variant">Ditolak</span>
             </div>
           </div>
        </div>
      </div>

        {/* Activity Feed */}
        <div className="mt-xl mb-xl md:mb-xl pb-md md:pb-0">
        <div className="bg-white border border-outline-variant p-lg rounded-xl shadow-sm">
          <h4 className="text-headline-sm font-bold text-primary mb-md">Aktivitas Terbaru</h4>
           <div className="space-y-md">
             {paginatedActivities.length === 0 ? (
               <p className="text-body-sm text-on-surface-variant">Belum ada aktivitas verifikasi.</p>
             ) : (
               paginatedActivities.map(item => (
                 <div key={item.id} className="flex gap-sm items-start">
                   <div
                     className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${
                       item.status === 'verified' ? 'bg-green-100 text-green-600' : 'bg-error-container text-on-error-container'
                     }`}
                   >
                     <span className="material-symbols-outlined text-sm">
                       {item.status === 'verified' ? 'check_circle' : 'cancel'}
                     </span>
                   </div>
                   <div className="flex-1">
                     <p className="text-body-sm font-bold">
                       {item.status === 'verified' ? 'Verifikasi Berhasil' : 'Pengajuan Ditolak'}
                     </p>
                     <p className="text-xs text-on-surface-variant">
                       Permohonan {item.nama_lengkap} ({item.id.slice(0, 8).toUpperCase()})
                     </p>
                     <p className="text-[10px] text-outline mt-1">{formatDateTime(item.updated_at)}</p>
                   </div>
                    <button onClick={() => openDetail(item)} className="px-md py-xs bg-primary text-on-primary text-label-sm rounded-lg hover:bg-primary-container transition-all flex-shrink-0">
                      Lihat
                    </button>
                 </div>
               ))
             )}
           </div>
           {totalActivityPages > 1 && (
             <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0 mt-md pt-md border-t border-outline-variant">
               <button
                 type="button"
                 onClick={() => setActivityPage((p) => Math.max(1, p - 1))}
                 disabled={safeActivityPage <= 1}
                 className="w-full md:w-auto px-md py-xs rounded-lg border border-outline-variant text-label-md font-label-md text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-low transition-colors"
               >
                 Sebelumnya
               </button>
               <span className="text-label-sm text-on-surface-variant">
                 Halaman {safeActivityPage} dari {totalActivityPages}
               </span>
               <button
                 type="button"
                 onClick={() => setActivityPage((p) => Math.min(totalActivityPages, p + 1))}
                 disabled={safeActivityPage >= totalActivityPages}
                 className="w-full md:w-auto px-md py-xs rounded-lg border border-outline-variant text-label-md font-label-md text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-low transition-colors"
               >
                 Selanjutnya
               </button>
             </div>
           )}
        </div>
      </div>

       {/* Mobile Nav Bar (Bottom) */}
       <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant flex justify-around items-center py-xs z-50">
         <button onClick={() => navigate('/verifikator')} className="flex flex-col items-center gap-1 text-primary">
           <span className="material-symbols-outlined">dashboard</span>
           <span className="text-[10px] font-bold">Beranda</span>
         </button>
         <button onClick={() => navigate('/pengajuan-masuk')} className="flex flex-col items-center gap-1 text-on-surface-variant">
           <span className="material-symbols-outlined">description</span>
           <span className="text-[10px]">Berkas</span>
         </button>
         <button onClick={() => navigate('/laporanverifikator')} className="flex flex-col items-center gap-1 text-on-surface-variant">
           <span className="material-symbols-outlined">history</span>
           <span className="text-[10px]">Riwayat</span>
         </button>
         <button onClick={() => navigate('/profil')} className="flex flex-col items-center gap-1 text-on-surface-variant">
           <span className="material-symbols-outlined">person</span>
           <span className="text-[10px]">Profil</span>
         </button>
        </nav>

      {detailOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={closeModal}>
          <div className="w-full md:w-[520px] max-h-[90vh] flex flex-col bg-surface-container-lowest rounded-lg shadow-xl overflow-y-auto popup-enter" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 md:p-md border-b border-outline-variant">
              <h3 className="text-headline-sm font-headline-sm text-primary">Informasi Detail Pengajuan</h3>
              <button onClick={closeModal} className="p-xs hover:bg-surface-container-low rounded-lg transition-colors">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>
            <div className="p-3 md:p-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-secondary-container/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-secondary">
                    {selectedItem.nama_lengkap ? selectedItem.nama_lengkap.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
                  </span>
                </div>
                <div>
                  <p className="font-body-md text-body-md text-on-surface font-bold">{selectedItem.nama_lengkap}</p>
                  <p className="text-label-sm text-on-surface-variant">NIP: {selectedItem.nip}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-label-xs text-on-surface-variant mb-1">Jabatan</p>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium">{selectedItem.jabatan || '-'}</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-label-xs text-on-surface-variant mb-1">Satuan Kerja</p>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium">{selectedItem.satker || '-'}</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-label-xs text-on-surface-variant mb-1">Status</p>
                  <span className={`inline-flex items-center gap-xs px-sm py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(selectedItem.status, selectedItem)}`}>
                    {getStatusLabel(selectedItem.status, selectedItem)}
                  </span>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3">
                  <p className="text-label-xs text-on-surface-variant mb-1">Dibuat</p>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium">{selectedItem.created_at ? formatDateTime(selectedItem.created_at) : '-'}</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3 md:col-span-2">
                  <p className="text-label-xs text-on-surface-variant mb-1">Diperbarui</p>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium">{selectedItem.updated_at ? formatDateTime(selectedItem.updated_at) : '-'}</p>
                </div>
              </div>

              {selectedItem.status === 'rejected' && selectedItem.alasan_ditolak && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-label-xs text-red-700 mb-1 font-semibold">Alasan Penolakan</p>
                  <p className="font-body-sm text-body-sm text-red-800">{selectedItem.alasan_ditolak}</p>
                </div>
              )}
              {selectedItem.status === 'submitted' && selectedItem.alasan_revisi && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-label-xs text-orange-700 mb-1 font-semibold">Catatan Revisi</p>
                  <p className="font-body-sm text-body-sm text-orange-800">{selectedItem.alasan_revisi}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
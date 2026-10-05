import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getPengajuanList } from '../lib/supabase-helpers'
import ProfilPopup from '../components/ProfilPopup'

export default function LaporanVerifikator() {
  const [pengajuanList, setPengajuanList] = React.useState([])
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [reportPage, setReportPage] = React.useState(1)
  const REPORT_PER_PAGE = 5
  const [profileOpen, setProfileOpen] = React.useState(false)
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
    setReportPage(1)
  }, [statusFilter])

  const loadData = async () => {
    try {
      const data = await getPengajuanList()
      setPengajuanList(data || [])
    } catch (err) {
      console.error('Failed to load pengajuan:', err)
    }
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

  const getProcessingDays = (created, updated) => {
    if (!created || !updated) return '-'
    const c = new Date(created)
    const u = new Date(updated)
    const diff = Math.floor((u - c) / (1000 * 60 * 60 * 24))
    if (diff === 0) return '< 1 hari'
    return `${diff} hari`
  }

  const getStatusBadge = (status) => {
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

  const getStatusLabel = (status) => {
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

  const handleExport = async () => {
    try {
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

      const rows = (pengajuanList || []).map(item => {
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

      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `rekap-pengajuan-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Gagal mengekspor data:', err)
      alert('Gagal mengunduh rekap. Silakan coba lagi.')
    }
  }

  const totalReportPages = Math.max(1, Math.ceil(filtered.length / REPORT_PER_PAGE))
  const safeReportPage = Math.min(reportPage, totalReportPages)
  const reportStartIdx = (safeReportPage - 1) * REPORT_PER_PAGE
  const paginatedReport = filtered.slice(reportStartIdx, reportStartIdx + REPORT_PER_PAGE)

  return (
    <div className="pb-16 md:pb-0">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-xs">Ringkasan Laporan</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Pantau performa verifikasi dan ringkasan berkas pemohon yang telah diproses.
          </p>
        </div>
        <div className="flex items-center gap-sm text-label-sm text-on-surface-variant bg-surface-container-low px-sm py-xs rounded border border-outline-variant">
          <span className="material-symbols-outlined text-sm">calendar_today</span>
          <span>{formatDate(new Date().toISOString())}</span>
        </div>
      </div>

       <div className="max-w-[950px] mx-auto bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm mb-xl">
        <div className="p-md md:p-lg border-b border-outline-variant flex flex-col md:flex-row md:items-center justify-between gap-md bg-surface-container-lowest">
          <div>
            <h3 className="text-headline-sm font-headline-sm text-primary">Detail Laporan Verifikasi</h3>
            <p className="text-body-sm text-on-surface-variant">Data lengkap status verifikasi berkas pemohon.</p>
          </div>
          <div className="flex flex-wrap items-center gap-sm">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-outline-variant rounded-lg pl-md pr-xl py-sm text-label-md text-on-surface-variant focus:ring-primary focus:border-primary cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="submitted">Menunggu Verifikasi</option>
              <option value="verified">Terverifikasi</option>
              <option value="rejected">Ditolak</option>
            </select>
            <button onClick={handleExport} className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary-container transition-colors">
              <span className="material-symbols-outlined text-sm">download</span>
              Unduh Rekap
            </button>
          </div>
        </div>

        

        <div>
          <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low text-label-md text-primary font-bold uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="pl-4 md:pl-md pr-2 md:pr-md py-sm border-b border-outline-variant">Pemohon</th>
                  <th className="px-2 md:px-md py-sm border-b border-outline-variant hidden md:table-cell">Instansi</th>
                  <th className="px-2 md:px-md py-sm border-b border-outline-variant hidden md:table-cell">Jabatan</th>
                  <th className="px-2 md:px-md py-sm border-b border-outline-variant hidden sm:table-cell">Tgl Pengajuan</th>
                  <th className="px-2 md:px-md py-sm border-b border-outline-variant hidden sm:table-cell">Tgl Selesai</th>
                  <th className="px-2 md:px-md py-sm border-b border-outline-variant text-center">Status</th>
                  <th className="pl-4 md:pl-md pr-2 md:pr-md py-sm border-b border-outline-variant text-right">Waktu Proses</th>
                </tr>
              </thead>
              <tbody className="text-body-sm text-on-surface divide-y divide-outline-variant">
                {paginatedReport.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-2 md:px-md py-sm text-center text-on-surface-variant">
                      Tidak ada data laporan untuk filter ini.
                    </td>
                  </tr>
                ) : (
                  paginatedReport.map(item => (
                    <tr key={item.id} className="hover:bg-surface-container-low transition-colors group">
                       <td className="pl-4 md:pl-md pr-2 md:pr-md py-sm">
                          <div className="min-w-0">
                            <p className="font-bold">{item.nama_lengkap}</p>
                            <p className="text-[10px] text-on-surface-variant">ID: {item.id.slice(0, 8).toUpperCase()}</p>
                          </div>
                        </td>
                      <td className="px-2 md:px-md py-sm hidden md:table-cell">{item.satker || '-'}</td>
                      <td className="px-2 md:px-md py-sm hidden md:table-cell">{item.jabatan || '-'}</td>
                      <td className="px-2 md:px-md py-sm hidden sm:table-cell">{formatDateTime(item.created_at)}</td>
                      <td className="px-2 md:px-md py-sm hidden sm:table-cell">
                        {item.status === 'submitted' || item.status === 'draft' ? '-' : formatDateTime(item.updated_at)}
                      </td>
                      <td className="px-2 md:px-md py-sm text-center">
                        <span
                          className={`inline-flex items-center gap-xs px-sm py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(item.status)}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'verified'
                                ? 'bg-green-500'
                                : item.status === 'rejected'
                                  ? 'bg-error'
                                  : 'bg-secondary'
                            }`}
                          ></span>
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td className="pl-4 md:pl-md pr-2 md:pr-md py-sm text-right text-label-sm text-on-surface-variant">
                        {item.status === 'verified' || item.status === 'rejected'
                          ? getProcessingDays(item.created_at, item.updated_at)
                          : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        <div className="p-md bg-surface-container-low border-t border-outline-variant flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0">
          <p className="text-label-xs md:text-label-sm text-on-surface-variant text-center md:text-left">Menampilkan {paginatedReport.length} dari {filtered.length} permohonan</p>
          {totalReportPages > 1 && (
            <div className="flex items-center gap-1 md:gap-base">
              <button
                type="button"
                onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                disabled={safeReportPage <= 1}
                className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant bg-white text-on-surface-variant disabled:opacity-50 hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
              </button>
              {Array.from({ length: totalReportPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setReportPage(page)}
                  className={`w-8 h-8 flex items-center justify-center rounded text-label-sm font-bold ${
                    page === safeReportPage
                      ? 'bg-primary text-on-primary'
                      : 'border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container transition-colors'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setReportPage((p) => Math.min(totalReportPages, p + 1))}
                disabled={safeReportPage >= totalReportPages}
                className="w-8 h-8 flex items-center justify-center rounded border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Nav Bar (Bottom) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant flex justify-around items-center py-xs z-50">
        <button onClick={() => navigate('/verifikator')} className="flex flex-col items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px]">Beranda</span>
        </button>
        <button onClick={() => navigate('/pengajuan-masuk')} className="flex flex-col items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined">description</span>
          <span className="text-[10px]">Berkas</span>
        </button>
        <button onClick={() => {}} className="flex flex-col items-center gap-1 text-primary">
          <span className="material-symbols-outlined">history</span>
          <span className="text-[10px] font-bold">Riwayat</span>
        </button>
        <button onClick={() => setProfileOpen((prev) => !prev)} className="flex flex-col items-center gap-1 text-on-surface-variant relative">
          <span className="material-symbols-outlined">person</span>
          <span className="text-[10px]">Profil</span>
        </button>
      </nav>

      <ProfilPopup open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  )
}

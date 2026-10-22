import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getPpkList, getPpList } from '../lib/supabase-helpers'
import { getRingkasanDokumen } from '../lib/dokumen-syarat'
import { DokumenSyaratBadges } from '../components/DokumenSyaratField'
import ProfilPopup from '../components/ProfilPopup'

const REPORT_PER_PAGE = 8

const JENIS_META = {
  ppk: {
    label: 'PPK',
    nama: 'Pejabat Pembuat Komitmen',
    icon: 'badge',
    chip: 'bg-secondary-container/60 text-on-secondary-container border-secondary-container',
    avatar: 'bg-secondary-container/70 text-on-secondary-container',
  },
  pp: {
    label: 'PP',
    nama: 'Pejabat Pengadaan',
    icon: 'workspaces',
    chip: 'bg-green-50 text-green-700 border-green-200',
    avatar: 'bg-green-100 text-green-700',
  },
}

const JENIS_TABS = [
  { value: 'all', label: 'Semua' },
  { value: 'ppk', label: 'PPK' },
  { value: 'pp', label: 'Pejabat Pengadaan' },
]

const STATUS_TABS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'aktif', label: 'Aktif' },
  { value: 'non-aktif', label: 'Non-Aktif' },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '-'
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getStatusBadge = (status) => {
  if (status === 'aktif') {
    return 'bg-green-50 text-green-700 border border-green-200'
  }
  return 'bg-red-50 text-red-700 border border-red-200'
}

const buildPageNumbers = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages = new Set([1, total, current, current - 1, current + 1])
  const sorted = Array.from(pages).filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)

  const result = []
  let previous = 0
  sorted.forEach((page) => {
    if (previous && page - previous > 1) result.push('gap')
    result.push(page)
    previous = page
  })
  return result
}

export default function LaporanVerifikator() {
  const [ppkList, setPpkList] = React.useState([])
  const [ppList, setPpList] = React.useState([])
  const [jenisFilter, setJenisFilter] = React.useState('all')
  const [statusFilter, setStatusFilter] = React.useState('all')
  const [searchTerm, setSearchTerm] = React.useState('')
  const [reportPage, setReportPage] = React.useState(1)
  const [loading, setLoading] = React.useState(true)
  const [errorMessage, setErrorMessage] = React.useState('')
  const [exporting, setExporting] = React.useState(false)
  const [detailItem, setDetailItem] = React.useState(null)
  const [profileOpen, setProfileOpen] = React.useState(false)
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
    setReportPage(1)
  }, [jenisFilter, statusFilter, searchTerm])

  const loadData = async () => {
    setLoading(true)
    setErrorMessage('')
    try {
      const [ppkData, ppData] = await Promise.all([getPpkList(), getPpList()])
      setPpkList(ppkData || [])
      setPpList(ppData || [])
    } catch (err) {
      console.error('Failed to load PPK/PP data:', err)
      setErrorMessage(err?.message || 'Gagal memuat data PPK dan Pejabat Pengadaan.')
    } finally {
      setLoading(false)
    }
  }

  const allRows = React.useMemo(() => {
    const mapRow = (item, jenis) => ({
      id: `${jenis}-${item.id}`,
      jenis,
      nama_lengkap: item.nama_lengkap || '-',
      nip: item.nip || '-',
      jabatan: item.jabatan || '-',
      satker: (item.satker || '-').trim() || '-',
      bidang: item.nama_bidang || '-',
      status_aktif: item.status_aktif === 'non-aktif' ? 'non-aktif' : 'aktif',
      alasan_penonaktifan: item.alasan_penonaktifan || '',
      dokumen_syarat: item.dokumen_syarat || '',
      created_at: item.created_at,
      updated_at: item.updated_at,
    })

    return [...ppkList.map((item) => mapRow(item, 'ppk')), ...ppList.map((item) => mapRow(item, 'pp'))]
  }, [ppkList, ppList])

  const stats = React.useMemo(() => {
    const ppk = allRows.filter((row) => row.jenis === 'ppk')
    const pp = allRows.filter((row) => row.jenis === 'pp')
    const nonAktif = allRows.filter((row) => row.status_aktif === 'non-aktif')
    const opd = new Set(allRows.map((row) => row.satker).filter((value) => value && value !== '-'))

    let dokumenLengkap = 0
    let dokumenTotal = 0
    allRows.forEach((row) => {
      const ringkasan = getRingkasanDokumen(row.dokumen_syarat, row.jabatan, row.jenis)
      if (ringkasan.total > 0) {
        dokumenTotal++
        if (ringkasan.lengkap === ringkasan.total) dokumenLengkap++
      }
    })

    return {
      total: allRows.length,
      totalPpk: ppk.length,
      totalPp: pp.length,
      ppkAktif: ppk.filter((row) => row.status_aktif === 'aktif').length,
      ppAktif: pp.filter((row) => row.status_aktif === 'aktif').length,
      nonAktif: nonAktif.length,
      opd: opd.size,
      dokumenLengkap,
      dokumenTotal,
    }
  }, [allRows])

  const filtered = React.useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase()

    return allRows.filter((row) => {
      if (jenisFilter !== 'all' && row.jenis !== jenisFilter) return false
      if (statusFilter !== 'all' && row.status_aktif !== statusFilter) return false
      if (!keyword) return true

      return [row.nama_lengkap, row.nip, row.satker, row.jabatan]
        .some((field) => String(field || '').toLowerCase().includes(keyword))
    })
  }, [allRows, jenisFilter, statusFilter, searchTerm])

  const rekapOpd = React.useMemo(() => {
    const map = new Map()

    allRows.forEach((row) => {
      const key = row.satker
      if (!map.has(key)) map.set(key, { nama: key, ppk: 0, pp: 0, nonAktif: 0 })
      const entry = map.get(key)
      if (row.jenis === 'ppk') entry.ppk++
      else entry.pp++
      if (row.status_aktif === 'non-aktif') entry.nonAktif++
    })

    return Array.from(map.values()).sort(
      (a, b) => (b.ppk + b.pp) - (a.ppk + a.pp) || a.nama.localeCompare(b.nama, 'id')
    )
  }, [allRows])

  const maxOpd = Math.max(...rekapOpd.map((row) => row.ppk + row.pp), 1)

  const totalReportPages = Math.max(1, Math.ceil(filtered.length / REPORT_PER_PAGE))
  const safeReportPage = Math.min(reportPage, totalReportPages)
  const reportStartIdx = (safeReportPage - 1) * REPORT_PER_PAGE
  const paginatedReport = filtered.slice(reportStartIdx, reportStartIdx + REPORT_PER_PAGE)

  const tabCounts = React.useMemo(() => ({
    all: allRows.length,
    ppk: allRows.filter((row) => row.jenis === 'ppk').length,
    pp: allRows.filter((row) => row.jenis === 'pp').length,
    aktif: allRows.filter((row) => row.status_aktif === 'aktif').length,
    'non-aktif': allRows.filter((row) => row.status_aktif === 'non-aktif').length,
  }), [allRows])

  const handleExport = async () => {
    setExporting(true)
    try {
      const { default: ExcelJS } = await import('exceljs')
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Data PPK & PP')

      worksheet.columns = [
        { header: 'Jenis', key: 'jenis', width: 12 },
        { header: 'Nama Lengkap', key: 'nama_lengkap', width: 26 },
        { header: 'NIP', key: 'nip', width: 20 },
        { header: 'Jabatan', key: 'jabatan', width: 28 },
        { header: 'Satuan Kerja', key: 'satker', width: 32 },
        { header: 'Status Aktif', key: 'status_aktif', width: 14 },
        { header: 'Alasan Penonaktifan', key: 'alasan_penonaktifan', width: 34 },
        { header: 'Dokumen Syarat', key: 'dokumen_syarat', width: 40 },
        { header: 'Kelengkapan Dokumen', key: 'kelengkapan', width: 20 },
        { header: 'Terakhir Diperbarui', key: 'updated_at', width: 22 },
        { header: 'Dibuat', key: 'created_at', width: 22 },
      ]

      worksheet.getRow(1).font = { bold: true }
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      }
      worksheet.views = [{ state: 'frozen', ySplit: 1 }]

      filtered.forEach((row) => {
        const ringkasan = getRingkasanDokumen(row.dokumen_syarat, row.jabatan, row.jenis)
        worksheet.addRow({
          jenis: JENIS_META[row.jenis].label,
          nama_lengkap: row.nama_lengkap,
          nip: row.nip,
          jabatan: row.jabatan,
          satker: row.satker,
          status_aktif: row.status_aktif === 'aktif' ? 'Aktif' : 'Non-Aktif',
          alasan_penonaktifan: row.alasan_penonaktifan || '-',
          dokumen_syarat: ringkasan.labels.join(', ') || '-',
          kelengkapan: ringkasan.total > 0 ? `${ringkasan.lengkap}/${ringkasan.total}` : '-',
          updated_at: row.updated_at ? formatDateTime(row.updated_at) : '-',
          created_at: row.created_at ? formatDateTime(row.created_at) : '-',
        })
      })

      const ringkasanSheet = workbook.addWorksheet('Ringkasan')
      ringkasanSheet.columns = [
        { header: 'Keterangan', key: 'label', width: 30 },
        { header: 'Jumlah', key: 'value', width: 14 },
      ]
      ringkasanSheet.getRow(1).font = { bold: true }
      ringkasanSheet.addRows([
        { label: 'Total PPK', value: stats.totalPpk },
        { label: 'Total Pejabat Pengadaan', value: stats.totalPp },
        { label: 'PPK Aktif', value: stats.ppkAktif },
        { label: 'Pejabat Pengadaan Aktif', value: stats.ppAktif },
        { label: 'Total Non-Aktif', value: stats.nonAktif },
        { label: 'Satuan Kerja Terdaftar', value: stats.opd },
        { label: 'Dokumen Syarat Lengkap', value: `${stats.dokumenLengkap} dari ${stats.dokumenTotal}` },
      ])

      const opdSheet = workbook.addWorksheet('Rekap per OPD')
      opdSheet.columns = [
        { header: 'Satuan Kerja', key: 'nama', width: 40 },
        { header: 'PPK', key: 'ppk', width: 10 },
        { header: 'PP', key: 'pp', width: 10 },
        { header: 'Non-Aktif', key: 'nonAktif', width: 12 },
        { header: 'Total', key: 'total', width: 10 },
      ]
      opdSheet.getRow(1).font = { bold: true }
      rekapOpd.forEach((row) => {
        opdSheet.addRow({ nama: row.nama, ppk: row.ppk, pp: row.pp, nonAktif: row.nonAktif, total: row.ppk + row.pp })
      })

      const buffer = await workbook.xlsx.writeBuffer()

      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `laporan-data-ppk-pp-${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Gagal mengekspor data:', err)
      alert('Gagal mengunduh laporan. Silakan coba lagi.')
    } finally {
      setExporting(false)
    }
  }

  const renderJenisBadge = (jenis) => {
    const meta = JENIS_META[jenis]
    return (
      <span className={`inline-flex items-center gap-xs px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap shrink-0 ${meta.chip}`}>
        {meta.label}
      </span>
    )
  }

  const renderDokumenBadge = (row) => {
    const ringkasan = getRingkasanDokumen(row.dokumen_syarat, row.jabatan, row.jenis)
    if (ringkasan.total === 0) {
      return <span className="text-[11px] text-on-surface-variant">Belum ada data</span>
    }
    const lengkap = ringkasan.lengkap === ringkasan.total
    return (
      <span
        title={ringkasan.labels.length ? ringkasan.labels.join(', ') : 'Belum ada dokumen'}
        className={`inline-flex items-center gap-xs px-2 py-0.5 rounded-full text-[11px] font-bold border whitespace-nowrap ${
          lengkap
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}
      >
        <span className="material-symbols-outlined text-[12px]">{lengkap ? 'verified' : 'pending'}</span>
        {ringkasan.lengkap}/{ringkasan.total} dokumen
      </span>
    )
  }

  const statCards = [
    {
      key: 'ppk',
      label: 'Pejabat Pembuat Komitmen',
      value: stats.totalPpk,
      icon: 'badge',
      iconClass: 'text-secondary',
      barClass: 'bg-secondary',
      ratio: stats.total ? (stats.totalPpk / stats.total) * 100 : 0,
      hint: `${stats.ppkAktif} aktif`,
    },
    {
      key: 'pp',
      label: 'Pejabat Pengadaan',
      value: stats.totalPp,
      icon: 'workspaces',
      iconClass: 'text-green-500',
      barClass: 'bg-green-500',
      ratio: stats.total ? (stats.totalPp / stats.total) * 100 : 0,
      hint: `${stats.ppAktif} aktif`,
    },
    {
      key: 'non-aktif',
      label: 'Non-Aktif',
      value: stats.nonAktif,
      icon: 'person_off',
      iconClass: 'text-red-500',
      barClass: 'bg-red-500',
      ratio: stats.total ? (stats.nonAktif / stats.total) * 100 : 0,
      hint: 'perlu mutasi',
    },
    {
      key: 'opd',
      label: 'Satuan Kerja Terdaftar',
      value: stats.opd,
      icon: 'domain',
      iconClass: 'text-primary',
      barClass: 'bg-primary',
      ratio: 100,
      hint: 'OPD terdata',
    },
  ]

  return (
    <div className="pb-24 md:pb-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-lg">
        <div>
          <div className="flex items-center gap-xs mb-xs">
            <span className="material-symbols-outlined text-sm text-secondary">assessment</span>
            <span className="text-label-sm uppercase tracking-wider text-secondary font-bold">Modul Data Pejabat</span>
          </div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-xs">Laporan Data PPK dan Pejabat Pengadaan</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Rekap data Pejabat Pembuat Komitmen (PPK) dan Pejabat Pengadaan (PP) beserta status keaktifan dan dokumen persyaratannya.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-sm">
          <div className="flex items-center gap-sm text-label-sm text-on-surface-variant bg-surface-container-low px-sm py-xs rounded border border-outline-variant">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            <span>{formatDate(new Date().toISOString())}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-xs px-md py-sm bg-white border border-outline-variant text-label-md text-on-surface-variant rounded-lg hover:bg-surface-container-low transition-colors disabled:opacity-60"
          >
            <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
            Muat Ulang
          </button>
        </div>
      </div>

      {/* Ringkasan angka */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-sm mb-lg">
        {statCards.map((card) => (
          <div
            key={card.key}
            className="bg-white p-md rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
              <span className={`material-symbols-outlined text-[56px] ${card.iconClass}`}>{card.icon}</span>
            </div>
            <div className="flex items-center gap-xs mb-xs">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center bg-surface-container ${card.iconClass}`}>
                <span className="material-symbols-outlined text-sm">{card.icon}</span>
              </span>
              <p className="text-label-sm font-bold text-on-surface-variant">{card.label}</p>
            </div>
            <div className="flex items-baseline gap-xs">
              <span className="text-headline-md font-black text-primary leading-none">{String(card.value).padStart(2, '0')}</span>
              <span className="text-[11px] text-on-surface-variant">{card.hint}</span>
            </div>
            <div className="mt-sm h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
              <div
                className={`h-full ${card.barClass} transition-all duration-500`}
                style={{ width: `${Math.min(card.ratio, 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      <div className="w-full max-w-[1280px]">
        {/* Tabel laporan */}
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden shadow-sm mb-lg">
          <div className="p-md border-b border-outline-variant bg-gradient-to-br from-surface-container-low to-white">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-md">
              <div>
                <h3 className="text-headline-sm font-headline-sm text-primary">Daftar Data PPK & PP</h3>
                <p className="text-body-sm text-on-surface-variant">
                  {stats.dokumenTotal > 0
                    ? `${stats.dokumenLengkap} dari ${stats.dokumenTotal} data memiliki dokumen syarat lengkap.`
                    : 'Data-docs syarat belum dilengkapi pada seluruh data.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-sm">
                <div className="relative flex-1 min-w-[200px]">
                  <span className="material-symbols-outlined text-sm absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                    search
                  </span>
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari nama, NIP, instansi..."
                    className="w-full bg-white border border-outline-variant rounded-lg pl-9 pr-3 py-2 text-body-sm text-on-surface placeholder:text-outline focus:ring-primary focus:border-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exporting || filtered.length === 0}
                  className="inline-flex items-center gap-xs px-md py-2 bg-primary text-on-primary rounded-lg font-label-md hover:bg-primary-container transition-colors disabled:opacity-60"
                >
                  <span className={`material-symbols-outlined text-sm ${exporting ? 'animate-spin' : ''}`}>download</span>
                  {exporting ? 'Menyiapkan...' : 'Unduh Laporan'}
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center gap-md mt-md">
              <div className="flex flex-wrap items-center gap-xs">
                {JENIS_TABS.map((tab) => {
                  const active = jenisFilter === tab.value
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setJenisFilter(tab.value)}
                      className={`inline-flex items-center gap-xs px-md py-1 rounded-full text-label-sm font-bold border transition-colors ${
                        active
                          ? 'bg-primary text-on-primary border-primary'
                          : 'bg-white text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`px-1.5 rounded-full text-[10px] ${
                          active ? 'bg-white/20 text-on-primary' : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {tabCounts[tab.value] ?? 0}
                      </span>
                    </button>
                  )
                })}
              </div>
              <div className="hidden md:block w-px h-6 bg-outline-variant"></div>
              <div className="flex flex-wrap items-center gap-xs">
                {STATUS_TABS.map((tab) => {
                  const active = statusFilter === tab.value
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setStatusFilter(tab.value)}
                      className={`inline-flex items-center gap-xs px-md py-1 rounded-full text-label-sm font-bold border transition-colors ${
                        active
                          ? 'bg-secondary text-on-secondary border-secondary'
                          : 'bg-white text-on-surface-variant border-outline-variant hover:bg-surface-container-low'
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`px-1.5 rounded-full text-[10px] ${
                          active ? 'bg-white/20 text-on-secondary' : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {tabCounts[tab.value] ?? 0}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Notifikasi error */}
          {errorMessage && (
            <div className="m-md flex flex-col sm:flex-row sm:items-center gap-sm px-md py-sm bg-red-50 border border-red-200 rounded-lg">
              <span className="material-symbols-outlined text-red-500 shrink-0">error</span>
              <p className="text-body-sm text-red-700 flex-1">{errorMessage}</p>
              <button
                type="button"
                onClick={loadData}
                className="shrink-0 inline-flex items-center gap-xs px-md py-xs bg-white border border-red-200 text-label-md text-red-700 rounded-lg hover:bg-red-100 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Coba Lagi
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && !errorMessage && (
            <div className="p-md space-y-sm">
              {Array.from({ length: 5 }).map((_, rowIndex) => (
                <div key={rowIndex} className="flex items-center gap-md animate-pulse">
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-1/3 rounded bg-surface-container"></div>
                    <div className="h-2.5 w-1/5 rounded bg-surface-container"></div>
                  </div>
                  <div className="hidden md:block h-3 w-28 rounded bg-surface-container"></div>
                  <div className="h-6 w-24 rounded-full bg-surface-container"></div>
                </div>
              ))}
            </div>
          )}

          {/* Tabel desktop */}
          {!loading && !errorMessage && (
            <div className="hidden xl:block overflow-x-auto custom-scrollbar">
              <table className="w-full table-fixed text-left border-collapse">
                <colgroup>
                  <col className="w-[42%]" />
                  <col className="w-[20%]" />
                  <col className="w-[22%]" />
                  <col className="w-[16%]" />
                </colgroup>
                <thead className="bg-surface-container-low text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">
                  <tr>
                    <th className="pl-md pr-2 py-2 border-b border-outline-variant">Nama & Jabatan</th>
                    <th className="px-2 py-2 border-b border-outline-variant">NIP</th>
                    <th className="px-2 py-2 border-b border-outline-variant">Satuan Kerja</th>
                    <th className="pl-2 pr-md py-2 border-b border-outline-variant text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="text-body-sm text-on-surface divide-y divide-outline-variant/60">
                  {paginatedReport.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-md py-xl text-center">
                        <span className="material-symbols-outlined text-[40px] text-outline block mb-xs">inbox</span>
                        <p className="text-body-sm font-bold text-on-surface">Tidak ada data PPK & PP</p>
                        <p className="text-label-sm text-on-surface-variant mt-1">
                          {allRows.length === 0
                            ? 'Belum ada data PPK maupun Pejabat Pengadaan di sistem.'
                            : 'Ubah kata kunci atau filter untuk melihat data lain.'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedReport.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => setDetailItem(row)}
                        className="hover:bg-surface-container-low transition-colors cursor-pointer"
                      >
                        <td className="pl-md pr-2 py-3">
                          <div className="min-w-0">
                            <p className="font-bold text-primary truncate" title={row.nama_lengkap}>{row.nama_lengkap}</p>
                            <div className="flex items-center gap-xs mt-0.5">
                              {renderJenisBadge(row.jenis)}
                              <span className="text-[11px] text-on-surface-variant truncate" title={row.jabatan}>{row.jabatan}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-on-surface-variant whitespace-nowrap">{row.nip}</td>
                        <td className="px-2 py-3 text-on-surface-variant max-w-[190px] truncate" title={row.satker}>{row.satker}</td>
                        <td className="pl-2 pr-md py-3">
                          <span className={`inline-flex items-center gap-xs px-sm py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(row.status_aktif)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${row.status_aktif === 'aktif' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            {row.status_aktif === 'aktif' ? 'Aktif' : 'Non-Aktif'}
                          </span>
                          {row.status_aktif === 'non-aktif' && row.alasan_penonaktifan && (
                            <p className="text-[11px] text-red-600 mt-1 max-w-[160px] truncate" title={row.alasan_penonaktifan}>
                              {row.alasan_penonaktifan}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Kartu mobile */}
          {!loading && !errorMessage && (
            <div className="xl:hidden divide-y divide-outline-variant/60">
              {paginatedReport.length === 0 ? (
                <div className="px-md py-xl text-center">
                  <span className="material-symbols-outlined text-[40px] text-outline block mb-xs">inbox</span>
                  <p className="text-body-sm font-bold text-on-surface">Tidak ada data PPK & PP</p>
                  <p className="text-label-sm text-on-surface-variant mt-1">
                    {allRows.length === 0
                      ? 'Belum ada data PPK maupun Pejabat Pengadaan di sistem.'
                      : 'Ubah kata kunci atau filter untuk melihat data lain.'}
                  </p>
                </div>
              ) : (
                paginatedReport.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setDetailItem(row)}
                    className="w-full text-left p-md space-y-xs hover:bg-surface-container-low transition-colors"
                  >
                    <div className="flex items-start justify-between gap-sm">
                      <div className="min-w-0 flex-1">
                        <p className="text-body-sm font-bold text-primary truncate" title={row.nama_lengkap}>{row.nama_lengkap}</p>
                        <p className="text-[11px] text-on-surface-variant truncate">NIP {row.nip}</p>
                      </div>
                      {renderJenisBadge(row.jenis)}
                    </div>
                    <div className="grid grid-cols-2 gap-x-md gap-y-xs text-[11px]">
                      <div>
                        <p className="text-on-surface-variant">Satuan Kerja</p>
                        <p className="text-on-surface font-medium truncate">{row.satker}</p>
                      </div>
                      <div>
                        <p className="text-on-surface-variant">Jabatan</p>
                        <p className="text-on-surface font-medium truncate">{row.jabatan}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-xs">
                      <span className={`inline-flex items-center gap-xs px-sm py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(row.status_aktif)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${row.status_aktif === 'aktif' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {row.status_aktif === 'aktif' ? 'Aktif' : 'Non-Aktif'}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Pagination */}
          {!loading && !errorMessage && filtered.length > 0 && (
            <div className="px-md py-3 bg-surface-container-low border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-label-sm text-on-surface-variant text-center sm:text-left">
                Menampilkan <span className="font-bold text-primary">{reportStartIdx + 1}-{reportStartIdx + paginatedReport.length}</span> dari{' '}
                <span className="font-bold text-primary">{filtered.length}</span> data
              </p>
              {totalReportPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setReportPage((p) => Math.max(1, p - 1))}
                    disabled={safeReportPage <= 1}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant bg-white text-on-surface-variant disabled:opacity-40 hover:bg-surface-container transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_left</span>
                  </button>
                  {buildPageNumbers(safeReportPage, totalReportPages).map((page, index) =>
                    page === 'gap' ? (
                      <span key={`gap-${index}`} className="px-1 text-on-surface-variant text-label-sm">...</span>
                    ) : (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setReportPage(page)}
                        className={`min-w-8 h-8 px-1 flex items-center justify-center rounded-lg text-label-sm font-bold transition-colors ${
                          page === safeReportPage
                            ? 'bg-primary text-on-primary'
                            : 'border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    onClick={() => setReportPage((p) => Math.min(totalReportPages, p + 1))}
                    disabled={safeReportPage >= totalReportPages}
                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-outline-variant bg-white text-on-surface-variant hover:bg-surface-container transition-colors disabled:opacity-40"
                  >
                    <span className="material-symbols-outlined text-sm">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rekap per satuan kerja */}
        <div className="bg-white border border-outline-variant rounded-xl p-lg shadow-sm">
          <div className="flex items-start justify-between gap-sm mb-md">
            <div>
              <h3 className="text-headline-sm font-headline-sm text-primary">Rekap per Satuan Kerja</h3>
              <p className="text-body-sm text-on-surface-variant">Sebaran penempatan PPK dan PP pada setiap OPD.</p>
            </div>
            <span className="inline-flex items-center gap-xs px-3 py-1 rounded-full bg-primary-container/70 border border-primary-fixed text-label-sm font-bold text-on-primary-container shrink-0">
              <span className="material-symbols-outlined text-sm">domain</span>
              {rekapOpd.length} OPD
            </span>
          </div>

          {rekapOpd.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Belum ada data PPK/PP.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
              {rekapOpd.map((row) => (
                <div key={row.nama} className="p-md rounded-lg border border-outline-variant bg-gradient-to-br from-surface-container-low to-white">
                  <div className="flex items-center justify-between gap-2 mb-xs">
                    <span className="text-body-sm font-bold text-primary truncate" title={row.nama}>{row.nama}</span>
                    <span className="text-label-sm font-black text-primary shrink-0">{row.ppk + row.pp}</span>
                  </div>
                  <div className="h-2.5 bg-surface-container rounded-full overflow-hidden flex">
                    {row.ppk > 0 && (
                      <div className="h-full bg-secondary transition-all duration-500" style={{ width: `${(row.ppk / maxOpd) * 100}%` }} title={`PPK: ${row.ppk}`}></div>
                    )}
                    {row.pp > 0 && (
                      <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${(row.pp / maxOpd) * 100}%` }} title={`PP: ${row.pp}`}></div>
                    )}
                    {row.nonAktif > 0 && (
                      <div className="h-full bg-red-400 transition-all duration-500" style={{ width: `${(row.nonAktif / maxOpd) * 100}%` }} title={`Non-Aktif: ${row.nonAktif}`}></div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-xs mt-xs">
                    <span className="text-[10px] text-on-surface-variant">PPK {row.ppk}</span>
                    <span className="text-[10px] text-on-surface-variant">PP {row.pp}</span>
                    {row.nonAktif > 0 && <span className="text-[10px] text-red-500 font-bold">Non-Aktif {row.nonAktif}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-md pt-md border-t border-outline-variant">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-secondary"></span>
              <span className="text-[10px] text-on-surface-variant">PPK</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-green-500"></span>
              <span className="text-[10px] text-on-surface-variant">PP</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-400"></span>
              <span className="text-[10px] text-on-surface-variant">Non-Aktif</span>
            </span>
          </div>
        </div>
      </div>

      {/* Modal detail */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4" onClick={() => setDetailItem(null)}>
          <div
            className="w-full md:w-[560px] max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden popup-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-md py-sm border-b border-outline-variant/60 bg-surface-container-lowest">
              <div className="flex items-center gap-sm min-w-0">
                <span className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${JENIS_META[detailItem.jenis].avatar}`}>
                  <span className="material-symbols-outlined">{JENIS_META[detailItem.jenis].icon}</span>
                </span>
                <div className="min-w-0">
                  <h3 className="text-headline-sm font-headline-sm text-primary truncate">{detailItem.nama_lengkap}</h3>
                  <p className="text-label-sm text-on-surface-variant">{JENIS_META[detailItem.jenis].nama}</p>
                </div>
              </div>
              <button onClick={() => setDetailItem(null)} className="p-xs hover:bg-surface-container-low rounded-full transition-colors shrink-0">
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            <div className="p-md space-y-md overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
                <div className="bg-surface-container-low rounded-xl p-sm">
                  <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">NIP</p>
                  <p className="text-body-sm text-on-surface font-medium">{detailItem.nip}</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-sm">
                  <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Jabatan</p>
                  <p className="text-body-sm text-on-surface font-medium">{detailItem.jabatan}</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-sm">
                  <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Satuan Kerja</p>
                  <p className="text-body-sm text-on-surface font-medium">{detailItem.satker}</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-sm">
                  <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Bidang/Bagian</p>
                  <p className="text-body-sm text-on-surface font-medium">{detailItem.bidang}</p>
                </div>
                <div className="bg-surface-container-low rounded-xl p-sm">
                  <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Status Aktif</p>
                  <span className={`inline-flex items-center gap-xs px-sm py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(detailItem.status_aktif)}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${detailItem.status_aktif === 'aktif' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    {detailItem.status_aktif === 'aktif' ? 'Aktif' : 'Non-Aktif'}
                  </span>
                </div>
              </div>

              {detailItem.alasan_penonaktifan && (
                <div className="p-md bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-label-sm text-red-700 font-bold mb-xs">Alasan Penonaktifan</p>
                  <p className="text-body-sm text-red-700">{detailItem.alasan_penonaktifan}</p>
                </div>
              )}

              <div className="bg-surface-container-low rounded-xl p-sm">
                <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-xs">Dokumen Persyaratan</p>
                <DokumenSyaratBadges value={detailItem.dokumen_syarat} jabatan={detailItem.jabatan} jenis={detailItem.jenis} />
                {renderDokumenBadge(detailItem)}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm pt-sm border-t border-outline-variant/60">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Tanggal Terdaftar</p>
                  <p className="text-body-sm text-on-surface font-medium">{formatDateTime(detailItem.created_at)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-1">Terakhir Diperbarui</p>
                  <p className="text-body-sm text-on-surface font-medium">{formatDateTime(detailItem.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Nav Bar (Bottom) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant flex justify-around items-center py-xs z-40">
        <button onClick={() => navigate('/verifikator')} className="flex flex-col items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined">dashboard</span>
          <span className="text-[10px]">Beranda</span>
        </button>
        <button onClick={() => navigate('/datappk')} className="flex flex-col items-center gap-1 text-on-surface-variant">
          <span className="material-symbols-outlined">history</span>
          <span className="text-[10px]">Riwayat</span>
        </button>
        <button onClick={() => navigate('/laporanverifikator')} className="flex flex-col items-center gap-1 text-primary">
          <span className="material-symbols-outlined">assessment</span>
          <span className="text-[10px] font-bold">Laporan</span>
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

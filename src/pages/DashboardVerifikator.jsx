import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getSatkerList, getPpkList, getPpList, createPpk, createPp, getBidangList } from '../lib/supabase-helpers'
import DokumenSyaratField, { DokumenSyaratBadges } from '../components/DokumenSyaratField'
import { getDokumenSyaratList, isJabatanPp } from '../lib/dokumen-syarat'
import Toast from '../components/Toast'

export default function DashboardVerifikator() {
  const [ppkList, setPpkList] = React.useState([])
  const [ppList, setPpList] = React.useState([])
  const [ppkppOpen, setPpkppOpen] = React.useState(false)
  const [ppkppForm, setPpkppForm] = React.useState({
    nama_lengkap: '',
    nip: '',
    jabatan: '',
    satker: '',
    bidang: [],
    status_aktif: 'aktif',
    dokumen: [],
  })
  const [satkerList, setSatkerList] = React.useState([])
  const [bidangList, setBidangList] = React.useState([])
  const [loadingBidang, setLoadingBidang] = React.useState(false)
  const [savingPpkpp, setSavingPpkpp] = React.useState(false)
  const [toast, setToast] = React.useState({ open: false, message: '', type: 'success' })
  const [opdDetail, setOpdDetail] = React.useState(null)
  const [detailFilter, setDetailFilter] = React.useState({ type: null, id: null })
  const [ppkHistory, setPpkHistory] = React.useState({})
  const [ppHistory, setPpHistory] = React.useState({})
  const detailOpdPpkRef = React.useRef([])
  const detailOpdPpRef = React.useRef([])
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  const detailOpdPpk = React.useMemo(() => {
    if (!opdDetail) return []
    const target = (opdDetail || '').trim() || '-'
    let result = ppkList.filter(item => ((item.satker || '-').trim() || '-') === target)
    if (detailFilter.type === 'PPK' && detailFilter.id) {
      result = result.filter(item => String(item.id) === String(detailFilter.id))
    }
    return result
  }, [opdDetail, ppkList, detailFilter])

  const detailOpdPp = React.useMemo(() => {
    if (!opdDetail) return []
    const target = (opdDetail || '').trim() || '-'
    let result = ppList.filter(item => ((item.satker || '-').trim() || '-') === target)
    if (detailFilter.type === 'PP' && detailFilter.id) {
      result = result.filter(item => String(item.id) === String(detailFilter.id))
    }
    return result
  }, [opdDetail, ppList, detailFilter])

  React.useEffect(() => {
    detailOpdPpkRef.current = detailOpdPpk
    detailOpdPpRef.current = detailOpdPp
  }, [detailOpdPpk, detailOpdPp, opdDetail])

  React.useEffect(() => {
    if (!opdDetail) return
    let cancelled = false
    const fetchAllHistory = async () => {
      const targets = []
      if (detailFilter.type !== 'PP') {
        detailOpdPpkRef.current.forEach(item => targets.push({ item, table: 'ppk' }))
      }
      if (detailFilter.type !== 'PPK') {
        detailOpdPpRef.current.forEach(item => targets.push({ item, table: 'pp' }))
      }
      for (const { item, table } of targets) {
        if (cancelled) return
        const key = `${table}:${item.id}`
        if (table === 'ppk' ? ppkHistory[key] : ppHistory[key]) continue
        try {
          const { data, error } = await supabase
            .from(`${table}_history`)
            .select('*')
            .eq(`${table}_id`, item.id)
            .order('changed_at', { ascending: false })
            .limit(5)
          const fallback = !error && data && data.length > 0 ? data : (item.catatan_mutasi
            ? [{ changed_at: item.updated_at, jabatan: item.jabatan, satker: item.satker, bidang: item.nilai_bidang || item.bidang, catatan: item.catatan_mutasi }]
            : [])
          if (cancelled) return
          if (table === 'ppk') setPpkHistory(prev => ({ ...prev, [key]: fallback }))
          else setPpHistory(prev => ({ ...prev, [key]: fallback }))
        } catch (e) {
          const fallback = item.catatan_mutasi
            ? [{ changed_at: item.updated_at, jabatan: item.jabatan, satker: item.satker, bidang: item.nilai_bidang || item.bidang, catatan: item.catatan_mutasi }]
            : []
          if (table === 'ppk') setPpkHistory(prev => ({ ...prev, [key]: fallback }))
          else setPpHistory(prev => ({ ...prev, [key]: fallback }))
        }
      }
    }
    fetchAllHistory()
    return () => { cancelled = true }
  }, [opdDetail])

  React.useEffect(() => {
    if (loading) return
    if (!user) {
      navigate('/loginverifikator')
      return
    }
    loadData()
  }, [user, loading, navigate])

   const loadData = async () => {
    try {
      const [ppkData, ppData] = await Promise.all([getPpkList(), getPpList()])
      setPpkList(ppkData || [])
      setPpList(ppData || [])
    } catch (err) {
      console.error('Failed to load PPK/PP data:', err)
    }
  }

  const openOpdDetail = (namaOpd, filter = null) => {
    setOpdDetail(namaOpd)
    setDetailFilter(filter || { type: null, id: null })
    setPpkHistory({})
    setPpHistory({})
  }

  const closeOpdDetail = () => {
    setOpdDetail(null)
    setDetailFilter({ type: null, id: null })
    setPpkHistory({})
    setPpHistory({})
  }

  const openPpkppModal = async () => {
    setPpkppForm({
      nama_lengkap: '',
      nip: '',
      jabatan: 'Pejabat Pembuat Komitmen (PPK)',
      satker: '',
      bidang: [],
      status_aktif: 'aktif',
      dokumen: [],
    })
    setPpkppOpen(true)

    if (satkerList.length === 0) {
      try {
        const data = await getSatkerList()
        setSatkerList(data || [])
      } catch (err) {
        console.error('Failed to load satker:', err)
      }
    }
  }

  const closePpkppModal = () => {
    setPpkppOpen(false)
  }

  const handleJabatanChange = (jabatan) => {
    const allowedKeys = getDokumenSyaratList(jabatan).map(doc => doc.key)
    setPpkppForm(prev => ({
      ...prev,
      jabatan,
      dokumen: prev.dokumen.filter(key => allowedKeys.includes(key)),
    }))
  }

  const SATKER_BIDANG_MAP = React.useMemo(() => ({}), [])

  const handleSatkerChange = async (value) => {
    setPpkppForm(prev => ({ ...prev, satker: value, bidang: [] }))
    if (!value) {
      setBidangList([])
      return
    }
    setLoadingBidang(true)
    try {
      const data = await getBidangList(value)
      setBidangList(data || [])
    } catch (err) {
      console.error('Error loading bidang:', err)
      setBidangList([])
    } finally {
      setLoadingBidang(false)
    }
  }

  const handleSavePpkpp = async (e) => {
    e.preventDefault()

    if (!ppkppForm.nama_lengkap.trim() || !ppkppForm.nip.trim()) {
      setToast({ open: true, message: 'Nama Lengkap dan NIP wajib diisi', type: 'error' })
      return
    }

    setSavingPpkpp(true)
    try {
      const payload = { ...ppkppForm, dokumen_syarat: ppkppForm.dokumen }
      const isPp = isJabatanPp(ppkppForm.jabatan)

      if (isPp) {
        await createPp(payload)
      } else {
        await createPpk(payload)
      }
      setPpkppOpen(false)
      loadData()
      setToast({
        open: true,
        message: `Data ${isPp ? 'PP' : 'PPK'} berhasil disimpan`,
        type: 'success',
      })
    } catch (err) {
      setToast({ open: true, message: err.message || 'Gagal menyimpan data', type: 'error' })
    } finally {
      setSavingPpkpp(false)
    }
  }

  const ppkStats = React.useMemo(() => {
    const total = ppkList.length
    const nonAktif = ppkList.filter(item => item.status_aktif === 'non-aktif').length
    return { total, nonAktif, aktif: total - nonAktif }
  }, [ppkList])

  const ppStats = React.useMemo(() => {
    const total = ppList.length
    const nonAktif = ppList.filter(item => item.status_aktif === 'non-aktif').length
    return { total, nonAktif, aktif: total - nonAktif }
  }, [ppList])

  const rekapPpkPp = React.useMemo(() => {
    const total = ppkStats.total + ppStats.total
    const nonAktif = ppkStats.nonAktif + ppStats.nonAktif
    return { total, nonAktif, aktif: total - nonAktif }
  }, [ppkStats, ppStats])

  const komposisi = React.useMemo(() => {
    const slices = [
      { label: 'PPK Aktif', value: ppkStats.aktif, color: '#1e3a8a' },
      { label: 'PPK Non-Aktif', value: ppkStats.nonAktif, color: '#ef4444' },
      { label: 'PP Aktif', value: ppStats.aktif, color: '#22c55e' },
      { label: 'PP Non-Aktif', value: ppStats.nonAktif, color: '#f59e0b' },
    ]

    const total = slices.reduce((sum, slice) => sum + slice.value, 0)
    let acc = 0

    const stops = slices.map((slice) => {
      const start = total ? (acc / total) * 360 : 0
      acc += slice.value
      const end = total ? (acc / total) * 360 : 0
      return `${slice.color} ${start}deg ${end}deg`
    })

    return {
      slices,
      total,
      gradient: total ? `conic-gradient(${stops.join(', ')})` : 'conic-gradient(#e0e0e0 0deg 360deg)',
    }
  }, [ppkStats, ppStats])

  const rekapPerOpd = React.useMemo(() => {
    const map = new Map()

    const add = (nama, jenis) => {
      const key = (nama || '-').trim() || '-'
      if (!map.has(key)) {
        map.set(key, { nama: key, ppk: 0, pp: 0 })
      }
      map.get(key)[jenis] += 1
    }

    ppkList.forEach(item => add(item.satker, 'ppk'))
    ppList.forEach(item => add(item.satker, 'pp'))

    return Array.from(map.values()).sort(
      (a, b) => (b.ppk + b.pp) - (a.ppk + a.pp) || a.nama.localeCompare(b.nama, 'id')
    )
  }, [ppkList, ppList])

  const grafikOpd = React.useMemo(() => rekapPerOpd.slice(0, 8), [rekapPerOpd])
  const maxGrafikOpd = Math.max(...grafikOpd.map(row => row.ppk + row.pp), 1)
  const maxOpdTotal = Math.max(...rekapPerOpd.map(row => row.ppk + row.pp), 1)

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


   const [activityPage, setActivityPage] = React.useState(1)
   const ACTIVITY_PER_PAGE = 4

  const allActivities = React.useMemo(() => {
    const toActivity = (item, jenis) => {
      const isPp = jenis === 'PP'
      const isNonAktif = item.status_aktif === 'non-aktif'
      return {
        id: item.id,
        jenis,
        nama_lengkap: item.nama_lengkap,
        nip: item.nip,
        satker: (item.satker || '-').trim() || '-',
        jabatan: item.jabatan || '',
        status_aktif: isNonAktif ? 'non-aktif' : 'aktif',
        waktu: item.updated_at || item.created_at,
        keterangan: isNonAktif ? `${jenis} Non-Aktif` : isPp ? `${jenis} Baru` : `${jenis} Baru`,
      }
    }

    return [
      ...ppkList.map(item => toActivity(item, 'PPK')),
      ...ppList.map(item => toActivity(item, 'PP')),
    ].sort((a, b) => new Date(b.waktu || 0) - new Date(a.waktu || 0))
  }, [ppkList, ppList])

   const totalActivityPages = Math.max(1, Math.ceil(allActivities.length / ACTIVITY_PER_PAGE))
   const safeActivityPage = Math.min(activityPage, totalActivityPages)
   const activityStartIdx = (safeActivityPage - 1) * ACTIVITY_PER_PAGE
   const paginatedActivities = allActivities.slice(activityStartIdx, activityStartIdx + ACTIVITY_PER_PAGE)

  return (
    <div>
      <Toast
        open={toast.open}
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ ...toast, open: false })}
      />
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary mb-xs">Ringkasan Data PPK/PP</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Selamat datang kembali, {user?.nama_lengkap || 'Pengguna'}. Pantau dan kelola data PPK dan PP pada setiap OPD di sini.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-sm">
          <div className="flex items-center gap-sm text-label-sm text-on-surface-variant bg-surface-container-low px-sm py-xs rounded border border-outline-variant">
            <span className="material-symbols-outlined text-sm">calendar_today</span>
            <span>{formatDate(new Date().toISOString())}</span>
          </div>
          <button
            onClick={() => openPpkppModal()}
            className="inline-flex items-center justify-center gap-xs px-md py-sm bg-primary text-white rounded-lg text-label-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Tambah PPK/PP
          </button>
        </div>
      </div>

      {/* Ringkasan PPK & PP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-sm mb-xl">
         {/* Jumlah PPK */}
         <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <span className="material-symbols-outlined text-[64px]">badge</span>
           </div>
           <p className="text-label-md font-bold text-on-surface-variant mb-xs">Jumlah PPK</p>
           <div className="flex items-baseline gap-sm">
             <span className="text-headline-lg font-black text-primary">{String(ppkStats.total).padStart(2, '0')}</span>
             <span className="text-label-sm text-secondary">{ppkStats.aktif} aktif</span>
           </div>
           <div className="mt-md h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
             <div
               className="h-full bg-secondary transition-all duration-500"
               style={{ width: `${ppkStats.total ? ((ppkStats.aktif / ppkStats.total) * 100) : 0}%` }}
             ></div>
           </div>
         </div>

         {/* Jumlah PP */}
         <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <span className="material-symbols-outlined text-[64px]">workspaces</span>
           </div>
           <p className="text-label-md font-bold text-on-surface-variant mb-xs">Jumlah PP</p>
           <div className="flex items-baseline gap-sm">
             <span className="text-headline-lg font-black text-primary">{String(ppStats.total).padStart(2, '0')}</span>
             <span className="text-label-sm text-secondary">{ppStats.aktif} aktif</span>
           </div>
           <div className="mt-md h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
             <div
               className="h-full bg-green-500 transition-all duration-500"
               style={{ width: `${ppStats.total ? ((ppStats.aktif / ppStats.total) * 100) : 0}%` }}
             ></div>
           </div>
         </div>

         {/* Jumlah Non-Aktif */}
         <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <span className="material-symbols-outlined text-[64px] text-red-500">person_off</span>
           </div>
           <p className="text-label-md font-bold text-on-surface-variant mb-xs">Jumlah Non-Aktif</p>
           <div className="flex items-baseline gap-sm">
             <span className="text-headline-lg font-black text-red-500">{String(rekapPpkPp.nonAktif).padStart(2, '0')}</span>
             <span className="text-label-sm text-on-surface-variant">dari {rekapPpkPp.total} PPK & PP</span>
           </div>
           <div className="mt-md h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
             <div
               className="h-full bg-red-500 transition-all duration-500"
               style={{ width: `${rekapPpkPp.total ? ((rekapPpkPp.nonAktif / rekapPpkPp.total) * 100) : 0}%` }}
             ></div>
           </div>
         </div>
        </div>


      

      {/* Grafik Data PPK & PP */}
      <div className="bg-white border border-outline-variant rounded-xl p-lg shadow-sm mb-xl">
        <h3 className="text-headline-sm font-headline-sm text-primary mb-xs">Grafik Data PPK & PP</h3>
        <p className="text-body-sm text-on-surface-variant mb-md">
          Komposisi status dan sebaran penempatan PPK serta PP pada setiap OPD.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {/* Donut komposisi */}
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-40 flex-shrink-0">
              <div className="w-full h-full rounded-full" style={{ background: komposisi.gradient }}></div>
              <div className="absolute inset-[18px] bg-white rounded-full flex flex-col items-center justify-center">
                <span className="text-headline-lg font-black text-primary leading-none">{komposisi.total}</span>
                <span className="text-[10px] text-on-surface-variant uppercase tracking-wider">Total</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1 mt-md w-full">
              {komposisi.slices.map(slice => (
                <div key={slice.label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-xs min-w-0">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: slice.color }}></span>
                    <span className="text-[11px] text-on-surface-variant truncate">{slice.label}</span>
                  </span>
                  <span className="text-[11px] font-bold text-on-surface">{slice.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar chart per OPD */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-md">
              <h4 className="text-label-lg font-bold text-primary">Sebaran per OPD</h4>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-secondary"></span>
                  <span className="text-[10px] text-on-surface-variant">PPK</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-green-500"></span>
                  <span className="text-[10px] text-on-surface-variant">PP</span>
                </span>
              </div>
            </div>

            {grafikOpd.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">Belum ada data PPK/PP.</p>
            ) : (
              <div className="space-y-sm">
                {grafikOpd.map(row => (
                  <div key={row.nama} className="flex items-center gap-sm">
                    <span
                      className="w-28 md:w-56 text-[11px] text-on-surface-variant truncate shrink-0"
                      title={row.nama}
                    >
                      {row.nama}
                    </span>
                    <div className="flex-1 h-3 bg-surface-container rounded-full overflow-hidden flex">
                      {row.ppk > 0 && (
                        <div
                          className="h-full bg-secondary"
                          style={{ width: `${(row.ppk / maxGrafikOpd) * 100}%` }}
                          title={`PPK: ${row.ppk}`}
                        ></div>
                      )}
                      {row.pp > 0 && (
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${(row.pp / maxGrafikOpd) * 100}%` }}
                          title={`PP: ${row.pp}`}
                        ></div>
                      )}
                    </div>
                    <span className="w-8 text-right text-[11px] font-bold text-primary shrink-0">
                      {row.ppk + row.pp}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {rekapPerOpd.length > grafikOpd.length && (
              <p className="text-[10px] text-on-surface-variant mt-md">
                Menampilkan {grafikOpd.length} OPD teratas dari {rekapPerOpd.length} OPD.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Dashboard Widgets */}
      <div className="mb-xl">
        {/* Jumlah PPK & PP per OPD */}
        <div className="bg-white border border-outline-variant rounded-xl p-lg shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-md mb-md">
            <div>
              <h3 className="text-headline-sm font-headline-sm text-primary mb-xs">Jumlah PPK & PP per OPD</h3>
              <p className="text-body-sm text-on-surface-variant">Klik OPD untuk melihat detail nama PPK dan PP.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-xs px-3 py-1 rounded-full bg-primary-container/70 border border-primary-fixed text-label-sm font-bold text-on-primary-container">
                <span className="material-symbols-outlined text-sm">domain</span>
                {rekapPerOpd.length} OPD
              </span>
              <span className="inline-flex items-center gap-xs px-3 py-1 rounded-full bg-secondary-container/40 border border-secondary-container/60 text-label-sm font-bold text-on-secondary-container">
                <span className="material-symbols-outlined text-sm">groups</span>
                {rekapPpkPp.total} PPK & PP
              </span>
            </div>
          </div>

          {rekapPerOpd.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Belum ada data PPK/PP.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-sm max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
              {rekapPerOpd.map(row => (
                <button
                  key={row.nama}
                  type="button"
                  onClick={() => openOpdDetail(row.nama)}
                  className="group text-left rounded-lg border border-outline-variant bg-gradient-to-br from-surface-container-low to-white p-3 hover:border-primary-fixed hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex items-center gap-sm min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-primary-container/70 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-sm text-on-primary-container">domain</span>
                      </span>
                      <span className="text-body-sm font-bold text-primary truncate">{row.nama}</span>
                    </span>
                    <span className="material-symbols-outlined text-sm text-outline group-hover:text-primary transition-colors flex-shrink-0">
                      chevron_right
                    </span>
                  </div>

                  <div className="flex items-center gap-xs mt-3">
                    <span className="inline-flex items-center gap-xs px-2 py-0.5 rounded-full text-[11px] font-bold bg-secondary-container/40 border border-secondary-container/60 text-on-secondary-container">
                      <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      PPK {row.ppk}
                    </span>
                    <span className="inline-flex items-center gap-xs px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-50 border border-green-200 text-green-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      PP {row.pp}
                    </span>
                    <span className="ml-auto text-[11px] text-on-surface-variant">Total {row.ppk + row.pp}</span>
                  </div>

                  <div className="mt-3 h-1.5 w-full bg-surface-container rounded-full overflow-hidden flex">
                    {row.ppk > 0 && (
                      <div
                        className="h-full bg-secondary/80 transition-all duration-500"
                        style={{ width: `${(row.ppk / maxOpdTotal) * 100}%` }}
                      ></div>
                    )}
                    {row.pp > 0 && (
                      <div
                        className="h-full bg-green-500/80 transition-all duration-500"
                        style={{ width: `${(row.pp / maxOpdTotal) * 100}%` }}
                      ></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

        {/* Activity Feed */}
        <div className="mt-xl mb-xl md:mb-xl pb-md md:pb-0">
        <div className="bg-white border border-outline-variant p-lg rounded-xl shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-md mb-md">
            <div>
              <h4 className="text-headline-sm font-bold text-primary mb-xs">Aktivitas Data PPK & PP</h4>
              <p className="text-body-sm text-on-surface-variant">Pembaruan data PPK dan PP terakhir pada setiap OPD.</p>
            </div>
            <span className="inline-flex items-center gap-xs px-3 py-1 rounded-full bg-primary-container/70 border border-primary-fixed text-label-sm font-bold text-on-primary-container self-start">
              <span className="material-symbols-outlined text-sm">history</span>
              {allActivities.length} catatan
            </span>
          </div>

           <div className="overflow-x-auto">
             <table className="w-full">
               <thead>
                 <tr className="border-b border-outline-variant">
                   <th className="text-left text-label-sm text-on-surface-variant font-medium py-2 px-2">Nama</th>
                   <th className="text-left text-label-sm text-on-surface-variant font-medium py-2 px-2 hidden md:table-cell">NIP</th>
                    <th className="text-left text-label-sm text-on-surface-variant font-medium py-2 px-2 hidden lg:table-cell">Satuan Kerja</th>
                    <th className="text-right text-label-sm text-on-surface-variant font-medium py-2 px-2">Tanggal</th>
                 </tr>
               </thead>
               <tbody>
                 {paginatedActivities.length === 0 ? (
                   <tr>
                      <td colSpan={4} className="text-body-sm text-on-surface-variant py-4 text-center">Belum ada data PPK/PP.</td>
                   </tr>
                 ) : (
                   paginatedActivities.map(item => (
                     <tr
                       key={`${item.jenis}-${item.id}`}
                       onClick={(e) => { e.stopPropagation(); openOpdDetail(item.satker, { type: item.jenis, id: item.id }) }}
                       className="border-b border-outline-variant/50 hover:bg-surface-container-low cursor-pointer transition-colors"
                     >
                       <td className="py-3 px-2">
                         <div className="flex items-center gap-2">
                           <span
                             className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                               item.jenis === 'PPK'
                                 ? 'bg-secondary-container/60 text-on-secondary-container'
                                 : 'bg-green-50 text-green-600'
                             }`}
                           >
                             <span className="material-symbols-outlined text-sm">
                               {item.jenis === 'PPK' ? 'badge' : 'workspaces'}
                             </span>
                           </span>
                           <div className="min-w-0">
                             <p className="text-body-sm font-bold text-primary truncate">{item.nama_lengkap}</p>
                             <p className="text-[11px] text-on-surface-variant md:hidden">{item.nip || '-'}</p>
                           </div>
                         </div>
                       </td>
                       <td className="py-3 px-2 hidden md:table-cell text-body-sm text-on-surface-variant">{item.nip || '-'}</td>
                         <td className="py-3 px-2 hidden lg:table-cell text-body-sm text-on-surface-variant truncate max-w-[200px]">{item.satker}</td>
                        <td className="py-3 px-2 text-right text-[11px] text-on-surface-variant whitespace-nowrap">{formatDateTime(item.waktu)}</td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
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

      {/* Modal Detail OPD */}
      {opdDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeOpdDetail}>
          <div
            className="w-full md:w-[580px] max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden popup-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary">domain</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Detail PPK & PP</h3>
                  <p className="text-sm text-slate-500">{opdDetail}</p>
                </div>
              </div>
              <button onClick={closeOpdDetail} className="p-2 hover:bg-slate-50 rounded-full transition-colors">
                <span className="material-symbols-outlined text-slate-400">close</span>
              </button>
            </div>

            <div className="p-4 md:p-5 space-y-5 overflow-y-auto">
              {detailFilter.type !== 'PP' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-blue-600">badge</span>
                  <h4 className="text-base font-semibold text-slate-800">
                    PPK <span className="text-slate-400 font-normal">({detailOpdPpk.length})</span>
                  </h4>
                </div>
                {detailOpdPpk.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400 bg-slate-50 rounded-xl">Belum ada PPK pada OPD ini.</div>
                ) : (
                  <div className="space-y-3">
                    {detailOpdPpk.map(item => (
                      <div key={item.id} className="border border-slate-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold">
                                {item.nama_lengkap ? item.nama_lengkap.split(' ').filter(Boolean).slice(0,2).map(n => n[0]).join('').toUpperCase() : 'PPK'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 truncate">{item.nama_lengkap}</p>
                              <p className="text-sm text-slate-500">NIP: {item.nip || '-'}</p>
                            </div>
                          </div>
                          {item.status_aktif === 'non-aktif' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
                              Non-Aktif
                            </span>
                          )}
                        </div>
<div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                           <div className="bg-slate-50 rounded-lg px-3 py-2">
                             <p className="text-slate-400 text-xs">Jabatan</p>
                             <p className="text-slate-700 mt-0.5">{item.jabatan || '-'}</p>
                           </div>
                           <div className="bg-slate-50 rounded-lg px-3 py-2">
                             <p className="text-slate-400 text-xs">Satuan Kerja</p>
                             <p className="text-slate-700 mt-0.5 truncate">{item.satker || '-'}</p>
                           </div>
                           {item.status_aktif === 'non-aktif' && item.alasan_penonaktifan && (
                             <div className="md:col-span-2 bg-red-50/50 rounded-lg px-3 py-2 border border-red-100">
                               <p className="text-red-500 text-xs">Alasan Penonaktifan</p>
                               <p className="text-red-700 mt-0.5">{item.alasan_penonaktifan}</p>
                             </div>
                           )}
                           {item.catatan_mutasi && (
                             <div className="md:col-span-2 bg-amber-50/50 rounded-lg px-3 py-2 border border-amber-100">
                               <p className="text-amber-600 text-xs">Catatan Mutasi</p>
                               <p className="text-amber-800 mt-0.5">{item.catatan_mutasi}</p>
                             </div>
                           )}
                         </div>
                         <div className="mt-3">
                           {(() => {
                             const key = `ppk:${item.id}`
                             const history = ppkHistory[key]
                             if (!history || history.length === 0) return null
                             return (
                               <div className="space-y-1.5">
                                 <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                   <span className="material-symbols-outlined text-sm">history</span>
                                   Riwayat Perubahan
                                 </p>
                                 {history.map((h, i) => (
                                   <div key={i} className="bg-slate-50 rounded-lg px-3 py-2 text-xs">
                                     <p className="text-slate-400">{formatDateTime(h.changed_at)}</p>
                                     <p className="text-slate-700">
                                       Jabatan: {h.jabatan || '-'} | Satuan Kerja: {h.satker || '-'} | Bidang: {h.bidang || '-'}
                                     </p>
                                     {h.catatan && <p className="text-slate-500 mt-0.5">{h.catatan}</p>}
                                   </div>
                                 ))}
                               </div>
                             )
                           })()}
                         </div>
                         <DokumenSyaratBadges value={item.dokumen_syarat} jabatan={item.jabatan} />
                       </div>
                     ))}
                   </div>
                 )}
               </div>
               )}

               {detailFilter.type !== 'PPK' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">workspaces</span>
                  <h4 className="text-base font-semibold text-slate-800">
                    PP <span className="text-slate-400 font-normal">({detailOpdPp.length})</span>
                  </h4>
                </div>
                {detailOpdPp.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400 bg-slate-50 rounded-xl">Belum ada PP pada OPD ini.</div>
                ) : (
                  <div className="space-y-3">
                    {detailOpdPp.map(item => (
                      <div key={item.id} className="border border-slate-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-semibold">
                                {item.nama_lengkap ? item.nama_lengkap.split(' ').filter(Boolean).slice(0,2).map(n => n[0]).join('').toUpperCase() : 'PP'}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 truncate">{item.nama_lengkap}</p>
                              <p className="text-sm text-slate-500">NIP: {item.nip || '-'}</p>
                            </div>
                          </div>
                          {item.status_aktif === 'non-aktif' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600">
                              Non-Aktif
                            </span>
                          )}
                        </div>
<div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                           <div className="bg-slate-50 rounded-lg px-3 py-2">
                             <p className="text-slate-400 text-xs">Jabatan</p>
                             <p className="text-slate-700 mt-0.5">{item.jabatan || '-'}</p>
                           </div>
                           <div className="bg-slate-50 rounded-lg px-3 py-2">
                             <p className="text-slate-400 text-xs">Satuan Kerja</p>
                             <p className="text-slate-700 mt-0.5 truncate">{item.satker || '-'}</p>
                           </div>
                           {item.status_aktif === 'non-aktif' && item.alasan_penonaktifan && (
                             <div className="md:col-span-2 bg-red-50/50 rounded-lg px-3 py-2 border border-red-100">
                               <p className="text-red-500 text-xs">Alasan Penonaktifan</p>
                               <p className="text-red-700 mt-0.5">{item.alasan_penonaktifan}</p>
                             </div>
                           )}
                           {item.catatan_mutasi && (
                             <div className="md:col-span-2 bg-amber-50/50 rounded-lg px-3 py-2 border border-amber-100">
                               <p className="text-amber-600 text-xs">Catatan Mutasi</p>
                               <p className="text-amber-800 mt-0.5">{item.catatan_mutasi}</p>
                             </div>
                           )}
                         </div>
                         <div className="mt-3">
                           {(() => {
                             const key = `pp:${item.id}`
                             const history = ppHistory[key]
                             if (!history || history.length === 0) return null
                             return (
                               <div className="space-y-1.5">
                                 <p className="text-[11px] text-slate-400 flex items-center gap-1">
                                   <span className="material-symbols-outlined text-sm">history</span>
                                   Riwayat Perubahan
                                 </p>
                                 {history.map((h, i) => (
                                   <div key={i} className="bg-slate-50 rounded-lg px-3 py-2 text-xs">
                                     <p className="text-slate-400">{formatDateTime(h.changed_at)}</p>
                                     <p className="text-slate-700">
                                       Jabatan: {h.jabatan || '-'} | Satuan Kerja: {h.satker || '-'} | Bidang: {h.bidang || '-'}
                                     </p>
                                     {h.catatan && <p className="text-slate-500 mt-0.5">{h.catatan}</p>}
                                   </div>
                                 ))}
                               </div>
                             )
                           })()}
                         </div>
                         <DokumenSyaratBadges value={item.dokumen_syarat} jabatan={item.jabatan} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Nav Bar (Bottom) */}
       <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-outline-variant flex justify-around items-center py-xs z-50">
         <button onClick={() => navigate('/verifikator')} className="flex flex-col items-center gap-1 text-primary">
           <span className="material-symbols-outlined">dashboard</span>
           <span className="text-[10px] font-bold">Beranda</span>
         </button>
          <button onClick={() => navigate('/laporanverifikator')} className="flex flex-col items-center gap-1 text-on-surface-variant">
            <span className="material-symbols-outlined">assessment</span>
            <span className="text-[10px]">Laporan</span>
          </button>
         <button onClick={() => navigate('/profil')} className="flex flex-col items-center gap-1 text-on-surface-variant">
           <span className="material-symbols-outlined">person</span>
           <span className="text-[10px]">Profil</span>
         </button>
        </nav>

      {/* Modal Tambah PPK / PP */}
      {ppkppOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={closePpkppModal}>
          <div
            className="w-full md:w-[520px] max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[20px]">person_add</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-800">
                  Tambah PPK/PP
                </h3>
              </div>
              <button onClick={closePpkppModal} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined text-slate-500 text-[20px]">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 min-h-0">
              <form onSubmit={handleSavePpkpp} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Nama Lengkap</label>
                  <input
                    type="text"
                    value={ppkppForm.nama_lengkap}
                    onChange={(e) => setPpkppForm({ ...ppkppForm, nama_lengkap: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                    placeholder="Nama lengkap sesuai KTP"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">NIP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={18}
                    value={ppkppForm.nip}
                    onChange={(e) => setPpkppForm({ ...ppkppForm, nip: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                    placeholder="18 digit NIP"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Jabatan</label>
                  <select
                    value={ppkppForm.jabatan}
                    onChange={(e) => handleJabatanChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                  >
                    <option value="Pejabat Pembuat Komitmen (PPK)">Pejabat Pembuat Komitmen (PPK)</option>
                    <option value="Pejabat Pengadaan (PP)">Pejabat Pengadaan (PP)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Satuan Kerja</label>
                  <select
                    value={ppkppForm.satker}
                    onChange={(e) => handleSatkerChange(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition"
                  >
                    <option value="">Pilih Satuan Kerja</option>
                    {satkerList.map((item) => (
                      <option key={item.id} value={item.nama}>
                        {item.nama}
                      </option>
                    ))}
                  </select>
                </div>
                 {!(ppkppForm.satker || '').toLowerCase().includes('kecamatan') && !(ppkppForm.satker || '').toLowerCase().includes('upt puskesmas') && (
                 <div className="space-y-1.5">
                   <label className="text-xs font-medium text-slate-600">Bidang/Bagian</label>
                   {loadingBidang ? (
                    <p className="text-sm text-slate-500 py-2">Memuat...</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50">
                      {bidangList.map((item) => (
                        <label key={item.id} className="flex items-center gap-2.5 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={ppkppForm.bidang.includes(item.nama)}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setPpkppForm((prev) => ({
                                ...prev,
                                bidang: checked
                                  ? [...prev.bidang, item.nama]
                                  : prev.bidang.filter((b) => b !== item.nama),
                              }))
                            }}
                            className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary/30"
                          />
                          <span className="text-sm text-slate-700 group-hover:text-slate-900">{item.nama}</span>
                        </label>
                      ))}
                      {bidangList.length === 0 && (
                        <p className="text-sm text-slate-500">Pilih Satuan Kerja terlebih dahulu</p>
                      )}
                    </div>
                  )}
                  </div>
                  )}
                  <DokumenSyaratField
                  value={ppkppForm.dokumen}
                  onChange={(dokumen) => setPpkppForm({ ...ppkppForm, dokumen })}
                  jabatan={ppkppForm.jabatan}
                />
                <div className="flex flex-col md:flex-row items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={closePpkppModal}
                    className="w-full md:w-auto px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingPpkpp}
                    className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
                  >
                    {savingPpkpp ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

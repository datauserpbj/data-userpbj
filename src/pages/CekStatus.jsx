import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getPengajuanList } from '../lib/supabase-helpers'

export default function CekStatus() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nip = (searchParams.get('nip') || '').trim()
  const pengajuanId = searchParams.get('id') || ''
  const [pengajuanList, setPengajuanList] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState(false)
  const [historyPage, setHistoryPage] = React.useState(1)
  const HISTORY_PER_PAGE = 2
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [showVerifiedPopup, setShowVerifiedPopup] = React.useState(false)
  const prevVerifiedRef = React.useRef(false)

  const selectedPengajuan = pengajuanId
    ? pengajuanList.find((item) => item.id === pengajuanId) || null
    : pengajuanList.length > 0
      ? [...pengajuanList].sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || b.created_at))[0]
      : null

  React.useEffect(() => {
    if (!selectedPengajuan) return
    const isVerified = selectedPengajuan.status === 'verified'
    if (isVerified && !prevVerifiedRef.current) {
      setShowVerifiedPopup(true)
    }
    prevVerifiedRef.current = isVerified
  }, [selectedPengajuan])

  React.useEffect(() => {
    if (!nip) return
    setLoading(true)
    setError(false)
    setHistoryPage(1)
    getPengajuanList()
      .then((data) => {
        const matched = (Array.isArray(data) ? data : []).filter((item) => String(item.nip || '').trim() === nip)
        setPengajuanList(matched)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [nip])

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
  }

  const addHours = (dateStr, hours) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    date.setHours(date.getHours() + hours)
    return date.toISOString()
  }

  const buildHistory = (item) => {
    if (!item) return []
    const created = item.created_at ? formatDateTime(item.created_at) : null
    const updated = item.updated_at ? formatDateTime(item.updated_at) : null

    const history = []

    if (item.status === 'draft') {
      history.push({
        tanggal: updated || created || '-',
        aktivitas: 'Simpan Draft',
        status: 'Selesai',
        statusWarna: 'on-surface-variant',
        keterangan: 'Draft pengajuan diperbarui',
        _sortAt: item.updated_at || item.created_at,
      })
    } else {
      history.push({
        tanggal: created || '-',
        aktivitas: 'Submit Pengajuan',
        status: 'Berhasil',
        statusWarna: 'green-600',
        keterangan: 'Dokumen lengkap telah diterima sistem',
        _sortAt: item.created_at,
      })

      if (item.status === 'submitted') {
        const isRevision = item.alasan_revisi
        if (isRevision) {
          history.push({
            tanggal: updated || formatDateTime(addHours(item.created_at, 4)) || '-',
            aktivitas: 'Minta Revisi',
            status: 'Minta Revisi',
            statusWarna: 'orange-600',
            keterangan: item.alasan_revisi || 'Dokumen perlu direvisi sesuai catatan verifikator',
            _sortAt: item.updated_at || addHours(item.created_at, 4),
          })
        } else {
          history.push({
            tanggal: updated || formatDateTime(addHours(item.created_at, 4)) || '-',
            aktivitas: 'Verifikasi Dokumen',
            status: 'Sedang Diproses',
            statusWarna: 'secondary',
            keterangan: 'Menunggu antrean verifikator LPSE',
            _sortAt: item.updated_at || addHours(item.created_at, 4),
          })
        }
      } else if (item.status === 'verified') {
        history.push({
          tanggal: updated || formatDateTime(addHours(item.created_at, 8)) || '-',
          aktivitas: 'Verifikasi Dokumen',
          status: 'Terverifikasi',
          statusWarna: 'green-600',
          keterangan: 'Pengajuan telah diverifikasi dan disetujui',
          _sortAt: item.updated_at || addHours(item.created_at, 8),
        })
      } else if (item.status === 'rejected') {
        const alasan = item.alasan_ditolak ? `: ${item.alasan_ditolak}` : ''
        history.push({
          tanggal: updated || formatDateTime(addHours(item.created_at, 6)) || '-',
          aktivitas: 'Verifikasi Dokumen',
          status: 'Ditolak',
          statusWarna: 'red-600',
          keterangan: `Pengajuan ditolak${alasan}`,
          _sortAt: item.updated_at || addHours(item.created_at, 6),
        })
      }
    }

    return history
  }

  const histories = pengajuanList.map((item) => buildHistory(item))
  const selectedHistory = selectedPengajuan
    ? (histories[pengajuanList.findIndex((item) => item.id === selectedPengajuan.id)] || [])
    : []
  const isRejected = selectedPengajuan?.status === 'rejected'

  const isRevisionRequested = (item) => item.status === 'submitted' && !!item.alasan_revisi

  const getStatusBadge = (item) => {
    if (item.status === 'submitted' && item.revisi_selesai) {
      return 'bg-green-50 text-green-700 border border-green-200'
    }
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

  const getStatusLabel = (item) => {
    if (item.status === 'submitted' && item.revisi_selesai) {
      return 'Selesai Diperbaiki'
    }
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

  const getProgressInfo = (status, item) => {
    if (isRevisionRequested(item)) {
      return { title: 'Minta Revisi', desc: `Dokumen Anda perlu direvisi: ${item.alasan_revisi}`, color: 'bg-orange-500' }
    }
    switch (status) {
      case 'verified':
        return { title: 'Pengajuan Telah Disetujui', desc: 'Pengajuan Anda telah diverifikasi dan disetujui oleh tim LPSE.', color: 'bg-green-500' }
      case 'rejected':
        return { title: 'Pengajuan Ditolak', desc: 'Pengajuan Anda ditolak. Silakan perbaiki dokumen dan ajukan kembali.', color: 'bg-error' }
      default:
        return { title: 'Dokumen Sedang Diverifikasi', desc: 'Dokumen Anda sedang dalam antrean verifikasi oleh tim LPSE. Estimasi waktu penyelesaian adalah 1-3 hari kerja.', color: 'bg-primary' }
    }
  }

  const getLatestActivity = (item) => {
    if (!item) return null
    if (item.status === 'submitted' && item.revisi_selesai) {
      return {
        aktivitas: 'Revisi Pemohon',
        status: 'Perbaikan sudah dikirim',
        statusWarna: 'green-600',
        keterangan: 'Revisi berhasil dikirim dan menunggu verifikasi ulang oleh tim LPSE.',
        _sortAt: item.updated_at,
      }
    }
    const history = buildHistory(item)
    if (history.length === 0) return null
    return history[history.length - 1]
  }

  const allHistory = histories.flat().sort((a, b) => {
    const ta = a._sortAt || ''
    const tb = b._sortAt || ''
    return tb.localeCompare(ta)
  })
  const totalHistoryPages = Math.max(1, Math.ceil(allHistory.length / HISTORY_PER_PAGE))
  const safeHistoryPage = Math.min(historyPage, totalHistoryPages)
  const startIdx = (safeHistoryPage - 1) * HISTORY_PER_PAGE
  const paginatedHistory = allHistory.slice(startIdx, startIdx + HISTORY_PER_PAGE)
  return (
    <div className="page-gradient-pengajuan">
      <nav className="sticky top-0 z-50 flex justify-between items-center w-full px-md py-xs glass-nav">
        <div className="flex items-center gap-md">
          <span className="text-headline-sm font-headline-sm font-bold text-primary">LPSE DocVerify</span>
          <div className="hidden md:flex items-center gap-lg ml-lg">
            <a className="text-on-surface-variant hover:bg-surface-container-low px-xs py-base transition-colors font-body-md text-body-md cursor-pointer" onClick={() => navigate('/')}>Formulir Pengajuan</a>
            <a className="text-primary font-bold border-b-2 border-primary pb-1 font-body-md text-body-md" href="#">Cek Status Pengajuan</a>
          </div>
        </div>
        <div className="flex items-center gap-md">
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-full hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined text-primary">{mobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="absolute top-full left-0 right-0 bg-white/90 backdrop-blur-md border-b border-outline-variant md:hidden">
            <a className="block w-full text-left px-md py-sm text-on-surface-variant hover:bg-surface-container-low font-body-md text-body-md cursor-pointer" onClick={() => { setMobileMenuOpen(false); navigate('/') }}>Formulir Pengajuan</a>
            <a className="block w-full text-left px-md py-sm text-primary font-bold border-b border-outline-variant font-body-md text-body-md" href="#">Cek Status Pengajuan</a>
          </div>
        )}
      </nav>

      <main className="max-w-[1000px] mx-auto px-md py-xl">
        <header className="mb-xl">
          <div className="bg-white border border-outline-variant rounded-xl p-lg shadow-sm text-center">
            <h1 className="font-headline-lg text-headline-lg text-primary mb-xs">Detail Status Pengajuan</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Pantau perkembangan verifikasi berkas Anda secara real-time dan tinjau riwayat aktivitas pengajuan.</p>
          </div>
        </header>

        <div className="w-full max-w-[800px] mx-auto mb-xl px-md">
          <div className="flex items-center justify-between relative h-3">
            <div className="absolute top-1/2 left-0 w-full h-px bg-outline-variant -translate-y-1/2 z-0"></div>
            <div className="absolute top-1/2 left-0 w-1/2 h-0.5 bg-primary -translate-y-1/2 z-0"></div>
          </div>
        </div>

        <form className="space-y-lg" id="submissionForm" onSubmit={(e) => e.preventDefault()}>
          {!nip ? (
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg text-center">
              <p className="font-body-md text-body-md text-on-surface-variant">Masukkan NIP untuk melihat status pengajuan.</p>
            </section>
          ) : (
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
              <div className="flex items-center gap-sm mb-md">
                <span className="material-symbols-outlined text-secondary">badge</span>
                <h2 className="font-headline-sm text-headline-sm text-primary">Detail Pegawai</h2>
              </div>
              {loading && <p className="font-body-sm text-body-sm text-on-surface-variant">Memuat data pegawai...</p>}
              {error && <p className="font-body-sm text-body-sm text-red-600">Gagal memuat data pegawai.</p>}
              {!loading && !error && selectedPengajuan && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                  <div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">NIP</p>
                    <p className="font-body-md text-body-md text-on-surface">{selectedPengajuan.nip}</p>
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Nama Lengkap</p>
                    <p className="font-body-md text-body-md text-on-surface">{selectedPengajuan.nama_lengkap}</p>
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Satuan Kerja</p>
                    <p className="font-body-md text-body-md text-on-surface">{selectedPengajuan.satker || '-'}</p>
                  </div>
                  <div>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">Jabatan</p>
                    <p className="font-body-md text-body-md text-on-surface">{selectedPengajuan.jabatan || '-'}</p>
                  </div>
                </div>
              )}
              {!loading && !error && pengajuanList.length === 0 && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">Data pegawai dengan NIP tersebut tidak ditemukan.</p>
              )}
            </section>
          )}

          {selectedPengajuan && (
            <section className="bg-surface-container border border-primary rounded-xl p-lg mb-lg">
                <div className="flex items-center justify-between mb-md">
                  <div className="flex items-center gap-sm">
                    <span className="material-symbols-outlined text-primary">info</span>
                    <h2 className="font-headline-sm text-headline-sm text-primary">
                      Status Pengajuan {pengajuanId ? `#${pengajuanId.slice(0, 8)}` : 'Terakhir'}
                    </h2>
                  </div>
                  {selectedPengajuan.status && (
                    <span className={`px-sm py-xs rounded-full text-label-md font-label-md ${getStatusBadge(selectedPengajuan)}`}>
                      {getStatusLabel(selectedPengajuan)}
                    </span>
                  )}
              </div>
              <div className="space-y-sm">
                <div className="flex items-end gap-md">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full ${(getLatestActivity(selectedPengajuan) || getProgressInfo(selectedPengajuan.status, selectedPengajuan)).color}`}></div>
                    <div className="w-px h-6 bg-outline-variant"></div>
                    <div className="w-3 h-3 rounded-full bg-outline-variant"></div>
                  </div>
                    <div className="space-y-xs">
                      <p className="font-body-md text-body-md text-primary font-bold">
                        {(getLatestActivity(selectedPengajuan) || getProgressInfo(selectedPengajuan.status, selectedPengajuan)).title}
                      </p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {(getLatestActivity(selectedPengajuan) || getProgressInfo(selectedPengajuan.status, selectedPengajuan)).desc}
                      </p>
                       {selectedPengajuan.status === 'rejected' && selectedPengajuan.alasan_ditolak && (
                         <p className="font-body-sm text-body-sm text-red-700">
                           <span className="font-semibold">Alasan:</span> {selectedPengajuan.alasan_ditolak}
                         </p>
                       )}
                       {isRevisionRequested(selectedPengajuan) && selectedPengajuan.alasan_revisi && (
                         <p className="font-body-sm text-body-sm text-orange-700">
                           <span className="font-semibold">Catatan Revisi:</span> {selectedPengajuan.alasan_revisi}
                         </p>
                       )}
                         <p className="font-label-sm text-label-sm text-outline">Terakhir diperbarui pada {formatDateTime(selectedPengajuan.updated_at)}</p>
                         {isRevisionRequested(selectedPengajuan) && (
                           <div className="pt-md">
                            <button onClick={() => navigate(`/edit-pengajuan/${selectedPengajuan.id}`)} className="w-fit px-md py-sm font-label-md text-label-md gradient-primary text-on-primary rounded-lg hover:opacity-90 shadow-sm active:opacity-80 transition-all flex items-center justify-center gap-xs">
                              <span>Perbaiki</span>
                              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </button>
                          </div>
                         )}
                     </div>
                </div>
              </div>
            </section>
          )}

          {pengajuanList.length > 0 && (
            <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg mt-lg">
              <div className="flex items-center gap-sm mb-lg border-b border-outline-variant pb-md">
                <span className="material-symbols-outlined text-secondary">history</span>
                <h2 className="font-headline-sm text-headline-sm text-primary">Riwayat Aktivitas Pengajuan</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-container-low">
                    <tr className="text-label-md text-on-surface-variant">
                      <th className="p-md border-b border-outline-variant">Tanggal &amp; Waktu</th>
                      <th className="p-md border-b border-outline-variant">Aktivitas</th>
                      <th className="p-md border-b border-outline-variant">Status</th>
                      <th className="p-md border-b border-outline-variant">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody className="text-body-sm">
                    {(pengajuanId ? selectedHistory : paginatedHistory).map((h, hIdx) => (
                      <tr key={hIdx} className="border-b border-outline-variant">
                        <td className="p-md">{h.tanggal}</td>
                        <td className="p-md font-bold">{h.aktivitas}</td>
                        <td className="p-md">{h.statusWarna ? <span className={`text-${h.statusWarna}`}>{h.status}</span> : h.status}</td>
                        <td className="p-md">{h.keterangan}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!pengajuanId && totalHistoryPages > 1 && (
                <div className="flex flex-col md:flex-row items-center justify-between gap-2 md:gap-0 mt-md pt-md border-t border-outline-variant">
                  <button
                    type="button"
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={safeHistoryPage <= 1}
                    className="w-full md:w-auto px-md py-xs rounded-lg border border-outline-variant text-label-md font-label-md text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-low transition-colors"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-label-sm text-on-surface-variant">
                    Halaman {safeHistoryPage} dari {totalHistoryPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))}
                    disabled={safeHistoryPage >= totalHistoryPages}
                    className="w-full md:w-auto px-md py-xs rounded-lg border border-outline-variant text-label-md font-label-md text-on-surface-variant disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-container-low transition-colors"
                  >
                    Selanjutnya
                  </button>
                </div>
              )}
            </section>
          )}
        </form>

        <footer className="mt-xl border-t border-outline-variant pt-lg flex flex-col md:flex-row justify-between items-center gap-md">
          <div className="flex items-center gap-md">
            <div className="flex items-center gap-xs text-white">
              <span className="material-symbols-outlined text-[20px]">schedule</span>
              <span className="text-body-sm font-body-sm">Estimasi verifikasi: 2-3 hari kerja</span>
            </div>
          </div>
          <div className="text-white font-body-sm text-body-sm">
            © 2026 LPSE Portal. All Rights Reserved | Designed & Developed by <a href="https://card-profile-tawny.vercel.app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Junaidi</a>
          </div>
        </footer>
      </main>

      {showVerifiedPopup && selectedPengajuan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowVerifiedPopup(false)}>
          <div className="w-full max-w-[420px] bg-white rounded-xl shadow-2xl overflow-hidden popup-enter" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-green-600 text-4xl">check_circle</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-primary mb-2">Pengajuan Telah Disetujui</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                Silahkan cek email anda untuk mendapatkan informasi <strong>Aktivasi Akun</strong>  atau <strong>User ID dan Password</strong> akun SPSE anda. 
              </p>
              <button
                onClick={() => setShowVerifiedPopup(false)}
                className="w-full sm:w-auto px-md py-sm rounded-lg gradient-primary text-on-primary font-bold hover:opacity-90 shadow-sm transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

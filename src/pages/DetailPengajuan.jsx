import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { getPengajuanDetail, updatePengajuanStatus } from '../lib/supabase-helpers'

export default function DetailPengajuan() {
  const { id } = useParams()
  const [formulir, setFormulir] = React.useState(null)
  const [dokumen, setDokumen] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
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

  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  React.useEffect(() => {
    if (authLoading) return
    if (!user) {
      navigate('/loginverifikator')
      return
    }
    loadData()
  }, [user, authLoading, navigate, id])

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getPengajuanDetail(id)
      setFormulir(data.formulir)
      setDokumen(data.dokumen || [])
    } catch (err) {
      setFormulir(null)
      setDokumen([])
    } finally {
      setLoading(false)
    }
  }

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}, ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`
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

  const isRevisionRequested = (item) => item && item.status === 'submitted' && !!item.alasan_revisi

  const updateStatus = async (status, alasanDitolak = null, alasanRevisi = null) => {
    setSubmitting(true)
    try {
      const payload = { status, alasan_ditolak: alasanDitolak, alasan_revisi: alasanRevisi }
      console.log('Updating status:', { id, payload })

      const result = await updatePengajuanStatus(id, payload)
      console.log('Update status response:', result)

      await loadData()
      setShowRejectForm(false)
      setRejectReason('')
      setShowRevisionForm(false)
      setRevisionNote('')
      alert('Status berhasil diperbarui')
    } catch (err) {
      alert(`Gagal: ${err.message || 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-background text-on-background overflow-x-hidden">
      {/* Breadcrumb & Header Panel */}
      <div className="bg-white px-4 md:px-md py-sm border-b border-outline-variant flex flex-col md:flex-row md:justify-between md:items-center gap-sm">
        <div className="flex flex-col">
          <div className="flex items-center gap-xs text-label-sm text-on-surface-variant">
            <span>Verifikasi</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span>Detail Dokumen</span>
            <span className="material-symbols-outlined text-sm">chevron_right</span>
            <span className="text-primary font-semibold">{formulir?.nama_lengkap || 'Loading...'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-sm mt-1">
            <h1 className="text-headline-md font-headline-md text-primary">{formulir?.nama_lengkap || 'Detail Pengajuan'}</h1>
            <span className={`px-sm py-1 ${formulir ? getStatusBadge(formulir) : ''} rounded-full text-xs font-semibold uppercase tracking-wider`}>
              {formulir ? getStatusLabel(formulir) : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-sm">
          <button className="p-xs hover:bg-surface-container-low rounded-lg transition-colors">
            <span className="material-symbols-outlined">fullscreen</span>
          </button>
          <button className="p-xs hover:bg-surface-container-low rounded-lg transition-colors">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-col md:flex-row overflow-hidden">
        {/* Left Pane: Personal Data (Read-only) */}
        <section className="w-full md:w-[40%] flex flex-col border-b md:border-r border-outline-variant bg-white">
          <div className="p-md border-b border-outline-variant flex flex-col md:flex-row md:justify-between md:items-center gap-sm">
            <h3 className="text-label-md font-bold text-primary flex items-center gap-xs">
              <span className="material-symbols-outlined text-sm">badge</span>
              DATA DIRI PEMOHON
            </h3>
            <span className="text-[10px] text-on-surface-variant italic">Data Terverifikasi Kependudukan</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 md:p-md space-y-md custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : formulir ? (
              <div className="grid grid-cols-1 gap-md">
                <div className="space-y-xs">
                  <label className="text-label-sm text-on-surface-variant">Nomor Induk Pegawai (NIP)</label>
                  <div className="px-sm py-sm bg-surface-container-lowest border border-outline-variant rounded text-body-md font-semibold text-primary">
                    {formulir.nip || '-'}
                  </div>
                </div>
                <div className="space-y-xs">
                  <label className="text-label-sm text-on-surface-variant">Nama Lengkap</label>
                  <div className="px-sm py-sm bg-surface-container-lowest border border-outline-variant rounded text-body-md font-medium text-primary">
                    {formulir.nama_lengkap || '-'}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                  <div className="space-y-xs">
                    <label className="text-label-sm text-on-surface-variant">Jabatan</label>
                    <div className="px-sm py-sm bg-surface-container-lowest border border-outline-variant rounded text-body-md font-medium text-primary">
                      {formulir.jabatan || '-'}
                    </div>
                  </div>
                  <div className="space-y-xs">
                    <label className="text-label-sm text-on-surface-variant">Satuan Kerja</label>
                    <div className="px-sm py-sm bg-surface-container-lowest border border-outline-variant rounded text-body-md font-medium text-primary">
                      {formulir.satker || '-'}
                    </div>
                  </div>
                </div>
                <div className="space-y-xs">
                  <label className="text-label-sm text-on-surface-variant">Tanggal Pengajuan</label>
                  <div className="px-sm py-sm bg-surface-container-lowest border border-outline-variant rounded text-body-md font-medium text-primary">
                    {formatDateTime(formulir.created_at)}
                  </div>
                </div>

                <div className="space-y-sm mt-md">
                  <label className="text-label-sm text-on-surface-variant font-bold uppercase tracking-wider">Pratinjau Dokumen</label>
                  <div className="space-y-xs">
                    {dokumen.length > 0 ? (
                      dokumen.map((doc, idx) => {
                        const docInfo = {
                          surat_permohonan: { label: 'Surat Permohonan Verifikasi', icon: 'description' },
                          pakta_integritas: { label: 'Pakta Integritas', icon: 'verified' },
                          sk_terbaru: { label: 'SK Jabatan Terakhir', icon: 'assignment_ind' },
                          surat_rekomendasi_ukpbj: { label: 'Surat Rekomendasi dari UKPBJ', icon: 'verified' },
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
          </div>
        </section>

        {/* Right Pane: Document Preview */}
        <section className="w-full md:w-[60%] flex flex-col bg-surface-dim">
          <div className="p-sm flex flex-col md:flex-row md:justify-between md:items-center gap-sm bg-white border-b border-outline-variant">
            <div className="flex items-center gap-sm">
              <span className="material-symbols-outlined text-error">picture_as_pdf</span>
              <span className="text-label-md font-bold text-primary">
                {dokumen.length > 0 ? dokumen[0].filename : 'Dokumen.pdf'}
              </span>
            </div>
            <div className="flex items-center gap-xs bg-surface-container-low rounded p-1">
              <button className="p-xs hover:bg-white rounded transition-all"><span className="material-symbols-outlined text-sm">zoom_out</span></button>
              <span className="text-xs font-semibold px-xs">100%</span>
              <button className="p-xs hover:bg-white rounded transition-all"><span className="material-symbols-outlined text-sm">zoom_in</span></button>
              <div className="w-px h-4 bg-outline-variant mx-xs"></div>
              <button className="p-xs hover:bg-white rounded transition-all"><span className="material-symbols-outlined text-sm">download</span></button>
              <button className="p-xs hover:bg-white rounded transition-all"><span className="material-symbols-outlined text-sm">print</span></button>
            </div>
          </div>
          <div className="flex-1 p-3 md:p-xl overflow-y-auto custom-scrollbar flex justify-center">
            {dokumen.length > 0 ? (
              <div className="w-full max-w-2xl">
                <iframe
                  src={dokumen[0].filepath}
                  className="w-full h-[400px] md:h-[600px] rounded-lg border border-outline-variant shadow-lg"
                  title="Document Preview"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-body-sm text-on-surface-variant">Tidak ada dokumen untuk ditampilkan.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Footer Action Panel */}
      <footer className="bg-white border-t border-outline-variant p-3 md:p-md">
        {formulir?.status === 'verified' ? (
          <div className="flex items-center justify-center">
            <span className="text-label-md font-bold text-green-700 flex items-center gap-xs">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Pengajuan sudah disetujui — {formatDateTime(formulir.updated_at || formulir.created_at)}
            </span>
          </div>
        ) : isRevisionRequested(formulir) ? (
          <div className="flex flex-col items-center gap-sm">
            <span className="text-label-md font-bold text-orange-700 flex items-center gap-xs">
              <span className="material-symbols-outlined text-sm">edit</span>
              Permintaan Revisi — {formatDateTime(formulir.updated_at || formulir.created_at)}
            </span>
            {formulir.alasan_revisi && (
              <p className="text-body-sm text-on-surface-variant text-center">
                <span className="font-semibold">Catatan Revisi:</span> {formulir.alasan_revisi}
              </p>
            )}
          </div>
        ) : formulir?.status === 'rejected' ? (
          <div className="flex flex-col items-center gap-sm">
            <span className="text-label-md font-bold text-red-700 flex items-center gap-xs">
              <span className="material-symbols-outlined text-sm">cancel</span>
              Pengajuan ditolak — {formatDateTime(formulir.updated_at || formulir.created_at)}
            </span>
            {formulir.alasan_ditolak && (
              <p className="text-body-sm text-on-surface-variant text-center">
                <span className="font-semibold">Alasan:</span> {formulir.alasan_ditolak}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-sm">
            <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-sm">
              <button
                type="button"
                onClick={() => setShowRejectForm((prev) => !prev)}
                disabled={submitting}
                className="w-full md:w-auto px-md py-xs border border-error text-error font-bold rounded-md hover:bg-error-container/10 transition-colors uppercase text-xs tracking-wide disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm align-middle mr-xs">close</span>
                Tolak
              </button>
              <button
                type="button"
                onClick={() => setShowRevisionForm((prev) => !prev)}
                disabled={submitting}
                className="w-full md:w-auto px-md py-xs border border-secondary text-secondary font-bold rounded-md hover:bg-surface-container-low transition-colors uppercase text-xs tracking-wide disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm align-middle mr-xs">edit</span>
                Minta Revisi
              </button>
              <button onClick={() => updateStatus('verified')} disabled={submitting} className="w-full md:w-auto px-md py-xs bg-primary text-white font-bold rounded-md hover:opacity-90 transition-all flex items-center justify-center gap-xs uppercase text-xs tracking-wide disabled:opacity-50 disabled:cursor-not-allowed">
                <span className="material-symbols-outlined text-sm">verified</span>
                Setujui
              </button>
            </div>
            {showRejectForm && (
              <div className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
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
                    disabled={submitting}
                    className="w-full md:w-auto px-md py-xs rounded-lg border border-outline-variant text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-low transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus('rejected', rejectReason)}
                    disabled={submitting || !rejectReason.trim()}
                    className="w-full md:w-auto px-md py-xs rounded-lg bg-error text-on-error font-label-md text-label-md hover:opacity-90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Kirim Penolakan'}
                  </button>
                </div>
              </div>
            )}
             {showRevisionForm && (
               <div className="w-full max-w-2xl bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
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
                    disabled={submitting}
                    className="w-full md:w-auto px-md py-xs rounded-lg border border-outline-variant text-on-surface-variant font-label-md text-label-md hover:bg-surface-container-low transition-colors disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus('submitted', null, revisionNote)}
                    disabled={submitting || !revisionNote.trim()}
                    className="w-full md:w-auto px-md py-xs rounded-lg bg-secondary text-white font-label-md text-label-md hover:opacity-90 transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'Menyimpan...' : 'Kirim Revisi'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </footer>
    </div>
  )
}

import React from 'react'
import { useNavigate } from 'react-router-dom'
import Select from 'react-select'
import logoLpse from '../img/logo-lpse-bungo.png'
import { supabase } from '../lib/supabase'
import {
  getSatkerList,
  createPengajuan,
} from '../lib/supabase-helpers'

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const FILE_LIMITS = {
  surat_permohonan: 2 * 1024 * 1024,
  pakta_integritas: 2 * 1024 * 1024,
  sk_terbaru: 10 * 1024 * 1024,
  surat_rekomendasi_ukpbj: 2 * 1024 * 1024,
  sertifikat_level1: 2 * 1024 * 1024,
  sk_kpa_sertifikat_pbj: 2 * 1024 * 1024,
}

const bucketByJenis = {
  surat_permohonan: 'Surat Permohonan',
  pakta_integritas: 'Pakta Integritas',
  sk_terbaru: 'SK Terbaru',
  surat_rekomendasi_ukpbj: 'Surat Rekomendasi UKPBJ',
  sertifikat_level1: 'Sertifikat Level 1',
  sk_kpa_sertifikat_pbj: 'SK KPA atau Sertifikat PBJ Level-1',
}

function sanitizeFilenamePart(str) {
  return String(str || '')
    .replace(/[^a-zA-Z0-9 \-_.]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'tanpa-nama'
}

function buildStorageFilename(namaLengkap, jabatan, satker, jenisDokumen) {
  const nama = sanitizeFilenamePart(namaLengkap)
  const jab = sanitizeFilenamePart(jabatan)
  const sat = sanitizeFilenamePart(satker)
  const jenis = sanitizeFilenamePart(jenisDokumen)
  return `${jenis} - ${nama} - ${jab} - ${sat}.pdf`
}

export default function PengajuanForm() {
  const [formData, setFormData] = React.useState({
    nama_lengkap: '',
    nip: '',
    jabatan: '',
    satker: '',
  })
  const [files, setFiles] = React.useState({})
  const [fileErrors, setFileErrors] = React.useState({})
  const [submitting, setSubmitting] = React.useState(false)
  const [submitMessage, setSubmitMessage] = React.useState('')
  const [showSuccessPopup, setShowSuccessPopup] = React.useState(false)
  const [showWelcome, setShowWelcome] = React.useState(true)
  const [satkerList, setSatkerList] = React.useState([])
  const [loadingSatker, setLoadingSatker] = React.useState(true)
  const [nipError, setNipError] = React.useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [missingDocTypes, setMissingDocTypes] = React.useState(new Set())
  const navigate = useNavigate()

  React.useEffect(() => {
    const loadSatker = async () => {
      try {
        const data = await getSatkerList()
        setSatkerList(data || [])
      } catch (error) {
        console.error('Error loading satker:', error)
      } finally {
        setLoadingSatker(false)
      }
    }

    loadSatker()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleNipChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '')
    const value = raw.slice(0, 18)

    setFormData((prev) => ({ ...prev, nip: value }))

    if (!value) {
      setNipError('')
      return
    }

    if (value.length !== 18) {
      setNipError('NIP harus terdiri dari 18 digit angka')
      return
    }

    setNipError('')
  }

  const handleSatkerChange = (selected) => {
    setFormData((prev) => ({ ...prev, satker: selected ? selected.value : '' }))
  }

  const handleFileChange = (jenis, file) => {
    setFileErrors((prev) => {
      const next = { ...prev }
      delete next[jenis]
      return next
    })

    const limit = FILE_LIMITS[jenis] || MAX_FILE_SIZE
    if (file && file.size > limit) {
      setFileErrors((prev) => ({ ...prev, [jenis]: `Ukuran file melebihi batas maksimal ${Math.round(limit / 1024 / 1024)}MB` }))
      setFiles((prev) => ({ ...prev, [jenis]: null }))
      return
    }
    if (file && file.type !== 'application/pdf') {
      setFileErrors((prev) => ({ ...prev, [jenis]: `File harus berformat PDF` }))
      setFiles((prev) => ({ ...prev, [jenis]: null }))
      return
    }
    setFiles((prev) => ({ ...prev, [jenis]: file }))
    if (file) {
      setMissingDocTypes((prev) => {
        if (!prev.has(jenis)) return prev
        const next = new Set(prev)
        next.delete(jenis)
        return next
      })
    }
  }

  const isFormComplete = Boolean(
    formData.nama_lengkap &&
    formData.nip &&
    formData.jabatan &&
    formData.satker &&
    files['surat_permohonan'] &&
    files['pakta_integritas'] &&
    files['sk_terbaru'] &&
    (formData.jabatan !== 'Pejabat Pengadaan (PP)' || (files['surat_rekomendasi_ukpbj'] && files['sertifikat_level1'])) &&
    (formData.jabatan !== 'Pejabat Pembuat Komitmen (PPK)' || /kecamatan/i.test(formData.satker || '') || files['sk_kpa_sertifikat_pbj']) &&
    (formData.jabatan !== 'Pengguna Anggaran (PA)' || (files['sk_terbaru'] && files['pakta_integritas'] && files['surat_permohonan'])) &&
    !nipError
  )

  async function uploadFileDirect(jenis, file) {
    const bucket = bucketByJenis[jenis]
    if (!bucket) return null

    const storagePath = `${Date.now()}-${buildStorageFilename(formData.nama_lengkap, formData.jabatan, formData.satker, jenis)}`

    const { data: signedData, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath, 60)

    if (signError || !signedData?.signedUrl) {
      console.error('Error generating signed URL:', signError)
      throw new Error('Gagal membuat URL upload')
    }

    const uploadRes = await fetch(signedData.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file,
    })

    if (!uploadRes.ok) {
      throw new Error('Gagal mengupload file ke storage')
    }

    return {
      jenis_dokumen: jenis,
      path: storagePath,
      bucket,
      size_bytes: file.size,
      filename: file.name,
    }
  }

  const handleBatal = () => {
    setFormData({
      nama_lengkap: '',
      nip: '',
      jabatan: '',
      satker: '',
    })
    setFiles({})
    setFileErrors({})
    setNipError('')
    localStorage.removeItem('pengajuan-draft')
    setSubmitMessage('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitMessage('')

    if (!isFormComplete) {
      const missing = []
      if (!files['surat_permohonan']) missing.push('surat_permohonan')
      if (!files['pakta_integritas']) missing.push('pakta_integritas')
      if (!files['sk_terbaru']) missing.push('sk_terbaru')
      if (formData.jabatan === 'Pejabat Pengadaan (PP)') {
        if (!files['surat_rekomendasi_ukpbj']) missing.push('surat_rekomendasi_ukpbj')
        if (!files['sertifikat_level1']) missing.push('sertifikat_level1')
      }
      if (formData.jabatan === 'Pejabat Pembuat Komitmen (PPK)' && !/kecamatan/i.test(formData.satker || '')) {
        if (!files['sk_kpa_sertifikat_pbj']) missing.push('sk_kpa_sertifikat_pbj')
      }
      setMissingDocTypes(new Set(missing))

      const firstMissingId = missing[0]
      if (firstMissingId) {
        const el = document.getElementById(`doc-${firstMissingId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
      return
    }

    setMissingDocTypes(new Set())
    setSubmitting(true)

    try {
      const dokumenList = []
      for (const [jenis, file] of Object.entries(files)) {
        if (!file) continue
        const uploaded = await uploadFileDirect(jenis, file)
        if (uploaded) {
          dokumenList.push(uploaded)
        }
      }

      console.log('Submitting pengajuan...', {
        nama_lengkap: formData.nama_lengkap,
        nip: formData.nip,
        jabatan: formData.jabatan,
        satker: formData.satker,
        dokumen: dokumenList.map(d => d.jenis_dokumen),
      })

      const result = await createPengajuan({
        nama_lengkap: formData.nama_lengkap,
        nip: formData.nip,
        jabatan: formData.jabatan,
        satker: formData.satker,
        dokumen: dokumenList,
      })

      console.log('Response data:', result)

      setFormData({
        nama_lengkap: '',
        nip: '',
        jabatan: '',
        satker: '',
      })
      setFiles({})
      setShowSuccessPopup(true)
    } catch (error) {
      console.error('Error submitting pengajuan:', error)
      setSubmitMessage(error.message || 'Gagal terhubung ke server')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page-gradient-pengajuan">
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-2xl overflow-hidden popup-enter text-center">
            <div className="p-8">
              <div className="flex items-center justify-center mb-6">
                <img
                  src={logoLpse}
                  alt="Logo LPSE Bungo"
                  className="h-10 w-auto object-contain"
                />
              </div>
              <h2 className="font-headline-md text-headline-md font-bold text-primary mb-4" style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.02em' }}>Selamat Datang di Portal Verifikasi Berkas Akun LPSE</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant mb-8">
                Silahkan lengkapi data diri dan unggah dokumen pendukung Anda untuk memulai proses verifikasi Berkas.
              
                Pastikan seluruh informasi yang Anda masukkan sudah benar dan sesuai dengan dokumen asli.
              </p>
              <button
                onClick={() => setShowWelcome(false)}
                className="w-full px-xl py-sm font-label-md text-label-md gradient-primary text-on-primary rounded-lg hover:opacity-90 shadow-md active:opacity-80 transition-all"
              >
                Masuk ke Formulir
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="sticky top-0 z-50 flex justify-between items-center w-full px-md py-xs glass-nav">
        <div className="flex items-center gap-md">
          <span className="text-headline-sm font-headline-sm font-bold text-primary">LPSE DocVerify</span>
          <div className="hidden md:flex items-center gap-lg ml-lg">
            <a className="text-primary font-bold border-b-2 border-primary pb-1 font-body-md text-body-md" href="#">Formulir Pengajuan</a>
            <a className="text-on-surface-variant hover:bg-surface-container-low px-xs py-base transition-colors font-body-md text-body-md cursor-pointer" onClick={() => navigate('/kolom-cek-status')}>Cek Status Pengajuan</a>
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
          <div className="absolute top-full left-0 right-0 bg-white/90 backdrop-blur-md border-b border-outline-variant shadow-lg md:hidden">
            <a className="block w-full text-left px-md py-sm text-primary font-bold border-b border-outline-variant font-body-md text-body-md" href="#">Formulir Pengajuan</a>
            <a className="block w-full text-left px-md py-sm text-on-surface-variant hover:bg-surface-container-low font-body-md text-body-md cursor-pointer" onClick={() => { setMobileMenuOpen(false); navigate('/kolom-cek-status') }}>Cek Status Pengajuan</a>
          </div>
        )}
      </nav>

      <main className="max-w-[1000px] mx-auto px-md py-xl">
      <div className="gradient-subtle rounded-2xl p-xl mb-xl text-center">
        <h1 className="font-headline-lg text-headline-lg text-primary mb-xs">Formulir Pengajuan Pemohon</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">Lengkapi data diri dan unggah dokumen pendukung untuk proses verifikasi akun LPSE.</p>
      </div>

        <div className="flex flex-row justify-center items-center mb-xl gap-1 md:gap-xl">
        <div className="flex items-center gap-xs step-active">
          <span className="w-6 h-6 md:w-8 md:h-8 rounded-full gradient-step flex items-center justify-center font-bold text-label-sm md:text-label-md text-white shadow-sm">1</span>
          <span className="font-label-sm md:font-label-md text-label-sm md:text-label-md text-white">Data Diri</span>
        </div>
        <div className="hidden md:block w-8 md:w-16 h-px bg-outline-variant"></div>
        <div className="flex items-center gap-xs step-inactive">
          <span className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center font-bold text-label-sm md:text-label-md text-white">2</span>
          <span className="font-label-sm md:font-label-md text-label-sm md:text-label-md text-white">Unggah Dokumen</span>
        </div>
        <div className="hidden md:block w-8 md:w-16 h-px bg-outline-variant"></div>
        <div className="flex items-center gap-xs step-inactive">
          <span className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center font-bold text-label-sm md:text-label-md text-white">3</span>
          <span className="font-label-sm md:font-label-md text-label-sm md:text-label-md text-white">Konfirmasi</span>
        </div>
      </div>

      <form className="space-y-lg" id="submissionForm" onSubmit={handleSubmit}>
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <div className="flex items-center gap-sm mb-lg border-b border-outline-variant pb-md">
            <span className="material-symbols-outlined text-secondary">person</span>
            <h2 className="font-headline-sm text-headline-sm text-primary">Data Pemohon</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="nama_lengkap">Nama Lengkap (Sesuai KTP)</label>
              <div className="border border-outline-variant rounded-lg p-sm bg-white flex items-center gap-sm form-focus transition-all">
                <span className="material-symbols-outlined text-outline">badge</span>
                <input className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md" id="nama_lengkap" name="nama_lengkap" placeholder="Masukkan nama lengkap" type="text" value={formData.nama_lengkap} onChange={handleChange} />
              </div>
            </div>
            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="nip">NIP (Nomor Induk Pegawai)</label>
              <div className="border border-outline-variant rounded-lg p-sm bg-white flex items-center gap-sm form-focus transition-all">
                <span className="material-symbols-outlined text-outline">fingerprint</span>
                <input className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md" id="nip" name="nip" placeholder="Masukkan 18 digit NIP" type="text" value={formData.nip} onChange={handleNipChange} inputMode="numeric" maxLength={18} />
              </div>
              {nipError && (
                <p className="text-[11px] text-error mt-1">{nipError}</p>
              )}
            </div>
            <div className="space-y-xs">
              <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="jabatan">Jabatan</label>
              <div className="border border-outline-variant rounded-lg p-sm bg-white flex items-center gap-sm form-focus transition-all">
                <span className="material-symbols-outlined text-outline">work</span>
                <select className="w-full bg-transparent border-none focus:ring-0 font-body-md text-body-md appearance-none" id="jabatan" name="jabatan" value={formData.jabatan} onChange={handleChange}>
                  <option value="">Pilih Jabatan</option>
                  <option value="Pejabat Pengadaan (PP)">Pejabat Pengadaan (PP)</option>
                  <option value="Pejabat Pembuat Komitmen (PPK)">Pejabat Pembuat Komitmen (PPK)</option>
                  <option value="Pengguna Anggaran (PA)">Pengguna Anggaran (PA)</option>
                </select>
              </div>
            </div>
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="satuan_kerja">Satuan Kerja</label>
                  <div className="border border-outline-variant rounded-lg p-sm bg-white flex items-center gap-sm form-focus transition-all">
                    <span className="material-symbols-outlined text-outline">corporate_fare</span>
                    <Select
                      id="satuan_kerja"
                      name="satker"
                      value={formData.satker ? { value: formData.satker, label: formData.satker } : null}
                      onChange={handleSatkerChange}
                      options={satkerList.map(item => ({ value: item.nama, label: item.nama }))}
                      placeholder="Pilih Satuan Kerja"
                      isLoading={loadingSatker}
                      isClearable
                      styles={{
                        container: (base) => ({ ...base, flex: 1 }),
                        control: (base) => ({
                          ...base,
                          border: 'none',
                          boxShadow: 'none',
                          background: 'transparent',
                          minHeight: 'auto',
                          padding: '0',
                        }),
                        valueContainer: (base) => ({
                          ...base,
                          padding: '0',
                          margin: '0',
                        }),
                        input: (base) => ({
                          ...base,
                          margin: '0',
                          padding: '0',
                          color: 'inherit',
                        }),
                        placeholder: (base) => ({
                          ...base,
                          color: '#9e9e9e',
                        }),
                        singleValue: (base) => ({
                          ...base,
                          color: 'inherit',
                        }),
                        menu: (base) => ({
                          ...base,
                          zIndex: 50,
                        }),
                        menuList: (base) => ({
                          ...base,
                          maxHeight: '200px',
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused ? '#f0f0f0' : state.isSelected ? '#e3f2fd' : 'transparent',
                          color: state.isSelected ? '#1976d2' : 'inherit',
                          ':active': {
                            backgroundColor: '#e3f2fd',
                          },
                        }),
                      }}
                    />
                  </div>
              </div>
          </div>
        </section>

        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg shadow-sm">
          <div className="flex items-center gap-sm mb-lg border-b border-outline-variant pb-md">
            <span className="material-symbols-outlined text-secondary">cloud_upload</span>
            <h2 className="font-headline-sm text-headline-sm text-primary">Pusat Unggah Dokumen</h2>
          </div>
            <div className="space-y-lg">
              {formData.jabatan === 'Pejabat Pengadaan (PP)' && (
                <div id="doc-surat_rekomendasi_ukpbj" className={`flex flex-col md:flex-row md:items-center justify-between gap-md p-md border ${missingDocTypes.has('surat_rekomendasi_ukpbj') ? 'border-error border-2 ring-2 ring-error/30' : 'border-outline-variant border-dashed'} rounded-lg drop-zone transition-all`}>
                  <div className="flex items-start gap-md">
                    <div className="bg-secondary-container/20 p-sm rounded-lg">
                      <span className="material-symbols-outlined text-secondary">verified</span>
                    </div>
                     <div>
                       <p className="font-label-md text-label-md text-primary">Surat Rekomendasi UKPBJ</p>
                       <p className="font-body-sm text-body-sm text-on-surface-variant">Format .pdf, Maksimal 2MB</p>
                     </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-sm">
                    <p className="text-[11px] text-black md:hidden">Surat rekomendasi dari UKPBJ setelah surat permohonan disetujui</p>
                    <label className="cursor-pointer gradient-primary text-on-primary font-label-md text-label-md px-xl md:px-md py-sm rounded-lg hover:opacity-90 transition-all inline-block text-center shadow-sm w-full md:w-auto">
                        Pilih File
                        <input className="hidden" type="file" onChange={(e) => handleFileChange('surat_rekomendasi_ukpbj', e.target.files[0])} />
                      </label>
                      {files['surat_rekomendasi_ukpbj'] && (
                        <span className="font-body-sm text-body-sm text-green-600 flex items-center gap-xs">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          {files['surat_rekomendasi_ukpbj'].name}
                        </span>
                      )}
                      <span className="material-symbols-outlined text-outline cursor-help hidden md:block" title="Surat rekomendasi dari UKPBJ setelah surat permohonan disetujui">info</span>
                  </div>
                {fileErrors['surat_rekomendasi_ukpbj'] && (
                  <p className="text-[11px] text-error mt-1">{fileErrors['surat_rekomendasi_ukpbj']}</p>
                )}
                {missingDocTypes.has('surat_rekomendasi_ukpbj') && (
                  <p className="text-[11px] text-error mt-1 font-medium">Dokumen Surat Rekomendasi UKPBJ belum diunggah</p>
                )}
               </div>
             )}

             {formData.jabatan === 'Pejabat Pembuat Komitmen (PPK)' && !/kecamatan/i.test(formData.satker || '') && (
                <div id="doc-sk_kpa_sertifikat_pbj" className={`flex flex-col md:flex-row md:items-center justify-between gap-md p-md border ${missingDocTypes.has('sk_kpa_sertifikat_pbj') ? 'border-error border-2 ring-2 ring-error/30' : 'border-outline-variant border-dashed'} rounded-lg drop-zone transition-all`}>
                  <div className="flex items-start gap-md">
                    <div className="bg-secondary-container/20 p-sm rounded-lg">
                      <span className="material-symbols-outlined text-secondary">verified</span>
                    </div>
                     <div>
                       <p className="font-label-md text-label-md text-primary">Sertifikat PBJ Level-1 / SK KPA bagi PPK</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Format .pdf, Maksimal 2MB</p>
                     </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-sm">
                    <p className="text-[11px] text-black md:hidden">Sertifikat PBJ Level-1 yang dikeluarkan oleh LKPP / SK KPA bagi PPK</p>
                    <label className="cursor-pointer gradient-primary text-on-primary font-label-md text-label-md px-xl md:px-md py-sm rounded-lg hover:opacity-90 transition-all inline-block text-center shadow-sm w-full md:w-auto">
                        Pilih File
                        <input className="hidden" type="file" onChange={(e) => handleFileChange('sk_kpa_sertifikat_pbj', e.target.files[0])} />
                      </label>
                      {files['sk_kpa_sertifikat_pbj'] && (
                        <span className="font-body-sm text-body-sm text-green-600 flex items-center gap-xs">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          {files['sk_kpa_sertifikat_pbj'].name}
                        </span>
                      )}
                      <span className="material-symbols-outlined text-outline cursor-help hidden md:block" title="SK KPA atau Sertifikat PBJ Level-1 yang dikeluarkan oleh LKPP">info</span>
                  </div>
                 {fileErrors['sk_kpa_sertifikat_pbj'] && (
                   <p className="text-[11px] text-error mt-1">{fileErrors['sk_kpa_sertifikat_pbj']}</p>
                 )}
                 {missingDocTypes.has('sk_kpa_sertifikat_pbj') && (
                   <p className="text-[11px] text-error mt-1 font-medium">Dokumen SK KPA / Sertifikat PBJ Level-1 belum diunggah</p>
                 )}
               </div>
             )}

              <div id="doc-surat_permohonan" className={`flex flex-col md:flex-row md:items-center justify-between gap-md p-md border ${missingDocTypes.has('surat_permohonan') ? 'border-error border-2 ring-2 ring-error/30' : 'border-outline-variant border-dashed'} rounded-lg drop-zone transition-all`}>
               <div className="flex items-start gap-md">
                 <div className="bg-secondary-container/20 p-sm rounded-lg">
                   <span className="material-symbols-outlined text-secondary">description</span>
                 </div>
                  <div>
                     <p className="font-label-md text-label-md text-primary">Surat Permohonan Verifikasi</p>
                     <p className="font-body-sm text-body-sm text-on-surface-variant">Format .pdf, Maksimal 2MB</p>
                  </div>
               </div>
                <div className="flex flex-col md:flex-row md:items-center gap-sm">
                  <p className="text-[11px] text-black md:hidden">Wajib diunggah dengan tanda tangan basah dan stempel atau menggunakan TTE</p>
                  <label className="cursor-pointer gradient-primary text-on-primary font-label-md text-label-md px-xl md:px-md py-sm rounded-lg hover:opacity-90 transition-all inline-block text-center shadow-sm w-full md:w-auto">
                    Pilih File
                    <input className="hidden" type="file" onChange={(e) => handleFileChange('surat_permohonan', e.target.files[0])} />
                  </label>
                  {files['surat_permohonan'] && (
                    <span className="font-body-sm text-body-sm text-green-600 flex items-center gap-xs">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      {files['surat_permohonan'].name}
                    </span>
                  )}
                  <span className="material-symbols-outlined text-outline cursor-help hidden md:block" title="Wajib diunggah dengan tanda tangan basah dan stempel">info</span>
                </div>
              {fileErrors['surat_permohonan'] && (
                <p className="text-[11px] text-error mt-1">{fileErrors['surat_permohonan']}</p>
              )}
              {missingDocTypes.has('surat_permohonan') && (
                <p className="text-[11px] text-error mt-1 font-medium">Dokumen Surat Permohonan belum diunggah</p>
              )}
            </div>

            <div id="doc-pakta_integritas" className={`flex flex-col md:flex-row md:items-center justify-between gap-md p-md border ${missingDocTypes.has('pakta_integritas') ? 'border-error border-2 ring-2 ring-error/30' : 'border-outline-variant border-dashed'} rounded-lg drop-zone transition-all`}>
              <div className="flex items-start gap-md">
                <div className="bg-secondary-container/20 p-sm rounded-lg">
                  <span className="material-symbols-outlined text-secondary">verified</span>
                </div>
                 <div>
                    <p className="font-label-md text-label-md text-primary">Pakta Integritas</p>
                     <p className="font-body-sm text-body-sm text-on-surface-variant">Format .pdf, Maksimal 2MB</p>
                 </div>
               </div>
                <div className="flex flex-col md:flex-row md:items-center gap-sm">
                  <p className="text-[11px] text-black md:hidden">Pakta Integritas yang sudah ditandatangani diatas Materai 10.000</p>
                  <label className="cursor-pointer gradient-primary text-on-primary font-label-md text-label-md px-xl md:px-md py-sm rounded-lg hover:opacity-90 transition-all inline-block text-center shadow-sm w-full md:w-auto">
                    Pilih File
                    <input className="hidden" type="file" onChange={(e) => handleFileChange('pakta_integritas', e.target.files[0])} />
                  </label>
                  {files['pakta_integritas'] && (
                    <span className="font-body-sm text-body-sm text-green-600 flex items-center gap-xs">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      {files['pakta_integritas'].name}
                    </span>
                  )}
                  <span className="material-symbols-outlined text-outline cursor-help hidden md:block" title="Pakta Integritas yang sudah ditandatangani diatas Materai 10.000">info</span>
                </div>
              {fileErrors['pakta_integritas'] && (
                <p className="text-[11px] text-error mt-1">{fileErrors['pakta_integritas']}</p>
              )}
              {missingDocTypes.has('pakta_integritas') && (
                <p className="text-[11px] text-error mt-1 font-medium">Dokumen Pakta Integritas belum diunggah</p>
              )}
            </div>

            <div id="doc-sk_terbaru" className={`flex flex-col md:flex-row md:items-center justify-between gap-md p-md border ${missingDocTypes.has('sk_terbaru') ? 'border-error border-2 ring-2 ring-error/30' : 'border-outline-variant border-dashed'} rounded-lg drop-zone transition-all`}>
              <div className="flex items-start gap-md">
                <div className="bg-secondary-container/20 p-sm rounded-lg">
                  <span className="material-symbols-outlined text-secondary">assignment_ind</span>
                </div>
                 <div>
                    <p className="font-label-md text-label-md text-primary">SK PP/PPK/PA Terbaru</p>
                     <p className="font-body-sm text-body-sm text-on-surface-variant">Format .pdf, Maksimal 2MB</p>
                 </div>
               </div>
                <div className="flex flex-col md:flex-row md:items-center gap-sm">
                  <p className="text-[11px] text-black md:hidden">Scan Asli SK Pengangkatan sebagai PP/PPK/PA</p>
                  <label className="cursor-pointer gradient-primary text-on-primary font-label-md text-label-md px-xl md:px-md py-sm rounded-lg hover:opacity-90 transition-all inline-block text-center shadow-sm w-full md:w-auto">
                    Pilih File
                    <input className="hidden" type="file" onChange={(e) => handleFileChange('sk_terbaru', e.target.files[0])} />
                  </label>
                  {files['sk_terbaru'] && (
                    <span className="font-body-sm text-body-sm text-green-600 flex items-center gap-xs">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      {files['sk_terbaru'].name}
                    </span>
                  )}
                  <span className="material-symbols-outlined text-outline cursor-help hidden md:block" title="Scan Asli SK Pengangkatan sebagai PP/PPK/PA">info</span>
                </div>
              {fileErrors['sk_terbaru'] && (
                <p className="text-[11px] text-error mt-1">{fileErrors['sk_terbaru']}</p>
              )}
              {missingDocTypes.has('sk_terbaru') && (
                <p className="text-[11px] text-error mt-1 font-medium">Dokumen SK PP/PPK/PA Terbaru belum diunggah</p>
              )}
            </div>

             {formData.jabatan === 'Pejabat Pengadaan (PP)' && (
                <div id="doc-sertifikat_level1" className={`flex flex-col md:flex-row md:items-center justify-between gap-md p-md border ${missingDocTypes.has('sertifikat_level1') ? 'border-error border-2 ring-2 ring-error/30' : 'border-outline-variant border-dashed'} rounded-lg drop-zone transition-all`}>
                  <div className="flex items-start gap-md">
                    <div className="bg-secondary-container/20 p-sm rounded-lg">
                      <span className="material-symbols-outlined text-secondary">verified</span>
                    </div>
                     <div>
                       <p className="font-label-md text-label-md text-primary">Sertifikat PBJ Level-1</p>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Format .pdf, Maksimal 2MB</p>
                     </div>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center gap-sm">
                    <p className="text-[11px] text-black md:hidden">Sertifikat PBJ Level-1 yang dikeluarkan oleh LKPP / SK KPA bagi PPK</p>
                    <label className="cursor-pointer gradient-primary text-on-primary font-label-md text-label-md px-xl md:px-md py-sm rounded-lg hover:opacity-90 transition-all inline-block text-center shadow-sm w-full md:w-auto">
                        Pilih File
                        <input className="hidden" type="file" onChange={(e) => handleFileChange('sertifikat_level1', e.target.files[0])} />
                      </label>
                      {files['sertifikat_level1'] && (
                        <span className="font-body-sm text-body-sm text-green-600 flex items-center gap-xs">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          {files['sertifikat_level1'].name}
                        </span>
                      )}
                      <span className="material-symbols-outlined text-outline cursor-help hidden md:block" title="Sertifikat Level 1 yang dikeluarkan oleh LKPP">info</span>
                  </div>
                {fileErrors['sertifikat_level1'] && (
                  <p className="text-[11px] text-error mt-1">{fileErrors['sertifikat_level1']}</p>
                )}
                {missingDocTypes.has('sertifikat_level1') && (
                  <p className="text-[11px] text-error mt-1 font-medium">Dokumen Sertifikat PBJ Level-1 belum diunggah</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Mobile action card */}
        <div className="md:hidden bg-surface-container-lowest border border-outline-variant rounded-xl p-4 shadow-sm mt-4">
          <div className="flex flex-col gap-3">
            <button className="w-full px-xl py-sm font-label-md text-label-md gradient-primary text-on-primary rounded-lg hover:opacity-90 shadow-md active:opacity-80 transition-all flex items-center justify-center gap-xs disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={submitting}>
              <span>{submitting ? 'Mengirim...' : 'Lanjutkan Pengajuan'}</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
            <button onClick={handleBatal} disabled={submitting} className="w-full px-xl py-sm font-label-md text-label-md text-white rounded-lg hover:opacity-90 shadow-sm active:opacity-80 transition-all disabled:opacity-50 disabled:cursor-not-allowed" type="button" style={{ background: '#2563eb' }}>
              Batal
            </button>
          </div>
        </div>

        {/* Desktop buttons */}
        <div className="hidden md:flex flex-col sm:flex-row items-center justify-end gap-md pt-md">
          <button onClick={handleBatal} disabled={submitting} className="order-2 sm:order-1 w-full sm:w-auto px-xl py-sm font-label-md text-label-md text-white border border-white rounded-lg hover:bg-white/10 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed" type="button">
            Batal
          </button>
          <button className="order-1 sm:order-2 w-full sm:w-auto px-xl py-sm font-label-md text-label-md gradient-primary text-on-primary rounded-lg hover:opacity-90 shadow-md active:opacity-80 transition-all flex items-center justify-center gap-xs disabled:opacity-50 disabled:cursor-not-allowed" type="submit" disabled={submitting}>
            <span>{submitting ? 'Mengirim...' : 'Lanjutkan Pengajuan'}</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </form>

      {submitMessage && !showSuccessPopup && (
        <div className={`mt-md p-md rounded-lg border ${submitMessage.includes('berhasil') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          <p className="font-body-sm text-body-sm">{submitMessage}</p>
        </div>
      )}

      {showSuccessPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowSuccessPopup(false)}>
          <div className="w-full max-w-[420px] bg-white rounded-xl shadow-2xl overflow-hidden popup-enter" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-green-600 text-3xl">check_circle</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-primary mb-2">Pengajuan Berhasil!</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mb-6">
                Pengajuan berhasil dikirim. Silahkan Cek Status Pengajuan secara berkala untuk melihat status verifikasi.
              </p>
               <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                 <button
                   onClick={() => navigate('/kolom-cek-status')}
                   className="w-full sm:w-auto px-md py-sm rounded-lg gradient-primary text-on-primary font-bold hover:opacity-90 shadow-sm transition-all"
                 >
                   Cek Status
                 </button>
                 <button
                   onClick={() => setShowSuccessPopup(false)}
                   className="w-full sm:w-auto px-md py-sm rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low transition-colors order-last sm:order-last"
                 >
                   Tutup
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}

      <footer className="mt-xl border-t border-outline-variant pt-lg flex flex-col md:flex-row justify-between items-center gap-md">
        <div className="flex items-center gap-md">
          <div className="flex items-center gap-xs text-white">
            <span className="material-symbols-outlined text-[20px]">schedule</span>
            <span className="font-body-sm text-body-sm">Estimasi verifikasi: 2-3 hari kerja</span>
          </div>
        </div>
        <div className="text-white font-body-sm text-body-sm">
          © 2026 LPSE Portal. All Rights Reserved | Designed & Developed by <a href="https://card-profile-tawny.vercel.app" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Junaidi</a>
        </div>
      </footer>
    </main>
    </div>
  )
}
import React from 'react'

export default function InfoCard() {
  return (
    <div className="mt-xl p-md bg-surface-container rounded-lg border-l-4 border-primary flex gap-md">
      <span className="material-symbols-outlined text-primary shrink-0">info</span>
      <div>
        <p className="font-label-md text-label-md text-primary">Informasi Penting</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Proses verifikasi membutuhkan waktu 1-3 hari kerja sejak pengajuan dikirim. Pastikan nomor kontak Anda aktif untuk keperluan klarifikasi oleh tim verifikator.</p>
      </div>
    </div>
  )
}
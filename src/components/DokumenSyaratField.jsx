import React from 'react'
import { getDokumenSyaratList, parseDokumenSyarat } from '../lib/dokumen-syarat'

export default function DokumenSyaratField({ value = [], onChange, jabatan, jenis }) {
  const selected = Array.isArray(value) ? value : []
  const list = getDokumenSyaratList(jabatan, jenis)

  const toggle = (key, checked) => {
    const next = checked
      ? [...selected, key]
      : selected.filter(item => item !== key)
    onChange?.(next)
  }

  return (
    <div className="space-y-xs">
      <label className="text-label-sm text-on-surface-variant">Dokumen Persyaratan</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
        {list.map(doc => (
          <label
            key={doc.key}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-outline-variant bg-white hover:border-primary-fixed transition-colors cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.includes(doc.key)}
              onChange={(e) => toggle(doc.key, e.target.checked)}
              className="w-4 h-4 rounded border-outline-variant accent-primary focus:ring-primary cursor-pointer"
            />
            <span className="text-body-sm text-on-surface">{doc.label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

export function DokumenSyaratBadges({ value, jabatan, jenis }) {
  const selected = parseDokumenSyarat(value)
  const list = getDokumenSyaratList(jabatan, jenis)

  if (selected.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1 mt-2">
      {list.map(doc => {
        const lengkap = selected.includes(doc.key)
        return (
          <span
            key={doc.key}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              lengkap
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-surface-container text-on-surface-variant border-outline-variant'
            }`}
          >
            <span className="material-symbols-outlined text-[10px]">
              {lengkap ? 'check_circle' : 'radio_button_unchecked'}
            </span>
            {doc.label}
          </span>
        )
      })}
    </div>
  )
}

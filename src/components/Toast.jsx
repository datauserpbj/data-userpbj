import React from 'react'

export default function Toast({ open, message, type = 'success', onClose }) {
  React.useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      onClose()
    }, 5000)
    return () => clearTimeout(timer)
  }, [open, onClose])

  if (!open) return null

  const colors = {
    success: 'bg-green-50 border-green-400 text-green-800',
    error: 'bg-red-50 border-red-400 text-red-800',
    info: 'bg-blue-50 border-blue-400 text-blue-800',
  }

  const icons = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-24 px-4 pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-sm px-md py-sm border rounded-lg shadow-lg ${colors[type]} popup-enter`}
        style={{ minWidth: '280px', maxWidth: '90vw' }}
      >
        <span className="material-symbols-outlined text-sm">{icons[type]}</span>
        <p className="text-label-sm font-medium flex-1">{message}</p>
        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded hover:bg-black/5 transition-colors"
          aria-label="Tutup notifikasi"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>
      </div>
    </div>
  )
}

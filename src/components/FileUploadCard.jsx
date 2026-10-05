import React from 'react'

export default function FileUploadCard({ title, description, onFileChange }) {
  const [selectedFile, setSelectedFile] = React.useState(null)
  const [previewUrl, setPreviewUrl] = React.useState(null)
  const [open, setOpen] = React.useState(false)

  const handleChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      if (onFileChange) {
        onFileChange(file)
      }
    }
  }

  const handlePreview = () => {
    if (!selectedFile) return
    const url = URL.createObjectURL(selectedFile)
    setPreviewUrl(url)
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between p-md border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors group">
      <div className="flex items-start gap-md">
        <div className="w-10 h-10 bg-error-container text-error rounded flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined">picture_as_pdf</span>
        </div>
        <div>
          <p className="font-label-md text-label-md text-on-surface">{title}</p>
          <p className="text-[11px] text-on-surface-variant">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-sm mt-sm md:mt-0">
        <button onClick={handlePreview} type="button" disabled={!selectedFile} className="px-md py-2 border border-primary text-primary font-label-md rounded flex items-center gap-2 hover:bg-primary/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
          <span className="material-symbols-outlined text-sm">visibility</span>
          Lihat Pratinjau
        </button>
        <label className="px-md py-2 bg-secondary text-white font-label-md rounded cursor-pointer hover:bg-primary transition-colors flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">upload_file</span>
          Pilih File
          <input accept=".pdf" className="hidden" type="file" onChange={handleChange} />
        </label>
      </div>
      {selectedFile && (
        <p className="text-[11px] text-secondary font-bold mt-sm md:mt-0">
          Terpilih: {selectedFile.name}
        </p>
      )}

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-0 md:p-6" onClick={handleClose}>
          <div className="bg-white w-full h-full md:h-[90vh] md:rounded-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
              <h3 className="font-headline-sm text-headline-sm text-primary truncate">{selectedFile?.name}</h3>
              <button onClick={handleClose} className="p-2 rounded-full hover:bg-surface-container-low transition-colors">
                <span className="material-symbols-outlined text-primary">close</span>
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {previewUrl && (
                <iframe src={previewUrl} title="Pratinjau" className="w-full h-full" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
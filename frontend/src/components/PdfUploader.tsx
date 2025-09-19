import {
  useCallback,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react'

export type PdfUploaderProps = {
  onFileChange?: (file: File | null) => void
  ariaLabelledBy?: string
}

const isPdfFile = (file: File) =>
  file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

const formatFileSize = (sizeInBytes: number) => {
  if (sizeInBytes >= 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`
  }

  if (sizeInBytes >= 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`
  }

  return `${sizeInBytes} bytes`
}

const PdfUploader = ({ onFileChange, ariaLabelledBy }: PdfUploaderProps) => {
  const inputId = useId()
  const descriptionId = `${inputId}-description`
  const statusId = `${inputId}-status`
  const errorId = `${inputId}-error`

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) {
        return
      }

      const file = files[0]

      if (!isPdfFile(file)) {
        setSelectedFile(null)
        setErrorMessage('Only PDF files (.pdf) can be uploaded. Please choose a PDF document.')
        onFileChange?.(null)
        return
      }

      setErrorMessage(null)
      setSelectedFile(file)
      onFileChange?.(file)
    },
    [onFileChange],
  )

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      handleFiles(event.target.files)
      event.target.value = ''
    },
    [handleFiles],
  )

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setIsDragging(false)
      handleFiles(event.dataTransfer?.files ?? null)
    },
    [handleFiles],
  )

  const handleDragEnter = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
    if (!isDragging) {
      setIsDragging(true)
    }
  }, [isDragging])

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const nextTarget = event.relatedTarget as Node | null
    if (nextTarget && event.currentTarget.contains(nextTarget)) {
      return
    }

    setIsDragging(false)
  }, [])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      fileInputRef.current?.click()
    }
  }, [])

  const describedBy = errorMessage ? `${descriptionId} ${errorId}` : descriptionId

  const dropZoneClasses = `relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
    isDragging
      ? 'border-blue-500 bg-blue-50/80 text-blue-700 shadow-lg shadow-blue-200/60'
      : 'border-slate-300/80 bg-slate-50/60 text-slate-700 hover:border-blue-500/70 hover:bg-blue-50/50 focus-visible:border-blue-500 focus-visible:bg-blue-50/50'
  }`

  return (
    <div className="grid gap-4">
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={handleInputChange}
      />

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a PDF document"
        aria-labelledby={ariaLabelledBy}
        aria-describedby={describedBy}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={dropZoneClasses}
      >
        <span aria-hidden="true" className="text-4xl">
          📄
        </span>
        <div className="grid gap-1">
          <p className="text-lg font-semibold text-slate-900">Drag and drop your PDF</p>
          <p className="text-sm text-slate-600" id={descriptionId}>
            Drop the locked file here or use the picker below. Only PDF files with the <strong>.pdf</strong> extension are allowed.
          </p>
        </div>
        <span className="inline-flex rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-1 text-sm font-semibold text-blue-600 shadow-sm">
          Browse for a PDF
        </span>
      </div>

      <div aria-live="polite" id={statusId} className="rounded-2xl border border-slate-200/60 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
        {selectedFile ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900" title={selectedFile.name}>
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-600">{formatFileSize(selectedFile.size)}</p>
            </div>
            <span aria-hidden="true" className="text-xl">
              ✅
            </span>
          </div>
        ) : (
          <p>No PDF selected yet.</p>
        )}
      </div>

      {errorMessage ? (
        <p id={errorId} role="alert" className="text-sm font-semibold text-red-600">
          {errorMessage}
        </p>
      ) : null}
    </div>
  )
}

export default PdfUploader

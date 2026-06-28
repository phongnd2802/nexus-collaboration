import { useState, useRef } from 'react'
import { Button } from '../ui/button'
import { Camera, Upload, X, Building2 } from 'lucide-react'
import { useIntl } from 'react-intl'

interface WorkspaceIconUploadProps {
  onIconChange: (file: File | null) => void
}

export function WorkspaceIconUpload({ onIconChange }: WorkspaceIconUploadProps) {
  const intl = useIntl()
  const [preview, setPreview] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (file: File) => {
    console.log('🔍 File selected in WorkspaceIconUpload:', file.name, file.type, file.size)

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert(intl.formatMessage({ id: 'workspace.createForm.icon.errors.invalidType' }))
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert(intl.formatMessage({ id: 'workspace.createForm.icon.errors.maxSize' }))
      return
    }

    console.log('✅ File validation passed, setting preview and calling onIconChange')
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
    onIconChange(file)
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const removeIcon = () => {
    setPreview(null)
    onIconChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const openFileDialog = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-2">
      <div
        className={`relative w-20 h-20 mx-auto rounded-xl border-2 border-dashed transition-all cursor-pointer group ${
          isDragging
            ? 'border-[#D97757] bg-[rgba(217,119,87,0.08)]'
            : preview
            ? 'border-[rgba(31,30,29,0.15)]'
            : 'border-[rgba(31,30,29,0.3)] hover:border-[#D97757] hover:bg-[rgba(217,119,87,0.08)]'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={openFileDialog}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt={intl.formatMessage({ id: 'workspace.createForm.icon.previewAlt' })}
              className="w-full h-full rounded-xl object-cover"
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                removeIcon()
              }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-xl transition-all flex items-center justify-center">
              <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#73726C]">
            <Building2 className="w-6 h-6 mb-1" />
            <Upload className="w-3 h-3" />
          </div>
        )}
      </div>

      <div className="text-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={openFileDialog}
          className="text-xs h-7"
        >
          {preview
            ? intl.formatMessage({ id: 'workspace.createForm.icon.change' })
            : intl.formatMessage({ id: 'workspace.createForm.icon.upload' })}
        </Button>
        <p className="text-xs text-[#73726C] mt-1">
          {intl.formatMessage({ id: 'workspace.createForm.icon.hint' })}
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  )
}

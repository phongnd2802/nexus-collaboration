import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Square, Paperclip, X, ArrowUp, Zap, Brain, Sparkles, ChevronDown, Check } from 'lucide-react'
import { useIntl } from 'react-intl'

interface AttachedFile {
  id: string
  file: File
  preview?: string
}

interface AIChatInputProps {
  onSend: (message: string, files: AttachedFile[]) => void
  onStop: () => void
  isStreaming: boolean
  model: string
  onModelChange: (modelId: string) => void
  disabled?: boolean
  value?: string
  onChange?: (value: string) => void
}

const MODES = [
  { id: 'auto', labelKey: 'modules.aiChat.modes.auto', defaultLabel: 'Auto', icon: Sparkles },
  { id: 'thinking', labelKey: 'modules.aiChat.modes.thinking', defaultLabel: 'Thinking', icon: Brain },
  { id: 'fast', labelKey: 'modules.aiChat.modes.fast', defaultLabel: 'Fast', icon: Zap },
]

function ModeDropdown({ model, onModelChange }: { model: string; onModelChange: (id: string) => void }) {
  const intl = useIntl()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handler)
      return () => document.removeEventListener('mousedown', handler)
    }
  }, [open])

  const currentMode = MODES.find(m => m.id === model) || MODES[0]
  const ActiveIcon = currentMode.icon

  const handleSelect = useCallback((id: string) => {
    onModelChange(id)
    setOpen(false)
  }, [onModelChange])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium text-[#3D3D3A] hover:text-[#1F1E1D] hover:bg-[rgba(31,30,29,0.04)] transition-colors outline-none select-none"
      >
        <ActiveIcon className="h-3.5 w-3.5 text-[#73726C]" />
        {intl.formatMessage({ id: currentMode.labelKey, defaultMessage: currentMode.defaultLabel })}
        <ChevronDown className={`h-3 w-3 text-[#73726C] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-44 rounded-xl border border-[rgba(31,30,29,0.12)] bg-white p-1 shadow-[rgba(0,0,0,0.016)_0px_4px_24px_0px,rgba(0,0,0,0.016)_0px_4px_32px_0px,rgba(0,0,0,0.01)_0px_2px_64px_0px,rgba(0,0,0,0.01)_0px_16px_32px_0px] z-50">
          {MODES.map(mode => {
            const Icon = mode.icon
            const isActive = model === mode.id
            return (
              <button
                key={mode.id}
                onClick={() => handleSelect(mode.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px] transition-colors text-left ${
                  isActive
                    ? 'bg-[#FAF9F5] text-[#1F1E1D] font-medium'
                    : 'text-[#1F1E1D] hover:bg-[#FAF9F5]'
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-[#D97757]' : 'text-[#73726C]'}`} />
                <span className="flex-1">
                  {intl.formatMessage({ id: mode.labelKey, defaultMessage: mode.defaultLabel })}
                </span>
                {isActive && <Check className="h-4 w-4 text-[#D97757] flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function AIChatInput({ onSend, onStop, isStreaming, model, onModelChange, disabled, value: externalValue, onChange }: AIChatInputProps) {
  const intl = useIntl()
  const isControlled = externalValue !== undefined && onChange !== undefined
  const [internalValue, setInternalValue] = useState('')
  const value = isControlled ? externalValue! : internalValue
  const setValue = isControlled ? onChange! : setInternalValue
  const [files, setFiles] = useState<AttachedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const autoResize = useCallback(() => {
    const el = textareaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 200) + 'px'
    }
  }, [])

  useEffect(() => {
    autoResize()
  }, [value, autoResize])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled || isStreaming) return
    onSend(trimmed, files)
    setValue('')
    setFiles([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, files, disabled, isStreaming, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    const newFiles: AttachedFile[] = selected.map(f => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
    }))
    setFiles(prev => [...prev, ...newFiles])
    if (fileInputRef.current) fileInputRef.current.value = ''
    textareaRef.current?.focus()
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file?.preview) URL.revokeObjectURL(file.preview)
      return prev.filter(f => f.id !== id)
    })
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    const newFiles: AttachedFile[] = dropped.map(f => ({
      id: `${Date.now()}-${Math.random()}`,
      file: f,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
    }))
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  return (
    <div
      className="sticky bottom-0 bg-white"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 bg-[#D97757]/5 border-2 border-dashed border-[#D97757] rounded-xl z-10 flex items-center justify-center m-2">
          <p className="text-[14px] font-medium text-[#1F1E1D]">
            {intl.formatMessage({ id: 'modules.aiChat.input.dropFiles', defaultMessage: 'Drop files to attach' })}
          </p>
        </div>
      )}

      {files.length > 0 && (
        <div className="max-w-3xl mx-auto flex items-center gap-2 px-4 pt-3 pb-1 flex-wrap">
          {files.map(f => (
            <div
              key={f.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#FAF9F5] border border-[rgba(31,30,29,0.12)] text-[13px] text-[#1F1E1D]"
            >
              {f.preview ? (
                <img src={f.preview} alt="" className="w-5 h-5 rounded object-cover" />
              ) : (
                <Paperclip className="h-3.5 w-3.5 text-[#73726C]" />
              )}
              <span className="max-w-[160px] truncate">{f.file.name}</span>
              <button onClick={() => removeFile(f.id)} className="text-[#73726C] hover:text-[#E01E5A] transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="rounded-2xl border border-[rgba(31,30,29,0.15)] bg-white shadow-[rgba(0,0,0,0.04)_0px_4px_20px_0px] transition-shadow focus-within:border-[#1F1E1D] focus-within:shadow-[0_0_0_3px_rgba(31,30,29,0.1)]">
          <textarea
            ref={textareaRef}
            data-ai-chat-input
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={intl.formatMessage({ id: 'modules.aiChat.input.placeholder', defaultMessage: 'Ask anything...' })}
            disabled={disabled}
            rows={1}
            className="w-full bg-transparent text-[16px] leading-[24px] text-[#141413] placeholder-[rgba(61,61,58,0.6)] outline-none px-5 pt-4 pb-2 resize-none max-h-[200px]"
          />

          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.txt,.md,.csv,.json,.xml,.yaml,.yml"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2 rounded-lg text-[#73726C] hover:text-[#1F1E1D] hover:bg-[rgba(31,30,29,0.04)] transition-colors"
                title={intl.formatMessage({ id: 'modules.aiChat.input.attachFiles', defaultMessage: 'Attach files' })}
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <ModeDropdown model={model} onModelChange={onModelChange} />

              {isStreaming ? (
                <button
                  onClick={onStop}
                  className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#E01E5A] text-white hover:bg-[#c71a4e] transition-colors"
                  title={intl.formatMessage({ id: 'modules.aiChat.input.stopGenerating', defaultMessage: 'Stop generating' })}
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!value.trim() || disabled}
                  className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#1F1E1D] text-white hover:bg-[#0A0A0A] active:scale-[0.98] disabled:bg-[#3D3D3A] disabled:text-[#73726C] disabled:cursor-not-allowed transition-all"
                  title={intl.formatMessage({ id: 'modules.aiChat.input.sendMessage', defaultMessage: 'Send message' })}
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="text-center text-[12px] text-[#73726C] mt-2">
          {intl.formatMessage({ id: 'modules.aiChat.disclaimer', defaultMessage: 'Nexus can make mistakes. Please double-check responses.' })}
        </p>
      </div>
    </div>
  )
}

import React, { useRef, useEffect, useCallback, useState } from 'react'
import {
  ArrowUp,
  Square,
  Code2,
  Pencil,
  GraduationCap,
  Coffee,
  Sparkles,
  Zap,
  Brain,
  ChevronDown,
  Check,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useIntl } from 'react-intl'

interface SuggestionChip {
  icon: React.ElementType
  label: string
  prompt: string
}

const SUGGESTIONS: SuggestionChip[] = [
  { icon: Code2, label: 'Code', prompt: 'Write a REST API endpoint in TypeScript with validation' },
  { icon: Pencil, label: 'Write', prompt: 'Draft a professional email to request a meeting' },
  { icon: GraduationCap, label: 'Learn', prompt: 'Explain how neural networks work in simple terms' },
  { icon: Coffee, label: 'Life stuff', prompt: 'Give me tips for staying productive while working from home' },
  { icon: Sparkles, label: 'Surprise me', prompt: 'Surprise me with something interesting about science' },
]

const MODES = [
  { id: 'auto', label: 'Auto', icon: Sparkles },
  { id: 'thinking', label: 'Thinking', icon: Brain },
  { id: 'fast', label: 'Fast', icon: Zap },
]

function getGreeting(name: string): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'Good morning'
  if (hour >= 12 && hour < 17) return 'Good afternoon'
  if (hour >= 17 && hour < 21) return 'Good evening'
  return 'Good night'
}

function ModeDropdown({ model, onModelChange }: { model: string; onModelChange: (id: string) => void }) {
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
        {currentMode.label}
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
                <span className="flex-1">{mode.label}</span>
                {isActive && <Check className="h-4 w-4 text-[#D97757] flex-shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface AIChatEmptyProps {
  onSend: (message: string) => void
  isStreaming: boolean
  onStop: () => void
  model: string
  onModelChange: (model: string) => void
}

export function AIChatEmpty({ onSend, isStreaming, onStop, model, onModelChange }: AIChatEmptyProps) {
  const { user } = useAuth()
  const intl = useIntl()
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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
    if (!trimmed || isStreaming) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [value, isStreaming, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const handleSuggestionClick = useCallback((prompt: string) => {
    if (isStreaming) return
    onSend(prompt)
  }, [isStreaming, onSend])

  const firstName = user?.name?.split(' ')[0] || 'there'
  const greeting = getGreeting(user?.name || '')

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-4 py-12">
      <h1 className="text-[32px] font-normal text-[#1F1E1D] mb-10 tracking-tight text-center">
        {greeting}, {firstName}
      </h1>

      <div className="w-full max-w-[680px]">
        <div className="rounded-2xl border border-[rgba(31,30,29,0.15)] bg-white shadow-[rgba(0,0,0,0.04)_0px_4px_20px_0px] transition-shadow focus-within:border-[#1F1E1D] focus-within:shadow-[0_0_0_3px_rgba(31,30,29,0.1)]">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={intl.formatMessage({ id: 'modules.aiChat.placeholder', defaultMessage: 'How can Nexus help you today?' })}
            rows={1}
            className="w-full bg-transparent text-[16px] leading-[24px] text-[#141413] placeholder-[rgba(61,61,58,0.6)] outline-none px-5 pt-4 pb-2 resize-none max-h-[200px]"
          />

          <div className="flex items-center justify-between px-3 pb-3">
            <div />

            <div className="flex items-center gap-2">
              <ModeDropdown model={model} onModelChange={onModelChange} />

              {isStreaming ? (
                <button
                  onClick={onStop}
                  className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#E01E5A] text-white hover:bg-[#c71a4e] transition-colors"
                >
                  <Square className="h-3.5 w-3.5 fill-current" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!value.trim()}
                  className="flex items-center justify-center h-8 w-8 rounded-lg bg-[#1F1E1D] text-white hover:bg-[#0A0A0A] active:scale-[0.98] disabled:bg-[#3D3D3A] disabled:text-[#73726C] disabled:cursor-not-allowed transition-all"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 mt-4 flex-wrap">
          {SUGGESTIONS.map(s => (
            <button
              key={s.label}
              onClick={() => handleSuggestionClick(s.prompt)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[rgba(31,30,29,0.12)] bg-white text-[13px] text-[#1F1E1D] hover:border-[rgba(31,30,29,0.25)] hover:bg-[#FAF9F5] transition-all duration-200"
            >
              <s.icon className="h-3.5 w-3.5 text-[#73726C]" />
              {s.label}
            </button>
          ))}
        </div>

        <p className="text-center text-[12px] text-[#73726C] mt-3">
          Nexus can make mistakes. Please double-check responses.
        </p>
      </div>
    </div>
  )
}

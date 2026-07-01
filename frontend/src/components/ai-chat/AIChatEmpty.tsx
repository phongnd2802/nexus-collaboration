import React, { useRef, useEffect, useCallback, useState } from 'react'
import {
  ArrowUp,
  Square,
  Code2,
  Pencil,
  GraduationCap,
  Coffee,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useIntl } from 'react-intl'

interface SuggestionChip {
  icon: React.ElementType
  labelKey: string
  defaultLabel: string
  promptKey: string
  defaultPrompt: string
}

const SUGGESTIONS: SuggestionChip[] = [
  {
    icon: Code2,
    labelKey: 'modules.aiChat.suggestions.code',
    defaultLabel: 'Code',
    promptKey: 'modules.aiChat.suggestionPrompts.code',
    defaultPrompt: 'Write a REST API endpoint in TypeScript with validation',
  },
  {
    icon: Pencil,
    labelKey: 'modules.aiChat.suggestions.write',
    defaultLabel: 'Write',
    promptKey: 'modules.aiChat.suggestionPrompts.write',
    defaultPrompt: 'Draft a professional email to request a meeting',
  },
  {
    icon: GraduationCap,
    labelKey: 'modules.aiChat.suggestions.learn',
    defaultLabel: 'Learn',
    promptKey: 'modules.aiChat.suggestionPrompts.learn',
    defaultPrompt: 'Explain how neural networks work in simple terms',
  },
  {
    icon: Coffee,
    labelKey: 'modules.aiChat.suggestions.lifeStuff',
    defaultLabel: 'Life stuff',
    promptKey: 'modules.aiChat.suggestionPrompts.lifeStuff',
    defaultPrompt: 'Give me tips for staying productive while working from home',
  },
  {
    icon: Sparkles,
    labelKey: 'modules.aiChat.suggestions.surpriseMe',
    defaultLabel: 'Surprise me',
    promptKey: 'modules.aiChat.suggestionPrompts.surpriseMe',
    defaultPrompt: 'Surprise me with something interesting about science',
  },
]

function getGreetingKey(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return 'modules.aiChat.greetings.morning'
  if (hour >= 12 && hour < 17) return 'modules.aiChat.greetings.afternoon'
  if (hour >= 17 && hour < 21) return 'modules.aiChat.greetings.evening'
  return 'modules.aiChat.greetings.night'
}

interface AIChatEmptyProps {
  onSend: (message: string) => void
  isStreaming: boolean
  onStop: () => void
}

export function AIChatEmpty({ onSend, isStreaming, onStop }: AIChatEmptyProps) {
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

  const firstName = user?.name?.split(' ')[0] || intl.formatMessage({ id: 'modules.aiChat.greetings.fallbackName', defaultMessage: 'there' })
  const greeting = intl.formatMessage({ id: getGreetingKey(), defaultMessage: 'Hello' })

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
              key={s.labelKey}
              onClick={() => handleSuggestionClick(intl.formatMessage({ id: s.promptKey, defaultMessage: s.defaultPrompt }))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[rgba(31,30,29,0.12)] bg-white text-[13px] text-[#1F1E1D] hover:border-[rgba(31,30,29,0.25)] hover:bg-[#FAF9F5] transition-all duration-200"
            >
              <s.icon className="h-3.5 w-3.5 text-[#73726C]" />
              {intl.formatMessage({ id: s.labelKey, defaultMessage: s.defaultLabel })}
            </button>
          ))}
        </div>

        <p className="text-center text-[12px] text-[#73726C] mt-3">
          {intl.formatMessage({ id: 'modules.aiChat.disclaimer', defaultMessage: 'Nexus can make mistakes. Please double-check responses.' })}
        </p>
      </div>
    </div>
  )
}

import React, { useState, useCallback } from 'react'
import { User, Bot, Copy, RefreshCw, Check, Circle, CheckCircle2, AlertCircle, Loader2, ChevronRight } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'
import { useIntl } from 'react-intl'

export interface ThinkingStep {
  id: string
  title: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'error'
  tool?: string
}

interface AIChatMessageProps {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  isStreaming?: boolean
  steps?: ThinkingStep[]
  onRegenerate?: () => void
}

function StepIcon({ status }: { status: ThinkingStep['status'] }) {
  if (status === 'running') return <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D97757]" />
  if (status === 'completed') return <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
  if (status === 'error') return <AlertCircle className="h-3.5 w-3.5 text-[#E01E5A]" />
  return <Circle className="h-3.5 w-3.5 text-[#A8A29E]" />
}

function ThinkingSteps({ steps }: { steps: ThinkingStep[] }) {
  const [open, setOpen] = useState(false)
  if (steps.length === 0) return null
  const activeStep = [...steps].reverse().find(step => step.status === 'running') || steps[steps.length - 1]
  const hasError = steps.some(step => step.status === 'error')
  const completedCount = steps.filter(step => step.status === 'completed').length

  return (
    <div className="mb-3 overflow-hidden rounded-2xl border border-[rgba(31,30,29,0.08)] bg-[#FAF9F5]">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-[rgba(31,30,29,0.03)]"
      >
        {hasError ? (
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-[#E01E5A]" />
        ) : activeStep?.status === 'running' ? (
          <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-[#D97757]" />
        ) : (
          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[#10B981]" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-5 text-[#1F1E1D]">
            {hasError
              ? 'Thinking hit an issue'
              : activeStep?.status === 'running'
                ? 'Thinking...'
                : 'Thought through the request'}
          </p>
          <p className="truncate text-[12px] leading-5 text-[#73726C]">
            {activeStep?.description || activeStep?.title || `${completedCount} step(s) completed`}
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#73726C]">
          {steps.length} steps
        </span>
        <ChevronRight className={`h-4 w-4 flex-shrink-0 text-[#73726C] transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-[rgba(31,30,29,0.08)] px-3.5 py-3">
          <div className="space-y-2.5">
            {steps.map(step => (
              <div key={step.id} className="flex gap-2.5">
                <div className="mt-0.5 flex-shrink-0">
                  <StepIcon status={step.status} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[13px] font-medium leading-5 text-[#1F1E1D]">{step.title}</p>
                    {step.tool && (
                      <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#8A4B2F]">
                        {step.tool}
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-[12px] leading-5 text-[#73726C]">{step.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function AIChatMessage({ role, content, timestamp, isStreaming, steps = [], onRegenerate }: AIChatMessageProps) {
  const intl = useIntl()
  const [copied, setCopied] = useState(false)
  const isUser = role === 'user'

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [content])

  if (role === 'system') return null

  return (
    <div
      className={`flex gap-4 px-6 py-5 animate-[fadeIn_0.3s_ease-out] ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#D97757] flex items-center justify-center mt-0.5">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      <div className={`min-w-0 ${isUser ? 'max-w-[70%]' : 'max-w-[85%]'}`}>
        {isUser ? (
          <div className="bg-[#F0F0ED] rounded-2xl rounded-br-md px-5 py-3">
            <p className="text-[15px] leading-[24px] text-[#1F1E1D] whitespace-pre-wrap break-words">
              {content}
            </p>
          </div>
        ) : (
          <div className="text-[15px] leading-[24px] text-[#1F1E1D]">
            {isStreaming && <ThinkingSteps steps={steps} />}
            {content ? <MarkdownRenderer content={content} /> : null}
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-[#D97757] animate-pulse rounded-sm align-middle" />
            )}
          </div>
        )}

        {!isStreaming && content && (
          <div className={`flex items-center gap-2 mt-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {timestamp && (
              <span className="text-[11px] text-[#73726C]">
                {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {!isUser && (
              <div className="flex items-center gap-1 opacity-0 hover:opacity-100 transition-opacity duration-200">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-[#73726C] hover:text-[#1F1E1D] hover:bg-[rgba(31,30,29,0.04)] transition-colors"
                  title={intl.formatMessage({ id: 'modules.aiChat.message.copy', defaultMessage: 'Copy' })}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-[#73726C] hover:text-[#1F1E1D] hover:bg-[rgba(31,30,29,0.04)] transition-colors"
                    title={intl.formatMessage({ id: 'modules.aiChat.message.regenerate', defaultMessage: 'Regenerate' })}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#3D3D3A] flex items-center justify-center mt-0.5">
          <User className="h-3.5 w-3.5 text-white" />
        </div>
      )}
    </div>
  )
}

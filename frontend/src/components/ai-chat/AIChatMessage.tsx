import React, { useState, useCallback } from 'react'
import { User, Bot, Copy, RefreshCw, Check } from 'lucide-react'
import { MarkdownRenderer } from './MarkdownRenderer'

interface AIChatMessageProps {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
  isStreaming?: boolean
  onRegenerate?: () => void
}

export function AIChatMessage({ role, content, timestamp, isStreaming, onRegenerate }: AIChatMessageProps) {
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
            <MarkdownRenderer content={content} />
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
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
                {onRegenerate && (
                  <button
                    onClick={onRegenerate}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] text-[#73726C] hover:text-[#1F1E1D] hover:bg-[rgba(31,30,29,0.04)] transition-colors"
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

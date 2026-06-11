import React, { useRef, useEffect } from 'react'
import { AIChatMessage } from './AIChatMessage'
import type { ThinkingStep } from './AIChatMessage'
import { Loader2, Sparkles } from 'lucide-react'
import { useIntl } from 'react-intl'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

interface AIChatMessagesProps {
  messages: Message[]
  isStreaming: boolean
  streamingContent: string
  streamingSteps?: ThinkingStep[]
  isLoading: boolean
  onRegenerate: (messageId: string) => void
}

export function AIChatMessages({ messages, isStreaming, streamingContent, streamingSteps = [], isLoading, onRegenerate }: AIChatMessagesProps) {
  const intl = useIntl()
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAutoScrollRef = useRef(true)

  useEffect(() => {
    if (isAutoScrollRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingContent, streamingSteps])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    isAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 100
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#73726C]" />
      </div>
    )
  }

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-8 w-8 text-[#73726C] mx-auto mb-3" />
          <p className="text-[15px] text-[#73726C]">
            {intl.formatMessage({ id: 'modules.aiChat.messages.startConversation', defaultMessage: 'Start a conversation' })}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overscroll-contain"
    >
      <div className="max-w-3xl mx-auto py-4">
        {messages.map((msg) => (
          <AIChatMessage
            key={msg.id}
            id={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
            onRegenerate={msg.role === 'assistant' ? () => onRegenerate(msg.id) : undefined}
          />
        ))}
        {isStreaming && (streamingContent || streamingSteps.length > 0) && (
          <AIChatMessage
            id="streaming"
            role="assistant"
            content={streamingContent}
            steps={streamingSteps}
            isStreaming
          />
        )}
      </div>
      <div ref={bottomRef} />
    </div>
  )
}

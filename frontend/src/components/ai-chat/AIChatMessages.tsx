import React, { useEffect, useRef } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useIntl } from 'react-intl'
import type { UIMessage } from 'ai'

import { AIChatMessage } from './AIChatMessage'
import type { ApprovalRequiredView } from './types'

interface AIChatMessagesProps {
  messages: UIMessage[]
  isLoading: boolean
  onRegenerate: (messageId: string) => void
  activeApprovalItemId?: string | null
  renderApprovalContent?: (item: ApprovalRequiredView) => React.ReactNode
}

export function AIChatMessages({
  messages,
  isLoading,
  onRegenerate,
  activeApprovalItemId,
  renderApprovalContent,
}: AIChatMessagesProps) {
  const intl = useIntl()
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAutoScrollRef = useRef(true)

  useEffect(() => {
    if (isAutoScrollRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    isAutoScrollRef.current = scrollHeight - scrollTop - clientHeight < 100
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#73726C]" />
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-[#73726C]" />
          <p className="text-[15px] text-[#73726C]">
            {intl.formatMessage({ id: 'modules.aiChat.messages.startConversation', defaultMessage: 'Start a conversation' })}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto overscroll-contain">
      <div className="mx-auto max-w-3xl py-4">
        {messages.map(message => (
          <AIChatMessage
            key={message.id}
            message={message}
            activeApprovalItemId={activeApprovalItemId}
            renderApprovalContent={renderApprovalContent}
            onRegenerate={message.role === 'assistant' ? () => onRegenerate(message.id) : undefined}
          />
        ))}
      </div>
      <div ref={bottomRef} />
    </div>
  )
}

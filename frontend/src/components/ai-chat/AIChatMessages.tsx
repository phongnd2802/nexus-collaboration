import { useEffect, useRef } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { useIntl } from 'react-intl'

import { AIChatMessage } from './AIChatMessage'
import type { AIChatTimelineItem } from './types'

interface AIChatMessagesProps {
  items: AIChatTimelineItem[]
  isLoading: boolean
  onRegenerate: (messageId: string) => void
}

export function AIChatMessages({
  items,
  isLoading,
  onRegenerate,
}: AIChatMessagesProps) {
  const intl = useIntl()
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const isAutoScrollRef = useRef(true)

  useEffect(() => {
    if (isAutoScrollRef.current && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [items])

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

  if (items.length === 0) {
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
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto overscroll-contain"
    >
      <div className="mx-auto max-w-3xl py-4">
        {items.map(item => (
          <AIChatMessage
            key={item.id}
            item={item}
            onRegenerate={item.type === 'assistant_message' ? () => onRegenerate(item.id) : undefined}
          />
        ))}
      </div>
      <div ref={bottomRef} />
    </div>
  )
}

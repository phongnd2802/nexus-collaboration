import { useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai'
import type { UIMessage } from 'ai'

import { createAIChatTransport } from '@/lib/api/ai-chat-api'

interface ConversationLike {
  id: string
  uiMessages?: UIMessage[]
}

interface UseAIChatSessionArgs {
  workspaceId?: string
  conversation: ConversationLike | null
  model: string
  onError?: (error: Error) => void
}

function messagesEqual(left: UIMessage[] | undefined, right: UIMessage[] | undefined) {
  return JSON.stringify(left || []) === JSON.stringify(right || [])
}

export function useAIChatSession({
  workspaceId,
  conversation,
  model,
  onError,
}: UseAIChatSessionArgs) {
  const [initializedConversationId, setInitializedConversationId] = useState<string | null>(null)
  const lastAppliedConversationIdRef = useRef<string | null>(null)
  const lastAppliedMessagesRef = useRef<string>('[]')

  const transport = useMemo(() => {
    if (!workspaceId) return null
    return createAIChatTransport({ workspaceId, model })
  }, [workspaceId, model])

  const chat = useChat({
    id: conversation?.id || `workspace-${workspaceId || 'unknown'}-draft`,
    messages: conversation?.uiMessages || [],
    transport: transport || undefined,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    onError,
  })

  const { setMessages, messages } = chat

  useEffect(() => {
    if (!conversation) {
      setInitializedConversationId(null)
      lastAppliedConversationIdRef.current = null
      if (messages.length > 0) {
        setMessages([])
        lastAppliedMessagesRef.current = '[]'
      }
      return
    }

    const nextMessages = conversation.uiMessages || []
    const nextSerialized = JSON.stringify(nextMessages)
    const conversationChanged = lastAppliedConversationIdRef.current !== conversation.id
    const messagesChanged = lastAppliedMessagesRef.current !== nextSerialized
    const chatAlreadyMatches = messagesEqual(messages, nextMessages)

    if ((conversationChanged || messagesChanged) && !chatAlreadyMatches) {
      setMessages(nextMessages)
    }
    lastAppliedConversationIdRef.current = conversation.id
    lastAppliedMessagesRef.current = nextSerialized
    setInitializedConversationId(current =>
      current === conversation.id ? current : conversation.id,
    )
  }, [conversation, messages, setMessages])

  return {
    ...chat,
    isConversationInitialized:
      conversation != null && initializedConversationId === conversation.id,
  }
}

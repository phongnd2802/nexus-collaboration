import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { IntlShape } from 'react-intl'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { aiChatApi, clearLegacyAIChatStorage } from '@/lib/api/ai-chat-api'
import { buildAIChatPath, buildAIChatTitle, createTimestamp, MODELS_KEY, toRequestMessages } from './aiChatPageUtils'
import { uiMessagesToTimeline } from './uiMessageTimeline'
import type { AIChatTimelineItem, AssistantMessageItem, ThinkingStep } from './types'

interface LocalConversation {
  id: string
  sessionId?: string
  title: string
  items: AIChatTimelineItem[]
  updatedAt: string
}

interface DeleteConversationDialogState {
  id: string
  title: string
  sessionId?: string
}

interface UseAIChatPageStateArgs {
  workspaceId?: string
  routeSessionId?: string
  intl: IntlShape
}

export function useAIChatPageState({ workspaceId, routeSessionId, intl }: UseAIChatPageStateArgs) {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<LocalConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [isHydratingSession, setIsHydratingSession] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [model, setModel] = useState(() => localStorage.getItem(MODELS_KEY) || 'auto')
  const [deleteConversationDialog, setDeleteConversationDialog] = useState<DeleteConversationDialogState | null>(null)
  const [isDeletingConversation, setIsDeletingConversation] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const currentAssistantItemIdRef = useRef<string | null>(null)
  const hydrateRequestRef = useRef<string | null>(null)

  useEffect(() => {
    localStorage.setItem(MODELS_KEY, model)
  }, [model])

  useEffect(() => {
    clearLegacyAIChatStorage()
    setConversations([])
    setActiveConversationId(null)
    setIsStreaming(false)
    setIsThinking(false)
    setIsHydratingSession(false)
    setDeleteConversationDialog(null)
    currentAssistantItemIdRef.current = null
    hydrateRequestRef.current = null
    abortRef.current?.abort()
    abortRef.current = null
  }, [workspaceId])

  const activeConversation = conversations.find(item => item.id === activeConversationId) || null
  const timelineItems = activeConversation?.items || []

  const updateConversation = useCallback(
    (conversationId: string, updater: (conversation: LocalConversation) => LocalConversation) => {
      setConversations(prev => prev.map(item => (item.id === conversationId ? updater(item) : item)))
    },
    [],
  )

  const appendItem = useCallback(
    (conversationId: string, item: AIChatTimelineItem) => {
      updateConversation(conversationId, conversation => ({
        ...conversation,
        items: [...conversation.items, item],
        updatedAt: createTimestamp(),
      }))
    },
    [updateConversation],
  )

  const upsertItem = useCallback(
    (conversationId: string, itemId: string, factory: () => AIChatTimelineItem, merge?: (item: AIChatTimelineItem) => AIChatTimelineItem) => {
      updateConversation(conversationId, conversation => {
        const index = conversation.items.findIndex(item => item.id === itemId)
        if (index === -1) {
          return { ...conversation, items: [...conversation.items, factory()], updatedAt: createTimestamp() }
        }
        const nextItems = [...conversation.items]
        nextItems[index] = merge ? merge(nextItems[index]) : factory()
        return { ...conversation, items: nextItems, updatedAt: createTimestamp() }
      })
    },
    [updateConversation],
  )

  const syncRoute = useCallback(
    (sessionId?: string) => {
      if (!workspaceId) return
      navigate(buildAIChatPath(workspaceId, sessionId), { replace: true })
    },
    [navigate, workspaceId],
  )

  const createConversation = useCallback((firstMessage?: string) => {
    const id = crypto.randomUUID()
    const now = createTimestamp()
    const conversation: LocalConversation = {
      id,
      title: buildAIChatTitle(firstMessage),
      items: [],
      updatedAt: now,
    }
    setConversations(prev => [conversation, ...prev])
    setActiveConversationId(id)
    return conversation
  }, [])

  const setConversationSession = useCallback(
    (conversationId: string, sessionId: string) => {
      updateConversation(conversationId, conversation => ({
        ...conversation,
        sessionId,
        updatedAt: createTimestamp(),
      }))
    },
    [updateConversation],
  )

  const ensureAssistantItem = useCallback(
    (conversationId: string) => {
      if (currentAssistantItemIdRef.current) return currentAssistantItemIdRef.current
      const itemId = `assistant-${Date.now()}-${crypto.randomUUID()}`
      currentAssistantItemIdRef.current = itemId
      appendItem(conversationId, {
        id: itemId,
        type: 'assistant_message',
        content: '',
        status: 'streaming',
        timestamp: createTimestamp(),
      })
      return itemId
    },
    [appendItem],
  )

  const finalizeAssistantItem = useCallback(
    (conversationId: string, finalContent: string, status: AssistantMessageItem['status']) => {
      const currentId = currentAssistantItemIdRef.current
      if (!currentId) {
        if (!finalContent) return
        appendItem(conversationId, {
          id: `assistant-${Date.now()}-${crypto.randomUUID()}`,
          type: 'assistant_message',
          content: finalContent,
          status,
          timestamp: createTimestamp(),
        })
        return
      }

      upsertItem(
        conversationId,
        currentId,
        () => ({
          id: currentId,
          type: 'assistant_message',
          content: finalContent,
          status,
          timestamp: createTimestamp(),
        }),
        current => {
          if (current.type !== 'assistant_message') return current
          return { ...current, content: finalContent || current.content, status }
        },
      )
    },
    [appendItem, upsertItem],
  )

  const appendSystemEvent = useCallback(
    (conversationId: string, title: string, description: string | undefined, status: 'info' | 'error') => {
      appendItem(conversationId, {
        id: `system-${Date.now()}-${crypto.randomUUID()}`,
        type: 'system_event',
        title,
        description,
        status,
        timestamp: createTimestamp(),
      })
    },
    [appendItem],
  )

  const stopStreamState = useCallback(() => {
    setIsStreaming(false)
    setIsThinking(false)
    abortRef.current = null
    currentAssistantItemIdRef.current = null
  }, [])

  useEffect(() => {
    if (!workspaceId) return
    const token = localStorage.getItem('auth_token') || ''
    let cancelled = false
    setIsLoadingSessions(true)

    aiChatApi
      .listSessions(workspaceId, token)
      .then(sessions => {
        if (cancelled) return
        setConversations(
          sessions.map(session => ({
            id: session.sessionId,
            sessionId: session.sessionId,
            title: session.title,
            items: [],
            updatedAt: session.updatedAt,
          })),
        )
      })
      .catch((error: Error) => {
        if (!cancelled) toast.error(error.message || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSessions(false)
      })

    return () => {
      cancelled = true
    }
  }, [intl, workspaceId])

  useEffect(() => {
    if (!workspaceId || !routeSessionId) return
    const existing = conversations.find(item => item.sessionId === routeSessionId)
    if (existing?.items.length) {
      setActiveConversationId(existing.id)
      return
    }
    if (hydrateRequestRef.current === routeSessionId) return

    const token = localStorage.getItem('auth_token') || ''
    hydrateRequestRef.current = routeSessionId
    setIsHydratingSession(true)

    aiChatApi
      .getSession(workspaceId, routeSessionId, token)
      .then(snapshot => {
        const timeline = uiMessagesToTimeline(snapshot.uiMessages)
        setConversations(prev => {
          const next: LocalConversation = {
            id: routeSessionId,
            sessionId: routeSessionId,
            title: snapshot.title,
            items: timeline?.items || [],
            updatedAt: snapshot.updatedAt,
          }
          const exists = prev.some(item => item.sessionId === routeSessionId)
          return exists ? prev.map(item => (item.sessionId === routeSessionId ? next : item)) : [next, ...prev]
        })
        setActiveConversationId(routeSessionId)
      })
      .catch((error: Error) => {
        toast.error(error.message || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
        syncRoute()
      })
      .finally(() => {
        hydrateRequestRef.current = null
        setIsHydratingSession(false)
      })
  }, [conversations, intl, routeSessionId, syncRoute, workspaceId])

  const handleSend = useCallback(
    async (message: string) => {
      if (!workspaceId || isStreaming || isHydratingSession) return

      const conversation = activeConversation || createConversation(message)
      if (!activeConversationId) setActiveConversationId(conversation.id)

      const userMessageItem: AIChatTimelineItem = {
        id: `user-${Date.now()}-${crypto.randomUUID()}`,
        type: 'user_message',
        content: message,
        timestamp: createTimestamp(),
      }

      appendItem(conversation.id, userMessageItem)
      updateConversation(conversation.id, current => ({
        ...current,
        title: current.title === 'New conversation' ? buildAIChatTitle(message) : current.title,
        updatedAt: createTimestamp(),
      }))

      setIsStreaming(true)
      setIsThinking(true)
      currentAssistantItemIdRef.current = null

      const token = localStorage.getItem('auth_token') || ''
      const controller = new AbortController()
      abortRef.current = controller

      const baseItems = [...conversation.items, userMessageItem]
      const context: Record<string, any> = {
        model,
        currentView: 'ai-chat',
        messages: toRequestMessages(baseItems),
      }

      let assistantContent = ''

      try {
        await aiChatApi.streamChat(
          {
            command: message,
            workspaceId,
            sessionId: conversation.sessionId,
            context,
          },
          {
            onTextDelta: (content: string) => {
              setIsThinking(false)
              assistantContent += content
              const itemId = ensureAssistantItem(conversation.id)
              upsertItem(
                conversation.id,
                itemId,
                () => ({
                  id: itemId,
                  type: 'assistant_message',
                  content: assistantContent,
                  status: 'streaming',
                  timestamp: createTimestamp(),
                }),
                current => {
                  if (current.type !== 'assistant_message') return current
                  return { ...current, content: current.content + content, status: 'streaming' }
                },
              )
            },
            onStep: (step: ThinkingStep) => {
              if (step.eventType === 'tool_call') {
                upsertItem(
                  conversation.id,
                  `tool-call-${step.id}`,
                  () => ({
                    id: `tool-call-${step.id}`,
                    type: 'tool_call',
                    toolName: step.tool,
                    input: step.input,
                    status: 'running',
                    timestamp: createTimestamp(),
                  }),
                  current => {
                    if (current.type !== 'tool_call') return current
                    return { ...current, toolName: step.tool || current.toolName, input: step.input || current.input, status: 'running' }
                  },
                )
                return
              }

              if (step.eventType === 'tool_result') {
                upsertItem(
                  conversation.id,
                  `tool-call-${step.id}`,
                  () => ({
                    id: `tool-call-${step.id}`,
                    type: 'tool_call',
                    toolName: step.tool,
                    input: step.input,
                    status: step.status === 'error' ? 'error' : 'completed',
                    timestamp: createTimestamp(),
                  }),
                  current => {
                    if (current.type !== 'tool_call') return current
                    return { ...current, status: step.status === 'error' ? 'error' : 'completed' }
                  },
                )
                upsertItem(conversation.id, `tool-result-${step.id}`, () => ({
                  id: `tool-result-${step.id}`,
                  type: 'tool_result',
                  toolName: step.tool,
                  result: step.result,
                  outcome: step.outcome,
                  status: step.status === 'error' ? 'error' : 'completed',
                  timestamp: createTimestamp(),
                }))
              }
            },
            onSession: (sessionId: string) => {
              setConversationSession(conversation.id, sessionId)
              syncRoute(sessionId)
            },
            onComplete: (result: any) => {
              finalizeAssistantItem(conversation.id, result?.message || assistantContent, 'completed')
              stopStreamState()
            },
            onError: (error: string) => {
              toast.error(error || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
              finalizeAssistantItem(conversation.id, assistantContent, 'error')
              appendSystemEvent(conversation.id, 'Request failed', error, 'error')
              stopStreamState()
            },
          },
          token,
          controller.signal,
        )
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          const messageText = err?.message || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' })
          toast.error(messageText)
          finalizeAssistantItem(conversation.id, assistantContent, 'error')
          appendSystemEvent(conversation.id, 'Request failed', messageText, 'error')
        }
        stopStreamState()
      }
    },
    [
      activeConversation,
      activeConversationId,
      appendItem,
      appendSystemEvent,
      createConversation,
      ensureAssistantItem,
      finalizeAssistantItem,
      intl,
      isHydratingSession,
      isStreaming,
      model,
      setConversationSession,
      stopStreamState,
      syncRoute,
      updateConversation,
      upsertItem,
      workspaceId,
    ],
  )

  const handleStop = useCallback(() => {
    abortRef.current?.abort()
    stopStreamState()
  }, [stopStreamState])

  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null)
    syncRoute()
  }, [syncRoute])

  const handleSelectConversation = useCallback(
    (conversationId: string) => {
      const conversation = conversations.find(item => item.id === conversationId)
      setActiveConversationId(conversationId)
      syncRoute(conversation?.sessionId)
    },
    [conversations, syncRoute],
  )

  const handleDeleteConversation = useCallback(
    (conversationId: string) => {
      const conversation = conversations.find(item => item.id === conversationId)
      if (!conversation) return
      setDeleteConversationDialog({ id: conversation.id, title: conversation.title, sessionId: conversation.sessionId })
    },
    [conversations],
  )

  const handleDeleteConversationDialogChange = useCallback((open: boolean) => {
    if (!open) setDeleteConversationDialog(null)
  }, [])

  const confirmDeleteConversation = useCallback(async () => {
    if (!workspaceId || !deleteConversationDialog) return
    setIsDeletingConversation(true)
    try {
      if (deleteConversationDialog.sessionId) {
        const token = localStorage.getItem('auth_token') || ''
        await aiChatApi.deleteSession(workspaceId, deleteConversationDialog.sessionId, token)
      }
      setConversations(prev => prev.filter(item => item.id !== deleteConversationDialog.id))
      if (activeConversationId === deleteConversationDialog.id) {
        setActiveConversationId(null)
        syncRoute()
      }
      setDeleteConversationDialog(null)
    } catch (error: any) {
      toast.error(error?.message || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
    } finally {
      setIsDeletingConversation(false)
    }
  }, [activeConversationId, deleteConversationDialog, intl, syncRoute, workspaceId])

  const handleRenameConversation = useCallback(
    (conversationId: string, title: string) => {
      updateConversation(conversationId, conversation => ({ ...conversation, title, updatedAt: createTimestamp() }))
    },
    [updateConversation],
  )

  const handleRegenerate = useCallback(() => {
    const lastUserMessage = [...timelineItems].reverse().find(item => item.type === 'user_message')
    if (lastUserMessage?.type === 'user_message') {
      void handleSend(lastUserMessage.content)
    }
  }, [handleSend, timelineItems])

  const hasConversation = useMemo(() => Boolean(activeConversation), [activeConversation])

  return {
    conversations,
    activeConversationId,
    activeApprovalItemId: null,
    timelineItems,
    isStreaming,
    isThinking,
    isHydratingSession,
    isLoadingSessions,
    deleteConversationDialog,
    isDeletingConversation,
    model,
    setModel,
    hasConversation,
    handleSend,
    handleStop,
    handleRegenerate,
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation,
    handleDeleteConversationDialogChange,
    confirmDeleteConversation,
    handleRenameConversation,
  }
}

export type UseAIChatPageStateReturn = ReturnType<typeof useAIChatPageState>

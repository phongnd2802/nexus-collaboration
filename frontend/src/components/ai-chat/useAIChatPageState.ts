import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { UIMessage } from 'ai'
import type { IntlShape } from 'react-intl'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

import { aiChatApi, clearLegacyAIChatStorage } from '@/lib/api/ai-chat-api'
import { useAIChatSession } from './useAIChatSession'

import {
  buildAIChatPath,
  buildAIChatTitle,
  EXECUTE_ACTIONS_KEY,
  MODELS_KEY,
  createTimestamp,
} from './aiChatPageUtils'
import type { ApprovalRequiredView } from './types'

interface LocalConversation {
  id: string
  sessionId?: string
  title: string
  uiMessages: UIMessage[]
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

interface PendingSend {
  conversationId: string
  message: string
}

function messagesEqual(left: UIMessage[], right: UIMessage[]) {
  return JSON.stringify(left) === JSON.stringify(right)
}

function textFromMessage(message: UIMessage) {
  return message.parts
    .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
    .map((part: any) => part.text)
    .join('')
}

function providerApprovalMetadata(part: Record<string, any>): Record<string, any> {
  const providerMetadata = part.callProviderMetadata || part.call_provider_metadata
  const pydanticAI = providerMetadata?.pydantic_ai
  const details = pydanticAI?.provider_details || pydanticAI?.providerDetails
  return details && typeof details === 'object' ? details : {}
}

function approvalFromToolPart(part: Record<string, any>): ApprovalRequiredView | null {
  if (typeof part?.type !== 'string' || !part.type.startsWith('tool-')) return null

  const toolCallId =
    typeof part.toolCallId === 'string'
      ? part.toolCallId
      : typeof part.tool_call_id === 'string'
        ? part.tool_call_id
        : null
  if (!toolCallId) return null

  const state = typeof part.state === 'string' ? part.state : ''
  const details = providerApprovalMetadata(part)
  const approvalRequired = details.approval_required === true || details.approvalRequired === true
  if (!approvalRequired && state !== 'approval-requested' && state !== 'approval-responded' && state !== 'output-denied') {
    return null
  }

  const approved = part.approval?.approved
  const status =
    state === 'approval-responded'
      ? approved === false ? 'denied' : 'approved'
      : state === 'output-denied'
        ? 'denied'
        : 'pending'
  const toolName =
    typeof details.tool_name === 'string'
      ? details.tool_name
      : typeof details.toolName === 'string'
        ? details.toolName
        : part.type.slice(5)

  return {
    id: `approval-${toolCallId}`,
    status,
    part,
    approval: {
      sessionId:
        typeof details.session_id === 'string'
          ? details.session_id
          : typeof details.sessionId === 'string'
            ? details.sessionId
            : '',
      runId:
        typeof details.run_id === 'string'
          ? details.run_id
          : typeof details.runId === 'string'
            ? details.runId
            : '',
      toolCallId,
      toolName,
      args:
        part.input && typeof part.input === 'object'
          ? part.input
          : details.args && typeof details.args === 'object'
            ? details.args
            : {},
      summary: typeof details.summary === 'string' ? details.summary : undefined,
      approvalKind:
        typeof details.approval_kind === 'string'
          ? details.approval_kind
          : typeof details.approvalKind === 'string'
            ? details.approvalKind
            : undefined,
      initialValues:
        details.initial_values && typeof details.initial_values === 'object'
          ? details.initial_values
          : details.initialValues && typeof details.initialValues === 'object'
            ? details.initialValues
            : undefined,
    },
  }
}

function pendingApprovalFromMessages(messages: UIMessage[]): ApprovalRequiredView | null {
  for (const message of [...messages].reverse()) {
    if (message.role !== 'assistant') continue
    for (const part of [...message.parts].reverse()) {
      const approval = approvalFromToolPart(part as Record<string, any>)
      if (approval?.status === 'pending') return approval
    }
  }
  return null
}

function withToolApprovalInput(
  messages: UIMessage[],
  toolCallId: string,
  formData?: Record<string, any>,
): UIMessage[] {
  if (!formData) return messages

  return messages.map(message => {
    if (message.role !== 'assistant') return message

    let changed = false
    const parts = message.parts.map(part => {
      const candidate = part as any
      const currentToolCallId =
        typeof candidate?.toolCallId === 'string'
          ? candidate.toolCallId
          : typeof candidate?.tool_call_id === 'string'
            ? candidate.tool_call_id
            : null

      if (currentToolCallId !== toolCallId || typeof candidate?.type !== 'string' || !candidate.type.startsWith('tool-')) {
        return part
      }

      changed = true
      return { ...candidate, input: formData } as typeof part
    })

    return changed ? { ...message, parts } : message
  })
}

function hasAssistantActivity(messages: UIMessage[]) {
  const lastUserIndex = [...messages].reverse().findIndex(message => message.role === 'user')
  if (lastUserIndex === -1) return messages.some(message => message.role === 'assistant')

  const sliceStart = messages.length - lastUserIndex
  return messages.slice(sliceStart).some(message => message.role === 'assistant' && message.parts.length > 0)
}

function initialModelSelection() {
  const stored = localStorage.getItem(MODELS_KEY)
  return stored === 'thinking' || stored === 'fast' || stored === 'auto' ? stored : 'auto'
}

export function useAIChatPageState({ workspaceId, routeSessionId, intl }: UseAIChatPageStateArgs) {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<LocalConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isThinking, setIsThinking] = useState(false)
  const [isHydratingSession, setIsHydratingSession] = useState(false)
  const [isLoadingSessions, setIsLoadingSessions] = useState(false)
  const [model, setModel] = useState(initialModelSelection)
  const [executeActions, setExecuteActions] = useState(
    () => localStorage.getItem(EXECUTE_ACTIONS_KEY) === 'true',
  )
  const [deleteConversationDialog, setDeleteConversationDialog] = useState<DeleteConversationDialogState | null>(null)
  const [isDeletingConversation, setIsDeletingConversation] = useState(false)
  const [isResumingApproval, setIsResumingApproval] = useState(false)

  const hydrateRequestRef = useRef<string | null>(null)
  const pendingSendRef = useRef<PendingSend | null>(null)
  const activeConversation = conversations.find(item => item.id === activeConversationId) || null
  const pendingApprovalItem = useMemo(
    () => pendingApprovalFromMessages(activeConversation?.uiMessages || []),
    [activeConversation?.uiMessages],
  )
  const activeApprovalItemId = pendingApprovalItem?.id || null

  useEffect(() => {
    localStorage.setItem(MODELS_KEY, model)
  }, [model])

  useEffect(() => {
    localStorage.setItem(EXECUTE_ACTIONS_KEY, String(executeActions))
  }, [executeActions])

  useEffect(() => {
    clearLegacyAIChatStorage()
    setConversations([])
    setActiveConversationId(null)
    setIsThinking(false)
    setIsHydratingSession(false)
    setDeleteConversationDialog(null)
    setIsDeletingConversation(false)
    setIsResumingApproval(false)
    hydrateRequestRef.current = null
  }, [workspaceId])

  const updateConversation = useCallback(
    (conversationId: string, updater: (conversation: LocalConversation) => LocalConversation) => {
      setConversations(prev => prev.map(item => (item.id === conversationId ? updater(item) : item)))
    },
    [],
  )

  const setConversationMessages = useCallback(
    (conversationId: string, uiMessages: UIMessage[]) => {
      updateConversation(conversationId, conversation => {
        if (messagesEqual(conversation.uiMessages, uiMessages)) return conversation
        return { ...conversation, uiMessages, updatedAt: createTimestamp() }
      })
    },
    [updateConversation],
  )

  const createConversation = useCallback((firstMessage?: string) => {
    const id = crypto.randomUUID()
    const now = createTimestamp()
    const conversation: LocalConversation = {
      id,
      sessionId: undefined,
      title: buildAIChatTitle(firstMessage),
      uiMessages: [],
      updatedAt: now,
    }
    setConversations(prev => [conversation, ...prev])
    setActiveConversationId(id)
    return conversation
  }, [])

  const syncRoute = useCallback(
    (sessionId?: string) => {
      if (!workspaceId) return
      navigate(buildAIChatPath(workspaceId, sessionId), { replace: true })
    },
    [navigate, workspaceId],
  )

  const activeSession = useAIChatSession({
    workspaceId,
    conversation: activeConversation,
    model,
    onError: error => {
      toast.error(error.message || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
      setIsThinking(false)
    },
  })

  useEffect(() => {
    if (!activeConversation || !activeSession.isConversationInitialized) return
    setConversationMessages(activeConversation.id, activeSession.messages)
  }, [activeConversation, activeSession.isConversationInitialized, activeSession.messages, setConversationMessages])

  useEffect(() => {
    const pendingSend = pendingSendRef.current
    if (!pendingSend) return
    if (!activeConversation || activeConversation.id !== pendingSend.conversationId) return
    if (!activeSession.isConversationInitialized) return

    pendingSendRef.current = null
    void activeSession.sendMessage(
      { text: pendingSend.message },
      { body: { model, currentView: 'ai-chat', executeActions } },
    )
  }, [activeConversation, activeSession, executeActions, model])

  useEffect(() => {
    if (!isThinking || !activeConversation) return
    if (hasAssistantActivity(activeConversation.uiMessages)) setIsThinking(false)
  }, [activeConversation, isThinking])

  useEffect(() => {
    if (activeSession.status === 'ready') setIsThinking(false)
  }, [activeSession.status])

  const previousSessionStatusRef = useRef(activeSession.status)

  useEffect(() => {
    const previousStatus = previousSessionStatusRef.current
    previousSessionStatusRef.current = activeSession.status

    if (!workspaceId || !activeConversation) return
    if (activeSession.status !== 'ready') return
    if (previousStatus !== 'submitted' && previousStatus !== 'streaming') return

    aiChatApi
      .getSession(workspaceId, activeConversation.sessionId || activeConversation.id)
      .then(snapshot => {
        const uiMessages = Array.isArray(snapshot.uiMessages) ? snapshot.uiMessages : []
        setConversations(prev =>
          prev.map(item =>
            item.id === activeConversation.id
              ? {
                  ...item,
                  id: snapshot.sessionId,
                  sessionId: snapshot.sessionId,
                  title: snapshot.title,
                  uiMessages,
                  updatedAt: snapshot.updatedAt,
                }
              : item,
          ),
        )
        setActiveConversationId(current => (current === activeConversation.id ? snapshot.sessionId : current))
        syncRoute(snapshot.sessionId)
      })
      .catch((error: Error) => {
        toast.error(error.message || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
      })
  }, [activeConversation, activeSession.status, intl, syncRoute, workspaceId])

  useEffect(() => {
    if (!workspaceId || !routeSessionId) return
    const existing = conversations.find(item => item.id === routeSessionId || item.sessionId === routeSessionId)
    if (existing) {
      setActiveConversationId(existing.id)
      return
    }
    if (hydrateRequestRef.current === routeSessionId) return

    hydrateRequestRef.current = routeSessionId
    setIsHydratingSession(true)

    aiChatApi
      .getSession(workspaceId, routeSessionId)
      .then(snapshot => {
        const uiMessages = Array.isArray(snapshot.uiMessages) ? snapshot.uiMessages : []
        setConversations(prev => {
          const existingConversation = prev.find(item => item.id === routeSessionId || item.sessionId === routeSessionId)
          const nextConversation: LocalConversation = {
            id: routeSessionId,
            sessionId: snapshot.sessionId,
            title: snapshot.title,
            uiMessages,
            updatedAt: snapshot.updatedAt,
          }
          if (existingConversation) {
            return prev.map(item => (item.id === existingConversation.id ? nextConversation : item))
          }
          return [nextConversation, ...prev]
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

  useEffect(() => {
    if (!workspaceId) return

    let cancelled = false
    setIsLoadingSessions(true)

    aiChatApi
      .listSessions(workspaceId)
      .then(sessions => {
        if (cancelled) return
        setConversations(prev => {
          const drafts = prev.filter(item => !item.sessionId)
          const bySessionId = new Map(prev.filter(item => item.sessionId).map(item => [item.sessionId as string, item]))
          const hydrated = sessions.map(session => {
            const existing = bySessionId.get(session.sessionId)
            return {
              ...(existing || {}),
              id: session.sessionId,
              sessionId: session.sessionId,
              title: session.title,
              uiMessages: existing?.uiMessages || [],
              updatedAt: session.updatedAt,
            }
          })
          return [...drafts, ...hydrated]
        })
      })
      .catch((error: Error) => {
        if (!cancelled) {
          toast.error(error.message || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSessions(false)
      })

    return () => {
      cancelled = true
    }
  }, [intl, workspaceId])

  const handleSend = useCallback(
    async (message: string, _files: any[] = []) => {
      if (!workspaceId || isHydratingSession) return

      const conversation = activeConversation || createConversation(message)
      if (!activeConversationId) setActiveConversationId(conversation.id)

      updateConversation(conversation.id, current => ({
        ...current,
        sessionId: current.sessionId || conversation.id,
        title: current.title === 'New conversation' ? buildAIChatTitle(message) : current.title,
        updatedAt: createTimestamp(),
      }))
      syncRoute(conversation.id)

      setIsThinking(true)

      if (!activeConversation) {
        pendingSendRef.current = { conversationId: conversation.id, message }
        return
      }

      await activeSession.sendMessage(
        { text: message },
        { body: { model, currentView: 'ai-chat', executeActions } },
      )
    },
    [
      workspaceId,
      isHydratingSession,
      activeConversation,
      createConversation,
      activeConversationId,
      updateConversation,
      syncRoute,
      activeSession,
      model,
      executeActions,
    ],
  )

  const handleStop = useCallback(() => {
    void activeSession.stop()
    setIsThinking(false)
  }, [activeSession])

  const handleApprovalDecision = useCallback(
    async (decision: 'approve' | 'deny', formData?: Record<string, any>) => {
      if (!workspaceId || !pendingApprovalItem || !activeConversation) return

      const nextMessages = withToolApprovalInput(
        activeSession.messages,
        pendingApprovalItem.approval.toolCallId,
        formData,
      )
      setIsResumingApproval(true)
      setIsThinking(true)

      try {
        activeSession.setMessages(nextMessages)
        setConversationMessages(activeConversation.id, nextMessages)
        await activeSession.addToolApprovalResponse({
          id: pendingApprovalItem.approval.toolCallId,
          approved: decision === 'approve',
          reason: decision === 'deny' ? 'User denied this action.' : undefined,
          options: {
            body: { model, currentView: 'ai-chat', executeActions },
          },
        })
      } catch (error: any) {
        toast.error(error?.message || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
      } finally {
        setIsResumingApproval(false)
      }
    },
    [
      workspaceId,
      pendingApprovalItem,
      activeConversation,
      activeSession,
      setConversationMessages,
      intl,
      model,
      executeActions,
    ],
  )

  const handleRegenerate = useCallback(
    async (messageId: string) => {
      await activeSession.regenerate({
        messageId,
        body: { model, currentView: 'ai-chat', executeActions },
      })
    },
    [activeSession, executeActions, model],
  )

  const hasConversation = conversations.length > 0 || activeSession.status !== 'ready' || isResumingApproval

  const handleNewConversation = useCallback(() => {
    createConversation()
    syncRoute()
  }, [createConversation, syncRoute])

  const handleSelectConversation = useCallback(
    (id: string) => {
      const conversation = conversations.find(item => item.id === id)
      if (!conversation) return
      setActiveConversationId(id)
      syncRoute(conversation.sessionId)
    },
    [conversations, syncRoute],
  )

  const handleDeleteConversation = useCallback(
    (id: string) => {
      const conversation = conversations.find(item => item.id === id)
      if (!conversation) return
      setDeleteConversationDialog({ id: conversation.id, title: conversation.title, sessionId: conversation.sessionId })
    },
    [conversations],
  )

  const handleDeleteConversationDialogChange = useCallback(
    (open: boolean) => {
      if (!open && !isDeletingConversation) setDeleteConversationDialog(null)
    },
    [isDeletingConversation],
  )

  const confirmDeleteConversation = useCallback(async () => {
    const dialog = deleteConversationDialog
    if (!dialog) return

    const conversation = conversations.find(item => item.id === dialog.id)
    if (!conversation) {
      setDeleteConversationDialog(null)
      return
    }

    const nextConversations = conversations.filter(item => item.id !== dialog.id)
    const replacement = activeConversationId === dialog.id ? nextConversations[0] : null
    const isDeletingActiveConversation = activeConversationId === dialog.id

    try {
      setIsDeletingConversation(true)
      if (conversation.sessionId) await aiChatApi.deleteSession(workspaceId || '', conversation.sessionId)
      if (isDeletingActiveConversation) void activeSession.stop()

      setConversations(prev => prev.filter(item => item.id !== dialog.id))
      setActiveConversationId(current => (current === dialog.id ? replacement?.id ?? null : current))

      if (isDeletingActiveConversation) {
        setIsThinking(false)
        syncRoute(replacement?.sessionId)
        activeSession.setMessages(replacement?.uiMessages || [])
      }

      setDeleteConversationDialog(null)
    } catch (error: any) {
      toast.error(error?.message || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
    } finally {
      setIsDeletingConversation(false)
    }
  }, [activeConversationId, activeSession, conversations, deleteConversationDialog, intl, syncRoute, workspaceId])

  const handleRenameConversation = useCallback((id: string, title: string) => {
    updateConversation(id, conversation => ({ ...conversation, title, updatedAt: createTimestamp() }))
  }, [updateConversation])

  return {
    conversations,
    activeConversationId,
    activeApprovalItemId,
    pendingApprovalItem,
    messages: activeConversation?.uiMessages || [],
    isStreaming: activeSession.status === 'submitted' || activeSession.status === 'streaming' || isResumingApproval,
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
    handleApprovalDecision,
    handleRegenerate,
    handleNewConversation,
    handleSelectConversation,
    handleDeleteConversation,
    handleDeleteConversationDialogChange,
    confirmDeleteConversation,
    handleRenameConversation,
    executeActions,
    setExecuteActions,
  }
}

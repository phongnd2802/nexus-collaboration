import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { IntlShape } from 'react-intl'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

import { aiChatApi, clearLegacyAIChatStorage } from '@/lib/api/ai-chat-api'
import type { ApprovalRequiredEvent } from '@/lib/api/ai-chat-api'

import {
  buildAIChatPath,
  buildAIChatTitle,
  CREATE_PROJECT_APPROVAL_INTRO,
  EXECUTE_ACTIONS_KEY,
  MODELS_KEY,
  createTimestamp,
  isCreateProjectApprovalBoilerplate,
  isPotentialCreateProjectApprovalBoilerplate,
  stripCreateProjectApprovalBoilerplate,
  toRequestMessages,
} from './aiChatPageUtils'
import type {
  AIChatTimelineItem,
  ApprovalRequiredItem,
  AssistantMessageItem,
  ThinkingStep,
} from './types'

interface LocalConversation {
  id: string
  sessionId?: string
  title: string
  items: AIChatTimelineItem[]
  updatedAt: string
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
  const [executeActions, setExecuteActions] = useState(() => localStorage.getItem(EXECUTE_ACTIONS_KEY) === 'true')
  const [activeApprovalItemId, setActiveApprovalItemId] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const currentAssistantItemIdRef = useRef<string | null>(null)
  const hydrateRequestRef = useRef<string | null>(null)

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
    setIsStreaming(false)
    setIsThinking(false)
    setIsHydratingSession(false)
    setActiveApprovalItemId(null)
    currentAssistantItemIdRef.current = null
    hydrateRequestRef.current = null
    abortRef.current?.abort()
    abortRef.current = null
  }, [workspaceId])

  const activeConversation = conversations.find(item => item.id === activeConversationId) || null
  const timelineItems = activeConversation?.items || []

  const pendingApprovalItem = useMemo(() => {
    if (!activeConversation || !activeApprovalItemId) return null
    const item = activeConversation.items.find(candidate => candidate.id === activeApprovalItemId)
    return item?.type === 'approval_required' ? item : null
  }, [activeConversation, activeApprovalItemId])

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
    (
      conversationId: string,
      itemId: string,
      factory: () => AIChatTimelineItem,
      merge?: (item: AIChatTimelineItem) => AIChatTimelineItem,
    ) => {
      updateConversation(conversationId, conversation => {
        const index = conversation.items.findIndex(item => item.id === itemId)
        if (index === -1) {
          return {
            ...conversation,
            items: [...conversation.items, factory()],
            updatedAt: createTimestamp(),
          }
        }

        const nextItems = [...conversation.items]
        nextItems[index] = merge ? merge(nextItems[index]) : factory()
        return {
          ...conversation,
          items: nextItems,
          updatedAt: createTimestamp(),
        }
      })
    },
    [updateConversation],
  )

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

  const activateConversationBySession = useCallback(
    (sessionId: string) => {
      const existing = conversations.find(item => item.sessionId === sessionId)
      if (!existing) return false
      setActiveConversationId(existing.id)
      setActiveApprovalItemId(
        existing.items.find(item => item.type === 'approval_required' && item.status === 'pending')?.id || null,
      )
      return existing.items.length > 0
    },
    [conversations],
  )

  const syncRoute = useCallback(
    (sessionId?: string) => {
      if (!workspaceId) return
      const nextPath = buildAIChatPath(workspaceId, sessionId)
      navigate(nextPath, { replace: true })
    },
    [navigate, workspaceId],
  )

  const upsertConversationSnapshot = useCallback(
    (
      sessionId: string,
      snapshot: {
        title: string
        items: AIChatTimelineItem[]
        updatedAt: string
        activeApprovalItemId?: string | null
      },
    ) => {
      setConversations(prev => {
        const existing = prev.find(item => item.sessionId === sessionId)
        const nextConversation: LocalConversation = existing
          ? {
              ...existing,
              title: snapshot.title,
              sessionId,
              items: snapshot.items,
              updatedAt: snapshot.updatedAt,
            }
          : {
              id: sessionId,
              sessionId,
              title: snapshot.title,
              items: snapshot.items,
              updatedAt: snapshot.updatedAt,
            }

        return existing
          ? prev.map(item => (item.id === existing.id ? nextConversation : item))
          : [nextConversation, ...prev]
      })

      setActiveConversationId(current => {
        const existing = conversations.find(item => item.sessionId === sessionId)
        return existing?.id || sessionId || current
      })
      setActiveApprovalItemId(snapshot.activeApprovalItemId || null)
    },
    [conversations],
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
          return {
            ...current,
            content: finalContent || current.content,
            status,
          }
        },
      )
    },
    [appendItem, upsertItem],
  )

  const ensureApprovalIntroBeforeForm = useCallback(
    (conversationId: string, approval: ApprovalRequiredEvent, currentContent: string) => {
      if (approval.toolName !== 'create_project') return

      const introContent = currentContent.trim() || CREATE_PROJECT_APPROVAL_INTRO
      if (currentAssistantItemIdRef.current) {
        finalizeAssistantItem(conversationId, introContent, 'completed')
        return
      }

      appendItem(conversationId, {
        id: `assistant-${Date.now()}-${crypto.randomUUID()}`,
        type: 'assistant_message',
        content: introContent,
        status: 'completed',
        timestamp: createTimestamp(),
      })
    },
    [appendItem, finalizeAssistantItem],
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

  const startStream = useCallback(() => {
    setIsStreaming(true)
    setIsThinking(true)
    currentAssistantItemIdRef.current = null
  }, [])

  const stopStreamState = useCallback(() => {
    setIsStreaming(false)
    setIsThinking(false)
    abortRef.current = null
    currentAssistantItemIdRef.current = null
  }, [])

  useEffect(() => {
    if (!workspaceId || !routeSessionId) return
    if (activateConversationBySession(routeSessionId)) return
    if (hydrateRequestRef.current === routeSessionId) return

    const token = localStorage.getItem('auth_token') || ''
    hydrateRequestRef.current = routeSessionId
    setIsHydratingSession(true)

    aiChatApi
      .getSession(workspaceId, routeSessionId, token)
      .then(snapshot => {
        upsertConversationSnapshot(routeSessionId, {
          title: snapshot.title,
          items: snapshot.items as AIChatTimelineItem[],
          updatedAt: snapshot.updatedAt,
          activeApprovalItemId: snapshot.activeApprovalItemId,
        })
      })
      .catch((error: Error) => {
        toast.error(error.message || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
        syncRoute()
      })
      .finally(() => {
        hydrateRequestRef.current = null
        setIsHydratingSession(false)
      })
  }, [activateConversationBySession, intl, routeSessionId, syncRoute, upsertConversationSnapshot, workspaceId])

  useEffect(() => {
    if (!workspaceId) return

    const token = localStorage.getItem('auth_token') || ''
    let cancelled = false
    setIsLoadingSessions(true)

    aiChatApi
      .listSessions(workspaceId, token)
      .then(sessions => {
        if (cancelled) return
        setConversations(prev => {
          const drafts = prev.filter(item => !item.sessionId)
          const bySessionId = new Map(prev.filter(item => item.sessionId).map(item => [item.sessionId as string, item]))

          const hydrated = sessions.map(session => {
            const existing = bySessionId.get(session.sessionId)
            if (existing) {
              return {
                ...existing,
                title: session.title,
                sessionId: session.sessionId,
                updatedAt: session.updatedAt,
              }
            }

            return {
              id: session.sessionId,
              sessionId: session.sessionId,
              title: session.title,
              items: [],
              updatedAt: session.updatedAt,
            }
          })

          return [...drafts, ...hydrated]
        })
      })
      .catch((error: Error) => {
        if (cancelled) return
        toast.error(error.message || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSessions(false)
      })

    return () => {
      cancelled = true
    }
  }, [intl, workspaceId])

  const handleSend = useCallback(
    async (message: string, files: any[] = []) => {
      if (!workspaceId || isStreaming || isHydratingSession) return

      const conversation = activeConversation || createConversation(message)
      if (!activeConversationId) {
        setActiveConversationId(conversation.id)
      }

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

      startStream()
      setActiveApprovalItemId(null)

      const token = localStorage.getItem('auth_token') || ''
      const controller = new AbortController()
      abortRef.current = controller

      const baseItems = [...conversation.items, userMessageItem]
      const context: Record<string, any> = {
        model,
        currentView: 'ai-chat',
        executeActions,
        messages: toRequestMessages(baseItems),
      }

      if (files.length > 0) {
        context.files = await Promise.all(
          files.map(async (f: any) => {
            if (f.file.type.startsWith('image/')) {
              return new Promise<string>(resolve => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.readAsDataURL(f.file)
              }).then(base64 => ({ name: f.file.name, type: f.file.type, data: base64 }))
            }
            return new Promise<{ name: string; type: string; content: string }>(resolve => {
              const reader = new FileReader()
              reader.onloadend = () =>
                resolve({ name: f.file.name, type: f.file.type, content: reader.result as string })
              reader.readAsText(f.file)
            })
          }),
        )
      }

      let assistantContent = ''
      let approvalRequiredReceived = false

      try {
        await aiChatApi.streamChat(
          {
            command: message,
            workspaceId,
            sessionId: conversation.sessionId,
            executeActions,
            context,
          },
          {
            onTextDelta: (content: string) => {
              setIsThinking(false)
              if (approvalRequiredReceived && isPotentialCreateProjectApprovalBoilerplate(content)) {
                return
              }
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
                  return {
                    ...current,
                    content: current.content + content,
                    status: 'streaming',
                  }
                },
              )
            },
            onStep: (step: ThinkingStep) => {
              if (step.eventType === 'approval_required') return

              if (step.eventType === 'tool_call') {
                const itemId = `tool-call-${step.id}`
                upsertItem(
                  conversation.id,
                  itemId,
                  () => ({
                    id: itemId,
                    type: 'tool_call',
                    toolName: step.tool,
                    input: step.input,
                    status: 'running',
                    timestamp: createTimestamp(),
                  }),
                  current => {
                    if (current.type !== 'tool_call') return current
                    return {
                      ...current,
                      toolName: step.tool || current.toolName,
                      input: step.input || current.input,
                      status: step.status === 'error' ? 'error' : step.status === 'completed' ? 'completed' : 'running',
                    }
                  },
                )
                return
              }

              if (step.eventType === 'tool_result') {
                const callItemId = `tool-call-${step.id}`
                upsertItem(
                  conversation.id,
                  callItemId,
                  () => ({
                    id: callItemId,
                    type: 'tool_call',
                    toolName: step.tool,
                    input: step.input,
                    status: 'completed',
                    timestamp: createTimestamp(),
                  }),
                  current => {
                    if (current.type !== 'tool_call') return current
                    return {
                      ...current,
                      status: step.status === 'error' ? 'error' : 'completed',
                    }
                  },
                )

                const resultItemId = `tool-result-${step.id}`
                upsertItem(
                  conversation.id,
                  resultItemId,
                  () => ({
                    id: resultItemId,
                    type: 'tool_result',
                    toolName: step.tool,
                    result: step.result,
                    outcome: step.outcome,
                    status: step.status === 'error' ? 'error' : 'completed',
                    timestamp: createTimestamp(),
                  }),
                  current => {
                    if (current.type !== 'tool_result') return current
                    return {
                      ...current,
                      toolName: step.tool || current.toolName,
                      result: step.result || current.result,
                      outcome: step.outcome || current.outcome,
                      status: step.status === 'error' ? 'error' : 'completed',
                    }
                  },
                )
              }
            },
            onSession: (sessionId: string) => {
              setConversationSession(conversation.id, sessionId)
              syncRoute(sessionId)
            },
            onApprovalRequired: (approval: ApprovalRequiredEvent) => {
              setIsThinking(false)
              approvalRequiredReceived = true
              ensureApprovalIntroBeforeForm(conversation.id, approval, assistantContent)
              const itemId = `approval-${approval.toolCallId}`
              setActiveApprovalItemId(itemId)
              upsertItem(
                conversation.id,
                itemId,
                () => ({
                  id: itemId,
                  type: 'approval_required',
                  approval,
                  status: 'pending',
                  timestamp: createTimestamp(),
                }),
                current => {
                  if (current.type !== 'approval_required') return current
                  return {
                    ...current,
                    approval,
                    status: 'pending',
                  }
                },
              )
            },
            onComplete: (result: any) => {
              if (result?.reasoning === 'approval_required') {
                finalizeAssistantItem(conversation.id, assistantContent, assistantContent ? 'completed' : 'stopped')
                stopStreamState()
                return
              }

              const finalContent = result?.message || assistantContent
              finalizeAssistantItem(conversation.id, finalContent, 'completed')
              setActiveApprovalItemId(null)
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
      workspaceId,
      isStreaming,
      isHydratingSession,
      activeConversation,
      createConversation,
      activeConversationId,
      appendItem,
      updateConversation,
      startStream,
      model,
      executeActions,
      ensureAssistantItem,
      upsertItem,
      setConversationSession,
      syncRoute,
      stopStreamState,
      finalizeAssistantItem,
      ensureApprovalIntroBeforeForm,
      intl,
      appendSystemEvent,
    ],
  )

  const handleStop = useCallback(() => {
    if (!activeConversation) return

    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }

    finalizeAssistantItem(activeConversation.id, '', 'stopped')
    appendSystemEvent(activeConversation.id, 'Response stopped', 'Streaming was stopped before completion.', 'info')
    stopStreamState()
  }, [activeConversation, appendSystemEvent, finalizeAssistantItem, stopStreamState])

  const handleApprovalDecision = useCallback(
    async (decision: 'approve' | 'deny', formData?: Record<string, any>) => {
      if (!workspaceId || !pendingApprovalItem || isStreaming || !activeConversation) return

      const approval = pendingApprovalItem.approval
      const approvalItemId = pendingApprovalItem.id

      upsertItem(
        activeConversation.id,
        approvalItemId,
        () => pendingApprovalItem,
        current => {
          if (current.type !== 'approval_required') return current
          return {
            ...current,
            status: decision === 'approve' ? 'approved' : 'denied',
            submittedFormData: formData,
          }
        },
      )

      startStream()

      const token = localStorage.getItem('auth_token') || ''
      const controller = new AbortController()
      abortRef.current = controller
      let assistantContent = ''
      let bufferedPreToolText = ''

      const appendAssistantDelta = (content: string) => {
        if (!content) return
        assistantContent += content
        const itemId = ensureAssistantItem(activeConversation.id)
        upsertItem(
          activeConversation.id,
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
            return {
              ...current,
              content: current.content + content,
              status: 'streaming',
            }
          },
        )
      }

      try {
        await aiChatApi.resumeApproval(
          workspaceId,
          approval.sessionId,
          approval.runId,
          approval.toolCallId,
          decision,
          formData,
          {
            onTextDelta: (content: string) => {
              setIsThinking(false)
              if (approval.toolName === 'create_project') {
                const candidate = bufferedPreToolText + content
                if (isCreateProjectApprovalBoilerplate(candidate)) {
                  bufferedPreToolText = ''
                  appendAssistantDelta(stripCreateProjectApprovalBoilerplate(candidate))
                  return
                }

                if (isPotentialCreateProjectApprovalBoilerplate(candidate)) {
                  bufferedPreToolText = candidate
                  return
                }

                const textToFlush = candidate
                bufferedPreToolText = ''
                appendAssistantDelta(textToFlush)
                return
              }

              appendAssistantDelta(content)
            },
            onStep: (step: ThinkingStep) => {
              if (step.eventType === 'approval_required') return

              if (step.eventType === 'tool_call') {
                const itemId = `tool-call-${step.id}`
                upsertItem(
                  activeConversation.id,
                  itemId,
                  () => ({
                    id: itemId,
                    type: 'tool_call',
                    toolName: step.tool,
                    input: step.input,
                    status: 'running',
                    timestamp: createTimestamp(),
                  }),
                  current => {
                    if (current.type !== 'tool_call') return current
                    return {
                      ...current,
                      toolName: step.tool || current.toolName,
                      input: step.input || current.input,
                      status: step.status === 'error' ? 'error' : step.status === 'completed' ? 'completed' : 'running',
                    }
                  },
                )
                return
              }

              if (step.eventType === 'tool_result') {
                if (approval.toolName === 'create_project' && bufferedPreToolText) {
                  const stripped = isPotentialCreateProjectApprovalBoilerplate(bufferedPreToolText)
                    ? ''
                    : stripCreateProjectApprovalBoilerplate(bufferedPreToolText)
                  bufferedPreToolText = ''
                  appendAssistantDelta(stripped)
                }
                const callItemId = `tool-call-${step.id}`
                upsertItem(
                  activeConversation.id,
                  callItemId,
                  () => ({
                    id: callItemId,
                    type: 'tool_call',
                    toolName: step.tool,
                    input: step.input,
                    status: 'completed',
                    timestamp: createTimestamp(),
                  }),
                  current => {
                    if (current.type !== 'tool_call') return current
                    return {
                      ...current,
                      status: step.status === 'error' ? 'error' : 'completed',
                    }
                  },
                )

                const resultItemId = `tool-result-${step.id}`
                upsertItem(
                  activeConversation.id,
                  resultItemId,
                  () => ({
                    id: resultItemId,
                    type: 'tool_result',
                    toolName: step.tool,
                    result: step.result,
                    outcome: step.outcome,
                    status: step.status === 'error' ? 'error' : 'completed',
                    timestamp: createTimestamp(),
                  }),
                  current => {
                    if (current.type !== 'tool_result') return current
                    return {
                      ...current,
                      toolName: step.tool || current.toolName,
                      result: step.result || current.result,
                      outcome: step.outcome || current.outcome,
                      status: step.status === 'error' ? 'error' : 'completed',
                    }
                  },
                )
              }
            },
            onApprovalRequired: (nextApproval: ApprovalRequiredEvent) => {
              const itemId = `approval-${nextApproval.toolCallId}`
              setActiveApprovalItemId(itemId)
              upsertItem(
                activeConversation.id,
                itemId,
                () => ({
                  id: itemId,
                  type: 'approval_required',
                  approval: nextApproval,
                  status: 'pending',
                  timestamp: createTimestamp(),
                }),
                current => {
                  if (current.type !== 'approval_required') return current
                  return {
                    ...current,
                    approval: nextApproval,
                    status: 'pending',
                  }
                },
              )
            },
            onComplete: (result: any) => {
              if (result?.reasoning === 'approval_required') {
                finalizeAssistantItem(activeConversation.id, assistantContent, assistantContent ? 'completed' : 'stopped')
                stopStreamState()
                return
              }

              const finalContent = stripCreateProjectApprovalBoilerplate(
                assistantContent || result?.message || '',
              )
              finalizeAssistantItem(activeConversation.id, finalContent, 'completed')
              setActiveApprovalItemId(null)
              stopStreamState()
            },
            onError: (error: string) => {
              toast.error(error || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
              finalizeAssistantItem(activeConversation.id, assistantContent, 'error')
              appendSystemEvent(activeConversation.id, 'Resume failed', error, 'error')
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
          finalizeAssistantItem(activeConversation.id, assistantContent, 'error')
          appendSystemEvent(activeConversation.id, 'Resume failed', messageText, 'error')
        }
        stopStreamState()
      }
    },
    [
      workspaceId,
      pendingApprovalItem,
      isStreaming,
      activeConversation,
      upsertItem,
      startStream,
      ensureAssistantItem,
      finalizeAssistantItem,
      stopStreamState,
      intl,
      appendSystemEvent,
    ],
  )

  const handleRegenerate = useCallback(
    (messageId: string) => {
      if (!activeConversation) return

      const msgIndex = activeConversation.items.findIndex(item => item.id === messageId)
      if (msgIndex < 0) return

      const userIndex = [...activeConversation.items]
        .slice(0, msgIndex)
        .map((item, index) => ({ item, index }))
        .reverse()
        .find(({ item }) => item.type === 'user_message')?.index

      if (userIndex == null) return

      const userItem = activeConversation.items[userIndex]
      if (userItem.type !== 'user_message') return

      updateConversation(activeConversation.id, conversation => ({
        ...conversation,
        items: conversation.items.slice(0, userIndex + 1),
        updatedAt: createTimestamp(),
      }))
      setActiveApprovalItemId(null)
      handleSend(userItem.content, [])
    },
    [activeConversation, updateConversation, handleSend],
  )

  const hasConversation = conversations.length > 0 || isStreaming

  const handleNewConversation = useCallback(() => {
    createConversation()
    syncRoute()
  }, [createConversation, syncRoute])

  const handleSelectConversation = useCallback((id: string) => {
    const conversation = conversations.find(item => item.id === id)
    if (!conversation) return
    setActiveConversationId(id)
    setActiveApprovalItemId(
      conversation.items.find(item => item.type === 'approval_required' && item.status === 'pending')?.id || null,
    )
    syncRoute(conversation.sessionId)
  }, [conversations, syncRoute])

  const handleDeleteConversation = useCallback((id: string) => {
    const nextConversations = conversations.filter(item => item.id !== id)
    const replacement = activeConversationId === id ? nextConversations[0] : null

    setConversations(prev => {
      setActiveConversationId(current => {
        if (current !== id) return current
        return replacement?.id ?? null
      })
      return prev.filter(item => item.id !== id)
    })
    if (activeApprovalItemId && activeConversationId === id) {
      setActiveApprovalItemId(null)
    }
    if (activeConversationId === id) {
      syncRoute(replacement?.sessionId)
    }
  }, [activeApprovalItemId, activeConversationId, conversations, syncRoute])

  const handleRenameConversation = useCallback((id: string, title: string) => {
    setConversations(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, title, updatedAt: createTimestamp() }
          : item,
      ),
    )
  }, [])

  return {
    conversations,
    activeConversationId,
    activeApprovalItemId,
    timelineItems,
    pendingApprovalItem,
    isStreaming,
    isThinking,
    isHydratingSession,
    isLoadingSessions,
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
    handleRenameConversation,
  }
}

export type UseAIChatPageStateReturn = ReturnType<typeof useAIChatPageState>

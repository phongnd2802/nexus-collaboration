import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { aiChatApi, clearLegacyAIChatStorage } from '@/lib/api/ai-chat-api'
import type { ApprovalRequiredEvent } from '@/lib/api/ai-chat-api'
import { AIChatSidebar } from './AIChatSidebar'
import { AIChatMessages } from './AIChatMessages'
import type { ThinkingStep } from './AIChatMessage'
import { AIChatInput } from './AIChatInput'
import { AIChatEmpty } from './AIChatEmpty'

interface LocalMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

interface LocalConversation {
  id: string
  sessionId?: string
  title: string
  messages: LocalMessage[]
  updatedAt: string
}

const MODELS_KEY = 'nexus_ai_chat_model'
const EXECUTE_ACTIONS_KEY = 'nexus_ai_chat_execute_actions'

export function AIChatPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const intl = useIntl()

  const [conversations, setConversations] = useState<LocalConversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingSteps, setStreamingSteps] = useState<ThinkingStep[]>([])
  const [pendingApproval, setPendingApproval] = useState<ApprovalRequiredEvent | null>(null)
  const [model, setModel] = useState(() => localStorage.getItem(MODELS_KEY) || 'auto')
  const [executeActions, setExecuteActions] = useState(() => localStorage.getItem(EXECUTE_ACTIONS_KEY) === 'true')
  const abortRef = useRef<AbortController | null>(null)

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
    setStreamingContent('')
    setStreamingSteps([])
    setPendingApproval(null)
    abortRef.current?.abort()
    abortRef.current = null
  }, [workspaceId])

  const activeConversation = conversations.find(item => item.id === activeConversationId) || null
  const localMessages = activeConversation?.messages || []

  const upsertConversation = useCallback((conversation: LocalConversation) => {
    setConversations(prev => {
      const exists = prev.some(item => item.id === conversation.id)
      if (exists) {
        return prev.map(item => (item.id === conversation.id ? conversation : item))
      }
      return [conversation, ...prev]
    })
  }, [])

  const updateActiveConversation = useCallback(
    (updater: (messages: LocalMessage[]) => LocalMessage[], title?: string) => {
      if (!activeConversationId) return
      setConversations(prev =>
        prev.map(conv => {
          if (conv.id !== activeConversationId) return conv
          const nextMessages = updater(conv.messages)
          return {
            ...conv,
            title: title || conv.title || 'New conversation',
            messages: nextMessages,
            updatedAt: new Date().toISOString(),
          }
        }),
      )
    },
    [activeConversationId],
  )

  const createConversation = useCallback(
    (firstMessage?: string) => {
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const conversation: LocalConversation = {
        id,
        title: firstMessage?.trim() ? firstMessage.trim().slice(0, 48) : 'New conversation',
        messages: [],
        updatedAt: now,
      }
      setConversations(prev => [conversation, ...prev])
      setActiveConversationId(id)
      return conversation
    },
    [],
  )

  const handleSend = useCallback(
    async (message: string, files: any[] = []) => {
      if (!workspaceId || isStreaming) return

      const conversation =
        activeConversation || createConversation(message)
      if (!activeConversationId) {
        setActiveConversationId(conversation.id)
      }

      const userMsg: LocalMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      const messagesForRequest = [...conversation.messages, userMsg]
      setConversations(prev =>
        prev.map(item =>
          item.id === conversation.id
            ? {
                ...item,
                title: item.title === 'New conversation' ? message.trim().slice(0, 48) || item.title : item.title,
                messages: messagesForRequest,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      )
      setIsStreaming(true)
      setIsThinking(true)
      setStreamingContent('')
      setStreamingSteps([])

      const token = localStorage.getItem('auth_token') || ''
      const controller = new AbortController()
      abortRef.current = controller

      const context: Record<string, any> = {
        model,
        currentView: 'ai-chat',
        executeActions,
        messages: messagesForRequest.map(({ role, content }) => ({ role, content })),
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
              assistantContent += content
              setStreamingContent(prev => prev + content)
            },
            onStep: (step: ThinkingStep) => {
              setStreamingSteps(prev => {
                const index = prev.findIndex(item => item.id === step.id)
                if (index === -1) return [...prev, step]
                const next = [...prev]
                next[index] = { ...next[index], ...step }
                return next
              })
            },
            onText: (content: string) => {
              setIsThinking(false)
              assistantContent = content
              setStreamingContent(content)
            },
            onSession: (sessionId: string) => {
              setConversations(prev =>
                prev.map(item => (item.id === conversation.id ? { ...item, sessionId } : item)),
              )
            },
            onApprovalRequired: (approval: ApprovalRequiredEvent) => {
              setPendingApproval(approval)
              setIsThinking(false)
            },
            onComplete: (result: any) => {
              if (result?.reasoning === 'approval_required') {
                setIsStreaming(false)
                setIsThinking(false)
                setStreamingContent('')
                abortRef.current = null
                return
              }
              const finalContent = result?.message || assistantContent
              const aiMsg: LocalMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: finalContent,
                timestamp: new Date().toISOString(),
              }
              setConversations(prev =>
                prev.map(item =>
                  item.id === conversation.id
                    ? {
                        ...item,
                        messages: [...messagesForRequest, aiMsg],
                        updatedAt: new Date().toISOString(),
                      }
                    : item,
                ),
              )
              setIsStreaming(false)
              setIsThinking(false)
              setStreamingContent('')
              setStreamingSteps([])
              setPendingApproval(null)
              abortRef.current = null
            },
            onError: (error: string) => {
              toast.error(error || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
              setIsStreaming(false)
              setIsThinking(false)
              setStreamingContent('')
              setStreamingSteps([])
              setPendingApproval(null)
              abortRef.current = null
            },
          },
          token,
          controller.signal,
        )
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast.error(err?.message || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
        }
        setIsStreaming(false)
        setIsThinking(false)
        setStreamingContent('')
        setStreamingSteps([])
        setPendingApproval(null)
        abortRef.current = null
      }
      },
    [workspaceId, isStreaming, model, executeActions, localMessages, intl, activeConversation, activeConversationId, createConversation],
  )

  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    if (streamingContent) {
      const aiMsg: LocalMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: streamingContent,
        timestamp: new Date().toISOString(),
      }
      updateActiveConversation(prev => [...prev, aiMsg])
    }
    setIsStreaming(false)
    setIsThinking(false)
    setStreamingContent('')
    setStreamingSteps([])
    setPendingApproval(null)
  }, [streamingContent, updateActiveConversation])

  const handleApprovalDecision = useCallback(
    async (decision: 'approve' | 'deny') => {
      if (!workspaceId || !pendingApproval || isStreaming || !activeConversation) return

      setIsStreaming(true)
      setIsThinking(true)
      setStreamingContent('')
      setStreamingSteps([])
      const token = localStorage.getItem('auth_token') || ''
      const controller = new AbortController()
      abortRef.current = controller
      let assistantContent = ''

      try {
        await aiChatApi.resumeApproval(
          workspaceId,
          pendingApproval.sessionId,
          pendingApproval.runId,
          pendingApproval.toolCallId,
          decision,
          {
            onTextDelta: (content: string) => {
              setIsThinking(false)
              assistantContent += content
              setStreamingContent(prev => prev + content)
            },
            onStep: (step: ThinkingStep) => {
              setStreamingSteps(prev => {
                const index = prev.findIndex(item => item.id === step.id)
                if (index === -1) return [...prev, step]
                const next = [...prev]
                next[index] = { ...next[index], ...step }
                return next
              })
            },
            onApprovalRequired: (approval: ApprovalRequiredEvent) => {
              setPendingApproval(approval)
            },
            onComplete: (result: any) => {
              if (result?.reasoning === 'approval_required') {
                setIsStreaming(false)
                setIsThinking(false)
                setStreamingContent('')
                abortRef.current = null
                return
              }
              const finalContent = result?.message || assistantContent
              if (finalContent) {
                const aiMsg: LocalMessage = {
                  id: `assistant-${Date.now()}`,
                  role: 'assistant',
                  content: finalContent,
                  timestamp: new Date().toISOString(),
                }
                setConversations(prev =>
                  prev.map(item =>
                    item.id === activeConversation.id
                      ? { ...item, messages: [...item.messages, aiMsg], updatedAt: new Date().toISOString() }
                      : item,
                  ),
                )
              }
              setPendingApproval(null)
              setIsStreaming(false)
              setIsThinking(false)
              setStreamingContent('')
              setStreamingSteps([])
              abortRef.current = null
            },
            onError: (error: string) => {
              toast.error(error || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
              setIsStreaming(false)
              setIsThinking(false)
              setStreamingContent('')
              setStreamingSteps([])
              abortRef.current = null
            },
          },
          token,
          controller.signal,
        )
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast.error(err?.message || intl.formatMessage({ id: 'modules.aiChat.errors.generic', defaultMessage: 'Something went wrong' }))
        }
        setIsStreaming(false)
        setIsThinking(false)
        setStreamingContent('')
        setStreamingSteps([])
        abortRef.current = null
      }
    },
    [workspaceId, pendingApproval, isStreaming, activeConversation, intl],
  )

  const handleRegenerate = useCallback(
    (messageId: string) => {
      const msgIndex = localMessages.findIndex(m => m.id === messageId)
      if (msgIndex < 1) return
      const userMsg = localMessages[msgIndex - 1]
      if (userMsg?.role !== 'user') return
      updateActiveConversation(prev => prev.slice(0, msgIndex))
      handleSend(userMsg.content, [])
    },
    [localMessages, handleSend, updateActiveConversation],
  )

  const hasConversation = conversations.length > 0 || isStreaming

  const handleNewConversation = useCallback(() => {
    createConversation()
  }, [createConversation])

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id)
  }, [])

  const handleDeleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const next = prev.filter(item => item.id !== id)
      setActiveConversationId(current => {
        if (current !== id) return current
        return next[0]?.id ?? null
      })
      return next
    })
  }, [])

  const handleRenameConversation = useCallback((id: string, title: string) => {
    setConversations(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, title, updatedAt: new Date().toISOString() }
          : item,
      ),
    )
  }, [])

  return (
    <div className="flex h-full bg-[#FAF9F5]">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes thinkingPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      <aside
        className={`bg-card/80 backdrop-blur-xl border-r border-border flex flex-col overflow-hidden transition-all duration-300 z-40 ${
          conversations.length > 0 ? 'w-60' : 'w-0 pointer-events-none'
        }`}
        aria-hidden={conversations.length === 0}
      >
        <div
          className={`h-full w-60 flex-shrink-0 transition-transform duration-300 ease-in-out ${
            conversations.length > 0 ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <AIChatSidebar
            conversations={conversations.map(item => ({
              id: item.id,
              title: item.title,
              messageCount: item.messages.length,
              updatedAt: item.updatedAt,
            }))}
            activeId={activeConversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
            onDelete={handleDeleteConversation}
            onRename={handleRenameConversation}
            isLoading={false}
          />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {!hasConversation ? (
          <AIChatEmpty
            onSend={handleSend}
            isStreaming={isStreaming}
            onStop={handleStop}
            model={model}
            onModelChange={setModel}
          />
        ) : (
          <>
            <AIChatMessages
              messages={localMessages}
              isStreaming={isStreaming}
              streamingContent={streamingContent}
              streamingSteps={streamingSteps}
              isLoading={false}
              onRegenerate={handleRegenerate}
            />
            {isThinking && !streamingContent && (
              <div className="flex items-center gap-3 px-6 py-4 max-w-3xl mx-auto w-full">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#D97757] flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[15px] text-[#73726C]">
                    {intl.formatMessage({ id: 'modules.aiChat.status.thinking', defaultMessage: 'Thinking' })}
                  </span>
                  <span className="flex gap-0.5">
                    <span className="w-1 h-1 rounded-full bg-[#D97757] animate-[thinkingPulse_1.4s_ease-in-out_infinite]" />
                    <span className="w-1 h-1 rounded-full bg-[#D97757] animate-[thinkingPulse_1.4s_ease-in-out_0.2s_infinite]" />
                    <span className="w-1 h-1 rounded-full bg-[#D97757] animate-[thinkingPulse_1.4s_ease-in-out_0.4s_infinite]" />
                  </span>
                </div>
              </div>
            )}
            {pendingApproval && !isStreaming && (
              <div className="mx-auto mb-3 w-full max-w-3xl px-6">
                <div className="rounded-2xl border border-[#D97757]/25 bg-[#FFF7ED] p-4 shadow-sm">
                  <div className="text-sm font-semibold text-[#8A4B2F]">
                    {pendingApproval.summary || `Approve ${pendingApproval.toolName}?`}
                  </div>
                  <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-white/70 p-3 text-xs text-[#3D3D3A]">
                    {JSON.stringify(pendingApproval.args, null, 2)}
                  </pre>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprovalDecision('approve')}
                      className="rounded-full bg-[#D97757] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#C86443]"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprovalDecision('deny')}
                      className="rounded-full border border-[#D6D3CE] px-3 py-1.5 text-xs font-semibold text-[#3D3D3A] hover:bg-white"
                    >
                      Deny
                    </button>
                  </div>
                </div>
              </div>
            )}
            <AIChatInput
              onSend={handleSend}
              onStop={handleStop}
              isStreaming={isStreaming}
              model={model}
              onModelChange={setModel}
            />
          </>
        )}
      </div>
    </div>
  )
}

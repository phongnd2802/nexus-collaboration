import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import {
  aiChatApi,
  aiChatKeys,
  useAIChatConversations,
  useAIChatMessages,
  useAIChatTools,
  useCreateAIChatConversation,
  useDeleteAIChatConversation,
  useRenameAIChatConversation,
} from '@/lib/api/ai-chat-api'
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

const MODELS_KEY = 'nexus_ai_chat_model'
const SIDEBAR_KEY = 'nexus_ai_chat_sidebar'
const EXECUTE_ACTIONS_KEY = 'nexus_ai_chat_execute_actions'

export function AIChatPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const intl = useIntl()

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [streamingSteps, setStreamingSteps] = useState<ThinkingStep[]>([])
  const [model, setModel] = useState(() => localStorage.getItem(MODELS_KEY) || 'auto')
  const [executeActions, setExecuteActions] = useState(() => {
    return localStorage.getItem(EXECUTE_ACTIONS_KEY) === 'true'
  })
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY)
    return saved !== null ? saved === 'true' : true
  })
  const abortRef = useRef<AbortController | null>(null)

  const { data: conversations = [], isLoading: conversationsLoading } = useAIChatConversations(workspaceId || '')
  const { data: serverMessages = [], isLoading: messagesLoading } = useAIChatMessages(conversationId)
  const { data: mcpTools, isError: mcpToolsError, isLoading: mcpToolsLoading } = useAIChatTools(workspaceId || '')
  const createConversation = useCreateAIChatConversation()
  const deleteConversation = useDeleteAIChatConversation()
  const renameConversation = useRenameAIChatConversation()
  const queryClient = useQueryClient()

  useEffect(() => {
    localStorage.setItem(MODELS_KEY, model)
  }, [model])

  useEffect(() => {
    localStorage.setItem(EXECUTE_ACTIONS_KEY, String(executeActions))
  }, [executeActions])

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen))
  }, [sidebarOpen])

  useEffect(() => {
    const handleSidebarToggle = () => {
      setSidebarOpen(prev => !prev)
    }

    window.addEventListener('nexus:toggle-ai-chat-sidebar', handleSidebarToggle)
    return () => window.removeEventListener('nexus:toggle-ai-chat-sidebar', handleSidebarToggle)
  }, [])

  const prevMessagesRef = useRef<string>('')

  useEffect(() => {
    if (conversationId && serverMessages.length > 0) {
      const key = JSON.stringify(serverMessages)
      if (key !== prevMessagesRef.current) {
        prevMessagesRef.current = key
        setLocalMessages(serverMessages)
      }
    } else if (!conversationId) {
      prevMessagesRef.current = ''
      setLocalMessages([])
    }
  }, [conversationId, serverMessages])

  const handleNewConversation = useCallback(async () => {
    if (!workspaceId) return
    try {
      const result = await createConversation.mutateAsync(workspaceId)
      setConversationId(result.sessionId)
      setLocalMessages([])
    } catch {
      toast.error(intl.formatMessage({ id: 'modules.aiChat.errors.createConversation', defaultMessage: 'Failed to create conversation' }))
    }
  }, [workspaceId, createConversation, intl])

  const handleSelectConversation = useCallback((id: string) => {
    setConversationId(id)
  }, [])

  const handleDeleteConversation = useCallback(
    (id: string) => {
      if (!workspaceId) return
      deleteConversation.mutate({ sessionId: id, workspaceId })
      if (conversationId === id) {
        setConversationId(null)
        setLocalMessages([])
      }
    },
    [workspaceId, conversationId, deleteConversation]
  )

  const handleRenameConversation = useCallback(
    (id: string, title: string) => {
      if (!workspaceId) return
      renameConversation.mutate({ sessionId: id, title, workspaceId })
    },
    [workspaceId, renameConversation]
  )

  const handleSend = useCallback(
    async (message: string, files: any[] = []) => {
      if (!workspaceId || isStreaming) return

      let sessionId = conversationId
      if (!sessionId) {
        try {
          const result = await createConversation.mutateAsync(workspaceId)
          sessionId = result.sessionId
          setConversationId(sessionId)
        } catch {
          toast.error(intl.formatMessage({ id: 'modules.aiChat.errors.createConversation', defaultMessage: 'Failed to create conversation' }))
          return
        }
      }

      const userMsg: LocalMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      const messagesForRequest = [...localMessages, userMsg]
      setLocalMessages(messagesForRequest)
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
          })
        )
      }

      let assistantContent = ''

      try {
        await aiChatApi.streamChat(
          {
            command: message,
            workspaceId,
            sessionId,
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
            onComplete: (result: any) => {
              const finalContent = result?.message || assistantContent
              const aiMsg: LocalMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: finalContent,
                timestamp: new Date().toISOString(),
              }
              const nextMessages = [...messagesForRequest, aiMsg]
              setLocalMessages(nextMessages)
              aiChatApi.saveMessages(workspaceId, sessionId!, nextMessages, model)
              queryClient.invalidateQueries({ queryKey: aiChatKeys.conversations(workspaceId) })
              queryClient.invalidateQueries({ queryKey: aiChatKeys.messages(sessionId) })
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
          controller.signal
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
    [workspaceId, conversationId, isStreaming, model, executeActions, localMessages, createConversation, intl, queryClient]
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
      setLocalMessages(prev => [...prev, aiMsg])
    }
    setIsStreaming(false)
    setIsThinking(false)
    setStreamingContent('')
    setStreamingSteps([])
  }, [streamingContent])

  const handleRegenerate = useCallback(
    (messageId: string) => {
      const msgIndex = localMessages.findIndex(m => m.id === messageId)
      if (msgIndex < 1) return
      const userMsg = localMessages[msgIndex - 1]
      if (userMsg?.role !== 'user') return
      setLocalMessages(prev => prev.slice(0, msgIndex))
      handleSend(userMsg.content, [])
    },
    [localMessages, handleSend]
  )

  const hasConversation = localMessages.length > 0 || isStreaming || conversationId !== null

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
          sidebarOpen ? 'w-60' : 'w-0 pointer-events-none'
        }`}
        aria-hidden={!sidebarOpen}
      >
        <div
          className={`h-full w-60 flex-shrink-0 transition-transform duration-300 ease-in-out ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <AIChatSidebar
            conversations={conversations}
            activeId={conversationId}
            onSelect={handleSelectConversation}
            onNew={handleNewConversation}
            onDelete={handleDeleteConversation}
            onRename={handleRenameConversation}
            isLoading={conversationsLoading}
          />
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-4 pt-3 pb-1 h-[44px] flex-shrink-0">
          {hasConversation && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-[#73726C] truncate font-medium">
                {conversations.find(c => c.id === conversationId)?.title ||
                  intl.formatMessage({ id: 'modules.aiChat.sidebar.newConversation', defaultMessage: 'New conversation' })}
              </p>
            </div>
          )}
          <div
            className={`ml-auto rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              mcpToolsError
                ? 'border-[#E01E5A]/20 bg-[#E01E5A]/5 text-[#B91C1C]'
                : 'border-[#D97757]/20 bg-[#D97757]/5 text-[#8A4B2F]'
            }`}
            title={
              mcpToolsError
                ? 'MCP server is not reachable'
                : mcpToolsLoading
                  ? 'Checking MCP tools'
                : `${mcpTools?.count || 0} MCP tools available`
            }
          >
            {mcpToolsError
              ? 'MCP offline'
              : mcpToolsLoading
                ? 'MCP checking'
                : `MCP ${mcpTools?.count || 0} tools`}
          </div>
          <button
            type="button"
            onClick={() => setExecuteActions(prev => !prev)}
            className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              executeActions
                ? 'border-[#E01E5A]/25 bg-[#E01E5A]/10 text-[#B91C1C]'
                : 'border-[#10B981]/20 bg-[#10B981]/5 text-[#047857]'
            }`}
            title={
              executeActions
                ? 'Write tools can execute real changes'
                : 'Write tools return preview only'
            }
          >
            {executeActions ? 'Execute on' : 'Preview'}
          </button>
        </div>

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
              isLoading={messagesLoading}
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

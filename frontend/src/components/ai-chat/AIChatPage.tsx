import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { toast } from 'sonner'
import { PanelLeft, Sparkles } from 'lucide-react'
import {
  useAIChatConversations,
  useAIChatMessages,
  useCreateAIChatConversation,
  useDeleteAIChatConversation,
  useRenameAIChatConversation,
} from '@/lib/api/ai-chat-api'
import { autopilotApi } from '@/lib/api/autopilot-api'
import { AIChatSidebar } from './AIChatSidebar'
import { AIChatMessages } from './AIChatMessages'
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

export function AIChatPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const intl = useIntl()

  const [conversationId, setConversationId] = useState<string | null>(null)
  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isThinking, setIsThinking] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [model, setModel] = useState(() => localStorage.getItem(MODELS_KEY) || 'auto')
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_KEY)
    return saved !== null ? saved === 'true' : true
  })
  const abortRef = useRef<AbortController | null>(null)

  const { data: conversations = [], isLoading: conversationsLoading } = useAIChatConversations(workspaceId || '')
  const { data: serverMessages = [], isLoading: messagesLoading } = useAIChatMessages(conversationId)
  const createConversation = useCreateAIChatConversation()
  const deleteConversation = useDeleteAIChatConversation()
  const renameConversation = useRenameAIChatConversation()

  useEffect(() => {
    localStorage.setItem(MODELS_KEY, model)
  }, [model])

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(sidebarOpen))
  }, [sidebarOpen])

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
      toast.error('Failed to create conversation')
    }
  }, [workspaceId, createConversation])

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
          toast.error('Failed to create conversation')
          return
        }
      }

      const userMsg: LocalMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      }
      setLocalMessages(prev => [...prev, userMsg])
      setIsStreaming(true)
      setIsThinking(true)
      setStreamingContent('')

      const token = localStorage.getItem('auth_token') || ''
      const controller = new AbortController()
      abortRef.current = controller

      const context: Record<string, any> = { model, currentView: 'ai-chat' }

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

      try {
        await autopilotApi.executeCommandStream(
          {
            command: message,
            workspaceId,
            sessionId,
            executeActions: false,
            context,
          },
          {
            onTextDelta: (content: string) => {
              setIsThinking(false)
              setStreamingContent(prev => prev + content)
            },
            onText: (content: string) => {
              setIsThinking(false)
              setStreamingContent(content)
            },
            onComplete: (result: any) => {
              const aiMsg: LocalMessage = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: result?.message || streamingContent,
                timestamp: new Date().toISOString(),
              }
              setLocalMessages(prev => [...prev, aiMsg])
              setIsStreaming(false)
              setIsThinking(false)
              setStreamingContent('')
              abortRef.current = null
            },
            onError: (error: string) => {
              toast.error(error || 'Something went wrong')
              setIsStreaming(false)
              setIsThinking(false)
              setStreamingContent('')
              abortRef.current = null
            },
          },
          token
        )
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast.error(err?.message || 'Something went wrong')
        }
        setIsStreaming(false)
        setIsThinking(false)
        setStreamingContent('')
        abortRef.current = null
      }
    },
    [workspaceId, conversationId, isStreaming, model, streamingContent, createConversation]
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

      {sidebarOpen && (
        <AIChatSidebar
          conversations={conversations}
          activeId={conversationId}
          onSelect={handleSelectConversation}
          onNew={handleNewConversation}
          onDelete={handleDeleteConversation}
          onRename={handleRenameConversation}
          isLoading={conversationsLoading}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-4 pt-3 pb-1 h-[44px] flex-shrink-0">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-[#73726C] hover:text-[#1F1E1D] hover:bg-[rgba(31,30,29,0.04)] transition-colors"
              title="Open sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
          {hasConversation && (
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-[#73726C] truncate font-medium">
                {conversations.find(c => c.id === conversationId)?.title || 'New conversation'}
              </p>
            </div>
          )}
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
              isLoading={messagesLoading}
              onRegenerate={handleRegenerate}
            />
            {isThinking && !streamingContent && (
              <div className="flex items-center gap-3 px-6 py-4 max-w-3xl mx-auto w-full">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#D97757] flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[15px] text-[#73726C]">Thinking</span>
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

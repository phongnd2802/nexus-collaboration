import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { StreamCallbacks, ExecuteCommandRequest, StreamEvent } from './autopilot-api'

export interface AIChatConversation {
  id: string
  sessionId: string
  title: string
  messageCount: number
  createdAt: string
  updatedAt: string
  model?: string
}

export interface AIChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
}

export interface AIChatTool {
  name: string
  originalName: string
  serverName: string
  description?: string
  parameters?: Record<string, any>
}

export interface AIChatToolsResponse {
  success: boolean
  count: number
  tools: AIChatTool[]
}

const STORAGE_PREFIX = 'nexus_ai_chat'

function conversationsKey(workspaceId: string) {
  return `${STORAGE_PREFIX}_conversations_${workspaceId}`
}

function messagesKey(sessionId: string) {
  return `${STORAGE_PREFIX}_messages_${sessionId}`
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function createTitle(message?: string) {
  const text = message?.trim()
  if (!text) return 'New conversation'
  return text.length > 48 ? `${text.slice(0, 48)}...` : text
}

function upsertConversation(workspaceId: string, conversation: AIChatConversation) {
  const conversations = aiChatApi.listConversations(workspaceId)
  const next = [
    conversation,
    ...conversations.filter(item => item.sessionId !== conversation.sessionId),
  ]
  writeJson(conversationsKey(workspaceId), next)
}

export const aiChatKeys = {
  all: ['ai-chat'] as const,
  conversations: (workspaceId: string) => [...aiChatKeys.all, 'conversations', workspaceId] as const,
  messages: (sessionId: string | null) => [...aiChatKeys.all, 'messages', sessionId] as const,
}

export const aiChatApi = {
  listConversations: (workspaceId: string): AIChatConversation[] =>
    readJson<AIChatConversation[]>(conversationsKey(workspaceId), []),

  createConversation: (workspaceId: string): { sessionId: string } => {
    const sessionId = crypto.randomUUID()
    const now = new Date().toISOString()
    upsertConversation(workspaceId, {
      id: sessionId,
      sessionId,
      title: 'New conversation',
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    })
    writeJson(messagesKey(sessionId), [])
    return { sessionId }
  },

  deleteConversation: (sessionId: string, workspaceId?: string): { success: boolean } => {
    if (workspaceId) {
      const conversations = aiChatApi
        .listConversations(workspaceId)
        .filter(item => item.sessionId !== sessionId)
      writeJson(conversationsKey(workspaceId), conversations)
    }
    localStorage.removeItem(messagesKey(sessionId))
    return { success: true }
  },

  getMessages: (sessionId: string): AIChatMessage[] =>
    readJson<AIChatMessage[]>(messagesKey(sessionId), []),

  saveMessages: (
    workspaceId: string,
    sessionId: string,
    messages: AIChatMessage[],
    model?: string,
  ): void => {
    writeJson(messagesKey(sessionId), messages)
    const existing = aiChatApi.listConversations(workspaceId).find(item => item.sessionId === sessionId)
    const now = new Date().toISOString()
    upsertConversation(workspaceId, {
      id: sessionId,
      sessionId,
      title: existing?.title && existing.title !== 'New conversation'
        ? existing.title
        : createTitle(messages.find(item => item.role === 'user')?.content),
      messageCount: messages.length,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      model,
    })
  },

  streamChat: async (
    data: ExecuteCommandRequest,
    callbacks: StreamCallbacks,
    token: string,
    signal?: AbortSignal,
  ): Promise<void> => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002'
    const apiVersion = import.meta.env.VITE_API_VERSION || '/api/v1'
    const baseUrl = `${apiUrl}${apiVersion}`
    const url = `${baseUrl}/workspaces/${data.workspaceId}/ai-chat/stream`
    const userLocale = localStorage.getItem('nexus_locale') || navigator.language || 'en'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Accept-Language': userLocale,
      },
      body: JSON.stringify({
        message: data.command,
        messages: data.context?.messages,
        model: data.context?.model,
        context: {
          ...(data.context || {}),
          executeActions: data.executeActions === true,
        },
      }),
      signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          const payload = line.slice(6).trim()
          if (payload === '[DONE]') return
          if (!payload) continue

          try {
            const event: StreamEvent = JSON.parse(payload)

            switch (event.type) {
              case 'status':
                callbacks.onStatus?.(event.data.status, event.data.message)
                break
              case 'step':
                callbacks.onStep?.(event.data)
                break
              case 'text':
                callbacks.onText?.(event.data.content)
                break
              case 'text_delta':
                callbacks.onTextDelta?.(event.data.content)
                break
              case 'complete':
                callbacks.onComplete?.(event.data)
                break
              case 'error':
                callbacks.onError?.(event.data.message)
                break
            }
          } catch (parseError) {
            console.error('Failed to parse AI chat SSE event:', parseError)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  },

  listTools: async (workspaceId: string, token: string): Promise<AIChatToolsResponse> => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3002'
    const apiVersion = import.meta.env.VITE_API_VERSION || '/api/v1'
    const baseUrl = `${apiUrl}${apiVersion}`
    const response = await fetch(`${baseUrl}/workspaces/${workspaceId}/ai-chat/tools`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return response.json()
  },

  renameConversation: (sessionId: string, title: string, workspaceId?: string): { success: boolean } => {
    if (!workspaceId) return { success: true }
    const conversations = aiChatApi.listConversations(workspaceId).map(item =>
      item.sessionId === sessionId ? { ...item, title, updatedAt: new Date().toISOString() } : item
    )
    writeJson(conversationsKey(workspaceId), conversations)
    return { success: true }
  },
}

export function useAIChatConversations(workspaceId: string) {
  return useQuery({
    queryKey: aiChatKeys.conversations(workspaceId),
    queryFn: () => aiChatApi.listConversations(workspaceId),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 2,
  })
}

export function useAIChatMessages(sessionId: string | null) {
  return useQuery({
    queryKey: aiChatKeys.messages(sessionId),
    queryFn: () => aiChatApi.getMessages(sessionId!),
    enabled: !!sessionId,
    staleTime: 1000 * 60 * 1,
  })
}

export function useAIChatTools(workspaceId: string) {
  const token = localStorage.getItem('auth_token') || ''
  return useQuery({
    queryKey: [...aiChatKeys.all, 'tools', workspaceId],
    queryFn: () => aiChatApi.listTools(workspaceId, token),
    enabled: !!workspaceId && !!token,
    staleTime: 1000 * 30,
    retry: 1,
  })
}

export function useCreateAIChatConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (workspaceId: string) => Promise.resolve(aiChatApi.createConversation(workspaceId)),
    onSuccess: (_data, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: aiChatKeys.conversations(workspaceId) })
    },
  })
}

export function useDeleteAIChatConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, workspaceId }: { sessionId: string; workspaceId: string }) =>
      Promise.resolve(aiChatApi.deleteConversation(sessionId, workspaceId)),
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: aiChatKeys.conversations(workspaceId) })
    },
  })
}

export function useRenameAIChatConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, title, workspaceId }: { sessionId: string; title: string; workspaceId: string }) =>
      Promise.resolve(aiChatApi.renameConversation(sessionId, title, workspaceId)),
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: aiChatKeys.conversations(workspaceId) })
    },
  })
}

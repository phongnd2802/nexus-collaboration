import { autopilotApi } from './autopilot-api'
import type { StreamCallbacks, ExecuteCommandRequest } from './autopilot-api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

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

export const aiChatKeys = {
  all: ['ai-chat'] as const,
  conversations: (workspaceId: string) => [...aiChatKeys.all, 'conversations', workspaceId] as const,
  messages: (sessionId: string | null) => [...aiChatKeys.all, 'messages', sessionId] as const,
}

export const aiChatApi = {
  listConversations: (workspaceId: string): Promise<AIChatConversation[]> =>
    autopilotApi.listSessions(workspaceId).then(sessions =>
      sessions.map(s => ({
        id: s.id,
        sessionId: s.sessionId,
        title: s.title,
        messageCount: s.messageCount,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }))
    ),

  createConversation: (workspaceId: string): Promise<{ sessionId: string }> =>
    autopilotApi.createSession(workspaceId).then(r => ({ sessionId: r.sessionId })),

  deleteConversation: (sessionId: string): Promise<{ success: boolean }> =>
    autopilotApi.deleteSession(sessionId),

  getMessages: (sessionId: string): Promise<AIChatMessage[]> =>
    autopilotApi.getHistory(sessionId).then(msgs =>
      msgs.map((m, i) => ({
        id: `${sessionId}-${i}`,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      }))
    ),

  streamChat: (
    data: ExecuteCommandRequest,
    callbacks: StreamCallbacks,
    token: string,
  ): Promise<void> => autopilotApi.executeCommandStream(data, callbacks, token),

  // TODO: wire to backend when available
  renameConversation: (_sessionId: string, _title: string): Promise<{ success: boolean }> =>
    Promise.resolve({ success: true }),
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

export function useCreateAIChatConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (workspaceId: string) => aiChatApi.createConversation(workspaceId),
    onSuccess: (_data, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: aiChatKeys.conversations(workspaceId) })
    },
  })
}

export function useDeleteAIChatConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, workspaceId }: { sessionId: string; workspaceId: string }) =>
      aiChatApi.deleteConversation(sessionId),
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: aiChatKeys.conversations(workspaceId) })
    },
  })
}

export function useRenameAIChatConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ sessionId, title, workspaceId }: { sessionId: string; title: string; workspaceId: string }) =>
      aiChatApi.renameConversation(sessionId, title),
    onSuccess: (_data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: aiChatKeys.conversations(workspaceId) })
    },
  })
}

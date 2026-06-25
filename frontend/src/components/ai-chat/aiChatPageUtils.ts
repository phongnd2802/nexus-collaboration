import type { AIChatTimelineItem } from './types'

export const MODELS_KEY = 'nexus_ai_chat_model'

export function toRequestMessages(items: AIChatTimelineItem[]) {
  return items
    .filter(
      (item): item is Extract<AIChatTimelineItem, { type: 'user_message' | 'assistant_message' }> =>
        item.type === 'user_message' || item.type === 'assistant_message',
    )
    .filter(item => item.content.trim().length > 0)
    .map(item => ({
      role: item.type === 'user_message' ? 'user' : 'assistant',
      content: item.content,
    }))
}

export function createTimestamp() {
  return new Date().toISOString()
}

export function buildAIChatTitle(value?: string) {
  const trimmed = value?.trim() || ''
  return trimmed ? trimmed.slice(0, 48) : 'New conversation'
}

export function buildAIChatPath(workspaceId: string, sessionId?: string) {
  return sessionId
    ? `/workspaces/${workspaceId}/ai-chat/${sessionId}`
    : `/workspaces/${workspaceId}/ai-chat`
}

import type { StreamCallbacks, ExecuteCommandRequest } from './autopilot-api'
import { API_CONFIG } from '@/lib/config'

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

const DEFAULT_MODEL = 'openai/gpt-4o-mini'
const STORAGE_PREFIX = 'nexus_ai_chat_'

export function clearLegacyAIChatStorage(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_PREFIX)) {
        keys.push(key)
      }
    }
    keys.forEach(key => localStorage.removeItem(key))
  } catch {
    // Ignore storage access failures.
  }
}

function normalizeModel(model?: string) {
  if (!model || ['auto', 'thinking', 'fast'].includes(model)) return DEFAULT_MODEL
  return model
}

function extractOpenAIError(payload: any, fallback: string) {
  if (payload?.error?.message) return payload.error.message
  if (payload?.message) return Array.isArray(payload.message) ? payload.message.join(', ') : payload.message
  return fallback
}

export const aiChatApi = {
  streamChat: async (
    data: ExecuteCommandRequest,
    callbacks: StreamCallbacks,
    token: string,
    signal?: AbortSignal,
  ): Promise<void> => {
    const messages =
      Array.isArray(data.context?.messages) && data.context.messages.length > 0
        ? data.context.messages
        : [{ role: 'user', content: data.command }]

    callbacks.onStatus?.('running', 'Connecting to Nexus AI')

    const response = await fetch(
      API_CONFIG.getApiUrl(`/agent-chat/workspaces/${data.workspaceId}/chat/completions`),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: normalizeModel(data.context?.model),
          messages,
          stream: true,
          metadata: {
            session_id: data.sessionId,
            workspace_id: data.workspaceId,
          },
        }),
        signal,
      },
    )

    if (!response.ok) {
      let payload: any = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      throw new Error(extractOpenAIError(payload, `Nexus AI request failed (${response.status})`))
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Nexus AI response body is empty')
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let assistantContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const events = buffer.split('\n\n')
      buffer = events.pop() || ''

      for (const event of events) {
        const line = event
          .split('\n')
          .find(item => item.startsWith('data: '))

        if (!line) continue

        const raw = line.slice(6).trim()
        if (raw === '[DONE]') {
          callbacks.onComplete?.({
            success: true,
            sessionId: data.sessionId || crypto.randomUUID(),
            message: assistantContent,
            actions: [],
            suggestions: [],
          })
          return
        }

        const chunk = JSON.parse(raw)
        const delta = chunk?.choices?.[0]?.delta?.content
        if (delta) {
          assistantContent += delta
          callbacks.onTextDelta?.(delta)
        }
      }
    }

    callbacks.onComplete?.({
      success: true,
      sessionId: data.sessionId || crypto.randomUUID(),
      message: assistantContent,
      actions: [],
      suggestions: [],
    })
  },

  listTools: async (_workspaceId: string, _token: string): Promise<AIChatToolsResponse> => {
    return Promise.resolve({
      success: true,
      count: 0,
      tools: [],
    })
  },
}

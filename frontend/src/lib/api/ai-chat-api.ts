import { API_CONFIG } from '@/lib/config'
import type { ProjectCardPayload, ThinkingStep } from '@/components/ai-chat/types'

export interface AIChatCommandRequest {
  command: string
  workspaceId: string
  sessionId?: string
  context?: Record<string, any>
}

export interface AIChatStreamCallbacks {
  onStatus?: (status: string, message: string) => void
  onStep?: (step: ThinkingStep) => void
  onAction?: (tool: string, success: boolean, message: string) => void
  onText?: (content: string) => void
  onTextDelta?: (content: string) => void
  onProjectList?: (payload: { title: string; projects: ProjectCardPayload[] }) => void
  onComplete?: (result: {
    success: boolean
    sessionId: string
    message: string
    actions: any[]
    suggestions: string[]
    reasoning?: string
    error?: string
  }) => void
  onError?: (error: string) => void
  onSession?: (sessionId: string, runId?: string) => void
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

export interface AIChatSessionSnapshot {
  sessionId: string
  title: string
  items: Array<Record<string, any>>
  uiMessages?: Array<Record<string, any>>
  updatedAt: string
}

export interface AIChatSessionSummary {
  sessionId: string
  title: string
  updatedAt: string
  messageCount: number
  hasPendingApproval?: boolean
}

export interface AIChatDeleteSessionResponse {
  success: boolean
  sessionId: string
}

interface UIMessagePart {
  type: string
  text?: string
  input?: Record<string, any>
  output?: Record<string, any>
  data?: Record<string, any>
  url?: string
  mediaType?: string
  title?: string
  reasoning?: string
  toolCallId?: string
  toolName?: string
  tool_call_id?: string
  tool_name?: string
  state?: string
  errorText?: string
  error_text?: string
  approval?: {
    id: string
    approved?: boolean
    reason?: string
  }
}

interface UIMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  parts: UIMessagePart[]
}

const DEFAULT_MODEL = 'openai/gpt-4o-mini'
const STORAGE_PREFIX = 'nexus_ai_chat_'

export function clearLegacyAIChatStorage(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key)
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

function completionResult(sessionId: string | undefined, message: string) {
  return {
    success: true,
    sessionId: sessionId || crypto.randomUUID(),
    message,
    actions: [],
    suggestions: [],
  }
}

function toProjectCardPayloads(value: unknown): ProjectCardPayload[] {
  if (!Array.isArray(value)) return []

  return value.reduce<ProjectCardPayload[]>((acc, item) => {
      if (!item || typeof item !== 'object') return acc
      const record = item as Record<string, any>
      const id = typeof record.id === 'string' ? record.id : ''
      const name = typeof record.name === 'string' ? record.name : ''
      const href = typeof record.href === 'string' ? record.href : ''
      if (!id || !name || !href) return acc

      acc.push({
        id,
        name,
        href,
        description: typeof record.description === 'string' ? record.description : undefined,
        status: typeof record.status === 'string' ? record.status : undefined,
        type: typeof record.type === 'string' ? record.type : undefined,
        updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : undefined,
        memberCount: typeof record.memberCount === 'number' ? record.memberCount : undefined,
      })
      return acc
    }, [])
}

function toUIRequestMessages(messages: Array<{ role: string; content: string }>): UIMessage[] {
  return messages
    .filter(message => typeof message.content === 'string' && message.content.trim())
    .map((message, index) => ({
      id: `msg-${index}-${crypto.randomUUID()}`,
      role:
        message.role === 'assistant' || message.role === 'system'
          ? message.role
          : 'user',
      parts: [
        {
          type: 'text',
          text: message.content,
        },
      ],
    }))
}

async function consumeNexusAIUIStream(
  response: Response,
  callbacks: AIChatStreamCallbacks,
  initialSessionId?: string,
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) throw new Error('Nexus AI response body is empty')

  const decoder = new TextDecoder()
  let buffer = ''
  let assistantContent = ''
  let sessionId = initialSessionId
  let runId: string | undefined
  const toolCalls = new Map<string, { toolName?: string; input?: Record<string, any>; startedAt?: string }>()
  let reasoningText = ''
  let reasoningStartedAt: string | undefined

  const complete = () => {
    callbacks.onComplete?.(completionResult(sessionId, assistantContent))
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''

    for (const event of events) {
      const line = event.split('\n').find(item => item.startsWith('data: '))
      if (!line) continue

      const raw = line.slice(6).trim()
      if (raw === '[DONE]') {
        complete()
        return
      }

      const chunk = JSON.parse(raw)

      if (chunk?.type === 'data-session') {
        sessionId = chunk.data?.sessionId || sessionId
        runId = chunk.data?.runId || runId
        if (sessionId) {
          callbacks.onSession?.(sessionId, runId)
        }
        continue
      }

      if (chunk?.type === 'text-delta' && typeof chunk.delta === 'string') {
        assistantContent += chunk.delta
        callbacks.onTextDelta?.(chunk.delta)
        continue
      }

      if (chunk?.type === 'reasoning-start') {
        reasoningText = ''
        reasoningStartedAt = new Date().toISOString()
        callbacks.onStep?.({
          id: chunk.id || 'reasoning',
          kind: 'reasoning',
          summary: 'Dang suy nghi...',
          label: 'Dang suy nghi...',
          status: 'running',
          detail: {
            text: '',
          },
          startedAt: reasoningStartedAt,
        })
        continue
      }

      if (chunk?.type === 'reasoning-delta' && typeof chunk.delta === 'string') {
        reasoningText += chunk.delta
        callbacks.onStep?.({
          id: chunk.id || 'reasoning',
          kind: 'reasoning',
          summary: 'Dang suy nghi...',
          label: 'Dang suy nghi...',
          status: 'running',
          detail: {
            text: reasoningText,
          },
          startedAt: reasoningStartedAt,
        })
        continue
      }

      if (chunk?.type === 'reasoning-end') {
        callbacks.onStep?.({
          id: chunk.id || 'reasoning',
          kind: 'reasoning',
          summary: 'Da suy nghi',
          label: 'Da suy nghi',
          status: 'completed',
          detail: {
            text: reasoningText || 'Assistant completed reasoning',
          },
          startedAt: reasoningStartedAt,
          endedAt: new Date().toISOString(),
        })
        continue
      }

      if (chunk?.type === 'tool-input-start') {
        const startedAt = new Date().toISOString()
        toolCalls.set(chunk.tool_call_id, {
          toolName: chunk.tool_name,
          input: {},
          startedAt,
        })
        callbacks.onStep?.({
          id: chunk.tool_call_id || `${chunk.tool_name}-${Date.now()}`,
          kind: 'tool_input',
          summary: 'Dang goi cong cu...',
          label: `Calling ${chunk.tool_name || 'tool'}`,
          status: 'running',
          toolName: chunk.tool_name,
          detail: {
            text: 'Preparing tool arguments',
          },
          startedAt,
        })
        continue
      }

      if (chunk?.type === 'tool-input-delta') {
        const current = toolCalls.get(chunk.tool_call_id)
        callbacks.onStep?.({
          id: chunk.tool_call_id || `${current?.toolName || 'tool'}-${Date.now()}`,
          kind: 'tool_input',
          summary: 'Dang goi cong cu...',
          label: `Calling ${current?.toolName || 'tool'}`,
          status: 'running',
          toolName: current?.toolName,
          detail: {
            text: 'Streaming tool arguments',
            input: current?.input,
          },
          startedAt: current?.startedAt,
        })
        continue
      }

      if (chunk?.type === 'tool-input-available') {
        const startedAt = toolCalls.get(chunk.tool_call_id)?.startedAt || new Date().toISOString()
        toolCalls.set(chunk.tool_call_id, {
          toolName: chunk.tool_name,
          input: chunk.input,
          startedAt,
        })
        callbacks.onStep?.({
          id: chunk.tool_call_id || `${chunk.tool_name}-${Date.now()}`,
          kind: 'tool_input',
          summary: 'Dang goi cong cu...',
          label: `Calling ${chunk.tool_name || 'tool'}`,
          status: 'running',
          toolName: chunk.tool_name,
          detail: {
            text: 'Tool arguments ready',
            input: chunk.input,
          },
          startedAt,
        })
        continue
      }

      if (chunk?.type === 'tool-output-available') {
        const toolCall = toolCalls.get(chunk.tool_call_id)
        callbacks.onStep?.({
          id: chunk.tool_call_id || `${toolCall?.toolName || 'tool'}-${Date.now()}`,
          kind: 'tool_output',
          summary: `${toolCall?.toolName || 'Tool'} completed`,
          label: `${toolCall?.toolName || 'Tool'} completed`,
          status: 'completed',
          toolName: toolCall?.toolName,
          detail: {
            text: 'Tool result received',
            input: toolCall?.input,
            output: chunk.output,
          },
          startedAt: toolCall?.startedAt,
          endedAt: new Date().toISOString(),
        })
        continue
      }

      if (chunk?.type === 'tool-output-error') {
        const toolCall = toolCalls.get(chunk.tool_call_id)
        callbacks.onStep?.({
          id: chunk.tool_call_id || `${toolCall?.toolName || 'tool'}-${Date.now()}`,
          kind: 'tool_output',
          summary: `${toolCall?.toolName || 'Tool'} failed`,
          label: `${toolCall?.toolName || 'Tool'} failed`,
          status: 'error',
          toolName: toolCall?.toolName,
          detail: {
            input: toolCall?.input,
            error: chunk.error_text || 'Tool execution failed',
          },
          startedAt: toolCall?.startedAt,
          endedAt: new Date().toISOString(),
        })
        continue
      }

      if (chunk?.type === 'tool-output-denied') {
        const toolCall = toolCalls.get(chunk.tool_call_id)
        callbacks.onStep?.({
          id: chunk.tool_call_id || `${toolCall?.toolName || 'tool'}-${Date.now()}`,
          kind: 'tool_output',
          summary: `${toolCall?.toolName || 'Tool'} denied`,
          label: `${toolCall?.toolName || 'Tool'} denied`,
          status: 'denied',
          toolName: toolCall?.toolName,
          detail: {
            input: toolCall?.input,
            error: 'Tool execution denied',
          },
          startedAt: toolCall?.startedAt,
          endedAt: new Date().toISOString(),
        })
        continue
      }

      if (chunk?.type === 'source-url') {
        callbacks.onStep?.({
          id: chunk.id || `source-url-${Date.now()}`,
          kind: 'source',
          summary: 'Source attached',
          label: chunk.title || chunk.url || 'Source',
          status: 'completed',
          detail: {
            metadata: {
              url: chunk.url,
              title: chunk.title,
            },
          },
        })
        continue
      }

      if (chunk?.type === 'source-document') {
        callbacks.onStep?.({
          id: chunk.id || `source-document-${Date.now()}`,
          kind: 'source',
          summary: 'Document attached',
          label: chunk.title || 'Document',
          status: 'completed',
          detail: {
            metadata: {
              title: chunk.title,
              mediaType: chunk.mediaType,
            },
          },
        })
        continue
      }

      if (chunk?.type === 'file') {
        callbacks.onStep?.({
          id: chunk.id || `file-${Date.now()}`,
          kind: 'file',
          summary: 'File attached',
          label: chunk.filename || chunk.mediaType || 'File',
          status: 'completed',
          detail: {
            metadata: {
              filename: chunk.filename,
              mediaType: chunk.mediaType,
            },
          },
        })
        continue
      }

      if (chunk?.type === 'data-project_list') {
        const projects = toProjectCardPayloads(chunk.data?.projects || chunk.projects)
        if (projects.length > 0) {
          callbacks.onProjectList?.({
            title:
              (typeof chunk.data?.title === 'string' && chunk.data.title)
                || (typeof chunk.title === 'string' && chunk.title)
                || 'Projects',
            projects,
          })
        }
        continue
      }

      if (chunk?.type === 'error') {
        callbacks.onError?.(chunk.error_text || 'Nexus AI request failed')
        return
      }
    }
  }

  complete()
}

export const aiChatApi = {
  streamChat: async (
    data: AIChatCommandRequest,
    callbacks: AIChatStreamCallbacks,
    token: string,
    signal?: AbortSignal,
  ): Promise<void> => {
    const messages =
      Array.isArray(data.context?.messages) && data.context.messages.length > 0
        ? data.context.messages
        : [{ role: 'user', content: data.command }]

    callbacks.onStatus?.('running', 'Connecting to Nexus AI')
    const path = data.sessionId
      ? `/agent-chat/ui/workspaces/${data.workspaceId}/sessions/${data.sessionId}/chat/completions`
      : `/agent-chat/ui/workspaces/${data.workspaceId}/chat/completions`

    const response = await fetch(API_CONFIG.getApiUrl(path), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        trigger: 'submit-message',
        id: data.sessionId || crypto.randomUUID(),
        messages: toUIRequestMessages(messages),
        model: normalizeModel(data.context?.model),
      }),
      signal,
    })

    if (!response.ok) {
      let payload: any = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      throw new Error(extractOpenAIError(payload, `Nexus AI request failed (${response.status})`))
    }

    await consumeNexusAIUIStream(response, callbacks, data.sessionId)
  },

  getSession: async (workspaceId: string, sessionId: string, token: string): Promise<AIChatSessionSnapshot> => {
    const response = await fetch(
      API_CONFIG.getApiUrl(`/agent-chat/workspaces/${workspaceId}/sessions/${sessionId}`),
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok) {
      let payload: any = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      throw new Error(extractOpenAIError(payload, `Nexus AI session fetch failed (${response.status})`))
    }

    return response.json()
  },

  listSessions: async (workspaceId: string, token: string): Promise<AIChatSessionSummary[]> => {
    const response = await fetch(
      API_CONFIG.getApiUrl(`/agent-chat/workspaces/${workspaceId}/sessions`),
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok) {
      let payload: any = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      throw new Error(extractOpenAIError(payload, `Nexus AI sessions fetch failed (${response.status})`))
    }

    const payload = await response.json()
    return Array.isArray(payload?.data) ? payload.data : []
  },

  deleteSession: async (
    workspaceId: string,
    sessionId: string,
    token: string,
  ): Promise<AIChatDeleteSessionResponse> => {
    const response = await fetch(
      API_CONFIG.getApiUrl(`/agent-chat/workspaces/${workspaceId}/sessions/${sessionId}`),
      {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    )

    if (!response.ok) {
      let payload: any = null
      try {
        payload = await response.json()
      } catch {
        payload = null
      }
      throw new Error(extractOpenAIError(payload, `Nexus AI session delete failed (${response.status})`))
    }

    return response.json()
  },

  listTools: async (_workspaceId: string, _token: string): Promise<AIChatToolsResponse> => {
    return Promise.resolve({
      success: true,
      count: 0,
      tools: [],
    })
  },
}

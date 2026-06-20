import { API_CONFIG } from '@/lib/config'
import type { ThinkingStep } from '@/components/ai-chat/types'

export interface AIChatCommandRequest {
  command: string
  workspaceId: string
  sessionId?: string
  context?: Record<string, any>
  executeActions?: boolean
}

export interface AIChatStreamCallbacks {
  onStatus?: (status: string, message: string) => void
  onStep?: (step: ThinkingStep) => void
  onAction?: (tool: string, success: boolean, message: string) => void
  onText?: (content: string) => void
  onTextDelta?: (content: string) => void
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
  onApprovalRequired?: (event: ApprovalRequiredEvent) => void
  onProjectList?: (payload: ProjectListEvent) => void
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

export interface ApprovalRequiredEvent {
  sessionId: string
  runId: string
  toolCallId: string
  toolName: string
  args: Record<string, any>
  summary?: string
  approvalKind?: string
  initialValues?: Record<string, any>
}

export interface AIChatSessionSnapshot {
  sessionId: string
  title: string
  items: Array<Record<string, any>>
  uiMessages?: Array<Record<string, any>>
  updatedAt: string
  activeApprovalItemId?: string | null
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

export interface ProjectCardPayload {
  id: string
  name: string
  description?: string
  status?: string
  type?: string
  updatedAt?: string
  memberCount?: number
  href: string
}

export interface ProjectListEvent {
  title: string
  items: ProjectCardPayload[]
}

interface UIMessagePart {
  type: string
  text?: string
  input?: Record<string, any>
  output?: Record<string, any>
  toolCallId?: string
  toolName?: string
  state?: string
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

function completionResult(sessionId: string | undefined, message: string, pendingApproval: boolean) {
  return {
    success: true,
    sessionId: sessionId || crypto.randomUUID(),
    message,
    actions: [],
    suggestions: [],
    reasoning: pendingApproval ? 'approval_required' : undefined,
  }
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
  let pendingApproval = false
  const toolCalls = new Map<string, { toolName?: string; input?: Record<string, any> }>()

  const complete = () => {
    callbacks.onComplete?.(completionResult(sessionId, assistantContent, pendingApproval))
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

      if (chunk?.type === 'tool-input-available') {
        toolCalls.set(chunk.tool_call_id, {
          toolName: chunk.tool_name,
          input: chunk.input,
        })
        callbacks.onStep?.({
          id: chunk.tool_call_id || `${chunk.tool_name}-${Date.now()}`,
          title: `Calling ${chunk.tool_name || 'tool'}`,
          description: 'Nexus AI is using a workspace tool',
          status: 'completed',
          tool: chunk.tool_name,
          eventType: 'tool_call',
          input: chunk.input,
        })
        continue
      }

      if (chunk?.type === 'tool-output-available') {
        const toolCall = toolCalls.get(chunk.tool_call_id)
        callbacks.onStep?.({
          id: chunk.tool_call_id || `${toolCall?.toolName || 'tool'}-${Date.now()}`,
          title: `${toolCall?.toolName || 'Tool'} completed`,
          description: 'Tool result received',
          status: 'completed',
          tool: toolCall?.toolName,
          eventType: 'tool_result',
          input: toolCall?.input,
          result: chunk.output,
          outcome: 'success',
        })
        continue
      }

      if (chunk?.type === 'tool-output-error') {
        const toolCall = toolCalls.get(chunk.tool_call_id)
        callbacks.onStep?.({
          id: chunk.tool_call_id || `${toolCall?.toolName || 'tool'}-${Date.now()}`,
          title: `${toolCall?.toolName || 'Tool'} failed`,
          description: chunk.error_text || 'Tool execution failed',
          status: 'error',
          tool: toolCall?.toolName,
          eventType: 'tool_result',
          input: toolCall?.input,
          result: { error: chunk.error_text },
          outcome: 'error',
        })
        continue
      }

      if (chunk?.type === 'tool-output-denied') {
        const toolCall = toolCalls.get(chunk.tool_call_id)
        callbacks.onStep?.({
          id: chunk.tool_call_id || `${toolCall?.toolName || 'tool'}-${Date.now()}`,
          title: `${toolCall?.toolName || 'Tool'} denied`,
          description: 'Tool execution denied',
          status: 'error',
          tool: toolCall?.toolName,
          eventType: 'tool_result',
          input: toolCall?.input,
          result: undefined,
          outcome: 'denied',
        })
        continue
      }

      if (chunk?.type === 'data-approval_required') {
        pendingApproval = true
        sessionId = chunk.data?.sessionId || sessionId
        runId = chunk.data?.runId || runId
        callbacks.onApprovalRequired?.({
          sessionId: chunk.data?.sessionId,
          runId: chunk.data?.runId,
          toolCallId: chunk.data?.toolCallId,
          toolName: chunk.data?.toolName,
          args: chunk.data?.args || {},
          summary: chunk.data?.summary,
          approvalKind: chunk.data?.approvalKind,
          initialValues: chunk.data?.initialValues || undefined,
        })
        continue
      }

      if (chunk?.type === 'data-project_list') {
        callbacks.onProjectList?.({
          title: typeof chunk.data?.title === 'string' ? chunk.data.title : 'Projects',
          items: Array.isArray(chunk.data?.items) ? chunk.data.items : [],
        })
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

  resumeApproval: async (
    workspaceId: string,
    sessionId: string,
    runId: string,
    toolCallId: string,
    decision: 'approve' | 'deny',
    formData: Record<string, any> | undefined,
    callbacks: AIChatStreamCallbacks,
    token: string,
    signal?: AbortSignal,
  ): Promise<void> => {
    callbacks.onStatus?.('running', decision === 'approve' ? 'Applying approved action' : 'Sending denial')
    const response = await fetch(
      API_CONFIG.getApiUrl(`/agent-chat/ui/workspaces/${workspaceId}/sessions/${sessionId}/runs/${runId}/resume`),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tool_call_id: toolCallId, decision, form_data: formData }),
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
      throw new Error(extractOpenAIError(payload, `Nexus AI resume failed (${response.status})`))
    }

    await consumeNexusAIUIStream(response, callbacks, sessionId)
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

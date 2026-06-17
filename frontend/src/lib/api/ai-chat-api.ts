import { API_CONFIG } from '@/lib/config'

export interface AIChatCommandRequest {
  command: string
  workspaceId: string
  sessionId?: string
  context?: Record<string, any>
  executeActions?: boolean
}

export interface AIChatStreamCallbacks {
  onStatus?: (status: string, message: string) => void
  onStep?: (step: {
    id: string
    title: string
    description?: string
    status: 'pending' | 'running' | 'completed' | 'error'
    tool?: string
    input?: Record<string, any>
  }) => void
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

function extractTextDelta(chunk: any): string {
  if (typeof chunk?.delta === 'string') return chunk.delta
  if (typeof chunk?.text === 'string') return chunk.text
  const content = chunk?.choices?.[0]?.delta?.content
  return typeof content === 'string' ? content : ''
}

async function consumeNexusAIStream(
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
        callbacks.onComplete?.(completionResult(sessionId, assistantContent, pendingApproval))
        return
      }

      const chunk = JSON.parse(raw)
      if (chunk?.session_id) {
        sessionId = String(chunk.session_id)
        runId = chunk.run_id || runId
        callbacks.onSession?.(sessionId, runId)
      }

      if (chunk?.type === 'tool_call') {
        callbacks.onStep?.({
          id: chunk.tool_call_id || `${chunk.tool_name}-${Date.now()}`,
          title: `Calling ${chunk.tool_name || 'tool'}`,
          description: 'Nexus AI is using a workspace tool',
          status: 'running',
          tool: chunk.tool_name,
          input: chunk.args,
        })
        continue
      }

      if (chunk?.type === 'tool_result') {
        callbacks.onStep?.({
          id: chunk.tool_call_id || `${chunk.tool_name}-${Date.now()}`,
          title: `${chunk.tool_name || 'Tool'} completed`,
          description: 'Tool result received',
          status: 'completed',
          tool: chunk.tool_name,
        })
        continue
      }

      if (chunk?.type === 'approval_required') {
        pendingApproval = true
        callbacks.onApprovalRequired?.({
          sessionId: chunk.session_id,
          runId: chunk.run_id,
          toolCallId: chunk.tool_call_id,
          toolName: chunk.tool_name,
          args: chunk.args || {},
          summary: chunk.summary,
        })
        callbacks.onStep?.({
          id: chunk.tool_call_id,
          title: `Approval required: ${chunk.tool_name}`,
          description: chunk.summary || 'Confirm before Nexus AI changes workspace data',
          status: 'pending',
          tool: chunk.tool_name,
          input: chunk.args,
        })
        continue
      }

      const delta = extractTextDelta(chunk)
      if (delta) {
        assistantContent += delta
        callbacks.onTextDelta?.(delta)
      }
    }
  }

  callbacks.onComplete?.(completionResult(sessionId, assistantContent, pendingApproval))
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
      ? `/agent-chat/workspaces/${data.workspaceId}/sessions/${data.sessionId}/chat/completions`
      : `/agent-chat/workspaces/${data.workspaceId}/chat/completions`

    const response = await fetch(API_CONFIG.getApiUrl(path), {
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

    await consumeNexusAIStream(response, callbacks, data.sessionId)
  },

  resumeApproval: async (
    workspaceId: string,
    sessionId: string,
    runId: string,
    toolCallId: string,
    decision: 'approve' | 'deny',
    callbacks: AIChatStreamCallbacks,
    token: string,
    signal?: AbortSignal,
  ): Promise<void> => {
    callbacks.onStatus?.('running', decision === 'approve' ? 'Applying approved action' : 'Sending denial')
    const response = await fetch(
      API_CONFIG.getApiUrl(`/agent-chat/workspaces/${workspaceId}/sessions/${sessionId}/runs/${runId}/resume`),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tool_call_id: toolCallId, decision }),
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

    await consumeNexusAIStream(response, callbacks, sessionId)
  },

  listTools: async (_workspaceId: string, _token: string): Promise<AIChatToolsResponse> => {
    return Promise.resolve({
      success: true,
      count: 0,
      tools: [],
    })
  },
}

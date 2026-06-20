import { DefaultChatTransport } from 'ai'
import type { UIMessage } from 'ai'

import { API_CONFIG } from '@/lib/config'

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
  uiMessages?: UIMessage[]
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

const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b:free'
const STORAGE_PREFIX = 'nexus_ai_chat_'

function canonicalModel(model: string) {
  if (model === 'nvidia/nemotron-3-ultra-550b-a55b:free') return DEFAULT_MODEL
  return model
}

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

export function normalizeModel(model?: string) {
  if (!model || ['auto', 'thinking', 'fast'].includes(model)) return DEFAULT_MODEL
  return canonicalModel(model)
}

function authHeaders() {
  const token = localStorage.getItem('auth_token') || ''
  return {
    Accept: 'text/event-stream',
    Authorization: `Bearer ${token}`,
  }
}

function extractOpenAIError(payload: any, fallback: string) {
  if (payload?.error?.message) return payload.error.message
  if (payload?.message) return Array.isArray(payload.message) ? payload.message.join(', ') : payload.message
  return fallback
}

function debugEnabled() {
  return import.meta.env.VITE_AI_CHAT_DEBUG === 'true'
}

function safeHeaders(headers: Headers) {
  return {
    contentType: headers.get('content-type') || undefined,
    uiStream: headers.get('x-vercel-ai-ui-message-stream') || undefined,
  }
}

async function debugFetch(input: RequestInfo | URL, init?: RequestInit) {
  if (!debugEnabled()) {
    return fetch(input, init)
  }

  const startedAt = performance.now()
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const method = init?.method || 'GET'
  let bodyId: string | undefined
  let messageCount: number | undefined

  if (typeof init?.body === 'string') {
    try {
      const body = JSON.parse(init.body)
      bodyId = typeof body?.id === 'string' ? body.id : undefined
      messageCount = Array.isArray(body?.messages) ? body.messages.length : undefined
    } catch {
      // Body logging is metadata-only; ignore unparseable bodies.
    }
  }

  console.info('[ai-chat] request', { method, url, bodyId, messageCount })
  const response = await fetch(input, init)
  console.info('[ai-chat] response', {
    method,
    url,
    status: response.status,
    ...safeHeaders(response.headers),
    durationMs: Math.round(performance.now() - startedAt),
  })
  return response
}

export function createAIChatTransport({
  workspaceId,
  model,
}: {
  workspaceId: string
  model: string
}) {
  return new DefaultChatTransport({
    api: API_CONFIG.getApiUrl(`/agent-chat/ui/workspaces/${workspaceId}/chat/completions`),
    fetch: debugFetch,
    headers: authHeaders,
    prepareSendMessagesRequest: ({ id, body, headers, credentials, messages, trigger, messageId }) => ({
      headers: {
        ...headers,
        ...authHeaders(),
      },
      credentials,
      body: {
        ...body,
        id,
        messages,
        trigger,
        messageId,
        model: normalizeModel(model),
      },
    }),
  })
}

export const aiChatApi = {
  async getSession(workspaceId: string, sessionId: string): Promise<AIChatSessionSnapshot> {
    const response = await fetch(
      API_CONFIG.getApiUrl(`/agent-chat/workspaces/${workspaceId}/sessions/${sessionId}`),
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: authHeaders().Authorization,
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

  async listSessions(workspaceId: string): Promise<AIChatSessionSummary[]> {
    const response = await fetch(
      API_CONFIG.getApiUrl(`/agent-chat/workspaces/${workspaceId}/sessions`),
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: authHeaders().Authorization,
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

  async deleteSession(
    workspaceId: string,
    sessionId: string,
  ): Promise<AIChatDeleteSessionResponse> {
    const response = await fetch(
      API_CONFIG.getApiUrl(`/agent-chat/workspaces/${workspaceId}/sessions/${sessionId}`),
      {
        method: 'DELETE',
        headers: {
          Accept: 'application/json',
          Authorization: authHeaders().Authorization,
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
}

import { API_CONFIG } from '@/lib/config'
import type {
  AIChatPartItem,
  ProjectCardPayload,
  WorkspaceActionPayload,
  WorkspaceReferencePayload,
} from '@/components/ai-chat/types'
import { normalizeTranscriptStatus, orchestrationLabel } from '@/components/ai-chat/transcriptModel'

export interface AIChatCommandRequest {
  command: string
  workspaceId: string
  sessionId?: string
  context?: Record<string, any>
}

export interface AIChatStreamCallbacks {
  onStatus?: (status: string, message: string) => void
  onPart?: (part: AIChatPartItem) => void
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
  transcript?: Array<Record<string, any>>
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

function toWorkspaceReferences(value: unknown): WorkspaceReferencePayload[] {
  if (!Array.isArray(value)) return []
  return value.reduce<WorkspaceReferencePayload[]>((acc, item) => {
    if (!item || typeof item !== 'object') return acc
    const record = item as Record<string, any>
    const title = typeof record.title === 'string' ? record.title : undefined
    const href = typeof record.href === 'string' ? record.href : undefined
    const entityId = typeof record.entityId === 'string' ? record.entityId : undefined
    if (!title && !href && !entityId) return acc
    acc.push({
      sourceType: typeof record.sourceType === 'string' ? record.sourceType : undefined,
      entityType: typeof record.entityType === 'string' ? record.entityType : undefined,
      entityId,
      title,
      href,
      snippet: typeof record.snippet === 'string' ? record.snippet : undefined,
      citation: typeof record.citation === 'string' ? record.citation : undefined,
      score: typeof record.score === 'number' ? record.score : undefined,
    })
    return acc
  }, [])
}

function toWorkspaceActions(value: unknown): WorkspaceActionPayload[] {
  if (!Array.isArray(value)) return []
  return value.reduce<WorkspaceActionPayload[]>((acc, item) => {
    if (!item || typeof item !== 'object') return acc
    const record = item as Record<string, any>
    const title = typeof record.title === 'string' ? record.title : undefined
    const href = typeof record.href === 'string' ? record.href : undefined
    const message = typeof record.message === 'string' ? record.message : undefined
    if (!title && !href && !message) return acc
    acc.push({
      toolName: typeof record.toolName === 'string' ? record.toolName : undefined,
      action: typeof record.action === 'string' ? record.action : undefined,
      status: typeof record.status === 'string' ? record.status : undefined,
      entityType: typeof record.entityType === 'string' ? record.entityType : undefined,
      entityId: typeof record.entityId === 'string' ? record.entityId : undefined,
      title,
      href,
      message,
    })
    return acc
  }, [])
}

const ACTION_WORDS = ['create', 'created', 'update', 'updated', 'delete', 'deleted', 'assign', 'assigned', 'send', 'sent', 'move', 'moved', 'share', 'shared']

function entityTypeFromTool(toolName: string | undefined): string | undefined {
  if (!toolName) return undefined
  const name = toolName.toLowerCase()
  if (name.includes('project')) return 'project'
  if (name.includes('task')) return 'task'
  if (name.includes('file')) return 'file'
  if (name.includes('note')) return 'note'
  if (name.includes('channel')) return 'channel'
  if (name.includes('message')) return 'message'
  if (name.includes('calendar') || name.includes('event')) return 'calendar_event'
  if (name.includes('call')) return 'video_call'
  return undefined
}

function entityHref(workspaceId: string, entityType: string | undefined, entityId: string | undefined, record: Record<string, any>): string | undefined {
  if (!workspaceId || !entityType || !entityId) return undefined
  if (entityType === 'project') return `/workspaces/${workspaceId}/projects/${entityId}`
  if (entityType === 'task') {
    const projectId = typeof record.projectId === 'string' ? record.projectId : typeof record.project_id === 'string' ? record.project_id : undefined
    return projectId
      ? `/workspaces/${workspaceId}/projects/${projectId}?taskId=${entityId}`
      : `/workspaces/${workspaceId}/projects?taskId=${entityId}`
  }
  if (entityType === 'file') return `/workspaces/${workspaceId}/files/${entityId}`
  if (entityType === 'note') return `/workspaces/${workspaceId}/notes/${entityId}`
  if (entityType === 'channel') return `/workspaces/${workspaceId}/chat/${entityId}`
  if (entityType === 'message') {
    const channelId = typeof record.channelId === 'string' ? record.channelId : typeof record.channel_id === 'string' ? record.channel_id : undefined
    return channelId ? `/workspaces/${workspaceId}/chat/${channelId}` : undefined
  }
  if (entityType === 'calendar_event') return `/workspaces/${workspaceId}/calendar?eventId=${entityId}`
  if (entityType === 'video_call') return `/workspaces/${workspaceId}/video-calls`
  return undefined
}

function recordsFromOutput(value: unknown): Record<string, any>[] {
  if (Array.isArray(value)) return value.flatMap(recordsFromOutput)
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, any>
  const nestedKeys = ['items', 'results', 'data', 'projects', 'tasks', 'files', 'notes', 'channels', 'messages']
  const nested = nestedKeys.flatMap(key => recordsFromOutput(record[key]))
  return nested.length > 0 ? nested : [record]
}

function inferredEntity(record: Record<string, any>, toolName: string | undefined): { entityType?: string; entityId?: string } {
  const toolEntityType = entityTypeFromTool(toolName)
  if (toolEntityType) {
    const directKey = `${toolEntityType === 'calendar_event' ? 'event' : toolEntityType}Id`
    const snakeKey = `${toolEntityType === 'calendar_event' ? 'event' : toolEntityType}_id`
    if (typeof record[directKey] === 'string') return { entityType: toolEntityType, entityId: record[directKey] }
    if (typeof record[snakeKey] === 'string') return { entityType: toolEntityType, entityId: record[snakeKey] }
    if (typeof record.id === 'string') return { entityType: toolEntityType, entityId: record.id }
  }
  const keyMap: Array<[string, string]> = [
    ['projectId', 'project'], ['project_id', 'project'],
    ['taskId', 'task'], ['task_id', 'task'],
    ['fileId', 'file'], ['file_id', 'file'],
    ['noteId', 'note'], ['note_id', 'note'],
    ['channelId', 'channel'], ['channel_id', 'channel'],
    ['messageId', 'message'], ['message_id', 'message'],
    ['eventId', 'calendar_event'], ['event_id', 'calendar_event'],
  ]
  for (const [key, entityType] of keyMap) {
    if (typeof record[key] === 'string') return { entityType, entityId: record[key] }
  }
  const entityType = typeof record.entityType === 'string'
    ? record.entityType
    : typeof record.entity_type === 'string'
      ? record.entity_type
      : toolEntityType
  const entityId = typeof record.entityId === 'string'
    ? record.entityId
    : typeof record.entity_id === 'string'
      ? record.entity_id
      : typeof record.id === 'string'
        ? record.id
        : undefined
  return { entityType, entityId }
}

function referencesFromToolOutput(toolName: string | undefined, output: unknown, workspaceId: string): WorkspaceReferencePayload[] {
  return recordsFromOutput(output).reduce<WorkspaceReferencePayload[]>((acc, record) => {
    const { entityType, entityId } = inferredEntity(record, toolName)
    if (!entityType || !entityId) return acc
    const title = typeof record.title === 'string'
      ? record.title
      : typeof record.name === 'string'
        ? record.name
        : `${entityType} ${entityId}`
    acc.push({
      sourceType: 'mcp',
      entityType,
      entityId,
      title,
      href: typeof record.href === 'string' ? record.href : entityHref(workspaceId, entityType, entityId, record),
    })
    return acc
  }, [])
}

function actionsFromToolOutput(toolName: string | undefined, output: unknown, workspaceId: string): WorkspaceActionPayload[] {
  if (!toolName || !ACTION_WORDS.some(word => toolName.toLowerCase().includes(word))) return []
  return recordsFromOutput(output).reduce<WorkspaceActionPayload[]>((acc, record) => {
    const { entityType, entityId } = inferredEntity(record, toolName)
    const message = typeof record.message === 'string' ? record.message : typeof record.error === 'string' ? record.error : undefined
    if (!entityType && !entityId && !message) return acc
    const status = record.success === true || record.ok === true
      ? 'completed'
      : record.success === false || record.ok === false || record.error
        ? 'error'
        : typeof record.status === 'string'
          ? record.status
          : 'unknown'
    acc.push({
      toolName,
      action: ACTION_WORDS.find(word => toolName.toLowerCase().includes(word)),
      status,
      entityType,
      entityId,
      title: typeof record.title === 'string' ? record.title : typeof record.name === 'string' ? record.name : undefined,
      href: typeof record.href === 'string' ? record.href : entityHref(workspaceId, entityType, entityId, record),
      message,
    })
    return acc
  }, [])
}

function dedupeByHref<T extends { href?: string; entityType?: string; entityId?: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = item.href || `${item.entityType || ''}:${item.entityId || ''}`
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function derivedPartsFromToolOutput(toolName: string | undefined, output: unknown, workspaceId: string): AIChatPartItem[] {
  if (!toolName || !output || typeof output !== 'object') return []
  const record = output as Record<string, any>
  if (toolName === 'search_rag') {
    const references = toWorkspaceReferences(record.sources)
    if (references.length === 0) return []
    return [{
      id: `rag-sources-${crypto.randomUUID()}`,
      type: 'data-rag_sources',
      status: 'completed',
      label: 'RAG sources',
      summary: 'Indexed file sources',
      references,
      metadata: { sources: references },
    }]
  }
  const actions = dedupeByHref([
    ...toWorkspaceActions(record.actions || record.actionResults || record.results),
    ...actionsFromToolOutput(toolName, output, workspaceId),
  ])
  const parts: AIChatPartItem[] = []
  if (actions.length > 0) {
    parts.push({
      id: `action-result-${crypto.randomUUID()}`,
      type: 'data-action_result',
      status: actions.some(action => action.status === 'error') ? 'error' : 'completed',
      label: 'Action result',
      summary: 'Workspace action result',
      actions,
      metadata: { toolName, actions },
    })
    return parts
  }
  const references = dedupeByHref([
    ...toWorkspaceReferences(record.sources || record.references),
    ...referencesFromToolOutput(toolName, output, workspaceId),
  ])
  if (references.length > 0) {
    parts.push({
      id: `mcp-sources-${crypto.randomUUID()}`,
      type: 'data-mcp_sources',
      status: 'completed',
      label: 'Workspace sources',
      summary: 'Workspace data sources',
      references,
      metadata: { toolName, sources: references },
    })
  }
  return parts
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
  let sessionId = initialSessionId
  let completed = false

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''

    for (const event of events) {
      const parsed = parseBackendSseEvent(event)
      if (!parsed) continue

      if (parsed.event === 'session') {
        sessionId = typeof parsed.data?.sessionId === 'string' ? parsed.data.sessionId : sessionId
        if (sessionId) callbacks.onSession?.(sessionId, typeof parsed.data?.runId === 'string' ? parsed.data.runId : undefined)
        continue
      }

      if (parsed.event === 'message.part') {
        const part = parsed.data?.part
        if (part && typeof part === 'object') {
          callbacks.onPart?.(part as AIChatPartItem)
        }
        continue
      }

      if (parsed.event === 'run.error') {
        callbacks.onError?.(
          typeof parsed.data?.error === 'string' ? parsed.data.error : 'Nexus AI request failed',
        )
        return
      }

      if (parsed.event === 'run.completed') {
        completed = true
        callbacks.onComplete?.(completionResult(sessionId, typeof parsed.data?.message === 'string' ? parsed.data.message : ''))
        return
      }
    }
  }

  if (!completed) {
    callbacks.onError?.('Nexus AI stream ended before completion')
  }
}

function parseBackendSseEvent(frame: string): { event: string; data: Record<string, any> } | null {
  const lines = frame.split('\n')
  let eventName = ''
  const dataLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim()
      continue
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart())
    }
  }

  if (!eventName || dataLines.length === 0) return null

  try {
    return {
      event: eventName,
      data: JSON.parse(dataLines.join('\n')),
    }
  } catch {
    return null
  }
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

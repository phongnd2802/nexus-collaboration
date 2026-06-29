import type {
  AIChatPartItem,
  AIChatTimelineItem,
  ProjectCardPayload,
  WorkspaceActionPayload,
  WorkspaceReferencePayload,
} from './types'
import { normalizeTranscriptStatus, orchestrationLabel } from './transcriptModel'

function timestampFromMetadata(value: Record<string, any> | undefined, fallback: string): string {
  return typeof value?.timestamp === 'string' ? value.timestamp : fallback
}

function toolNameFromPart(part: Record<string, any>): string | undefined {
  if (typeof part.toolName === 'string') return part.toolName
  if (typeof part.tool_name === 'string') return part.tool_name
  return undefined
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

function textPart(part: Record<string, any>, index: number): AIChatPartItem | null {
  if (part?.type !== 'text' || typeof part.text !== 'string') return null
  return {
    id: String(part.id || `text-${index}`),
    type: 'text',
    status: part.state === 'streaming' ? 'running' : 'completed',
    label: 'Message',
    text: part.text,
    raw: part,
  }
}

function reasoningPart(part: Record<string, any>, index: number): AIChatPartItem | null {
  if (part?.type !== 'reasoning' && typeof part.reasoning !== 'string') return null
  const text = typeof part.text === 'string' ? part.text : part.reasoning
  return {
    id: String(part.id || `reasoning-${index}`),
    type: 'reasoning',
    status: part.state === 'streaming' ? 'running' : 'completed',
    label: part.state === 'streaming' ? 'Dang suy nghi...' : 'Da suy nghi',
    summary: part.state === 'streaming' ? 'Dang suy nghi...' : 'Da suy nghi',
    text,
    raw: part,
  }
}

function orchestrationPart(part: Record<string, any>, index: number): AIChatPartItem | null {
  if (part?.type !== 'data-orchestration_stage') return null
  const data = typeof part.data === 'object' && part.data ? part.data : {}
  const stage = typeof data.stage === 'string' ? data.stage : 'unknown'
  const label = orchestrationLabel(stage)
  return {
    id: String(part.id || `orchestration-${stage}-${index}`),
    type: 'data-orchestration_stage',
    status: normalizeTranscriptStatus(typeof data.status === 'string' ? data.status : undefined),
    label,
    summary: typeof data.summary === 'string' ? data.summary : label,
    startedAt: typeof data.startedAt === 'string' ? data.startedAt : undefined,
    endedAt: typeof data.endedAt === 'string' ? data.endedAt : undefined,
    metadata: typeof data.metadata === 'object' && data.metadata ? data.metadata : undefined,
    raw: part,
  }
}

function routingDecisionPart(part: Record<string, any>, index: number): AIChatPartItem | null {
  if (part?.type !== 'data-routing_decision') return null
  const data = typeof part.data === 'object' && part.data ? part.data : {}
  const route = typeof data.route === 'string' ? data.route : 'unknown'
  const executionPath = typeof data.executionPath === 'string' ? data.executionPath : undefined
  return {
    id: String(part.id || `routing-${executionPath || route}-${index}`),
    type: 'data-routing_decision',
    status: 'completed',
    label:
      route === 'direct_workspace' || executionPath === 'direct_workspace' || route === 'direct'
        ? 'Direct workspace route'
        : 'Multi-agent route',
    summary:
      route === 'direct_workspace' || executionPath === 'direct_workspace' || route === 'direct'
        ? 'Routed to direct workspace agent'
        : 'Routed to multi-agent orchestration',
    metadata: data,
    raw: part,
  }
}

function orchestrationArtifactPart(part: Record<string, any>, index: number): AIChatPartItem | null {
  if (
    part?.type !== 'data-plan'
    && part?.type !== 'data-retrieval_bundle'
    && part?.type !== 'data-draft_answer'
    && part?.type !== 'data-critique'
    && part?.type !== 'data-final_answer'
  ) {
    return null
  }
  const labelByType: Record<string, string> = {
    'data-plan': 'Plan',
    'data-retrieval_bundle': 'Retrieval bundle',
    'data-draft_answer': 'Draft answer',
    'data-critique': 'Critique',
    'data-final_answer': 'Final answer',
  }
  const data = typeof part.data === 'object' && part.data ? part.data : {}
  return {
    id: String(part.id || `${part.type}-${index}`),
    type: part.type,
    status: 'completed',
    label: labelByType[part.type] || part.type,
    summary: labelByType[part.type] || part.type,
    metadata: data,
    text: part.type === 'data-final_answer' && typeof data.content === 'string' ? data.content : undefined,
    raw: part,
  }
}

function workspaceReferencePart(part: Record<string, any>, index: number): AIChatPartItem | null {
  if (
    part?.type !== 'data-rag_sources'
    && part?.type !== 'data-mcp_sources'
    && part?.type !== 'data-action_result'
  ) {
    return null
  }
  const data = typeof part.data === 'object' && part.data ? part.data : {}
  if (part.type === 'data-action_result') {
    const actions = toWorkspaceActions(data.actions || data.actionResults || data.results)
    if (actions.length === 0) return null
    return {
      id: String(part.id || `action-result-${index}`),
      type: part.type,
      status: actions.some(action => action.status === 'error') ? 'error' : 'completed',
      label: 'Action result',
      summary: 'Workspace action result',
      actions,
      metadata: data,
      raw: part,
    }
  }
  const references = toWorkspaceReferences(data.sources || data.references || data.results)
  if (references.length === 0) return null
  return {
    id: String(part.id || `${part.type}-${index}`),
    type: part.type,
    status: 'completed',
    label: part.type === 'data-rag_sources' ? 'RAG sources' : 'Workspace sources',
    summary: part.type === 'data-rag_sources' ? 'Indexed file sources' : 'Workspace data sources',
    references,
    metadata: data,
    raw: part,
  }
}

function sourceUrlPart(part: Record<string, any>, index: number): AIChatPartItem | null {
  if (part?.type !== 'source-url') return null
  return {
    id: String(part.id || `source-url-${index}`),
    type: 'source-url',
    status: 'completed',
    label: typeof part.title === 'string' ? part.title : typeof part.url === 'string' ? part.url : 'Source',
    summary: 'Source attached',
    metadata: {
      url: part.url,
      title: part.title,
    },
    raw: part,
  }
}

function sourceDocumentPart(part: Record<string, any>, index: number): AIChatPartItem | null {
  if (part?.type !== 'source-document') return null
  return {
    id: String(part.id || `source-document-${index}`),
    type: 'source-document',
    status: 'completed',
    label: typeof part.title === 'string' ? part.title : 'Document',
    summary: 'Document attached',
    metadata: {
      title: part.title,
      mediaType: part.mediaType,
    },
    raw: part,
  }
}

function filePart(part: Record<string, any>, index: number): AIChatPartItem | null {
  if (part?.type !== 'file') return null
  return {
    id: String(part.id || `file-${index}`),
    type: 'file',
    status: 'completed',
    label: typeof part.filename === 'string' ? part.filename : 'File',
    summary: 'File attached',
    metadata: {
      filename: part.filename,
      mediaType: part.mediaType,
    },
    raw: part,
  }
}

function projectListPart(part: Record<string, any>, index: number): AIChatPartItem | null {
  if (part?.type !== 'data-project_list') return null
  const projects = toProjectCardPayloads(part.data?.projects || part.projects)
  if (projects.length === 0) return null
  return {
    id: String(part.id || `project-list-${index}`),
    type: 'data-project_list',
    status: 'completed',
    label:
      (typeof part.data?.title === 'string' && part.data.title)
      || (typeof part.title === 'string' && part.title)
      || 'Projects',
    summary: 'Project list attached',
    projects,
    raw: part,
  }
}

function toolPart(part: Record<string, any>, index: number): AIChatPartItem | null {
  if (typeof part?.type !== 'string' || !part.type.startsWith('tool-')) return null
  const toolName = toolNameFromPart(part)
  const toolCallId = typeof part.toolCallId === 'string' ? part.toolCallId : part.tool_call_id
  const status =
    part.state === 'output-error'
      ? 'error'
      : part.state === 'output-denied'
        ? 'denied'
        : part.state === 'output-available'
          ? 'completed'
          : 'running'

  return {
    id: String(toolCallId || `${part.type}-${index}`),
    type: part.type,
    status,
    label:
      status === 'running'
        ? `Calling ${toolName || 'tool'}`
        : status === 'error'
          ? `${toolName || 'Tool'} failed`
          : status === 'denied'
            ? `${toolName || 'Tool'} denied`
            : `${toolName || 'Tool'} completed`,
    summary:
      status === 'running'
        ? 'Dang goi cong cu...'
        : status === 'error'
          ? `${toolName || 'Tool'} failed`
          : status === 'denied'
            ? `${toolName || 'Tool'} denied`
            : `${toolName || 'Tool'} completed`,
    toolName,
    input: typeof part.input === 'object' && part.input ? part.input : undefined,
    output: typeof part.output === 'object' && part.output ? part.output : undefined,
    error:
      typeof part.errorText === 'string'
        ? part.errorText
        : typeof part.error_text === 'string'
          ? part.error_text
          : status === 'denied'
            ? 'Tool execution denied'
            : undefined,
    text:
      typeof part.errorText === 'string'
        ? part.errorText
        : typeof part.error_text === 'string'
          ? part.error_text
          : status === 'completed'
            ? 'Tool result received'
            : 'Tool execution in progress',
    raw: part,
  }
}

function fallbackPart(part: Record<string, any>, index: number): AIChatPartItem {
  return {
    id: String(part.id || `${part.type || 'part'}-${index}`),
    type: typeof part.type === 'string' ? part.type : 'unknown',
    status: normalizeTranscriptStatus(typeof part.state === 'string' ? part.state : undefined),
    label: typeof part.type === 'string' ? part.type : 'Unknown part',
    text: typeof part.text === 'string' ? part.text : undefined,
    raw: part,
  }
}

function toPart(part: Record<string, any>, index: number): AIChatPartItem {
  return (
    textPart(part, index)
    || reasoningPart(part, index)
    || projectListPart(part, index)
    || routingDecisionPart(part, index)
    || orchestrationPart(part, index)
    || orchestrationArtifactPart(part, index)
    || workspaceReferencePart(part, index)
    || sourceUrlPart(part, index)
    || sourceDocumentPart(part, index)
    || filePart(part, index)
    || toolPart(part, index)
    || fallbackPart(part, index)
  )
}

export function messageContent(parts: AIChatPartItem[]): string {
  return parts
    .filter(part => part.type === 'text' && typeof part.text === 'string')
    .map(part => part.text)
    .join('')
    .trim()
}

export function groupAssistantPartsForThinking(parts: AIChatPartItem[]): AIChatPartItem[] {
  const textParts = parts.filter(part => part.type === 'text')
  const thinkingChildren = parts.filter(part => part.type !== 'text' && part.type !== 'thinking_group')
  if (thinkingChildren.length === 0) return textParts

  return [thinkingGroupPart(thinkingChildren), ...textParts]
}

export function thinkingGroupPart(children: AIChatPartItem[]): AIChatPartItem {
  const status = thinkingGroupStatus(children)
  return {
    id: 'thinking-group',
    type: 'thinking_group',
    status,
    label: status === 'running' ? 'Thinking' : status === 'error' ? 'Thinking failed' : 'Thinking',
    summary: thinkingGroupSummary(children, status),
    children,
  }
}

function thinkingGroupStatus(children: AIChatPartItem[]): AIChatPartItem['status'] {
  if (children.some(part => part.status === 'running' || part.status === 'pending')) return 'running'
  if (children.some(part => part.status === 'error')) return 'error'
  if (children.some(part => part.status === 'denied')) return 'denied'
  if (children.some(part => part.status === 'skipped')) return 'skipped'
  return 'completed'
}

function thinkingGroupSummary(children: AIChatPartItem[], status: AIChatPartItem['status']): string {
  if (status === 'running') {
    const running = [...children].reverse().find(part => part.status === 'running' || part.status === 'pending')
    return running?.summary || running?.label || 'Đang suy nghĩ...'
  }
  if (status === 'error') return 'Có bước xử lý bị lỗi'
  if (status === 'denied') return 'Có bước xử lý bị từ chối'
  if (children.length === 0) return 'Đã xử lý'
  return 'Đã xử lý'
}

export function transcriptToTimeline(
  transcriptMessages: Array<Record<string, any>> | undefined,
): { items: AIChatTimelineItem[]; activeApprovalItemId: string | null } | null {
  if (!Array.isArray(transcriptMessages) || transcriptMessages.length === 0) return null

  const items: AIChatTimelineItem[] = []
  let pendingInternalParts: AIChatPartItem[] = []

  for (const message of transcriptMessages) {
    const timestamp = timestampFromMetadata(message.metadata, new Date().toISOString())
    const parts = Array.isArray(message.parts) ? message.parts : []

    if (message.role === 'user') {
      const content = parts
        .filter(part => part?.type === 'text' && typeof part.text === 'string')
        .map(part => part.text)
        .join('')
        .trim()

      if (content) {
        items.push({
          id: message.id,
          type: 'user_message',
          content,
          timestamp,
        })
      }
      continue
    }

    const normalizedParts = parts
      .filter((part): part is Record<string, any> => Boolean(part && typeof part === 'object'))
      .map((part, index) => toPart(part, index))
    const contentFromNormalizedParts = messageContent(normalizedParts)

    if (message.role === 'system' && !contentFromNormalizedParts) {
      pendingInternalParts = [...pendingInternalParts, ...normalizedParts]
      continue
    }

    const partsWithPending = pendingInternalParts.length > 0
      ? [...pendingInternalParts, ...normalizedParts]
      : normalizedParts
    pendingInternalParts = []
    const groupedParts = groupAssistantPartsForThinking(partsWithPending)
    const content = messageContent(groupedParts)

    if (message.role === 'assistant') {
      if (content || groupedParts.length > 0) {
        items.push({
          id: `${message.id}-assistant`,
          type: 'assistant_message',
          content,
          status: groupedParts.some(part => part.status === 'running') ? 'streaming' : 'completed',
          parts: groupedParts,
          timestamp,
        })
      }
      continue
    }

    if (message.role === 'system') {
      items.push({
        id: `${message.id}-system`,
        type: 'system_message',
        content,
        parts: groupedParts,
        timestamp,
      })
    }
  }

  if (pendingInternalParts.length > 0) {
    const groupedParts = groupAssistantPartsForThinking(pendingInternalParts)
    items.push({
      id: `system-${Date.now()}-internal`,
      type: 'system_message',
      content: '',
      parts: groupedParts,
      timestamp: new Date().toISOString(),
    })
  }

  return { items, activeApprovalItemId: null }
}

export function uiMessagesToTimeline(
  uiMessages: Array<Record<string, any>> | undefined,
): { items: AIChatTimelineItem[]; activeApprovalItemId: string | null } | null {
  return transcriptToTimeline(uiMessages)
}

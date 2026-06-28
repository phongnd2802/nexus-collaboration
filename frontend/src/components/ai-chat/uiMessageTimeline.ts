import type { AIChatPartItem, AIChatTimelineItem, ProjectCardPayload } from './types'
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

function approvalPart(part: Record<string, any>, index: number): AIChatPartItem | null {
  if (!part?.approval || typeof part.approval !== 'object') return null
  const approval = part.approval as Record<string, any>
  const approved = approval.approved
  return {
    id: String(part.id || approval.id || `approval-${index}`),
    type: part.type || 'approval',
    status:
      approved === true
        ? 'completed'
        : approved === false
          ? 'denied'
          : 'pending',
    label: typeof part.title === 'string' ? part.title : 'Approval',
    summary:
      approved === true
        ? 'Approved'
        : approved === false
          ? 'Rejected'
          : 'Pending approval',
    approval: {
      id: typeof approval.id === 'string' ? approval.id : `approval-${index}`,
      approved: typeof approved === 'boolean' ? approved : undefined,
      reason: typeof approval.reason === 'string' ? approval.reason : undefined,
    },
    metadata: {
      toolName: toolNameFromPart(part),
    },
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
    status: normalizeStatus(typeof part.state === 'string' ? part.state : undefined),
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
    || orchestrationPart(part, index)
    || sourceUrlPart(part, index)
    || sourceDocumentPart(part, index)
    || filePart(part, index)
    || approvalPart(part, index)
    || toolPart(part, index)
    || fallbackPart(part, index)
  )
}

function messageContent(parts: AIChatPartItem[]): string {
  return parts
    .filter(part => part.type === 'text' && typeof part.text === 'string')
    .map(part => part.text)
    .join('')
    .trim()
}

export function transcriptToTimeline(
  transcriptMessages: Array<Record<string, any>> | undefined,
): { items: AIChatTimelineItem[]; activeApprovalItemId: string | null } | null {
  if (!Array.isArray(transcriptMessages) || transcriptMessages.length === 0) return null

  const items: AIChatTimelineItem[] = []
  let activeApprovalItemId: string | null = null

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

    for (const part of normalizedParts) {
      if (part.approval && part.approval.approved === undefined && activeApprovalItemId == null) {
        activeApprovalItemId = part.approval.id
      }
    }

    const content = messageContent(normalizedParts)

    if (message.role === 'assistant') {
      if (content || normalizedParts.length > 0) {
        items.push({
          id: `${message.id}-assistant`,
          type: 'assistant_message',
          content,
          status: normalizedParts.some(part => part.status === 'running') ? 'streaming' : 'completed',
          parts: normalizedParts,
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
        parts: normalizedParts,
        timestamp,
      })
    }
  }

  return { items, activeApprovalItemId }
}

export function uiMessagesToTimeline(
  uiMessages: Array<Record<string, any>> | undefined,
): { items: AIChatTimelineItem[]; activeApprovalItemId: string | null } | null {
  return transcriptToTimeline(uiMessages)
}

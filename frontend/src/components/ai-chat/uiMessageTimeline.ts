import type { AIChatTimelineItem, ProjectCardPayload, ThinkingStep } from './types'

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

function upsertStep(steps: ThinkingStep[], nextStep: ThinkingStep) {
  const index = steps.findIndex(step => step.id === nextStep.id)
  if (index === -1) {
    steps.push(nextStep)
    return
  }

  steps[index] = {
    ...steps[index],
    ...nextStep,
    detail: {
      ...steps[index].detail,
      ...nextStep.detail,
    },
  }
}

export function uiMessagesToTimeline(
  uiMessages: Array<Record<string, any>> | undefined,
): { items: AIChatTimelineItem[]; activeApprovalItemId: string | null } | null {
  if (!Array.isArray(uiMessages) || uiMessages.length === 0) return null

  const items: AIChatTimelineItem[] = []

  for (const message of uiMessages) {
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

    if (message.role !== 'assistant') continue

    const assistantItem: Extract<AIChatTimelineItem, { type: 'assistant_message' }> = {
      id: `${message.id}-assistant`,
      type: 'assistant_message',
      content: '',
      status: 'completed',
      steps: [],
      timestamp,
    }
    const projectListItems: Extract<AIChatTimelineItem, { type: 'project_list' }>[] = []

    for (const part of parts) {
      if (part?.type === 'text' && typeof part.text === 'string') {
        assistantItem.content += part.text
        if (part.state === 'streaming') assistantItem.status = 'streaming'
        continue
      }

      if (part?.type === 'reasoning' || typeof part.reasoning === 'string') {
        upsertStep(assistantItem.steps, {
          id: `${message.id}-reasoning`,
          kind: 'reasoning',
          status: part.state === 'streaming' ? 'running' : 'completed',
          summary: part.state === 'streaming' ? 'Dang suy nghi...' : 'Da suy nghi',
          label: part.state === 'streaming' ? 'Dang suy nghi...' : 'Da suy nghi',
          detail: {
            text: typeof part.text === 'string' ? part.text : part.reasoning,
          },
        })
        continue
      }

      if (part?.type === 'data-project_list') {
        const projects = toProjectCardPayloads(part.data?.projects || part.projects)
        if (projects.length > 0) {
          projectListItems.push({
            id: `${message.id}-project-list`,
            type: 'project_list',
            title:
              (typeof part.data?.title === 'string' && part.data.title)
                || (typeof part.title === 'string' && part.title)
                || 'Projects',
            projects,
            timestamp,
          })
        }
        continue
      }

      if (part?.type === 'source-url') {
        upsertStep(assistantItem.steps, {
          id: `${message.id}-source-url-${assistantItem.steps.length}`,
          kind: 'source',
          status: 'completed',
          summary: 'Source attached',
          label: typeof part.title === 'string' ? part.title : typeof part.url === 'string' ? part.url : 'Source',
          detail: {
            metadata: {
              url: part.url,
              title: part.title,
            },
          },
        })
        continue
      }

      if (part?.type === 'source-document') {
        upsertStep(assistantItem.steps, {
          id: `${message.id}-source-document-${assistantItem.steps.length}`,
          kind: 'source',
          status: 'completed',
          summary: 'Document attached',
          label: typeof part.title === 'string' ? part.title : 'Document',
          detail: {
            metadata: {
              title: part.title,
              mediaType: part.mediaType,
            },
          },
        })
        continue
      }

      if (part?.type === 'file') {
        upsertStep(assistantItem.steps, {
          id: `${message.id}-file-${assistantItem.steps.length}`,
          kind: 'file',
          status: 'completed',
          summary: 'File attached',
          label: typeof part.filename === 'string' ? part.filename : 'File',
          detail: {
            metadata: {
              filename: part.filename,
              mediaType: part.mediaType,
            },
          },
        })
        continue
      }

      if (typeof part?.type === 'string' && part.type.startsWith('tool-')) {
        const toolName = toolNameFromPart(part)
        const toolCallId = typeof part.toolCallId === 'string' ? part.toolCallId : part.tool_call_id
        if (!toolCallId) continue

        const status =
          part.state === 'output-error'
            ? 'error'
            : part.state === 'output-denied'
              ? 'denied'
              : part.state === 'output-available'
                ? 'completed'
                : 'running'

        upsertStep(assistantItem.steps, {
          id: toolCallId,
          kind: part.state === 'output-available' || part.state === 'output-error' || part.state === 'output-denied'
            ? 'tool_output'
            : 'tool_input',
          status,
          summary:
            status === 'running'
              ? 'Dang goi cong cu...'
              : status === 'error'
                ? `${toolName || 'Tool'} failed`
                : status === 'denied'
                  ? `${toolName || 'Tool'} denied`
                  : `${toolName || 'Tool'} completed`,
          label:
            status === 'running'
              ? `Calling ${toolName || 'tool'}`
              : status === 'error'
                ? `${toolName || 'Tool'} failed`
                : status === 'denied'
                  ? `${toolName || 'Tool'} denied`
                  : `${toolName || 'Tool'} completed`,
          toolName,
          detail: {
            text:
              typeof part.errorText === 'string'
                ? part.errorText
                : typeof part.error_text === 'string'
                  ? part.error_text
                  : status === 'completed'
                    ? 'Tool result received'
                    : 'Tool execution in progress',
            input: part.input,
            output: part.output,
            error:
              typeof part.errorText === 'string'
                ? part.errorText
                : typeof part.error_text === 'string'
                  ? part.error_text
                  : status === 'denied'
                    ? 'Tool execution denied'
                    : undefined,
          },
        })
      }
    }

    if (assistantItem.content.trim() || assistantItem.steps.length > 0) {
      items.push(assistantItem)
    }
    items.push(...projectListItems)
  }

  return { items, activeApprovalItemId: null }
}

import type { AIChatTimelineItem } from './types'

function timestampFromMetadata(value: Record<string, any> | undefined, fallback: string): string {
  return typeof value?.timestamp === 'string' ? value.timestamp : fallback
}

function toolNameFromPart(part: Record<string, any>): string | undefined {
  if (typeof part.toolName === 'string') return part.toolName
  if (typeof part.tool_name === 'string') return part.tool_name
  if (typeof part.type === 'string' && part.type.startsWith('tool-')) return part.type.slice(5)
  return undefined
}

function upsertItem(items: AIChatTimelineItem[], nextItem: AIChatTimelineItem) {
  const index = items.findIndex(item => item.id === nextItem.id)
  if (index === -1) {
    items.push(nextItem)
    return
  }
  items[index] = nextItem
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

    for (const part of parts) {
      if (part?.type === 'text' && typeof part.text === 'string' && part.text.trim()) {
        items.push({
          id: `${message.id}-text`,
          type: 'assistant_message',
          content: part.text,
          status: part.state === 'streaming' ? 'streaming' : 'completed',
          timestamp,
        })
        continue
      }

      if (typeof part?.type === 'string' && part.type.startsWith('tool-')) {
        const toolName = toolNameFromPart(part)
        const toolCallId = typeof part.toolCallId === 'string' ? part.toolCallId : part.tool_call_id
        if (!toolCallId) continue

        upsertItem(items, {
          id: `tool-call-${toolCallId}`,
          type: 'tool_call',
          toolName,
          input: part.input,
          status: part.state === 'input-streaming' ? 'running' : 'completed',
          timestamp,
        })

        if (part.state === 'output-available') {
          upsertItem(items, {
            id: `tool-result-${toolCallId}`,
            type: 'tool_result',
            toolName,
            result: part.output,
            outcome: 'success',
            status: 'completed',
            timestamp,
          })
        } else if (part.state === 'output-error') {
          upsertItem(items, {
            id: `tool-result-${toolCallId}`,
            type: 'tool_result',
            toolName,
            result: { error: part.errorText || part.error_text },
            outcome: 'error',
            status: 'error',
            timestamp,
          })
        } else if (part.state === 'output-denied') {
          upsertItem(items, {
            id: `tool-result-${toolCallId}`,
            type: 'tool_result',
            toolName,
            outcome: 'denied',
            status: 'error',
            timestamp,
          })
        }
      }
    }
  }

  return { items, activeApprovalItemId: null }
}

import type { ApprovalRequiredEvent, ProjectCardPayload } from '@/lib/api/ai-chat-api'

export interface ThinkingStep {
  id: string
  title: string
  description?: string
  status: 'pending' | 'running' | 'completed' | 'error'
  tool?: string
  eventType?: 'tool_call' | 'tool_result' | 'approval_required'
  input?: Record<string, any>
  result?: Record<string, any>
  outcome?: string
}

interface TimelineItemBase {
  id: string
  timestamp: string
}

export interface UserMessageItem extends TimelineItemBase {
  type: 'user_message'
  content: string
}

export interface AssistantMessageItem extends TimelineItemBase {
  type: 'assistant_message'
  content: string
  status: 'streaming' | 'completed' | 'error' | 'stopped'
}

export interface AssistantProjectListItem extends TimelineItemBase {
  type: 'assistant_project_list'
  title: string
  projects: ProjectCardPayload[]
}

export interface ToolCallItem extends TimelineItemBase {
  type: 'tool_call'
  toolName?: string
  input?: Record<string, any>
  status: 'running' | 'completed' | 'error'
}

export interface ToolResultItem extends TimelineItemBase {
  type: 'tool_result'
  toolName?: string
  result?: Record<string, any>
  outcome?: string
  status: 'completed' | 'error'
}

export interface ApprovalRequiredItem extends TimelineItemBase {
  type: 'approval_required'
  approval: ApprovalRequiredEvent
  status: 'pending' | 'approved' | 'denied'
  submittedFormData?: Record<string, any>
}

export interface SystemEventItem extends TimelineItemBase {
  type: 'system_event'
  title: string
  description?: string
  status: 'info' | 'error'
}

export type AIChatTimelineItem =
  | UserMessageItem
  | AssistantMessageItem
  | AssistantProjectListItem
  | ToolCallItem
  | ToolResultItem
  | ApprovalRequiredItem
  | SystemEventItem

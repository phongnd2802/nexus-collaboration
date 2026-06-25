export interface StepDetail {
  text?: string
  input?: Record<string, any>
  output?: Record<string, any>
  error?: string
  metadata?: Record<string, any>
}

export interface ThinkingStep {
  id: string
  kind: 'reasoning' | 'tool_input' | 'tool_output' | 'source' | 'file' | 'system'
  status: 'pending' | 'running' | 'completed' | 'error' | 'denied' | 'skipped'
  summary: string
  label?: string
  toolName?: string
  detail?: StepDetail
  startedAt?: string
  endedAt?: string
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
  steps: ThinkingStep[]
}

export interface ProjectListItem extends TimelineItemBase {
  type: 'project_list'
  title: string
  projects: ProjectCardPayload[]
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
  | ProjectListItem
  | SystemEventItem

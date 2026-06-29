export interface StepDetail {
  text?: string
  input?: Record<string, any>
  output?: Record<string, any>
  error?: string
  metadata?: Record<string, any>
}

export interface ThinkingStep {
  id: string
  kind: 'reasoning' | 'orchestration' | 'tool_input' | 'tool_output' | 'source' | 'file' | 'system'
  status: 'pending' | 'running' | 'completed' | 'error' | 'denied' | 'skipped'
  summary: string
  label?: string
  toolName?: string
  detail?: StepDetail
  startedAt?: string
  endedAt?: string
}

export interface AIChatApprovalState {
  id: string
  approved?: boolean
  reason?: string
}

export interface AIChatPartItem {
  id: string
  type: string
  status: 'pending' | 'running' | 'completed' | 'error' | 'denied' | 'skipped'
  label: string
  summary?: string
  text?: string
  toolName?: string
  startedAt?: string
  endedAt?: string
  input?: Record<string, any>
  output?: Record<string, any>
  error?: string
  metadata?: Record<string, any>
  projects?: ProjectCardPayload[]
  references?: WorkspaceReferencePayload[]
  actions?: WorkspaceActionPayload[]
  children?: AIChatPartItem[]
  approval?: AIChatApprovalState
  raw?: Record<string, any>
}

export interface WorkspaceReferencePayload {
  sourceType?: string
  entityType?: string
  entityId?: string
  title?: string
  href?: string
  snippet?: string
  citation?: string
  score?: number
}

export interface WorkspaceActionPayload {
  toolName?: string
  action?: string
  status?: string
  entityType?: string
  entityId?: string
  title?: string
  href?: string
  message?: string
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
  parts: AIChatPartItem[]
}

export interface SystemMessageItem extends TimelineItemBase {
  type: 'system_message'
  content: string
  parts: AIChatPartItem[]
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
  | SystemMessageItem
  | ProjectListItem
  | SystemEventItem

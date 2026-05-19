import { ProjectType } from '@/types/projects'

export type ApiProjectType = 'kanban' | 'scrum' | 'bug_tracking' | 'feature' | 'research'
export type ProjectViewName = 'board' | 'list' | 'timeline' | 'gantt' | 'team' | 'budgets'

export interface ProjectStagePreset {
  id: string
  name: string
  order: number
  color: string
}

export interface ProjectTypePreset {
  defaultView: ProjectViewName
  enabledViews: ProjectViewName[]
  completionStageId: string
  stages: ProjectStagePreset[]
}

const STAGE_COLORS = {
  blue: '#3B82F6',
  yellow: '#EAB308',
  purple: '#A855F7',
  green: '#22C55E',
  red: '#EF4444',
  orange: '#F97316',
} as const

export const PROJECT_TYPE_PRESETS: Record<ApiProjectType, ProjectTypePreset> = {
  kanban: {
    defaultView: 'board',
    enabledViews: ['board', 'list', 'timeline', 'gantt', 'team', 'budgets'],
    completionStageId: 'done',
    stages: [
      { id: 'todo', name: 'To Do', order: 0, color: STAGE_COLORS.blue },
      { id: 'in_progress', name: 'In Progress', order: 1, color: STAGE_COLORS.yellow },
      { id: 'review', name: 'Review', order: 2, color: STAGE_COLORS.purple },
      { id: 'done', name: 'Done', order: 3, color: STAGE_COLORS.green },
    ],
  },
  scrum: {
    defaultView: 'board',
    enabledViews: ['board', 'list', 'timeline', 'team', 'budgets'],
    completionStageId: 'done',
    stages: [
      { id: 'backlog', name: 'Backlog', order: 0, color: STAGE_COLORS.blue },
      { id: 'sprint_todo', name: 'Sprint To Do', order: 1, color: STAGE_COLORS.yellow },
      { id: 'in_progress', name: 'In Progress', order: 2, color: STAGE_COLORS.orange },
      { id: 'done', name: 'Done', order: 3, color: STAGE_COLORS.green },
    ],
  },
  bug_tracking: {
    defaultView: 'list',
    enabledViews: ['board', 'list', 'timeline', 'team', 'budgets'],
    completionStageId: 'closed',
    stages: [
      { id: 'new', name: 'New', order: 0, color: STAGE_COLORS.blue },
      { id: 'triaged', name: 'Triaged', order: 1, color: STAGE_COLORS.purple },
      { id: 'in_fix', name: 'In Fix', order: 2, color: STAGE_COLORS.orange },
      { id: 'in_test', name: 'In Test', order: 3, color: STAGE_COLORS.yellow },
      { id: 'closed', name: 'Closed', order: 4, color: STAGE_COLORS.green },
    ],
  },
  feature: {
    defaultView: 'timeline',
    enabledViews: ['board', 'list', 'timeline', 'gantt', 'team', 'budgets'],
    completionStageId: 'released',
    stages: [
      { id: 'idea', name: 'Idea', order: 0, color: STAGE_COLORS.blue },
      { id: 'planned', name: 'Planned', order: 1, color: STAGE_COLORS.purple },
      { id: 'building', name: 'Building', order: 2, color: STAGE_COLORS.orange },
      { id: 'released', name: 'Released', order: 3, color: STAGE_COLORS.green },
    ],
  },
  research: {
    defaultView: 'list',
    enabledViews: ['list', 'timeline', 'board', 'team'],
    completionStageId: 'published',
    stages: [
      { id: 'question', name: 'Question', order: 0, color: STAGE_COLORS.blue },
      { id: 'collecting', name: 'Collecting', order: 1, color: STAGE_COLORS.yellow },
      { id: 'analyzing', name: 'Analyzing', order: 2, color: STAGE_COLORS.purple },
      { id: 'published', name: 'Published', order: 3, color: STAGE_COLORS.green },
    ],
  },
}

const UI_TO_API_PROJECT_TYPE: Record<ProjectType, ApiProjectType> = {
  [ProjectType.KANBAN]: 'kanban',
  [ProjectType.SCRUM]: 'scrum',
  [ProjectType.BUG_TRACKING]: 'bug_tracking',
  [ProjectType.FEATURE_DEVELOPMENT]: 'feature',
  [ProjectType.RESEARCH]: 'research',
}

export function mapUiProjectTypeToApi(type?: ProjectType | ''): ApiProjectType {
  if (!type) return 'kanban'
  return UI_TO_API_PROJECT_TYPE[type] ?? 'kanban'
}

export function mapApiProjectTypeToUi(type?: string): ProjectType {
  switch (type) {
    case 'kanban':
      return ProjectType.KANBAN
    case 'scrum':
      return ProjectType.SCRUM
    case 'bug_tracking':
      return ProjectType.BUG_TRACKING
    case 'feature':
    case 'feature_development':
      return ProjectType.FEATURE_DEVELOPMENT
    case 'research':
      return ProjectType.RESEARCH
    default:
      return ProjectType.KANBAN
  }
}

export function resolveApiProjectType(type?: string): ApiProjectType {
  if (type === 'scrum' || type === 'bug_tracking' || type === 'feature' || type === 'research') {
    return type
  }
  return 'kanban'
}

export function getProjectTypePreset(type?: string): ProjectTypePreset {
  const resolved = resolveApiProjectType(type)
  return PROJECT_TYPE_PRESETS[resolved]
}

export function getDefaultKanbanStagesForType(type?: string): ProjectStagePreset[] {
  return getProjectTypePreset(type).stages
}

export function canTransitionStatus(type: string | undefined, from: string, to: string): boolean {
  const resolved = resolveApiProjectType(type)
  if (resolved === 'bug_tracking' && from === 'new' && to === 'closed') {
    return false
  }
  return true
}

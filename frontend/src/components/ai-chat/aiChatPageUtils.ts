export const MODELS_KEY = 'nexus_ai_chat_model'
export const EXECUTE_ACTIONS_KEY = 'nexus_ai_chat_execute_actions'
export const CREATE_PROJECT_APPROVAL_INTRO =
  'The project creation approval form has been triggered. Please complete the form in the UI to finalize the creation of the project.'
export const UPDATE_PROJECT_APPROVAL_INTRO =
  'The project update approval form has been triggered. Please complete the form in the UI to finalize the update of the project.'

const TOOL_APPROVAL_INTROS: Record<string, string> = {
  create_project: CREATE_PROJECT_APPROVAL_INTRO,
  update_project: UPDATE_PROJECT_APPROVAL_INTRO,
}

const TOOL_APPROVAL_BYPASS_PATTERNS: Record<string, RegExp[]> = {
  create_project: [
    /^\.?\s*the project creation approval form has been triggered\.?\s*/i,
    /^\.?\s*please complete the form in the ui to finalize the creation of the project\.?\s*/i,
    /^\.?\s*please fill in the necessary details to finalize the project creation\.?\s*/i,
    /^\.?\s*if you need assistance with any specific fields, let me know!?\s*/i,
  ],
  update_project: [
    /^\.?\s*the project update approval form has been triggered\.?\s*/i,
    /^\.?\s*please complete the form in the ui to finalize the update of the project\.?\s*/i,
    /^\.?\s*please fill in the necessary details to finalize the project update\.?\s*/i,
    /^\.?\s*if you need assistance with any specific fields, let me know!?\s*/i,
  ],
}

export function normalizeApprovalText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

export function getApprovalIntro(toolName?: string) {
  return toolName ? TOOL_APPROVAL_INTROS[toolName] : undefined
}

export function isToolApprovalBoilerplate(value: string, toolName?: string) {
  if (!toolName) return false
  const normalized = normalizeApprovalText(value)
  if (!normalized) return false

  if (toolName === 'create_project') {
    return (
      normalized.includes('project creation approval form has been triggered') ||
      normalized.includes('complete the form in the ui to finalize the creation of the project') ||
      normalized.includes('triggered the project creation') ||
      normalized.includes('finalize the creation of the project')
    )
  }

  if (toolName === 'update_project') {
    return (
      normalized.includes('project update approval form has been triggered') ||
      normalized.includes('complete the form in the ui to finalize the update of the project') ||
      normalized.includes('triggered the project update') ||
      normalized.includes('finalize the update of the project')
    )
  }

  return false
}

export function isPotentialToolApprovalBoilerplate(value: string, toolName?: string) {
  if (!toolName) return false
  const normalized = normalizeApprovalText(value)
  if (!normalized) return true

  const intro = getApprovalIntro(toolName)
  const targets = [
    intro,
    toolName === 'create_project'
      ? 'Please complete the form in the UI to finalize the creation of the project.'
      : 'Please complete the form in the UI to finalize the update of the project.',
    toolName === 'create_project'
      ? 'Please fill in the necessary details to finalize the project creation.'
      : 'Please fill in the necessary details to finalize the project update.',
    'If you need assistance with any specific fields, let me know!',
  ]
    .filter((target): target is string => Boolean(target))
    .map(normalizeApprovalText)

  const candidate = normalized.replace(/^\.\s*/, '')
  return targets.some(target => target.startsWith(candidate)) || isToolApprovalBoilerplate(value, toolName)
}

export function stripToolApprovalBoilerplate(value: string, toolName?: string) {
  if (!toolName) return value.trim()
  let next = value.trim()
  if (!next) return ''

  const leadingBoilerplatePatterns = TOOL_APPROVAL_BYPASS_PATTERNS[toolName] || []

  let changed = true
  while (changed && next) {
    changed = false
    for (const pattern of leadingBoilerplatePatterns) {
      const stripped = next.replace(pattern, '').trim()
      if (stripped !== next) {
        next = stripped
        changed = true
      }
    }
  }

  return isToolApprovalBoilerplate(next, toolName) ? '' : next
}

export function createTimestamp() {
  return new Date().toISOString()
}

export function buildAIChatTitle(value?: string) {
  const trimmed = value?.trim() || ''
  return trimmed ? trimmed.slice(0, 48) : 'New conversation'
}

export function buildAIChatPath(workspaceId: string, sessionId?: string) {
  return sessionId
    ? `/workspaces/${workspaceId}/ai-chat/${sessionId}`
    : `/workspaces/${workspaceId}/ai-chat`
}

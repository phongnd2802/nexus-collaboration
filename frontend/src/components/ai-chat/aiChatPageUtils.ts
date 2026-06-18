import type { AIChatTimelineItem } from './types'

export const MODELS_KEY = 'nexus_ai_chat_model'
export const EXECUTE_ACTIONS_KEY = 'nexus_ai_chat_execute_actions'
export const CREATE_PROJECT_APPROVAL_INTRO =
  'The project creation approval form has been triggered. Please complete the form in the UI to finalize the creation of the project.'

export function normalizeApprovalText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

export function isCreateProjectApprovalBoilerplate(value: string) {
  const normalized = normalizeApprovalText(value)
  if (!normalized) return false

  return (
    normalized.includes('project creation approval form has been triggered') ||
    normalized.includes('complete the form in the ui to finalize the creation of the project') ||
    normalized.includes('triggered the project creation') ||
    normalized.includes('finalize the creation of the project')
  )
}

export function isPotentialCreateProjectApprovalBoilerplate(value: string) {
  const normalized = normalizeApprovalText(value)
  if (!normalized) return true

  const targets = [
    CREATE_PROJECT_APPROVAL_INTRO,
    'Please complete the form in the UI to finalize the creation of the project.',
    'Please fill in the necessary details to finalize the project creation.',
    'If you need assistance with any specific fields, let me know!',
  ].map(normalizeApprovalText)

  const candidate = normalized.replace(/^\.\s*/, '')
  return targets.some(target => target.startsWith(candidate)) || isCreateProjectApprovalBoilerplate(value)
}

export function stripCreateProjectApprovalBoilerplate(value: string) {
  let next = value.trim()
  if (!next) return ''

  const leadingBoilerplatePatterns = [
    /^\.?\s*the project creation approval form has been triggered\.?\s*/i,
    /^\.?\s*please complete the form in the ui to finalize the creation of the project\.?\s*/i,
    /^\.?\s*please fill in the necessary details to finalize the project creation\.?\s*/i,
    /^\.?\s*if you need assistance with any specific fields, let me know!?\s*/i,
  ]

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

  return isCreateProjectApprovalBoilerplate(next) ? '' : next
}

export function toRequestMessages(items: AIChatTimelineItem[]) {
  return items
    .filter(
      (item): item is Extract<AIChatTimelineItem, { type: 'user_message' | 'assistant_message' }> =>
        item.type === 'user_message' || item.type === 'assistant_message',
    )
    .filter(item => item.content.trim().length > 0)
    .map(item => ({
      role: item.type === 'user_message' ? 'user' : 'assistant',
      content: item.content,
    }))
}

export function createTimestamp() {
  return new Date().toISOString()
}

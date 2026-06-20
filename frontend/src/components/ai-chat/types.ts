import type { ApprovalRequiredEvent } from '@/lib/api/ai-chat-api'

export interface ApprovalRequiredView {
  id: string
  approval: ApprovalRequiredEvent
  status: 'pending' | 'approved' | 'denied'
  part: Record<string, any>
}

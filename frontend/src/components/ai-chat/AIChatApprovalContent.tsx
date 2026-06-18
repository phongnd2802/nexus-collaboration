import React from 'react'

import type { WorkspaceMember } from '@/types'

import { AIChatProjectApprovalForm } from './AIChatProjectApprovalForm'
import type { ApprovalRequiredItem } from './types'

interface AIChatApprovalContentProps {
  item: ApprovalRequiredItem
  isActive: boolean
  isSubmitting: boolean
  members: WorkspaceMember[]
  currentUserId?: string
  onApprove: (formData?: Record<string, any>) => Promise<void> | void
  onDeny: () => Promise<void> | void
}

export function AIChatApprovalContent({
  item,
  isActive,
  isSubmitting,
  members,
  currentUserId,
  onApprove,
  onDeny,
}: AIChatApprovalContentProps) {
  if (!isActive || item.status !== 'pending') return null

  if (item.approval.approvalKind === 'project_create_form') {
    return (
      <div className="mt-3">
        <AIChatProjectApprovalForm
          approval={item.approval}
          members={members}
          currentUserId={currentUserId}
          isSubmitting={isSubmitting}
          onApprove={async formData => onApprove(formData)}
          onDeny={async () => onDeny()}
        />
      </div>
    )
  }

  return (
    <div className="mt-3">
      <pre className="max-h-40 overflow-auto rounded-xl bg-white/80 p-3 text-xs text-[#3D3D3A]">
        {JSON.stringify(item.approval.args, null, 2)}
      </pre>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => onApprove()}
          className="rounded-full bg-[#D97757] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#C86443]"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => onDeny()}
          className="rounded-full border border-[#D6D3CE] px-3 py-1.5 text-xs font-semibold text-[#3D3D3A] hover:bg-white"
        >
          Deny
        </button>
      </div>
    </div>
  )
}

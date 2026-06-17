import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'

import type { ApprovalRequiredEvent } from '@/lib/api/ai-chat-api'
import type { WorkspaceMember } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ProjectStageFormValue {
  id: string
  name: string
  order: number
  color: string
}

interface ProjectApprovalFormData {
  name: string
  description?: string
  lead_id: string
  kanban_stages: ProjectStageFormValue[]
  collaborative_data: {
    default_assignee_ids: string[]
  }
}

interface AIChatProjectApprovalFormProps {
  approval: ApprovalRequiredEvent
  members: WorkspaceMember[]
  currentUserId?: string
  isSubmitting: boolean
  onApprove: (formData: ProjectApprovalFormData) => Promise<void> | void
  onDeny: () => Promise<void> | void
}

const DEFAULT_STAGES: ProjectStageFormValue[] = [
  { id: 'todo', name: 'To Do', order: 1, color: '#3B82F6' },
  { id: 'progress', name: 'Progress', order: 2, color: '#F59E0B' },
  { id: 'done', name: 'Done', order: 3, color: '#10B981' },
]

function normalizeStages(rawStages: unknown): ProjectStageFormValue[] {
  if (!Array.isArray(rawStages) || rawStages.length === 0) return DEFAULT_STAGES

  return rawStages.map((stage, index) => {
    const value = (stage || {}) as Record<string, unknown>
    return {
      id: typeof value.id === 'string' && value.id.trim() ? value.id : `stage_${index + 1}`,
      name: typeof value.name === 'string' && value.name.trim() ? value.name : `Stage ${index + 1}`,
      order: typeof value.order === 'number' ? value.order : index + 1,
      color: typeof value.color === 'string' && value.color.trim() ? value.color : '#3B82F6',
    }
  })
}

export function AIChatProjectApprovalForm({
  approval,
  members,
  currentUserId,
  isSubmitting,
  onApprove,
  onDeny,
}: AIChatProjectApprovalFormProps) {
  const initialValues = useMemo(
    () => (approval.initialValues || approval.args || {}) as Record<string, any>,
    [approval.initialValues, approval.args],
  )

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [leadId, setLeadId] = useState('')
  const [stages, setStages] = useState<ProjectStageFormValue[]>(DEFAULT_STAGES)
  const [defaultAssigneeIds, setDefaultAssigneeIds] = useState<string[]>([])

  useEffect(() => {
    setName(typeof initialValues.name === 'string' ? initialValues.name : '')
    setDescription(typeof initialValues.description === 'string' ? initialValues.description : '')
    setLeadId(
      typeof initialValues.lead_id === 'string' && initialValues.lead_id.trim()
        ? initialValues.lead_id
        : currentUserId || '',
    )
    setStages(normalizeStages(initialValues.kanban_stages))
    setDefaultAssigneeIds(
      Array.isArray(initialValues?.collaborative_data?.default_assignee_ids)
        ? initialValues.collaborative_data.default_assignee_ids.filter((value: unknown): value is string => typeof value === 'string')
        : [],
    )
  }, [approval.toolCallId, currentUserId, initialValues])

  const visibleMembers = useMemo(
    () =>
      members.map(member => ({
        id: member.user_id,
        label: member.user?.name || member.name || member.user?.email || member.email || member.user_id,
        secondary: member.user?.email || member.email || member.role,
      })),
    [members],
  )

  const canSubmit = name.trim().length > 0 && leadId.trim().length > 0 && stages.every(stage => stage.id.trim() && stage.name.trim())

  const updateStage = (index: number, field: keyof ProjectStageFormValue, value: string | number) => {
    setStages(prev =>
      prev.map((stage, stageIndex) => (stageIndex === index ? { ...stage, [field]: value } : stage)),
    )
  }

  const addStage = () => {
    setStages(prev => [
      ...prev,
      {
        id: `stage_${prev.length + 1}`,
        name: '',
        order: prev.length + 1,
        color: '#3B82F6',
      },
    ])
  }

  const removeStage = (index: number) => {
    setStages(prev =>
      prev.filter((_, stageIndex) => stageIndex !== index).map((stage, stageIndex) => ({
        ...stage,
        order: stageIndex + 1,
      })),
    )
  }

  const toggleAssignee = (userId: string) => {
    setDefaultAssigneeIds(prev =>
      prev.includes(userId) ? prev.filter(value => value !== userId) : [...prev, userId],
    )
  }

  const handleApprove = async () => {
    if (!canSubmit) return

    await onApprove({
      name: name.trim(),
      description: description.trim() || undefined,
      lead_id: leadId,
      kanban_stages: stages.map((stage, index) => ({
        ...stage,
        id: stage.id.trim(),
        name: stage.name.trim(),
        order: index + 1,
      })),
      collaborative_data: {
        default_assignee_ids: defaultAssigneeIds,
      },
    })
  }

  return (
    <div className="overflow-hidden rounded-[12px] border border-[rgba(31,30,29,0.15)] bg-white shadow-[rgba(0,0,0,0.04)_0px_4px_20px_0px]">
      <div className="border-b border-[rgba(31,30,29,0.1)] bg-[#FAF9F5] px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-serif text-[20px] font-normal leading-[28px] tracking-[-0.2px] text-[#1F1E1D]">
              {approval.summary || 'Complete project details and confirm creation'}
            </div>
            <div className="mt-1 text-[13px] leading-5 text-[#73726C]">
              Review the fields below, then confirm to create the project.
            </div>
          </div>
          <div className="rounded-full border border-[rgba(31,30,29,0.15)] bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[#3D3D3A]">
            Approval
          </div>
        </div>
      </div>

      <div className="space-y-6 px-4 py-4 sm:px-5 sm:py-5">
        <div className="space-y-2">
          <Label htmlFor="ai-project-name">Project name</Label>
          <Input
            id="ai-project-name"
            value={name}
            onChange={event => setName(event.target.value)}
            placeholder="Enter project name"
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-project-description">Description</Label>
          <Textarea
            id="ai-project-description"
            value={description}
            onChange={event => setDescription(event.target.value)}
            placeholder="Optional description"
            rows={3}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ai-project-lead">Project lead</Label>
          <select
            id="ai-project-lead"
            value={leadId}
            onChange={event => setLeadId(event.target.value)}
            disabled={isSubmitting || visibleMembers.length === 0}
            className="flex h-11 w-full rounded-[9.6px] border border-[rgba(31,30,29,0.15)] bg-white px-4 py-2.5 text-[15px] leading-[22.5px] text-[#141413] outline-none transition-colors placeholder:text-[rgba(61,61,58,0.6)] hover:border-[rgba(31,30,29,0.3)] focus:border-[#1F1E1D] focus:shadow-[0_0_0_3px_rgba(31,30,29,0.1)] disabled:cursor-not-allowed disabled:bg-[#FAF9F5] disabled:text-[#73726C]"
          >
            <option value="" disabled>
              Select project lead
            </option>
            {visibleMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Label>Stages</Label>
              <div className="mt-1 text-[12px] leading-4 text-[#73726C]">
                Define the Kanban flow for this project.
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={addStage} disabled={isSubmitting}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add stage
            </Button>
          </div>
          <div className="space-y-2">
            {stages.map((stage, index) => (
              <div key={`${stage.id}-${index}`} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_120px_44px]">
                <Input
                  value={stage.id}
                  onChange={event => updateStage(index, 'id', event.target.value)}
                  placeholder="id"
                  disabled={isSubmitting}
                />
                <Input
                  value={stage.name}
                  onChange={event => updateStage(index, 'name', event.target.value)}
                  placeholder="Stage name"
                  disabled={isSubmitting}
                />
                <Input
                  type="color"
                  value={stage.color}
                  onChange={event => updateStage(index, 'color', event.target.value)}
                  className="h-11 p-1"
                  disabled={isSubmitting}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => removeStage(index)}
                  disabled={isSubmitting || stages.length <= 1}
                  className="h-11 w-11"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Default assignees</Label>
          <div className="max-h-48 space-y-2 overflow-auto rounded-[12px] border border-[rgba(31,30,29,0.15)] bg-[#FAF9F5] p-3">
            {visibleMembers.length === 0 ? (
              <div className="text-[13px] leading-5 text-[#73726C]">No workspace members available.</div>
            ) : (
              visibleMembers.map(member => (
                <label
                  key={member.id}
                  className="flex cursor-pointer items-start gap-3 rounded-[8px] px-2 py-2 transition-colors hover:bg-white"
                >
                  <input
                    type="checkbox"
                    checked={defaultAssigneeIds.includes(member.id)}
                    onChange={() => toggleAssignee(member.id)}
                    disabled={isSubmitting}
                    className="mt-1 h-5 w-5 rounded border-[2px] border-[rgba(31,30,29,0.3)] bg-white accent-[#1F1E1D] focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="min-w-0">
                    <span className="block text-[15px] font-normal leading-[22.5px] text-[#1F1E1D]">{member.label}</span>
                    <span className="block text-[12px] leading-4 text-[#73726C]">{member.secondary}</span>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-[rgba(31,30,29,0.1)] bg-[#FAF9F5] px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
        <Button type="button" onClick={handleApprove} disabled={isSubmitting || !canSubmit}>
          Create project
        </Button>
        <Button type="button" variant="outline" onClick={onDeny} disabled={isSubmitting}>
          Deny
        </Button>
      </div>
    </div>
  )
}

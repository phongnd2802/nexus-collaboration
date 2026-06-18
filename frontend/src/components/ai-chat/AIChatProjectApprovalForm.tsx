import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, GripVertical, Plus, Trash2 } from 'lucide-react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import type { ApprovalRequiredEvent } from '@/lib/api/ai-chat-api'
import type { WorkspaceMember } from '@/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'

interface ProjectStageFormValue {
  uid: string
  id: string
  name: string
  order: number
  color: string
}

interface ProjectApprovalFormData {
  name: string
  description?: string
  lead_id: string
  kanban_stages: Array<Omit<ProjectStageFormValue, 'uid'>>
  collaborative_data: {
    default_assignee_ids: string[]
  }
}

interface VisibleMember {
  id: string
  label: string
  secondary: string
  avatar?: string
}

interface SortableStageRowProps {
  id: string
  stage: ProjectStageFormValue
  index: number
  isSubmitting: boolean
  canRemove: boolean
  onChange: (index: number, field: keyof ProjectStageFormValue, value: string | number) => void
  onRemove: (index: number) => void
}

function SortableStageRow({
  id,
  stage,
  index,
  isSubmitting,
  canRemove,
  onChange,
  onRemove,
}: SortableStageRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.7 : 1,
      }}
      className="rounded-[12px] border border-[rgba(31,30,29,0.12)] bg-white p-3 shadow-[rgba(0,0,0,0.02)_0px_1px_2px_0px]"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.08em] text-[#73726C]">
          <button
            type="button"
            disabled={isSubmitting}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[rgba(31,30,29,0.12)] bg-[#FAF9F5] text-[#73726C] transition-colors hover:bg-white hover:text-[#1F1E1D] disabled:cursor-not-allowed disabled:opacity-50"
            {...attributes}
            {...listeners}
            aria-label="Reorder stage"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span>Stage {index + 1}</span>
        </div>

        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => onRemove(index)}
          disabled={isSubmitting || !canRemove}
          className="h-9 w-9 rounded-xl border-[rgba(31,30,29,0.18)] text-[#73726C] hover:text-[#E01E5A]"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_120px]">
        <Input
          value={stage.id}
          onChange={event => onChange(index, 'id', event.target.value)}
          placeholder="id"
          disabled={isSubmitting}
        />
        <Input
          value={stage.name}
          onChange={event => onChange(index, 'name', event.target.value)}
          placeholder="Stage name"
          disabled={isSubmitting}
        />
        <Input
          type="color"
          value={stage.color}
          onChange={event => onChange(index, 'color', event.target.value)}
          className="h-11 p-1"
          disabled={isSubmitting}
        />
      </div>
    </div>
  )
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
  { uid: 'stage_todo', id: 'todo', name: 'To Do', order: 1, color: '#3B82F6' },
  { uid: 'stage_progress', id: 'progress', name: 'Progress', order: 2, color: '#F59E0B' },
  { uid: 'stage_done', id: 'done', name: 'Done', order: 3, color: '#10B981' },
]

function normalizeStages(rawStages: unknown): ProjectStageFormValue[] {
  if (!Array.isArray(rawStages) || rawStages.length === 0) return DEFAULT_STAGES

  return rawStages.map((stage, index) => {
    const value = (stage || {}) as Record<string, unknown>
    return {
      uid: typeof value.uid === 'string' && value.uid.trim() ? value.uid : `stage_${index + 1}_${crypto.randomUUID()}`,
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
  const [leadPopoverOpen, setLeadPopoverOpen] = useState(false)

  const stageSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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
        avatar: member.user?.avatar || member.avatar_url,
      })),
    [members],
  )

  const leadMember = useMemo(
    () => visibleMembers.find(member => member.id === leadId) || null,
    [leadId, visibleMembers],
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
        uid: `stage_${prev.length + 1}_${crypto.randomUUID()}`,
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

  const handleStageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setStages(prev => {
      const oldIndex = prev.findIndex(stage => stage.uid === active.id)
      const newIndex = prev.findIndex(stage => stage.uid === over.id)
      if (oldIndex < 0 || newIndex < 0) return prev
      return arrayMove(prev, oldIndex, newIndex).map((stage, index) => ({
        ...stage,
        order: index + 1,
      }))
    })
  }

  const toggleAssignee = (userId: string) => {
    setDefaultAssigneeIds(prev =>
      prev.includes(userId) ? prev.filter(value => value !== userId) : [...prev, userId],
    )
  }

  const renderAvatar = (member: VisibleMember) => {
    const fallback = (member.label || member.id).slice(0, 2).toUpperCase()
    return (
      <Avatar className="h-9 w-9 flex-shrink-0 border border-[rgba(31,30,29,0.08)]">
        <AvatarImage src={member.avatar || undefined} alt={member.label} />
        <AvatarFallback className="bg-[#F0F0ED] text-[11px] font-medium text-[#3D3D3A]">
          {fallback}
        </AvatarFallback>
      </Avatar>
    )
  }

  const handleApprove = async () => {
    if (!canSubmit) return

    await onApprove({
      name: name.trim(),
      description: description.trim() || undefined,
      lead_id: leadId,
      kanban_stages: stages.map((stage, index) => ({
        id: stage.id.trim(),
        name: stage.name.trim(),
        order: index + 1,
        color: stage.color,
      })),
      collaborative_data: {
        default_assignee_ids: defaultAssigneeIds,
      },
    })
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-[#FAF9F5] px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="font-serif text-[20px] font-normal leading-[28px] tracking-[-0.2px] text-[#1F1E1D]">
              {approval.summary || 'Complete project details and confirm creation'}
            </CardTitle>
            <CardDescription className="mt-1 text-[13px] leading-5 text-[#73726C]">
              Review the fields below, then confirm to create the project.
            </CardDescription>
          </div>
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-[0.08em]">
            Approval
          </Badge>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="space-y-6 px-4 py-4 sm:px-5 sm:py-5">
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
          <Label>Project lead</Label>
          <Popover open={leadPopoverOpen} onOpenChange={setLeadPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || visibleMembers.length === 0}
                className="h-12 w-full justify-between rounded-[9.6px] border-[rgba(31,30,29,0.15)] bg-white px-4 text-left font-normal hover:border-[rgba(31,30,29,0.3)]"
              >
                {leadMember ? (
                  <span className="flex min-w-0 items-center gap-3">
                    {renderAvatar(leadMember)}
                    <span className="min-w-0 text-left">
                      <span className="block truncate text-[15px] leading-[22px] text-[#1F1E1D]">
                        {leadMember.label}
                      </span>
                      <span className="block truncate text-[12px] leading-4 text-[#73726C]">
                        {leadMember.secondary}
                      </span>
                    </span>
                  </span>
                ) : (
                  <span className="text-[15px] text-[#73726C]">Select project lead</span>
                )}
                <ChevronDown className="h-4 w-4 text-[#73726C]" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(420px,calc(100vw-2rem))] rounded-[12px] border border-[rgba(31,30,29,0.12)] p-0 shadow-[rgba(0,0,0,0.08)_0px_12px_32px_0px]" align="start">
              <ScrollArea className="max-h-72">
                <div className="p-2">
                  {visibleMembers.map(member => {
                    const isSelected = leadId === member.id
                    return (
                      <button
                      key={member.id}
                      type="button"
                      onClick={() => {
                        setLeadId(member.id)
                        setLeadPopoverOpen(false)
                      }}
                      className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors hover:bg-[#FAF9F5]"
                    >
                        {renderAvatar(member)}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] leading-5 text-[#1F1E1D]">
                            {member.label}
                          </span>
                          <span className="block truncate text-[12px] leading-4 text-[#73726C]">
                            {member.secondary}
                          </span>
                        </span>
                        {isSelected ? <Check className="h-4 w-4 text-[#1F1E1D]" /> : null}
                      </button>
                    )
                  })}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Label>Stages</Label>
              <div className="mt-1 text-[12px] leading-4 text-[#73726C]">
                Define the Kanban flow for this project.
              </div>
            </div>
            <Button type="button" size="sm" variant="secondary" onClick={addStage} disabled={isSubmitting}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add stage
            </Button>
          </div>
          <DndContext sensors={stageSensors} collisionDetection={closestCenter} onDragEnd={handleStageDragEnd}>
            <SortableContext items={stages.map(stage => stage.uid)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {stages.map((stage, index) => (
                  <SortableStageRow
                    key={stage.uid}
                    id={stage.uid}
                    stage={stage}
                    index={index}
                    isSubmitting={isSubmitting}
                    canRemove={stages.length > 1}
                    onChange={updateStage}
                    onRemove={removeStage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="space-y-2">
          <Label>Default assignees</Label>
          <div className="rounded-[12px] border border-[rgba(31,30,29,0.15)] bg-[#FAF9F5] p-2">
            {visibleMembers.length === 0 ? (
              <div className="px-2 py-2 text-[13px] leading-5 text-[#73726C]">No workspace members available.</div>
            ) : (
              <ScrollArea className="max-h-56">
                <div className="space-y-1 p-1">
                  {visibleMembers.map(member => (
                    <label
                      key={member.id}
                      className="flex cursor-pointer items-center gap-3 rounded-[10px] px-3 py-2.5 transition-colors hover:bg-white"
                    >
                      <Checkbox
                        checked={defaultAssigneeIds.includes(member.id)}
                        onCheckedChange={() => toggleAssignee(member.id)}
                        disabled={isSubmitting}
                      />
                      {renderAvatar(member)}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-normal leading-[22px] text-[#1F1E1D]">
                          {member.label}
                        </span>
                        <span className="block truncate text-[12px] leading-4 text-[#73726C]">
                          {member.secondary}
                        </span>
                      </span>
                      {defaultAssigneeIds.includes(member.id) ? (
                        <Badge variant="success" className="shrink-0 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em]">
                          Selected
                        </Badge>
                      ) : null}
                    </label>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </CardContent>

      <Separator />

      <CardFooter className="flex flex-col gap-2 bg-[#FAF9F5] px-4 py-4 sm:flex-row sm:justify-end sm:px-5">
        <Button type="button" onClick={handleApprove} disabled={isSubmitting || !canSubmit}>
          Create project
        </Button>
        <Button type="button" variant="outline" onClick={onDeny} disabled={isSubmitting}>
          Deny
        </Button>
      </CardFooter>
    </Card>
  )
}

import React, { useCallback, useState } from 'react'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronRight,
  Copy,
  Loader2,
  RefreshCw,
  ShieldCheck,
  User,
  Wrench,
  XCircle,
} from 'lucide-react'
import { useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'
import type { UIMessage } from 'ai'

import { MarkdownRenderer } from './MarkdownRenderer'
import type { ApprovalRequiredView } from './types'
import type { ProjectCardPayload } from '@/lib/api/ai-chat-api'

interface AIChatMessageProps {
  message: UIMessage
  activeApprovalItemId?: string | null
  renderApprovalContent?: (item: ApprovalRequiredView) => React.ReactNode
  onRegenerate?: () => void
}

function textFromParts(parts: UIMessage['parts']) {
  return parts
    .filter((part: any) => part?.type === 'text' && typeof part.text === 'string')
    .map((part: any) => part.text)
    .join('')
}

function toolNameFromPart(part: Record<string, any>) {
  if (typeof part.type === 'string' && part.type.startsWith('tool-')) return part.type.slice(5)
  if (typeof part.toolName === 'string') return part.toolName
  if (typeof part.tool_name === 'string') return part.tool_name
  return 'tool'
}

function providerApprovalMetadata(part: Record<string, any>): Record<string, any> {
  const providerMetadata = part.callProviderMetadata || part.call_provider_metadata
  const pydanticAI = providerMetadata?.pydantic_ai
  const details = pydanticAI?.provider_details || pydanticAI?.providerDetails
  return details && typeof details === 'object' ? details : {}
}

function approvalFromPart(part: Record<string, any>): ApprovalRequiredView | null {
  if (typeof part?.type !== 'string' || !part.type.startsWith('tool-')) return null
  const toolCallId = typeof part.toolCallId === 'string' ? part.toolCallId : part.tool_call_id
  if (!toolCallId) return null

  const details = providerApprovalMetadata(part)
  const state = typeof part.state === 'string' ? part.state : ''
  const approvalRequired = details.approval_required === true || details.approvalRequired === true
  if (!approvalRequired && state !== 'approval-requested' && state !== 'approval-responded' && state !== 'output-denied') {
    return null
  }

  const status =
    state === 'approval-responded'
      ? part.approval?.approved === false ? 'denied' : 'approved'
      : state === 'output-denied'
        ? 'denied'
        : 'pending'
  const toolName =
    typeof details.tool_name === 'string'
      ? details.tool_name
      : typeof details.toolName === 'string'
        ? details.toolName
        : toolNameFromPart(part)

  return {
    id: `approval-${toolCallId}`,
    status,
    part,
    approval: {
      sessionId: typeof details.session_id === 'string' ? details.session_id : details.sessionId || '',
      runId: typeof details.run_id === 'string' ? details.run_id : details.runId || '',
      toolCallId,
      toolName,
      args: part.input && typeof part.input === 'object' ? part.input : details.args || {},
      summary: typeof details.summary === 'string' ? details.summary : undefined,
      approvalKind:
        typeof details.approval_kind === 'string'
          ? details.approval_kind
          : typeof details.approvalKind === 'string'
            ? details.approvalKind
            : undefined,
      initialValues:
        details.initial_values && typeof details.initial_values === 'object'
          ? details.initial_values
          : details.initialValues && typeof details.initialValues === 'object'
            ? details.initialValues
            : undefined,
    },
  }
}

function JsonBlock({ value }: { value: unknown }) {
  if (value == null) return null
  return (
    <pre className="mt-2 max-h-56 overflow-auto rounded-xl bg-white/80 p-3 text-xs leading-5 text-[#3D3D3A]">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

function EventCard({
  icon,
  badge,
  title,
  description,
  tone = 'neutral',
  children,
  defaultOpen = false,
}: {
  icon: React.ReactNode
  badge?: string
  title: string
  description?: string
  tone?: 'neutral' | 'success' | 'warning' | 'error'
  children?: React.ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const tones = {
    neutral: 'border-[rgba(31,30,29,0.1)] bg-[#FAF9F5]',
    success: 'border-[rgba(16,185,129,0.18)] bg-[#F0FDF4]',
    warning: 'border-[rgba(217,119,87,0.2)] bg-[#FFF7ED]',
    error: 'border-[rgba(224,30,90,0.2)] bg-[#FFF1F2]',
  }

  return (
    <div className={`overflow-hidden rounded-2xl border ${tones[tone]}`}>
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[rgba(31,30,29,0.03)]"
      >
        <div className="mt-0.5 flex-shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="text-[13px] font-medium leading-5 text-[#1F1E1D]">{title}</div>
            {badge ? (
              <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#73726C]">
                {badge}
              </span>
            ) : null}
          </div>
          {description ? <div className="truncate text-[12px] leading-5 text-[#73726C]">{description}</div> : null}
        </div>
        <ChevronRight className={`mt-0.5 h-4 w-4 flex-shrink-0 text-[#73726C] transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open ? <div className="border-t border-[rgba(31,30,29,0.08)] px-4 py-3">{children}</div> : null}
    </div>
  )
}

function ProjectListPart({ part }: { part: Record<string, any> }) {
  const intl = useIntl()
  const navigate = useNavigate()
  const projects = Array.isArray(part.data?.items) ? part.data.items as ProjectCardPayload[] : []
  if (projects.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#73726C]">
        {typeof part.data?.title === 'string' ? part.data.title : 'Projects'}
      </div>
      <div className="grid gap-3">
        {projects.map(project => (
          <button
            key={project.id}
            type="button"
            onClick={() => navigate(project.href)}
            className="w-full rounded-[18px] border border-[rgba(31,30,29,0.12)] bg-white p-4 text-left shadow-[rgba(0,0,0,0.04)_0px_4px_20px_0px] transition-all hover:border-[rgba(31,30,29,0.22)] hover:shadow-[rgba(0,0,0,0.08)_0px_12px_28px_0px]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[16px] font-medium leading-6 text-[#1F1E1D]">{project.name}</div>
                <div className="mt-1 line-clamp-2 text-[14px] leading-6 text-[#73726C]">
                  {project.description || intl.formatMessage({ id: 'modules.aiChat.projects.noDescription', defaultMessage: 'No description provided.' })}
                </div>
              </div>
              <ChevronRight className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#73726C]" />
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ToolPart({
  part,
  activeApprovalItemId,
  renderApprovalContent,
}: {
  part: Record<string, any>
  activeApprovalItemId?: string | null
  renderApprovalContent?: (item: ApprovalRequiredView) => React.ReactNode
}) {
  const approval = approvalFromPart(part)
  if (approval) {
    const tone = approval.status === 'denied' ? 'error' : approval.status === 'approved' ? 'success' : 'warning'
    return (
      <EventCard
        icon={approval.status === 'pending'
          ? <ShieldCheck className="h-4 w-4 text-[#D97757]" />
          : approval.status === 'approved'
            ? <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
            : <XCircle className="h-4 w-4 text-[#E01E5A]" />}
        badge={approval.status === 'pending' ? 'Approval Needed' : approval.status === 'approved' ? 'Approval Submitted' : 'Approval Denied'}
        title={`Approval for ${approval.approval.toolName}`}
        description={approval.approval.summary}
        tone={tone}
        defaultOpen={approval.id === activeApprovalItemId}
      >
        {renderApprovalContent?.(approval) || <JsonBlock value={approval.approval.args} />}
      </EventCard>
    )
  }

  const toolName = toolNameFromPart(part)
  const state = typeof part.state === 'string' ? part.state : ''
  if (state === 'input-streaming' || state === 'input-available') {
    return (
      <EventCard
        icon={state === 'input-streaming' ? <Loader2 className="h-4 w-4 animate-spin text-[#D97757]" /> : <Wrench className="h-4 w-4 text-[#D97757]" />}
        badge="Tool Call"
        title={`Calling ${toolName}`}
        description={state === 'input-streaming' ? 'Tool input streaming' : 'Tool input available'}
      >
        <JsonBlock value={part.input} />
      </EventCard>
    )
  }

  const isError = state === 'output-error' || state === 'output-denied'
  return (
    <EventCard
      icon={isError ? <AlertCircle className="h-4 w-4 text-[#E01E5A]" /> : <CheckCircle2 className="h-4 w-4 text-[#10B981]" />}
      badge="Tool Result"
      title={`${toolName} completed`}
      description={isError ? 'Tool returned an error or denial' : 'Tool output available'}
      tone={isError ? 'error' : 'success'}
    >
      <JsonBlock value={state === 'output-error' ? { error: part.errorText || part.error_text } : part.output} />
    </EventCard>
  )
}

export function AIChatMessage({
  message,
  activeApprovalItemId,
  renderApprovalContent,
  onRegenerate,
}: AIChatMessageProps) {
  const [copied, setCopied] = useState(false)
  const text = textFromParts(message.parts)
  const isUser = message.role === 'user'
  const canCopy = !isUser && text.trim().length > 0

  const handleCopy = useCallback(() => {
    if (!text) return
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [text])

  if (isUser) {
    return (
      <div className="flex justify-end gap-4 px-6 py-5 animate-[fadeIn_0.3s_ease-out]">
        <div className="min-w-0 max-w-[70%]">
          <div className="rounded-2xl rounded-br-md bg-[#F0F0ED] px-5 py-3">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-[24px] text-[#1F1E1D]">{text}</p>
          </div>
        </div>
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#3D3D3A]">
          <User className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start gap-4 px-6 py-5 animate-[fadeIn_0.3s_ease-out]">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#D97757]">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>
      <div className="min-w-0 max-w-[85%] space-y-3">
        {message.parts.map((part: any, index) => {
          if (part?.type === 'text' && typeof part.text === 'string' && part.text.trim()) {
            return (
              <div key={`${message.id}-text-${index}`} className="text-[15px] leading-[24px] text-[#1F1E1D]">
                <MarkdownRenderer content={part.text} />
                {part.state === 'streaming' ? <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#D97757] align-middle" /> : null}
              </div>
            )
          }
          if (part?.type === 'data-project_list') {
            return <ProjectListPart key={part.id || `${message.id}-project-list-${index}`} part={part} />
          }
          if (typeof part?.type === 'string' && part.type.startsWith('tool-')) {
            return (
              <ToolPart
                key={`${message.id}-${part.toolCallId || part.tool_call_id || index}`}
                part={part}
                activeApprovalItemId={activeApprovalItemId}
                renderApprovalContent={renderApprovalContent}
              />
            )
          }
          return null
        })}

        {(canCopy || onRegenerate) ? (
          <div className="mt-1.5 flex items-center gap-2">
            {canCopy ? (
              <button type="button" onClick={handleCopy} className="rounded-md p-1 text-[#73726C] transition-colors hover:bg-[#F0F0ED] hover:text-[#1F1E1D]">
                {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            ) : null}
            {onRegenerate ? (
              <button type="button" onClick={onRegenerate} className="rounded-md p-1 text-[#73726C] transition-colors hover:bg-[#F0F0ED] hover:text-[#1F1E1D]">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

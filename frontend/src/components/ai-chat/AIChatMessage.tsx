import React, { useCallback, useState } from 'react'
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Copy,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  Wrench,
  XCircle,
} from 'lucide-react'
import { useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'

import { MarkdownRenderer } from './MarkdownRenderer'
import type { AIChatTimelineItem } from './types'

interface AIChatMessageProps {
  item: AIChatTimelineItem
  approvalContent?: React.ReactNode
  onRegenerate?: () => void
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
          {description ? (
            <div className="truncate text-[12px] leading-5 text-[#73726C]">{description}</div>
          ) : null}
        </div>
        <ChevronRight
          className={`mt-0.5 h-4 w-4 flex-shrink-0 text-[#73726C] transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>
      {open ? <div className="border-t border-[rgba(31,30,29,0.08)] px-4 py-3">{children}</div> : null}
    </div>
  )
}

export function AIChatMessage({ item, approvalContent, onRegenerate }: AIChatMessageProps) {
  const intl = useIntl()
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(
    (content: string) => {
      navigator.clipboard.writeText(content).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    },
    [],
  )

  if (item.type === 'user_message') {
    return (
      <div className="flex justify-end gap-4 px-6 py-5 animate-[fadeIn_0.3s_ease-out]">
        <div className="min-w-0 max-w-[70%]">
          <div className="rounded-2xl rounded-br-md bg-[#F0F0ED] px-5 py-3">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-[24px] text-[#1F1E1D]">
              {item.content}
            </p>
          </div>
          <div className="mt-1.5 flex justify-end">
            <span className="text-[11px] text-[#73726C]">
              {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#3D3D3A]">
          <User className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
    )
  }

  const renderBody = () => {
    if (item.type === 'assistant_message') {
      const isStreaming = item.status === 'streaming'
      const statusLabel =
        item.status === 'error' ? 'Response interrupted by error'
          : item.status === 'stopped' ? 'Response stopped'
            : null

      return (
        <div className="text-[15px] leading-[24px] text-[#1F1E1D]">
          {contentBlock(item.content)}
          {isStreaming ? (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#D97757] align-middle" />
          ) : null}
          {statusLabel ? (
            <div className="mt-3 text-[12px] leading-5 text-[#8A4B2F]">{statusLabel}</div>
          ) : null}
        </div>
      )
    }

    if (item.type === 'assistant_project_list') {
      return (
        <div className="space-y-3">
          <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#73726C]">
            {item.title}
          </div>
          <div className="grid gap-3">
            {item.projects.map(project => {
              const statusTone =
                project.status === 'completed'
                  ? 'border-[rgba(16,185,129,0.16)] bg-[#F0FDF4] text-[#15803D]'
                  : project.status === 'on_hold' || project.status === 'on-hold'
                    ? 'border-[rgba(210,153,34,0.2)] bg-[#FFF7ED] text-[#B45309]'
                    : 'border-[rgba(217,119,87,0.18)] bg-[#FFF7ED] text-[#C2410C]'

              return (
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
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {project.status ? (
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.04em] ${statusTone}`}>
                        {project.status.replaceAll('_', ' ')}
                      </span>
                    ) : null}
                    {project.type ? (
                      <span className="rounded-full border border-[rgba(31,30,29,0.12)] bg-[#FAF9F5] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.04em] text-[#3D3D3A]">
                        {project.type.replaceAll('_', ' ')}
                      </span>
                    ) : null}
                    {typeof project.memberCount === 'number' ? (
                      <span className="text-[12px] leading-5 text-[#73726C]">
                        {intl.formatMessage(
                          { id: 'modules.aiChat.projects.members', defaultMessage: '{count} members' },
                          { count: project.memberCount },
                        )}
                      </span>
                    ) : null}
                    {project.updatedAt ? (
                      <span className="text-[12px] leading-5 text-[#73726C]">
                        {intl.formatMessage(
                          { id: 'modules.aiChat.projects.updated', defaultMessage: 'Updated {date}' },
                          {
                            date: new Date(project.updatedAt).toLocaleDateString([], {
                              month: 'short',
                              day: '2-digit',
                            }),
                          },
                        )}
                      </span>
                    ) : null}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    if (item.type === 'tool_call') {
      return (
        <EventCard
          icon={item.status === 'running'
            ? <Loader2 className="h-4 w-4 animate-spin text-[#D97757]" />
            : <Wrench className="h-4 w-4 text-[#D97757]" />}
          badge="Tool Call"
          title={`Calling ${item.toolName || 'tool'}`}
          description={item.status === 'running' ? 'Tool execution started' : 'Tool call recorded'}
          tone="neutral"
        >
          <JsonBlock value={item.input} />
        </EventCard>
      )
    }

    if (item.type === 'tool_result') {
      const tone = item.outcome === 'success' ? 'success' : item.outcome === 'error' ? 'error' : 'neutral'
      return (
        <EventCard
          icon={item.outcome === 'success'
            ? <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
            : item.outcome === 'error'
              ? <AlertCircle className="h-4 w-4 text-[#E01E5A]" />
              : <Circle className="h-4 w-4 text-[#73726C]" />}
          badge="Tool Result"
          title={`${item.toolName || 'Tool'} completed`}
          description={item.outcome ? `Outcome: ${item.outcome}` : 'Tool result received'}
          tone={tone}
        >
          <JsonBlock value={item.result} />
        </EventCard>
      )
    }

    if (item.type === 'approval_required') {
      const tone = item.status === 'denied' ? 'error' : item.status === 'approved' ? 'success' : 'warning'
      const description =
        item.status === 'pending'
          ? item.approval.summary || `Approve ${item.approval.toolName}?`
          : item.status === 'approved'
            ? 'Approval submitted. Nexus AI is applying the action.'
            : 'Approval denied.'

      return (
        <EventCard
          icon={item.status === 'pending'
            ? <ShieldCheck className="h-4 w-4 text-[#D97757]" />
            : item.status === 'approved'
              ? <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
              : <XCircle className="h-4 w-4 text-[#E01E5A]" />}
          badge={
            item.status === 'pending'
              ? 'Approval Needed'
              : item.status === 'approved'
                ? 'Approval Submitted'
                : 'Approval Denied'
          }
          title={`Approval for ${item.approval.toolName}`}
          description={description}
          tone={tone}
          defaultOpen={item.status === 'pending'}
        >
          {approvalContent || <JsonBlock value={item.submittedFormData || item.approval.args} />}
        </EventCard>
      )
    }

    return (
      <EventCard
        icon={item.status === 'error'
          ? <AlertCircle className="h-4 w-4 text-[#E01E5A]" />
          : <Sparkles className="h-4 w-4 text-[#73726C]" />}
        badge={item.status === 'error' ? 'Error' : 'Event'}
        title={item.title}
        description={item.description}
        tone={item.status === 'error' ? 'error' : 'neutral'}
      />
    )
  }

  const contentForCopy = item.type === 'assistant_message' ? item.content : ''
  const canCopy = item.type === 'assistant_message' && item.content
  const canRegenerate = item.type === 'assistant_message' && item.status === 'completed' && onRegenerate

  return (
    <div className="flex justify-start gap-4 px-6 py-5 animate-[fadeIn_0.3s_ease-out]">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#D97757]">
        <Bot className="h-3.5 w-3.5 text-white" />
      </div>

      <div className="min-w-0 max-w-[85%]">
        {renderBody()}

        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[11px] text-[#73726C]">
            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {canCopy || canRegenerate ? (
            <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 hover:opacity-100">
              {canCopy ? (
                <button
                  onClick={() => handleCopy(contentForCopy)}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-[#73726C] transition-colors hover:bg-[rgba(31,30,29,0.04)] hover:text-[#1F1E1D]"
                  title={intl.formatMessage({ id: 'modules.aiChat.message.copy', defaultMessage: 'Copy' })}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              ) : null}
              {canRegenerate ? (
                <button
                  onClick={onRegenerate}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-[#73726C] transition-colors hover:bg-[rgba(31,30,29,0.04)] hover:text-[#1F1E1D]"
                  title={intl.formatMessage({ id: 'modules.aiChat.message.regenerate', defaultMessage: 'Regenerate' })}
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function contentBlock(content: string) {
  return content ? <MarkdownRenderer content={content} /> : null
}

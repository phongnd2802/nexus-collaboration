import React, { useCallback, useMemo, useState } from 'react'
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
  Wrench,
} from 'lucide-react'
import { useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'

import { MarkdownRenderer } from './MarkdownRenderer'
import type { AIChatPartItem, AIChatTimelineItem, ProjectCardPayload } from './types'

interface AIChatMessageProps {
  item: AIChatTimelineItem
  onRegenerate?: () => void
}

function JsonBlock({ label, value }: { label?: string; value: unknown }) {
  if (value == null) return null

  return (
    <div className="space-y-1.5">
      {label ? <div className="text-[11px] font-medium text-[#73726C]">{label}</div> : null}
      <pre className="overflow-auto rounded-lg bg-[rgba(31,30,29,0.04)] px-3 py-2 text-xs leading-5 text-[#3D3D3A]">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  )
}

function formatDuration(startedAt?: string, endedAt?: string) {
  if (!startedAt || !endedAt) return null
  const duration = new Date(endedAt).getTime() - new Date(startedAt).getTime()
  if (Number.isNaN(duration) || duration < 0) return null
  if (duration < 1000) return `${duration}ms`
  return `${(duration / 1000).toFixed(duration >= 10_000 ? 0 : 1)}s`
}

function partIcon(part: AIChatPartItem) {
  if (part.status === 'running') return <Loader2 className="h-3.5 w-3.5 animate-spin text-[#D97757]" />
  if (part.status === 'error') return <AlertCircle className="h-3.5 w-3.5 text-[#E01E5A]" />
  if (part.status === 'denied') return <AlertCircle className="h-3.5 w-3.5 text-[#D29922]" />
  if (part.type === 'reasoning') return <Sparkles className="h-3.5 w-3.5 text-[#D97757]" />
  if (part.type === 'data-orchestration_stage') return <Bot className="h-3.5 w-3.5 text-[#D97757]" />
  if (part.type.startsWith('tool-')) {
    return part.status === 'completed'
      ? <CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" />
      : <Wrench className="h-3.5 w-3.5 text-[#D97757]" />
  }
  if (part.type === 'source-url' || part.type === 'source-document') return <ExternalLink className="h-3.5 w-3.5 text-[#73726C]" />
  if (part.type === 'file') return <FileText className="h-3.5 w-3.5 text-[#73726C]" />
  return <CheckCircle2 className="h-3.5 w-3.5 text-[#15803D]" />
}

function statusText(part: AIChatPartItem) {
  switch (part.status) {
    case 'running':
      return 'Đang chạy'
    case 'completed':
      return 'Thành công'
    case 'error':
      return 'Thất bại'
    case 'denied':
      return 'Từ chối'
    case 'skipped':
      return 'Bỏ qua'
    default:
      return 'Đang chờ'
  }
}

function statusTone(part: AIChatPartItem) {
  if (part.status === 'error') return 'text-[#BE123C] bg-[rgba(224,30,90,0.08)]'
  if (part.status === 'denied') return 'text-[#B45309] bg-[rgba(210,153,34,0.1)]'
  if (part.status === 'running') return 'text-[#B45309] bg-[rgba(217,119,87,0.08)]'
  return 'text-[#15803D] bg-[rgba(34,197,94,0.1)]'
}

function ProjectCards({ projects }: { projects: ProjectCardPayload[] }) {
  const intl = useIntl()
  const navigate = useNavigate()

  return (
    <div className="grid gap-3">
      {projects.map(project => (
        <button
          key={project.id}
          type="button"
          onClick={() => navigate(project.href)}
          className="w-full rounded-xl border border-[rgba(31,30,29,0.12)] bg-white px-4 py-3 text-left shadow-[rgba(0,0,0,0.03)_0px_4px_18px_0px] transition-colors hover:border-[rgba(31,30,29,0.22)] hover:bg-[#FCFBF8]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[15px] leading-6 text-[#1F1E1D]">{project.name}</div>
              <div className="mt-0.5 line-clamp-2 text-[13px] leading-5 text-[#73726C]">
                {project.description || intl.formatMessage({ id: 'modules.aiChat.projects.noDescription', defaultMessage: 'No description provided.' })}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function TranscriptPart({ part }: { part: AIChatPartItem }) {
  const duration = formatDuration(part.startedAt, part.endedAt)

  if (part.type === 'text') {
    return (
      <div className="text-[15px] leading-[24px] text-[#1F1E1D]">
        <MarkdownRenderer content={part.text || ''} />
        {part.status === 'running' ? (
          <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-[#D97757] align-middle" />
        ) : null}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[rgba(31,30,29,0.08)] bg-[rgba(255,255,255,0.7)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-5">
        <span className="flex h-4 w-4 items-center justify-center">{partIcon(part)}</span>
        <span className="text-[#1F1E1D]">{part.summary || part.label}</span>
        {part.toolName ? <span className="text-[#73726C]">{part.toolName}</span> : null}
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${statusTone(part)}`}>{statusText(part)}</span>
        {duration ? <span className="text-[11px] text-[#8A877F]">{duration}</span> : null}
      </div>

      {part.projects && part.projects.length > 0 ? (
        <div className="mt-3">
          <ProjectCards projects={part.projects} />
        </div>
      ) : null}

      {part.approval ? (
        <div className="mt-3 rounded-lg bg-[rgba(31,30,29,0.03)] px-3 py-2 text-[12px] leading-5 text-[#4B4A45]">
          <div>Approval ID: {part.approval.id}</div>
          {typeof part.approval.approved === 'boolean' ? (
            <div>{part.approval.approved ? 'Approved' : 'Rejected'}</div>
          ) : (
            <div>Pending approval</div>
          )}
          {part.approval.reason ? <div>{part.approval.reason}</div> : null}
        </div>
      ) : null}

      {part.text && part.type !== 'text' ? (
        <div className="mt-3 whitespace-pre-wrap break-words text-[12px] leading-5 text-[#4B4A45]">
          {part.text}
        </div>
      ) : null}
      <div className="mt-3 space-y-2">
        <JsonBlock label="Input" value={part.input} />
        <JsonBlock label="Output" value={part.output} />
        {part.error ? <div className="text-[12px] leading-5 text-[#BE123C]">{part.error}</div> : null}
        <JsonBlock label="Metadata" value={part.metadata} />
        {part.raw && !part.projects ? <JsonBlock label="Raw part" value={part.raw} /> : null}
      </div>
    </div>
  )
}

function TranscriptMessage({
  item,
  icon,
  iconBg,
  timeLabel,
  canCopy,
  canRegenerate,
  onCopy,
  copied,
  onRegenerate,
}: {
  item: Extract<AIChatTimelineItem, { type: 'assistant_message' | 'system_message' }>
  icon: React.ReactNode
  iconBg: string
  timeLabel: string
  canCopy: boolean
  canRegenerate: boolean
  onCopy: () => void
  copied: boolean
  onRegenerate?: () => void
}) {
  const intl = useIntl()
  const statusLabel =
    item.type === 'assistant_message' && item.status === 'error'
      ? 'Response interrupted by error'
      : item.type === 'assistant_message' && item.status === 'stopped'
        ? 'Response stopped'
        : null

  return (
    <div className="flex justify-start gap-4 px-6 py-5 animate-[fadeIn_0.3s_ease-out]">
      <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        {icon}
      </div>

      <div className="min-w-0 max-w-[85%] space-y-3">
        {item.parts.length > 0 ? item.parts.map(part => <TranscriptPart key={part.id} part={part} />) : null}
        {statusLabel ? <div className="text-[12px] leading-5 text-[#8A4B2F]">{statusLabel}</div> : null}

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#73726C]">{timeLabel}</span>
          {canCopy || canRegenerate ? (
            <div className="flex items-center gap-1">
              {canCopy ? (
                <button
                  type="button"
                  onClick={onCopy}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-[#73726C] transition-colors hover:bg-[rgba(31,30,29,0.04)] hover:text-[#1F1E1D]"
                  title={intl.formatMessage({ id: 'modules.aiChat.message.copy', defaultMessage: 'Copy' })}
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </button>
              ) : null}
              {canRegenerate && onRegenerate ? (
                <button
                  type="button"
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

export function AIChatMessage({ item, onRegenerate }: AIChatMessageProps) {
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

  const timeLabel = useMemo(
    () => new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    [item.timestamp],
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
            <span className="text-[11px] text-[#73726C]">{timeLabel}</span>
          </div>
        </div>
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#3D3D3A]">
          <User className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
    )
  }

  if (item.type === 'project_list') {
    return (
      <div className="flex justify-start gap-4 px-6 py-4 animate-[fadeIn_0.3s_ease-out]">
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#D97757]">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="min-w-0 max-w-[85%] space-y-3">
          <div className="text-[13px] leading-5 text-[#73726C]">{item.title}</div>
          <ProjectCards projects={item.projects} />
          <div className="text-[11px] text-[#73726C]">{timeLabel}</div>
        </div>
      </div>
    )
  }

  if (item.type === 'system_event') {
    return (
      <div className="flex justify-start gap-4 px-6 py-3 animate-[fadeIn_0.3s_ease-out]">
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#D97757]">
          <Bot className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="min-w-0 max-w-[85%] text-[13px] leading-5 text-[#73726C]">
          <div className={item.status === 'error' ? 'text-[#BE123C]' : 'text-[#3D3D3A]'}>{item.title}</div>
          {item.description ? <div>{item.description}</div> : null}
        </div>
      </div>
    )
  }

  if (item.type === 'system_message') {
    return (
      <TranscriptMessage
        item={item}
        icon={<Bot className="h-3.5 w-3.5 text-white" />}
        iconBg="bg-[#73726C]"
        timeLabel={timeLabel}
        canCopy={item.content.trim().length > 0}
        canRegenerate={false}
        onCopy={() => handleCopy(item.content)}
        copied={copied}
      />
    )
  }

  return (
    <TranscriptMessage
      item={item}
      icon={<Bot className="h-3.5 w-3.5 text-white" />}
      iconBg="bg-[#D97757]"
      timeLabel={timeLabel}
      canCopy={item.content.trim().length > 0}
      canRegenerate={item.status === 'completed' && Boolean(onRegenerate)}
      onCopy={() => handleCopy(item.content)}
      copied={copied}
      onRegenerate={onRegenerate}
    />
  )
}

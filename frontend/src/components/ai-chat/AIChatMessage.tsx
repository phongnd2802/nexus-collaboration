import React, { useCallback, useMemo, useState } from 'react'
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  User,
  Wrench,
  X,
} from 'lucide-react'
import { useIntl } from 'react-intl'
import { useNavigate } from 'react-router-dom'

import { MarkdownRenderer } from './MarkdownRenderer'
import type {
  AIChatPartItem,
  AIChatTimelineItem,
  ProjectCardPayload,
  WorkspaceActionPayload,
  WorkspaceReferencePayload,
} from './types'

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

function formatReferenceScore(score?: number) {
  if (typeof score !== 'number' || Number.isNaN(score)) return null
  return score <= 1 ? `${Math.round(score * 100)}%` : score.toFixed(2)
}

function referenceMeta(reference: WorkspaceReferencePayload) {
  return [
    reference.citation,
    reference.pageNumbers && reference.pageNumbers.length > 0 ? `Trang ${reference.pageNumbers.join(', ')}` : null,
    reference.retrievalMode,
    formatReferenceScore(reference.score),
  ].filter(Boolean).join(' · ')
}

function ReferenceLinks({ references }: { references: WorkspaceReferencePayload[] }) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState<WorkspaceReferencePayload | null>(null)
  const selectedMeta = selected ? referenceMeta(selected) : ''

  return (
    <div className="mt-3 rounded-xl border border-[rgba(31,30,29,0.1)] bg-[#FCFBF8] p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="text-[12px] font-medium uppercase tracking-[0.08em] text-[#73726C]">Nguồn dữ liệu</div>
        <div className="text-[11px] text-[#8A877F]">{references.length} nguồn</div>
      </div>

      <div className="grid gap-2">
        {references.map((reference, index) => {
          const meta = referenceMeta(reference)
          return (
            <button
              key={`${reference.href || reference.entityId || reference.title || 'reference'}-${index}`}
              type="button"
              onClick={() => setSelected(reference)}
              className="w-full rounded-lg border border-[rgba(31,30,29,0.1)] bg-white px-3 py-2 text-left transition-colors hover:border-[rgba(31,30,29,0.2)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-[13px] leading-5 text-[#1F1E1D]">
                    {reference.title || reference.href || reference.entityId || 'Source'}
                  </div>
                  {meta ? <div className="mt-0.5 truncate text-[11px] leading-4 text-[#8A877F]">{meta}</div> : null}
                  {reference.snippet ? (
                    <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#73726C]">{reference.snippet}</div>
                  ) : null}
                </div>
                <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#73726C]" />
              </div>
            </button>
          )
        })}
      </div>

      {selected ? (
        <div className="mt-3 rounded-xl border border-[rgba(31,30,29,0.12)] bg-white p-3 shadow-[rgba(0,0,0,0.04)_0px_8px_24px_0px]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px] font-medium leading-5 text-[#1F1E1D]">
                {selected.title || selected.href || selected.entityId || 'Source'}
              </div>
              {selectedMeta ? <div className="mt-0.5 text-[11px] leading-4 text-[#8A877F]">{selectedMeta}</div> : null}
              {selected.mimeType ? <div className="mt-0.5 text-[11px] leading-4 text-[#8A877F]">{selected.mimeType}</div> : null}
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-md p-1 text-[#73726C] transition-colors hover:bg-[rgba(31,30,29,0.06)] hover:text-[#1F1E1D]"
              aria-label="Đóng nguồn dữ liệu"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {selected.snippet ? (
            <div className="mt-3 whitespace-pre-wrap rounded-lg bg-[rgba(31,30,29,0.04)] px-3 py-2 text-[12px] leading-5 text-[#3D3D3A]">
              {selected.snippet}
            </div>
          ) : null}

          {selected.bboxRefs && selected.bboxRefs.length > 0 ? (
            <div className="mt-2 text-[11px] leading-4 text-[#8A877F]">
              Có {selected.bboxRefs.length} bbox reference.
            </div>
          ) : null}

          {selected.href ? (
            <button
              type="button"
              onClick={() => navigate(selected.href!)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[rgba(31,30,29,0.12)] px-3 py-1.5 text-[12px] text-[#1F1E1D] transition-colors hover:bg-[#FCFBF8]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Mở file
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function ActionLinks({ actions }: { actions: WorkspaceActionPayload[] }) {
  const navigate = useNavigate()
  return (
    <div className="mt-3 grid gap-2">
      {actions.map((action, index) => (
        <button
          key={`${action.href || action.entityId || action.message || 'action'}-${index}`}
          type="button"
          onClick={() => {
            if (action.href) navigate(action.href)
          }}
          disabled={!action.href}
          className="w-full rounded-lg border border-[rgba(31,30,29,0.1)] bg-white px-3 py-2 text-left transition-colors hover:border-[rgba(31,30,29,0.2)] disabled:cursor-default disabled:bg-[rgba(31,30,29,0.02)]"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-[13px] leading-5 text-[#1F1E1D]">
                {action.title || action.message || action.entityId || action.action || 'Action result'}
              </div>
              <div className="mt-0.5 text-[12px] leading-5 text-[#73726C]">
                {[action.status, action.entityType, action.toolName].filter(Boolean).join(' · ')}
              </div>
            </div>
            {action.href ? <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#73726C]" /> : null}
          </div>
        </button>
      ))}
    </div>
  )
}

function ThinkingTimelineItem({ part }: { part: AIChatPartItem }) {
  const duration = formatDuration(part.startedAt, part.endedAt)

  return (
    <div className="rounded-lg border border-[rgba(31,30,29,0.08)] bg-white px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-5">
        <span className="flex h-4 w-4 items-center justify-center">{partIcon(part)}</span>
        <span className="min-w-0 flex-1 truncate text-[#1F1E1D]">{part.summary || part.label}</span>
        {part.toolName ? <span className="max-w-[180px] truncate text-[#73726C]">{part.toolName}</span> : null}
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${statusTone(part)}`}>{statusText(part)}</span>
        {duration ? <span className="text-[11px] text-[#8A877F]">{duration}</span> : null}
      </div>

      {part.text && part.type !== 'reasoning' ? (
        <div className="mt-2 whitespace-pre-wrap break-words text-[12px] leading-5 text-[#4B4A45]">
          {part.text}
        </div>
      ) : null}

      {part.references && part.references.length > 0 ? <ReferenceLinks references={part.references} /> : null}
      {part.actions && part.actions.length > 0 ? <ActionLinks actions={part.actions} /> : null}

      <div className="mt-2 space-y-2">
        <JsonBlock label="Input" value={part.input} />
        <JsonBlock label="Output" value={part.output} />
        {part.error ? <div className="text-[12px] leading-5 text-[#BE123C]">{part.error}</div> : null}
        <JsonBlock label="Metadata" value={part.metadata} />
      </div>
    </div>
  )
}

function ThinkingGroup({ part }: { part: AIChatPartItem }) {
  const [open, setOpen] = useState(false)
  const children = part.children || []
  const isRunning = part.status === 'running'

  return (
    <div className="rounded-xl border border-[rgba(31,30,29,0.08)] bg-[rgba(255,255,255,0.7)]">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] leading-5 transition-colors hover:bg-[rgba(31,30,29,0.025)]"
      >
        <span className="flex h-5 w-5 items-center justify-center">
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin text-[#D97757]" />
          ) : (
            <Sparkles className="h-4 w-4 text-[#D97757]" />
          )}
        </span>
        <span className="min-w-0 flex-1 text-[#1F1E1D]">
          {isRunning ? part.summary || 'Đang suy nghĩ...' : part.summary || 'Đã xử lý'}
          {isRunning ? <span className="ml-1 inline-block animate-pulse">...</span> : null}
        </span>
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] ${statusTone(part)}`}>{statusText(part)}</span>
        <span className="text-[#73726C]">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>

      {open ? (
        <div className="space-y-2 border-t border-[rgba(31,30,29,0.08)] px-4 py-3">
          {children.length > 0 ? (
            children.map(child => <ThinkingTimelineItem key={child.id} part={child} />)
          ) : (
            <div className="text-[12px] leading-5 text-[#73726C]">Chưa có bước xử lý chi tiết.</div>
          )}
        </div>
      ) : null}
    </div>
  )
}

function TranscriptPart({ part }: { part: AIChatPartItem }) {
  const duration = formatDuration(part.startedAt, part.endedAt)
  const hasStructuredUi =
    (part.projects && part.projects.length > 0)
    || (part.references && part.references.length > 0)
    || (part.actions && part.actions.length > 0)

  if (part.type === 'thinking_group') {
    return <ThinkingGroup part={part} />
  }

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

      {part.references && part.references.length > 0 ? <ReferenceLinks references={part.references} /> : null}
      {part.actions && part.actions.length > 0 ? <ActionLinks actions={part.actions} /> : null}

      {part.text && part.type !== 'text' ? (
        <div className="mt-3 whitespace-pre-wrap break-words text-[12px] leading-5 text-[#4B4A45]">
          {part.text}
        </div>
      ) : null}
      <div className="mt-3 space-y-2">
        <JsonBlock label="Input" value={part.input} />
        <JsonBlock label="Output" value={part.output} />
        {part.error ? <div className="text-[12px] leading-5 text-[#BE123C]">{part.error}</div> : null}
        <JsonBlock label="Metadata" value={hasStructuredUi ? undefined : part.metadata} />
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

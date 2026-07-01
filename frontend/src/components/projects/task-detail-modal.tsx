import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Calendar,
  Clock,
  User,
  Tag,
  ArrowUp,
  ArrowDown,
  Minus,
  Edit,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  FileText,
  Users,
  Hash,
  Type,
  CheckSquare,
  Globe,
  Mail,
  Phone,
  List,
  CalendarDays,
  Bell,
  MessageSquare,
  Trash2,
  Send,
} from 'lucide-react'
import { format, formatDistanceToNow, isAfter, isPast } from 'date-fns'
import { vi as viLocale, enUS as enLocale } from 'date-fns/locale'
import type { Task } from '@/lib/api/projects-api'
import {
  useTaskComments,
  useCreateTaskComment,
  useUpdateTaskComment,
  useDeleteTaskComment,
} from '@/lib/api/projects-api'
import { getAssigneeInitials, getAssigneeName } from '@/utils/task-helpers'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/contexts/LanguageContext'

// Per-task custom field structure
interface TaskCustomField {
  id: string;
  name: string;
  fieldType: string;
  value: any;
  options?: Array<{ id: string; label: string; color?: string }>;
}

interface TaskDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task | null
  onEdit?: (task: Task) => void
  kanbanStages?: Array<{ id: string; name: string; color: string }>
  workspaceId?: string
}

import { useIntl } from 'react-intl'

function TaskCommentsSection({ workspaceId, taskId }: { workspaceId: string; taskId: string }) {
  const intl = useIntl()
  const { toast } = useToast()
  const { user } = useAuth()
  const { locale } = useLanguage()
  const dateLocale = locale === 'vi' ? viLocale : enLocale
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null)

  const { data: comments, isLoading } = useTaskComments(workspaceId, taskId)
  const createComment = useCreateTaskComment()
  const updateComment = useUpdateTaskComment()
  const deleteComment = useDeleteTaskComment()

  const handlePost = () => {
    if (!newComment.trim()) return
    createComment.mutate(
      { workspaceId, taskId, data: { content: newComment.trim() } },
      {
        onSuccess: () => setNewComment(''),
        onError: () => toast({
          title: intl.formatMessage({ id: 'tasks.comments.postFailed', defaultMessage: 'Không thể gửi bình luận' }),
          variant: 'destructive',
        }),
      }
    )
  }

  const startEdit = (commentId: string, content: string) => {
    setEditingCommentId(commentId)
    setEditingContent(content)
  }

  const cancelEdit = () => {
    setEditingCommentId(null)
    setEditingContent('')
  }

  const saveEdit = (commentId: string) => {
    if (!editingContent.trim()) return
    updateComment.mutate(
      { workspaceId, commentId, taskId, data: { content: editingContent.trim() } },
      {
        onSuccess: () => cancelEdit(),
        onError: () => toast({
          title: intl.formatMessage({ id: 'tasks.comments.updateFailed', defaultMessage: 'Không thể cập nhật bình luận' }),
          variant: 'destructive',
        }),
      }
    )
  }

  const confirmDelete = () => {
    if (!commentToDelete) return
    const commentId = commentToDelete
    setCommentToDelete(null)
    deleteComment.mutate(
      { workspaceId, commentId, taskId },
      {
        onError: () => toast({
          title: intl.formatMessage({ id: 'tasks.comments.deleteFailed', defaultMessage: 'Không thể xóa bình luận' }),
          variant: 'destructive',
        }),
      }
    )
  }

  return (
    <>
      <Separator />
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          {intl.formatMessage({ id: 'tasks.comments.title', defaultMessage: 'Bình luận' })}
          {comments && comments.length > 0 && (
            <span className="text-xs">({comments.length})</span>
          )}
        </h3>

        <div className="flex items-start gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handlePost()
              }
            }}
            placeholder={intl.formatMessage({ id: 'tasks.comments.placeholder', defaultMessage: 'Viết bình luận...' })}
            className="min-h-[60px] text-sm"
          />
          <Button
            size="sm"
            onClick={handlePost}
            disabled={!newComment.trim() || createComment.isPending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">
            {intl.formatMessage({ id: 'tasks.comments.loading', defaultMessage: 'Đang tải bình luận...' })}
          </p>
        ) : !comments || comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {intl.formatMessage({ id: 'tasks.comments.noComments', defaultMessage: 'Chưa có bình luận nào' })}
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((comment) => {
              const isAuthor = user?.id === comment.user_id
              const isEditing = editingCommentId === comment.id
              return (
                <div key={comment.id} className="flex items-start gap-2">
                  <Avatar className="h-7 w-7 mt-0.5">
                    <AvatarImage src={comment.user?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {(comment.user?.name || '?').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{comment.user?.name || 'Unknown'}</span>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: dateLocale })}
                      </span>
                      {comment.is_edited && (
                        <span className="text-xs text-muted-foreground">
                          {intl.formatMessage({ id: 'tasks.comments.edited', defaultMessage: '(đã chỉnh sửa)' })}
                        </span>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              saveEdit(comment.id)
                            } else if (e.key === 'Escape') {
                              cancelEdit()
                            }
                          }}
                          className="min-h-[50px] text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => saveEdit(comment.id)} disabled={updateComment.isPending}>
                            {intl.formatMessage({ id: 'tasks.comments.save', defaultMessage: 'Lưu' })}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit}>
                            {intl.formatMessage({ id: 'tasks.comments.cancel', defaultMessage: 'Hủy' })}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
                    )}
                  </div>
                  {isAuthor && !isEditing && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => startEdit(comment.id, comment.content)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => setCommentToDelete(comment.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AlertDialog open={!!commentToDelete} onOpenChange={(open) => !open && setCommentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {intl.formatMessage({ id: 'tasks.comments.deleteConfirmTitle', defaultMessage: 'Xóa bình luận?' })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {intl.formatMessage({ id: 'tasks.comments.deleteConfirmDescription', defaultMessage: 'Hành động này không thể hoàn tác.' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {intl.formatMessage({ id: 'tasks.comments.cancel', defaultMessage: 'Hủy' })}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              {intl.formatMessage({ id: 'tasks.comments.delete', defaultMessage: 'Xóa' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export function TaskDetailModal({
  open,
  onOpenChange,
  task,
  onEdit,
  kanbanStages = [],
  workspaceId: propWorkspaceId
}: TaskDetailModalProps) {
  const intl = useIntl()
  const { locale } = useLanguage()
  const dateLocale = locale === 'vi' ? viLocale : enLocale
  const params = useParams<{ workspaceId: string }>()
  const workspaceId = propWorkspaceId || params.workspaceId || ''

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes < 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileUrl = (file: any) => {
    if (!file || !file.url) return '';
    if (typeof file.url === 'object' && file.url !== null && 'publicUrl' in file.url) {
      return (file.url as any).publicUrl;
    }
    return file.url as string;
  };

  if (!task) return null

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'urgent':
        return <ArrowUp className="w-4 h-4 text-red-500" />
      case 'medium':
        return <Minus className="w-4 h-4 text-yellow-500" />
      case 'low':
        return <ArrowDown className="w-4 h-4 text-green-500" />
      default:
        return null
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return intl.formatMessage({ id: 'tasks.high', defaultMessage: 'High' })
      case 'medium':
        return intl.formatMessage({ id: 'tasks.medium', defaultMessage: 'Medium' })
      case 'low':
        return intl.formatMessage({ id: 'tasks.low', defaultMessage: 'Low' })
      case 'urgent':
        return intl.formatMessage({ id: 'tasks.urgent', defaultMessage: 'Urgent' })
      default:
        return priority
    }
  }

  const getStatusInfo = (status: string) => {
    const stage = kanbanStages.find(s => s.id === status)
    if (stage) {
      return { name: stage.name, color: stage.color }
    }
    // Fallback colors
    switch (status) {
      case 'todo':
        return { name: 'To Do', color: '#3B82F6' }
      case 'in_progress':
        return { name: 'In Progress', color: '#EAB308' }
      case 'review':
        return { name: 'Review', color: '#A855F7' }
      case 'completed':
      case 'done':
        return { name: 'Done', color: '#22C55E' }
      default:
        return { name: status.replace('_', ' '), color: '#6B7280' }
    }
  }

  const statusInfo = getStatusInfo(task.status)
  const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'completed' && task.status !== 'done'
  const isDueSoon = task.dueDate && !isOverdue && isAfter(new Date(task.dueDate), new Date()) &&
    (new Date(task.dueDate).getTime() - new Date().getTime()) < 3 * 24 * 60 * 60 * 1000

  // Format custom field value for display (per-task custom fields)
  const formatCustomFieldValue = (field: TaskCustomField): React.ReactNode => {
    const { fieldType, value, options } = field
    if (value === null || value === undefined || value === '') return <span className="text-muted-foreground">-</span>

    switch (fieldType) {
      case 'checkbox':
        return value ? (
          <CheckCircle2 className="w-4 h-4 text-green-500" />
        ) : (
          <div className="w-4 h-4 rounded border border-muted-foreground/30" />
        )
      case 'date':
        try {
          return format(new Date(value), 'MMM dd, yyyy')
        } catch {
          return String(value)
        }
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value)
      case 'select':
        const selectOption = options?.find(opt => opt.id === value)
        if (selectOption) {
          return (
            <Badge
              variant="secondary"
              style={{
                backgroundColor: selectOption.color ? `${selectOption.color}20` : undefined,
                color: selectOption.color || undefined
              }}
            >
              {selectOption.label}
            </Badge>
          )
        }
        return String(value)
      case 'multi_select':
        if (Array.isArray(value)) {
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((v: string) => {
                const opt = options?.find(o => o.id === v)
                return opt ? (
                  <Badge
                    key={v}
                    variant="secondary"
                    style={{
                      backgroundColor: opt.color ? `${opt.color}20` : undefined,
                      color: opt.color || undefined
                    }}
                  >
                    {opt.label}
                  </Badge>
                ) : null
              })}
            </div>
          )
        }
        return String(value)
      case 'url':
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <Globe className="w-3 h-3" />
            {value}
          </a>
        )
      case 'email':
        return (
          <a href={`mailto:${value}`} className="text-blue-600 hover:underline flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {value}
          </a>
        )
      case 'phone':
        return (
          <a href={`tel:${value}`} className="text-blue-600 hover:underline flex items-center gap-1">
            <Phone className="w-3 h-3" />
            {value}
          </a>
        )
      default:
        return String(value)
    }
  }

  // Get icon for field type
  const getFieldTypeIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'text': return <Type className="w-4 h-4 text-muted-foreground" />
      case 'number': return <Hash className="w-4 h-4 text-muted-foreground" />
      case 'date': return <CalendarDays className="w-4 h-4 text-muted-foreground" />
      case 'select': return <List className="w-4 h-4 text-muted-foreground" />
      case 'multi_select': return <List className="w-4 h-4 text-muted-foreground" />
      case 'checkbox': return <CheckSquare className="w-4 h-4 text-muted-foreground" />
      case 'url': return <Globe className="w-4 h-4 text-muted-foreground" />
      case 'email': return <Mail className="w-4 h-4 text-muted-foreground" />
      case 'phone': return <Phone className="w-4 h-4 text-muted-foreground" />
      case 'person': return <User className="w-4 h-4 text-muted-foreground" />
      default: return <Type className="w-4 h-4 text-muted-foreground" />
    }
  }

  // Get assignees from task
  const assignees = task.assignees || (task.assignee ? [task.assignee] : [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  className="text-xs"
                  style={{
                    backgroundColor: `${statusInfo.color}20`,
                    color: statusInfo.color,
                    borderColor: statusInfo.color
                  }}
                >
                  {statusInfo.name}
                </Badge>
                <Badge className={`text-xs ${getPriorityColor(task.priority)}`}>
                  <span className="flex items-center gap-1">
                    {getPriorityIcon(task.priority)}
                    {getPriorityLabel(task.priority)}
                  </span>
                </Badge>
              </div>
              <DialogTitle className="text-xl font-semibold line-clamp-2">
                {task.title}
              </DialogTitle>
            </div>
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="mr-6"
                onClick={() => {
                  onOpenChange(false)
                  onEdit(task)
                }}
              >
                <Edit className="w-4 h-4 mr-1" />
                {intl.formatMessage({ id: 'common.edit', defaultMessage: 'Chỉnh sửa' })}
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(85vh-120px)]">
          <div className="px-6 py-4 space-y-6">
            {/* Description */}
            {task.description && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {intl.formatMessage({ id: 'modules.projects.createTask.description', defaultMessage: 'Mô tả' })}
                </h3>
                <div
                  className="text-sm prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: task.description }}
                />
              </div>
            )}

            <Separator />

            {/* Key Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Assignees */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {intl.formatMessage({ id: 'tasks.assignees', defaultMessage: 'Người được giao' })}
                </h3>
                {assignees.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {assignees.map((assignee: any, index: number) => {
                      const initials = getAssigneeInitials(assignee)
                      const displayName = getAssigneeName(assignee)
                      const avatarUrl = typeof assignee === 'object' ? assignee.avatar_url : undefined
                      return (
                        <div key={index} className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={avatarUrl} />
                            <AvatarFallback className="text-xs">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{displayName}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'tasks.noAssignees', defaultMessage: 'Chưa có người được giao' })}</span>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {intl.formatMessage({ id: 'tasks.dueDate', defaultMessage: 'Ngày hết hạn' })}
                </h3>
                {task.dueDate ? (
                  <div className={`flex items-center gap-2 ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-yellow-600' : ''}`}>
                    {isOverdue && <AlertCircle className="w-4 h-4" />}
                    <span className="text-sm font-medium">
                      {format(new Date(task.dueDate), 'dd MMM, yyyy', { locale: dateLocale })}
                      {(task as any).dueTime && (
                        <span className="ml-1 text-muted-foreground font-normal">
                          {intl.formatMessage({ id: 'tasks.at', defaultMessage: 'lúc' })} {(task as any).dueTime}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: dateLocale })})
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'tasks.noDueDate', defaultMessage: 'Chưa có ngày hết hạn' })}</span>
                )}
              </div>

              {/* Reminders */}
              {task.dueDate && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    {intl.formatMessage({ id: 'tasks.reminders', defaultMessage: 'Nhắc nhở' })}
                  </h3>
                  {!(task as any).reminder_settings?.enabled ? (
                    <span className="text-sm text-muted-foreground">
                      {intl.formatMessage({ id: 'tasks.reminderNotSet', defaultMessage: 'Chưa bật nhắc nhở' })}
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {((task as any).reminder_settings?.intervals ?? []).map((key: string) => {
                        const labels: Record<string, string> = {
                          '3d': intl.formatMessage({ id: 'modules.projects.createTask.reminder3d' }),
                          '1d': intl.formatMessage({ id: 'modules.projects.createTask.reminder1d' }),
                          '12h': intl.formatMessage({ id: 'modules.projects.createTask.reminder12h' }),
                          '3h': intl.formatMessage({ id: 'modules.projects.createTask.reminder3h' }),
                          '1h': intl.formatMessage({ id: 'modules.projects.createTask.reminder1h' }),
                        }
                        return (
                          <Badge key={key} variant="secondary" className="text-xs">
                            {labels[key] ?? key}
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Created */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {intl.formatMessage({ id: 'tasks.created', defaultMessage: 'Đã tạo' })}
                </h3>
                <span className="text-sm">
                  {format(new Date(task.createdAt), 'dd MMM, yyyy', { locale: dateLocale })}
                  <span className="text-muted-foreground ml-1">
                    ({formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: dateLocale })})
                  </span>
                </span>
              </div>
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    {intl.formatMessage({ id: 'tasks.tags', defaultMessage: 'Nhãn' })}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {task.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Attached Files */}
            {workspaceId && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {intl.formatMessage({ id: 'tasks.attachments', defaultMessage: 'Tệp đính kèm' })}
                  </h3>
                  {task.attachments &&
                  (task.attachments as any).file_attachment &&
                  (task.attachments as any).file_attachment.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(task.attachments as any).file_attachment.map((file: any) => (
                        <div
                          key={file.id}
                          className="flex items-center justify-between p-2 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <FileText className="w-8 h-8 text-primary/80 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate pr-2" title={file.name}>
                                {file.name}
                              </p>
                              {file.size && (
                                <p className="text-xs text-muted-foreground">
                                  {formatFileSize(file.size)}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {getFileUrl(file) && (
                              <a
                                href={getFileUrl(file)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 px-3"
                              >
                                Tải xuống
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Không có tệp đính kèm nào.</p>
                  )}
                </div>
              </>
            )}

            {/* Custom Fields (per-task) */}
            {(task as any).custom_fields && Array.isArray((task as any).custom_fields) && (task as any).custom_fields.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">{intl.formatMessage({ id: 'tasks.customFields', defaultMessage: 'Trường tùy chỉnh' })}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {((task as any).custom_fields as TaskCustomField[])
                      .filter(field => field.value !== undefined && field.value !== null && field.value !== '')
                      .map(field => (
                        <div key={field.id} className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            {getFieldTypeIcon(field.fieldType)}
                            <span>{field.name}</span>
                          </div>
                          <div className="text-sm pl-6">
                            {formatCustomFieldValue(field)}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            )}

            {/* Updated Info */}
            {(task as any).updated_by_user && (
              <>
                <Separator />
                <div className="text-xs text-muted-foreground">
                  {intl.formatMessage({ id: 'tasks.lastUpdatedBy', defaultMessage: 'Cập nhật lần cuối bởi' })} <span className="font-medium">{(task as any).updated_by_user.name}</span>
                  {task.updatedAt && (
                    <span> {formatDistanceToNow(new Date(task.updatedAt), { addSuffix: true })}</span>
                  )}
                </div>
              </>
            )}

            {/* Comments */}
            {workspaceId && <TaskCommentsSection workspaceId={workspaceId} taskId={task.id} />}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

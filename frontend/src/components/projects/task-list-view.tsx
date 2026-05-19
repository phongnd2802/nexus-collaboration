import { useMemo, useState } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  Minus,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import type { Task } from '@/lib/api/projects-api'
import { isAfter, isToday } from 'date-fns'
import { getAssigneeName } from '@/utils/task-helpers'
import { useWorkspace } from '@/contexts/WorkspaceContext'

const stripHtml = (html: string): string => {
  if (!html) return ''
  try {
    const preprocessed = html
      .replace(/<\/p>/gi, ' ')
      .replace(/<\/div>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
    const doc = new DOMParser().parseFromString(preprocessed, 'text/html')
    return (doc.body.textContent || '').trim().replace(/\s+/g, ' ')
  } catch (e) {
    return html.replace(/<[^>]*>/g, ' ').trim().replace(/\s+/g, ' ')
  }
}

// Per-task custom field type
interface TaskCustomField {
  id: string
  name: string
  fieldType: string
  value: any
  options?: Array<{ id: string; label: string; color?: string }>
}

interface TaskListViewProps {
  tasks: Task[]
  onTaskClick?: (task: Task) => void
  kanbanStages?: Array<{ id: string; name: string; color: string }>
}

type SortField = 'title' | 'status' | 'priority' | 'assignee' | 'dueDate' | 'createdAt'
type SortDirection = 'asc' | 'desc'

export function TaskListView({ tasks, onTaskClick, kanbanStages = [] }: TaskListViewProps) {
  const intl = useIntl()
  const { members } = useWorkspace()
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  const memberByUserId = useMemo(() => {
    const map = new Map<string, any>()
    members.forEach((member) => {
      if (member.user_id) map.set(member.user_id, member)
      if (member.id) map.set(member.id, member)
      if (member.user?.id) map.set(member.user.id, member)
    })
    return map
  }, [members])

  // Helper function to format per-task custom field values for display
  const formatCustomFieldValue = (field: TaskCustomField): string => {
    const { fieldType, value, options } = field
    if (value === null || value === undefined || value === '') return '-'

    switch (fieldType) {
      case 'checkbox':
        return value ? '✓' : '✗'
      case 'date':
        try {
          return new Date(value).toLocaleDateString()
        } catch {
          return String(value)
        }
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : String(value)
      case 'select':
        const selectOption = options?.find(opt => opt.id === value)
        return selectOption?.label || String(value)
      case 'multi_select':
        if (Array.isArray(value)) {
          const labels = value.map(v => {
            const opt = options?.find(o => o.id === v)
            return opt?.label || v
          })
          return labels.join(', ')
        }
        return String(value)
      default:
        return String(value)
    }
  }

  // Get option color for select fields from per-task custom field
  const getOptionColor = (field: TaskCustomField): string | undefined => {
    const { fieldType, value, options } = field
    if (fieldType === 'select') {
      const option = options?.find(opt => opt.id === value)
      return option?.color
    }
    return undefined
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Sort tasks
  const sortedTasks = [...tasks].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case 'title':
        aValue = a.title.toLowerCase()
        bValue = b.title.toLowerCase()
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      case 'priority':
        const priorityOrder: { [key: string]: number } = { urgent: 4, high: 3, medium: 2, low: 1 }
        aValue = priorityOrder[a.priority] || 0
        bValue = priorityOrder[b.priority] || 0
        break
      case 'dueDate':
        aValue = a.dueDate ? new Date(a.dueDate).getTime() : 0
        bValue = b.dueDate ? new Date(b.dueDate).getTime() : 0
        break
      case 'assignee':
        aValue = a.assignee?.name || ''
        bValue = b.assignee?.name || ''
        break
      case 'createdAt':
        aValue = new Date(a.createdAt).getTime()
        bValue = new Date(b.createdAt).getTime()
        break
      default:
        aValue = a.createdAt
        bValue = b.createdAt
    }

    if (sortDirection === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <ArrowUp className="w-4 h-4 text-red-500" />
      case 'medium': return <Minus className="w-4 h-4 text-yellow-500" />
      case 'low': return <ArrowDown className="w-4 h-4 text-green-500" />
      default: return null
    }
  }

  const getStatusColor = (status: string) => {
    const stage = kanbanStages.find((s) => s.id === status) || kanbanStages.find((s) => normalizeStatus(s.id) === normalizeStatus(status))
    if (stage?.color) {
      return {
        backgroundColor: `${stage.color}20`,
        color: stage.color,
        borderColor: `${stage.color}66`
      }
    }

    const normalizedStatus = (status || '').toString().toLowerCase()
    switch (normalizedStatus) {
      case '1':
      case 'todo': return { backgroundColor: '#DBEAFE', color: '#1E3A8A', borderColor: '#93C5FD' }
      case '2':
      case 'in_progress': return { backgroundColor: '#FEF3C7', color: '#92400E', borderColor: '#FCD34D' }
      case '3':
      case 'review': return { backgroundColor: '#EDE9FE', color: '#5B21B6', borderColor: '#C4B5FD' }
      case '4':
      case 'completed': return { backgroundColor: '#DCFCE7', color: '#166534', borderColor: '#86EFAC' }
      default: return { backgroundColor: '#E5E7EB', color: '#111827', borderColor: '#D1D5DB' }
    }
  }

  const normalizeStatus = (status: string) => {
    const normalizedStatus = (status || '').toString().toLowerCase()
    if (normalizedStatus === '1') return 'todo'
    if (normalizedStatus === '2') return 'in_progress'
    if (normalizedStatus === '3') return 'review'
    if (normalizedStatus === '4') return 'completed'
    if (normalizedStatus === 'in-progress') return 'in_progress'
    if (normalizedStatus === 'done') return 'completed'
    return normalizedStatus
  }

  const getStatusLabel = (status: string) => {
    const stage = kanbanStages.find((s) => s.id === status) || kanbanStages.find((s) => normalizeStatus(s.id) === normalizeStatus(status))
    if (stage?.name) return stage.name

    const normalizedStatus = (status || '').toString().toLowerCase()
    switch (normalizedStatus) {
      case '1':
      case 'todo':
        return intl.formatMessage({ id: 'tasks.status.todo', defaultMessage: 'To do' })
      case '2':
      case 'in_progress':
      case 'in-progress':
        return intl.formatMessage({ id: 'tasks.status.inProgress', defaultMessage: 'In progress' })
      case '3':
      case 'review':
        return intl.formatMessage({ id: 'tasks.status.review', defaultMessage: 'Review' })
      case '4':
      case 'completed':
      case 'done':
        return intl.formatMessage({ id: 'tasks.status.completed', defaultMessage: 'Completed' })
      default:
        return status
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
  }

  const resolveAssigneeDisplay = (task: Task) => {
    const firstAssignee = (task as any).assignees?.[0]
    const firstAssigneeId =
      typeof firstAssignee === 'string'
        ? firstAssignee
        : firstAssignee?.id

    const assigneeId =
      task.assigneeId ||
      (typeof task.assignee === 'object' ? task.assignee?.id : undefined) ||
      firstAssigneeId

    const workspaceMember = assigneeId ? memberByUserId.get(assigneeId) : undefined

    const nameFromMember =
      workspaceMember?.user?.name ||
      workspaceMember?.name ||
      workspaceMember?.email

    const avatarFromMember =
      workspaceMember?.user?.avatar ||
      workspaceMember?.avatar_url

    if (nameFromMember) {
      return {
        name: nameFromMember,
        avatarUrl: avatarFromMember
      }
    }

    if (typeof firstAssignee === 'object' && firstAssignee?.name) {
      return {
        name: firstAssignee.name,
        avatarUrl: firstAssignee.avatarUrl || firstAssignee.avatar
      }
    }

    if (task.assignee && typeof task.assignee === 'object') {
      return {
        name: getAssigneeName(task.assignee),
        avatarUrl: task.assignee.avatarUrl || task.assignee.avatar
      }
    }

    return undefined
  }

  const getNameInitials = (name: string) => {
    return name
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  if (sortedTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold mb-2">No tasks found</h3>
          <p className="text-muted-foreground">
            Get started by creating your first task
          </p>
        </div>
      </div>
    )
  }

  return (
    <Card className="h-full">
      <CardContent className="p-0 h-full flex flex-col">
        <div className="flex-shrink-0">
          <Table>
            <TableHeader className="table-fixed w-full">
              <TableRow>
                <TableHead className="w-[22%]">
                  <button
                    type="button"
                    className="h-8 p-0 font-semibold inline-flex items-center gap-1 bg-transparent border-0 shadow-none"
                    onClick={() => handleSort('title')}
                  >
                    {intl.formatMessage({ id: 'tasks.listTable.task', defaultMessage: 'Task' })}
                    <SortIcon field="title" />
                  </button>
                </TableHead>
                <TableHead className="w-[14%]">
                  <button
                    type="button"
                    className="h-8 p-0 font-semibold inline-flex items-center gap-1 bg-transparent border-0 shadow-none"
                    onClick={() => handleSort('status')}
                  >
                    {intl.formatMessage({ id: 'tasks.listTable.status', defaultMessage: 'Status' })}
                    <SortIcon field="status" />
                  </button>
                </TableHead>
                <TableHead className="w-[16%]">
                  <button
                    type="button"
                    className="h-8 p-0 font-semibold inline-flex items-center gap-1 bg-transparent border-0 shadow-none"
                    onClick={() => handleSort('priority')}
                  >
                    {intl.formatMessage({ id: 'tasks.listTable.priority', defaultMessage: 'Priority' })}
                    <SortIcon field="priority" />
                  </button>
                </TableHead>
                <TableHead className="w-[18%]">
                  <button
                    type="button"
                    className="h-8 p-0 font-semibold inline-flex items-center gap-1 bg-transparent border-0 shadow-none"
                    onClick={() => handleSort('assignee')}
                  >
                    {intl.formatMessage({ id: 'tasks.listTable.assignee', defaultMessage: 'Assignee' })}
                    <SortIcon field="assignee" />
                  </button>
                </TableHead>
                <TableHead className="w-[12%]">
                  <button
                    type="button"
                    className="h-8 p-0 font-semibold inline-flex items-center gap-1 bg-transparent border-0 shadow-none"
                    onClick={() => handleSort('dueDate')}
                  >
                    {intl.formatMessage({ id: 'tasks.listTable.dueDate', defaultMessage: 'Due Date' })}
                    <SortIcon field="dueDate" />
                  </button>
                </TableHead>
                <TableHead className="w-[12%]">{intl.formatMessage({ id: 'tasks.listTable.customFields', defaultMessage: 'Custom Fields' })}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
          </Table>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Table className="table-fixed w-full">
            <TableBody>
              {sortedTasks.map(task => {
                const isOverdue = task.dueDate && isAfter(new Date(), new Date(task.dueDate)) && task.status !== 'completed'
                const isDueToday = task.dueDate && isToday(new Date(task.dueDate))
                const assigneeDisplay = resolveAssigneeDisplay(task)

                return (
                  <TableRow
                    key={task.id}
                    className={`cursor-pointer hover:bg-neutral-200/50 ${
                      isOverdue
                        ? 'bg-red-200/30'
                        : isDueToday
                        ? 'bg-yellow-200/30'
                        : ''
                    }`}
                    onClick={() => onTaskClick?.(task)}
                  >
                    <TableCell className="w-[22%]">
                      <div className="space-y-1">
                        <p className="font-medium line-clamp-2 break-words">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{stripHtml(task.description)}</p>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="w-[14%]">
                      <Badge className="text-xs border" style={getStatusColor(task.status)}>
                        {getStatusLabel(task.status)}
                      </Badge>
                    </TableCell>

                    <TableCell className="w-[14%]">
                      <div className="flex items-center gap-1">
                        {getPriorityIcon(task.priority)}
                        <span className="text-sm">{task.priority.toUpperCase()}</span>
                      </div>
                    </TableCell>

                    <TableCell className="w-[18%]">
                      {assigneeDisplay && (
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="w-6 h-6">
                            <AvatarImage src={assigneeDisplay.avatarUrl} />
                            <AvatarFallback className="text-xs">
                              {getNameInitials(assigneeDisplay.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm truncate">{assigneeDisplay.name}</span>
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="w-[13%]">
                      {task.dueDate && (
                        <div className={`text-sm ${
                          isOverdue ? 'text-red-600' : isDueToday ? 'text-yellow-600' : 'text-muted-foreground'
                        }`}>
                          {intl.formatDate(new Date(task.dueDate), { month: 'short', day: '2-digit', year: 'numeric' })}
                        </div>
                      )}
                    </TableCell>

                    {/* Custom Fields Column (per-task) */}
                    <TableCell className="w-[12%]">
                      {(task as any).custom_fields && Array.isArray((task as any).custom_fields) && (task as any).custom_fields.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                          {((task as any).custom_fields as TaskCustomField[])
                            .filter(field => field.value !== undefined && field.value !== null && field.value !== '')
                            .slice(0, 3) // Show max 3 custom fields in table
                            .map(field => {
                              const displayValue = formatCustomFieldValue(field)
                              const optionColor = getOptionColor(field)

                              return (
                                <div
                                  key={field.id}
                                  className="flex items-center gap-1 text-xs"
                                  title={`${field.name}: ${displayValue}`}
                                >
                                  <span className="text-muted-foreground">{field.name}:</span>
                                  {optionColor ? (
                                    <span
                                      className="px-1.5 py-0.5 rounded font-medium"
                                      style={{ backgroundColor: `${optionColor}20`, color: optionColor }}
                                    >
                                      {displayValue}
                                    </span>
                                  ) : (
                                    <span className="font-medium truncate max-w-[80px]">{displayValue}</span>
                                  )}
                                </div>
                              )
                            })}
                          {((task as any).custom_fields as TaskCustomField[]).filter(field => field.value !== undefined && field.value !== null && field.value !== '').length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{((task as any).custom_fields as TaskCustomField[]).filter(field => field.value !== undefined && field.value !== null && field.value !== '').length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            {intl.formatMessage({ id: 'tasks.listTable.actions.viewDetails', defaultMessage: 'View Details' })}
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            {intl.formatMessage({ id: 'tasks.listTable.actions.edit', defaultMessage: 'Edit' })}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            {intl.formatMessage({ id: 'tasks.listTable.actions.delete', defaultMessage: 'Delete' })}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

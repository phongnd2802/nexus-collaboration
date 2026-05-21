import { useEffect, useMemo, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  List as ListIcon,
  Calendar,
  Target,
  AlertTriangle,
  CheckCircle2,
  Circle,
  PlayCircle,
} from 'lucide-react'
import { projectKeys, projectService, type Task } from '@/lib/api/projects-api'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useToast } from '@/components/ui/use-toast'
import {
  format,
  startOfMonth,
  startOfDay,
  endOfMonth,
  eachDayOfInterval,
  differenceInDays,
  addMonths,
  subMonths,
  isToday,
  isWeekend
} from 'date-fns'
import { getAssigneeInitials } from '@/utils/task-helpers'

interface GanttViewProps {
  tasks: Task[]
  workspaceId: string
  projectId: string
  onAddTask?: () => void
  onTaskClick?: (task: Task) => void
  kanbanStages?: Array<{ id: string; name: string; color: string }>
}

export function GanttView({
  tasks,
  workspaceId,
  projectId,
  onAddTask,
  onTaskClick,
  kanbanStages = []
}: GanttViewProps) {
  const intl = useIntl()
  const { members } = useWorkspace()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [timelineScrollWidth, setTimelineScrollWidth] = useState(1000)
  const timelineHeaderScrollRef = useRef<HTMLDivElement | null>(null)
  const timelineBodyScrollRef = useRef<HTMLDivElement | null>(null)
  const timelineBottomScrollRef = useRef<HTMLDivElement | null>(null)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const scheduledTasks = tasks.filter(task => task.dueDate)

  useEffect(() => {
    const headerEl = timelineHeaderScrollRef.current
    const bodyEl = timelineBodyScrollRef.current
    const bottomEl = timelineBottomScrollRef.current
    if (!headerEl || !bodyEl || !bottomEl) return

    let syncingSource: 'body' | 'bottom' | null = null

    const syncHeaderFromBody = () => {
      if (syncingSource === 'bottom') return
      syncingSource = 'body'
      headerEl.scrollLeft = bodyEl.scrollLeft
      bottomEl.scrollLeft = bodyEl.scrollLeft
      requestAnimationFrame(() => {
        syncingSource = null
      })
    }

    const syncFromBottomScrollbar = () => {
      if (syncingSource === 'body') return
      syncingSource = 'bottom'
      bodyEl.scrollLeft = bottomEl.scrollLeft
      headerEl.scrollLeft = bottomEl.scrollLeft
      requestAnimationFrame(() => {
        syncingSource = null
      })
    }

    bodyEl.addEventListener('scroll', syncHeaderFromBody)
    bottomEl.addEventListener('scroll', syncFromBottomScrollbar)
    headerEl.scrollLeft = bodyEl.scrollLeft
    bottomEl.scrollLeft = bodyEl.scrollLeft

    return () => {
      bodyEl.removeEventListener('scroll', syncHeaderFromBody)
      bottomEl.removeEventListener('scroll', syncFromBottomScrollbar)
    }
  }, [days.length, scheduledTasks.length])

  useEffect(() => {
    const bodyEl = timelineBodyScrollRef.current
    if (!bodyEl) return

    const syncTimelineWidth = () => {
      setTimelineScrollWidth(bodyEl.scrollWidth)
    }

    syncTimelineWidth()

    const resizeObserver = new ResizeObserver(() => {
      syncTimelineWidth()
    })

    resizeObserver.observe(bodyEl)
    const firstChild = bodyEl.firstElementChild
    if (firstChild instanceof HTMLElement) {
      resizeObserver.observe(firstChild)
    }

    window.addEventListener('resize', syncTimelineWidth)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', syncTimelineWidth)
    }
  }, [days.length, scheduledTasks.length, currentMonth])

  const memberByUserId = useMemo(() => {
    const map = new Map<string, any>()
    members.forEach((member) => {
      if (member.user_id) map.set(member.user_id, member)
      if (member.id) map.set(member.id, member)
      if (member.user?.id) map.set(member.user.id, member)
    })
    return map
  }, [members])

  const normalizeStatus = (status: string) => {
    const s = (status || '').toString().toLowerCase()
    if (s === '1') return 'todo'
    if (s === '2') return 'in_progress'
    if (s === '3') return 'review'
    if (s === '4') return 'completed'
    if (s === 'in-progress') return 'in_progress'
    if (s === 'done') return 'completed'
    return s
  }

  const getStageByStatus = (status: string) => {
    if (!kanbanStages.length) return undefined
    const normalized = normalizeStatus(status)
    return (
      kanbanStages.find((s) => s.id === status) ||
      kanbanStages.find((s) => normalizeStatus(s.id) === normalized)
    )
  }

  const getStatusLabel = (status: string) => {
    const stage = getStageByStatus(status)
    if (stage?.name) return stage.name

    const normalized = normalizeStatus(status)
    switch (normalized) {
      case 'todo':
        return intl.formatMessage({ id: 'tasks.status.todo', defaultMessage: 'To do' })
      case 'in_progress':
        return intl.formatMessage({ id: 'tasks.status.inProgress', defaultMessage: 'In progress' })
      case 'review':
        return intl.formatMessage({ id: 'tasks.status.review', defaultMessage: 'Review' })
      case 'completed':
        return intl.formatMessage({ id: 'tasks.status.completed', defaultMessage: 'Completed' })
      default:
        return status
    }
  }

  const getWeekdayLabel = (day: Date) => {
    if (intl.locale.startsWith('vi')) {
      const weekday = day.getDay()
      if (weekday === 0) return 'CN'
      return `Th${weekday + 1}`
    }

    return intl.formatDate(day, { weekday: 'short' })
  }

  const getTaskProgress = (task: Task) => {
    const stage = getStageByStatus(task.status)
    if (stage && kanbanStages.length > 0) {
      const stageIndex = kanbanStages.findIndex((s) => s.id === stage.id)
      if (stageIndex >= 0) {
        return Math.round(((stageIndex + 1) / kanbanStages.length) * 100)
      }
    }

    switch (normalizeStatus(task.status)) {
      case 'completed': return 100
      case 'in_progress': return 50
      case 'review': return 75
      default: return 0
    }
  }

  const getTaskDuration = (task: Task) => {
    if (!task.dueDate) return 0
    const startDate = new Date(task.createdAt)
    const endDate = new Date(task.dueDate)
    return Math.max(1, differenceInDays(endDate, startDate))
  }

  const getTaskDayId = (task: Task) => {
    if (!task.dueDate) return null
    return format(startOfDay(new Date(task.dueDate)), 'yyyy-MM-dd')
  }

  const getDroppableId = (taskId: string, dayId: string) => `${taskId}:${dayId}`

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return { bg: 'bg-red-500', border: 'border-red-600', text: 'text-red-100', accent: 'bg-red-600' }
      case 'medium': return { bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-yellow-900', accent: 'bg-yellow-600' }
      case 'low': return { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-100', accent: 'bg-green-600' }
      default: return { bg: 'bg-gray-500', border: 'border-gray-600', text: 'text-gray-100', accent: 'bg-gray-600' }
    }
  }

  const getStatusColor = (status: string) => {
    const stage = getStageByStatus(status)
    if (stage?.color) {
      return {
        bg: '',
        border: '',
        text: 'text-white',
        gradient: '',
        customColor: stage.color
      }
    }

    switch (normalizeStatus(status)) {
      case 'completed': return { bg: 'bg-emerald-500', border: 'border-emerald-600', text: 'text-emerald-100', gradient: 'from-emerald-500 to-emerald-600', customColor: undefined }
      case 'in_progress': return { bg: 'bg-yellow-500', border: 'border-yellow-600', text: 'text-yellow-900', gradient: 'from-yellow-500 to-yellow-600', customColor: undefined }
      case 'review': return { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-100', gradient: 'from-purple-500 to-purple-600', customColor: undefined }
      case 'todo': return { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-100', gradient: 'from-blue-500 to-blue-600', customColor: undefined }
      default: return { bg: 'bg-gray-500', border: 'border-gray-600', text: 'text-gray-100', gradient: 'from-gray-500 to-gray-600', customColor: undefined }
    }
  }

  const getStatusIcon = (status: string) => {
    switch (normalizeStatus(status)) {
      case 'completed': return <CheckCircle2 className="w-3 h-3" />
      case 'in_progress': return <PlayCircle className="w-3 h-3" />
      case 'review': return <Target className="w-3 h-3" />
      case 'todo': return <Circle className="w-3 h-3" />
      default: return <Circle className="w-3 h-3" />
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return <AlertTriangle className="w-3 h-3" />
      case 'medium': return <Target className="w-3 h-3" />
      case 'low': return <Circle className="w-3 h-3" />
      default: return <Circle className="w-3 h-3" />
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
  }

  const buildDueDateIso = (day: Date) => {
    const nextDueDate = new Date(day)
    nextDueDate.setHours(12, 0, 0, 0)
    return nextDueDate.toISOString()
  }

  const updateDueDateMutation = useMutation({
    mutationFn: ({ taskId, dueDateIso }: { taskId: string; dueDateIso: string }) =>
      projectService.updateTask(workspaceId, taskId, { due_date: dueDateIso }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.tasks(projectId) })
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    }
  })

  const handleTaskDrop = (taskId: string, day: Date) => {
    const dueDateIso = buildDueDateIso(day)
    const previousTasks = queryClient.getQueryData<any[]>(projectKeys.tasks(projectId))

    queryClient.setQueryData<any[]>(projectKeys.tasks(projectId), (old) => {
      if (!old) return old
      return old.map((apiTask: any) =>
        apiTask.id === taskId
          ? {
              ...apiTask,
              due_date: dueDateIso,
              dueDate: dueDateIso,
              updated_at: new Date().toISOString()
            }
          : apiTask
      )
    })

    updateDueDateMutation.mutate(
      { taskId, dueDateIso },
      {
        onError: () => {
          if (previousTasks) {
            queryClient.setQueryData(projectKeys.tasks(projectId), previousTasks)
          }
          toast({
            title: 'Error',
            description: 'Failed to update task due date.',
            variant: 'destructive'
          })
        }
      }
    )
  }

  const onDragEnd = (result: any) => {
    if (!result.destination) return

    const { draggableId, source, destination } = result

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return
    }

    const [destinationTaskId, destinationDayId] = String(destination.droppableId).split(':')
    if (destinationTaskId !== draggableId || !destinationDayId) {
      return
    }

    const targetDay = days.find((day) => format(day, 'yyyy-MM-dd') === destinationDayId)
    if (!targetDay) return

    handleTaskDrop(draggableId, targetDay)
  }

  const resolveAssigneeDisplay = (task: Task) => {
    const isLikelyUuid = (value: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)

    const pickDisplayName = (raw: any): string | undefined => {
      if (!raw || typeof raw !== 'string') return undefined
      const normalized = raw.trim()
      if (!normalized) return undefined
      if (isLikelyUuid(normalized)) return undefined
      return normalized
    }

    const fromMember = (id?: string) => {
      if (!id) return undefined
      const member = memberByUserId.get(id)
      if (!member) return undefined
      const name =
        pickDisplayName(member?.user?.name) ||
        pickDisplayName(member?.name) ||
        pickDisplayName(member?.email)
      if (!name) return undefined
      return {
        name,
        avatarUrl: member?.user?.avatar || member?.avatar_url
      }
    }

    const normalizeObjectAssignee = (assignee: any) => {
      if (!assignee || typeof assignee !== 'object') return undefined

      const userObj = assignee.user && typeof assignee.user === 'object' ? assignee.user : undefined
      const idCandidate =
        userObj?.id ||
        assignee.user_id ||
        assignee.assignee_id ||
        assignee.id

      const byId = typeof idCandidate === 'string' ? fromMember(idCandidate) : undefined
      if (byId) return byId

      const name =
        pickDisplayName(userObj?.name) ||
        pickDisplayName(assignee.name) ||
        pickDisplayName(assignee.fullName) ||
        pickDisplayName(assignee.display_name) ||
        pickDisplayName(userObj?.email) ||
        pickDisplayName(assignee.email)

      if (!name) return undefined

      return {
        name,
        avatarUrl:
          userObj?.avatar ||
          assignee.avatar_url ||
          assignee.avatarUrl ||
          assignee.avatar
      }
    }

    const assignees = Array.isArray((task as any).assignees) ? (task as any).assignees : []
    for (const a of assignees) {
      if (typeof a === 'string') {
        const byId = fromMember(a)
        if (byId) return byId
        const displayName = pickDisplayName(a)
        if (displayName) return { name: displayName, avatarUrl: undefined }
      } else {
        const normalized = normalizeObjectAssignee(a)
        if (normalized) return normalized
      }
    }

    const taskAssignee = normalizeObjectAssignee((task as any).assignee)
    if (taskAssignee) return taskAssignee

    const byAssigneeId = fromMember(task.assigneeId)
    if (byAssigneeId) return byAssigneeId

    return undefined
  }

  if (scheduledTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-muted/20 to-muted/40">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-6">
            <TrendingUp className="w-12 h-12 text-blue-600" />
          </div>
          <h3 className="text-2xl font-bold mb-3">
            {intl.formatMessage({ id: 'tasks.gantt.emptyTitle', defaultMessage: 'No tasks scheduled' })}
          </h3>
          <p className="text-muted-foreground mb-8 leading-relaxed">
            {intl.formatMessage({
              id: 'tasks.gantt.emptyDescription',
              defaultMessage: 'Create tasks with due dates to visualize your project timeline. The Gantt chart will help you track progress and dependencies.'
            })}
          </p>
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 shadow-lg" onClick={onAddTask}>
            <Plus className="w-5 h-5 mr-2" />
            {intl.formatMessage({ id: 'tasks.gantt.emptyCta', defaultMessage: 'Create Your First Task' })}
          </Button>
        </div>
      </div>
    )
  }

  return (
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b bg-gradient-to-r from-background to-muted/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-xl font-bold">
                  {intl.formatMessage({ id: 'tasks.gantt.title', defaultMessage: 'Gantt Chart' })}
                </h2>
              </div>
              <div className="flex items-center gap-3 bg-background border rounded-lg p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                  className="h-8"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="px-4 py-1 font-semibold text-center min-w-[140px]">
                  {intl.formatDate(currentMonth, { month: 'long', year: 'numeric' })}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                  className="h-8"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMonth(new Date())}
                  className="h-8 ml-2"
                >
                  <Calendar className="w-3 h-3 mr-1" />
                  {intl.formatMessage({ id: 'tasks.gantt.today', defaultMessage: 'Today' })}
                </Button>
              </div>
            </div>
          </div>

        </div>

        {/* Gantt Chart */}
        <div className="bg-background">
          <div className="flex bg-background">
            {/* Task List */}
            <div className="w-96 flex-shrink-0 border-r bg-gradient-to-b from-muted/5 to-muted/10">
              <div className="sticky top-0 z-20 h-[74px] border-b bg-background px-4 shadow-sm flex items-center relative before:absolute before:inset-x-0 before:-top-3 before:h-3 before:bg-background before:content-['']">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 rounded">
                      <ListIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="font-semibold">
                      {intl.formatMessage({ id: 'tasks.gantt.tasks', defaultMessage: 'Tasks' })}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {intl.formatMessage(
                      { id: 'tasks.gantt.itemsCount', defaultMessage: '{count, plural, one {# item} other {# items}}' },
                      { count: scheduledTasks.length }
                    )}
                  </Badge>
                </div>
              </div>
              <div className="space-y-0">
                {scheduledTasks.map((task, index) => {
                  const priorityColors = getPriorityColor(task.priority)
                  const statusColors = getStatusColor(task.status)
                  const progress = getTaskProgress(task)
                  const assigneeDisplay = resolveAssigneeDisplay(task)

                  return (
                    <div
                      key={task.id}
                      className={`group px-3 py-3 cursor-pointer transition-all duration-200 border h-28 flex items-start hover:bg-muted/50 hover:shadow-sm border-transparent hover:rounded-lg ${
                        index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                      }`}
                      onClick={() => onTaskClick?.(task)}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3 flex-1 min-w-0 max-w-[250px]">
                          <div className="flex-1 min-w-0 pt-2">
                            <div className="font-semibold text-sm truncate group-hover:text-blue-600 transition-colors">
                              {task.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 mb-1">
                              {intl.formatMessage(
                                { id: 'tasks.gantt.durationDays', defaultMessage: '{count, plural, one {# day} other {# days}}' },
                                { count: getTaskDuration(task) }
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mb-1">
                              {intl.formatMessage({ id: 'tasks.gantt.due', defaultMessage: 'Due' })}: {task.dueDate ? format(new Date(task.dueDate), 'dd/MM/yyyy') : '--'}
                            </div>
                            <div className="flex items-center gap-2">
                              {assigneeDisplay ? (
                                <>
                                  <Avatar className="w-5 h-5 ring-1 ring-background">
                                    <AvatarImage src={assigneeDisplay.avatarUrl} />
                                    <AvatarFallback className="text-xs bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700">
                                      {getAssigneeInitials(assigneeDisplay.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {assigneeDisplay.name}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {intl.formatMessage({ id: 'tasks.unassigned', defaultMessage: 'Unassigned' })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2 min-w-[56px]">
                          <Badge
                            variant="outline"
                            className={`text-xs ${statusColors.text} ${statusColors.bg} border-transparent`}
                            style={statusColors.customColor ? {
                              backgroundColor: statusColors.customColor,
                              borderColor: statusColors.customColor
                            } : undefined}
                          >
                            {getStatusLabel(task.status)}
                          </Badge>
                          <div className="flex items-center gap-2">
                            <div className="text-xs font-medium text-muted-foreground">
                              {progress}%
                            </div>
                            <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${statusColors.customColor ? '' : `bg-gradient-to-r ${statusColors.gradient}`} transition-all duration-300`}
                                style={{
                                  width: `${progress}%`,
                                  ...(statusColors.customColor ? { backgroundColor: statusColors.customColor } : {})
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Timeline */}
            <div className="flex-1 min-w-0 bg-gradient-to-br from-background to-muted/5">
              <div className="sticky top-0 z-30 border-b bg-background shadow-sm relative before:absolute before:inset-x-0 before:-top-3 before:h-3 before:bg-background before:content-['']">
                <div ref={timelineHeaderScrollRef} className="overflow-x-hidden">
                  <div
                    className="grid min-w-[1000px] border-b border-muted/20"
                    style={{ gridTemplateColumns: `repeat(${days.length}, minmax(48px, 1fr))` }}
                  >
                    {days.map((day) => {
                      const isCurrentDay = isToday(day)
                      const isWeekendDay = isWeekend(day)

                      return (
                        <div
                          key={day.toISOString()}
                          className={`relative h-[74px] p-3 text-center border-r border-muted/20 transition-colors ${
                            isCurrentDay
                              ? 'bg-blue-50 border-blue-200'
                              : isWeekendDay
                              ? 'bg-muted/30'
                              : 'bg-background hover:bg-muted/20'
                          }`}
                        >
                          <div className={`text-sm font-semibold ${
                            isCurrentDay ? 'text-blue-600' : 'text-foreground'
                          }`}>
                            {format(day, 'd')}
                          </div>
                          <div className={`text-xs ${
                            isCurrentDay
                              ? 'text-blue-500'
                              : 'text-muted-foreground'
                          }`}>
                            {getWeekdayLabel(day)}
                          </div>
                          {isCurrentDay && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div
                ref={timelineBodyScrollRef}
                className="overflow-x-auto [&::-webkit-scrollbar]:hidden"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <div className="min-w-[1000px]">
                  <DragDropContext onDragEnd={onDragEnd}>
                    <div className="relative">
                      {scheduledTasks.map((task, index) => {
                        const taskDayId = getTaskDayId(task)
                        const progress = getTaskProgress(task)
                        const statusColors = getStatusColor(task.status)
                        const priorityColors = getPriorityColor(task.priority)

                        return (
                          <div
                            key={task.id}
                            className={`grid relative h-28 border-b border-muted/10 transition-all duration-200 hover:bg-muted/20 ${
                              index % 2 === 0 ? 'bg-background' : 'bg-muted/5'
                            }`}
                            style={{ gridTemplateColumns: `repeat(${days.length}, minmax(48px, 1fr))` }}
                          >
                            {days.map((day, dayIndex) => {
                              const isCurrentDay = isToday(day)
                              const isWeekendDay = isWeekend(day)
                              const dayId = format(day, 'yyyy-MM-dd')
                              const isTaskDay = taskDayId === dayId

                              return (
                                <Droppable
                                  key={dayId}
                                  droppableId={getDroppableId(task.id, dayId)}
                                  type={task.id}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={`border-r h-full ${
                                        isCurrentDay
                                          ? 'border-blue-300'
                                          : isWeekendDay
                                          ? 'border-muted/40'
                                          : 'border-muted/20'
                                      } ${
                                        isCurrentDay ? 'bg-blue-50/50' : ''
                                      } ${
                                        snapshot.isDraggingOver ? 'bg-blue-100/70' : ''
                                      }`}
                                      style={{ gridColumn: dayIndex + 1 }}
                                    >
                                      {isTaskDay ? (
                                        <div className="flex items-start px-1 pt-3">
                                          <Draggable draggableId={task.id} index={0}>
                                            {(dragProvided, dragSnapshot) => (
                                              <div
                                                ref={dragProvided.innerRef}
                                                {...dragProvided.draggableProps}
                                                {...dragProvided.dragHandleProps}
                                                className={`h-8 w-full min-w-[40px] rounded-lg shadow-lg cursor-grab transition-all duration-300 hover:shadow-xl hover:scale-105 group border ${
                                                  dragSnapshot.isDragging ? 'opacity-75' : ''
                                                } ${statusColors.border}`}
                                                style={{
                                                  ...dragProvided.draggableProps.style,
                                                  borderColor: statusColors.customColor || undefined
                                                }}
                                                onClick={() => onTaskClick?.(task)}
                                              >
                                                <div
                                                  className={`h-full rounded-lg ${statusColors.customColor ? '' : `bg-gradient-to-r ${statusColors.gradient}`} relative overflow-hidden`}
                                                  style={statusColors.customColor ? { backgroundColor: statusColors.customColor } : undefined}
                                                >
                                                  <div
                                                    className="absolute top-0 left-0 h-full bg-white/25 rounded-lg transition-all duration-500"
                                                    style={{ width: `${progress}%` }}
                                                  />

                                                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${priorityColors.accent} rounded-l-lg`} />

                                                  <div className="absolute inset-0 flex items-center px-3">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0 pr-10">
                                                      {getStatusIcon(task.status)}
                                                      <span className={`text-xs font-semibold truncate ${statusColors.text}`}>
                                                        {task.title}
                                                      </span>
                                                    </div>
                                                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium ${statusColors.text} opacity-90`}>
                                                      {progress}%
                                                    </div>
                                                  </div>

                                                  <div className="absolute inset-0 bg-white/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                                </div>
                                              </div>
                                            )}
                                          </Draggable>
                                        </div>
                                      ) : null}
                                      {provided.placeholder}
                                    </div>
                                  )}
                                </Droppable>
                              )
                            })}
                          </div>
                        )
                      })}
                    </div>
                  </DragDropContext>
                </div>
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-40 flex border-t bg-background/95 backdrop-blur-sm relative after:absolute after:inset-x-0 after:-bottom-3 after:h-3 after:bg-background after:content-['']">
            <div className="w-96 flex-shrink-0 border-r bg-background" />
            <div
              ref={timelineBottomScrollRef}
              className="flex-1 overflow-x-auto"
            >
              <div className="h-4" style={{ width: `${timelineScrollWidth}px` }} />
            </div>
          </div>
        </div>
      </div>
  )
}

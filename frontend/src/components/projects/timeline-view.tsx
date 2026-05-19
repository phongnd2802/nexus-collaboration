import { useEffect, useMemo, useRef, useState } from 'react'
import { useIntl } from 'react-intl'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin
} from 'lucide-react'
import { projectKeys, projectService, type Task } from '@/lib/api/projects-api'
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isToday,
  format
} from 'date-fns'
import { getAssigneeName } from '@/utils/task-helpers'
import { useWorkspace } from '@/contexts/WorkspaceContext'
import { useToast } from '@/components/ui/use-toast'

interface TimelineViewProps {
  tasks: Task[]
  workspaceId: string
  projectId: string
  onTaskClick?: (task: Task) => void
  onAddTask?: () => void
}

export function TimelineView({ tasks, workspaceId, projectId, onTaskClick, onAddTask }: TimelineViewProps) {
  const intl = useIntl()
  const { members } = useWorkspace()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [optimisticDueDates, setOptimisticDueDates] = useState<Record<string, string>>({})
  const dragIntentRef = useRef(false)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const memberByUserId = useMemo(() => {
    const map = new Map<string, any>()
    members.forEach((member) => {
      if (member.user_id) map.set(member.user_id, member)
      if (member.id) map.set(member.id, member)
      if (member.user?.id) map.set(member.user.id, member)
    })
    return map
  }, [members])

  const getEffectiveDueDate = (task: Task) => optimisticDueDates[task.id] || task.dueDate

  useEffect(() => {
    setOptimisticDueDates((current) => {
      const next = { ...current }
      let changed = false

      for (const task of tasks) {
        const optimisticDueDate = current[task.id]
        if (!optimisticDueDate) continue
        if (task.dueDate === optimisticDueDate) {
          delete next[task.id]
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [tasks])

  const getTasksForDay = (day: Date) => {
    return tasks.filter(task => {
      const effectiveDueDate = getEffectiveDueDate(task)
      if (!effectiveDueDate) return false
      const taskDate = new Date(effectiveDueDate)
      return taskDate.toDateString() === day.toDateString()
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return intl.formatMessage({ id: 'tasks.priorityLevels.high', defaultMessage: 'High Priority' })
      case 'medium':
        return intl.formatMessage({ id: 'tasks.priorityLevels.medium', defaultMessage: 'Medium Priority' })
      case 'low':
        return intl.formatMessage({ id: 'tasks.priorityLevels.low', defaultMessage: 'Low Priority' })
      default:
        return priority
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'review': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1))
  }

  const buildDueDateIso = (dayId: string) => {
    const [year, month, date] = dayId.split('-').map(Number)
    const nextDueDate = new Date(year, month - 1, date, 12, 0, 0, 0)
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

  const onDragEnd = (result: any) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const dueDateIso = buildDueDateIso(destination.droppableId)
    const previousTasks = queryClient.getQueryData<any[]>(projectKeys.tasks(projectId))

    setOptimisticDueDates((current) => ({
      ...current,
      [draggableId]: dueDateIso
    }))

    queryClient.setQueryData<any[]>(projectKeys.tasks(projectId), (old) => {
      if (!old) return old
      return old.map((apiTask: any) =>
        apiTask.id === draggableId
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
      { taskId: draggableId, dueDateIso },
      {
        onError: () => {
          setOptimisticDueDates((current) => {
            const next = { ...current }
            delete next[draggableId]
            return next
          })
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

  const bindTaskPointerEvents = (task: Task) => ({
    onMouseDown: () => {
      dragIntentRef.current = false
    },
    onMouseMove: () => {
      dragIntentRef.current = true
    },
    onMouseUp: () => {
      window.setTimeout(() => {
        dragIntentRef.current = false
      }, 0)
    },
    onClick: () => {
      if (dragIntentRef.current) return
      onTaskClick?.(task)
    }
  })

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

  if (tasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold mb-2">No tasks scheduled</h3>
          <p className="text-muted-foreground mb-6">
            Tasks with due dates will appear in the timeline view
          </p>
          <Button size="lg" onClick={onAddTask}>
            <Plus className="w-4 h-4 mr-2" />
            Create Task
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Month Navigation */}
      <div className="flex-shrink-0 px-4 py-3 border-b bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-3 py-1 text-sm font-medium">
              {intl.formatDate(currentMonth, { month: 'long', year: 'numeric' })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentMonth(new Date())}
              className="ml-2"
            >
              {intl.formatMessage({ id: 'modules.calendar.dayView.today', defaultMessage: 'Today' })}
            </Button>
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center gap-6 p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="text-sm">{getPriorityLabel('high')}</span>
                </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm">{getPriorityLabel('medium')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm">{getPriorityLabel('low')}</span>
              </div>
            </div>

            {/* Timeline Grid */}
            <DragDropContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-7 gap-2">
                {/* Day Headers */}
                {[
                  { id: 'modules.calendar.monthView.sunShort', defaultMessage: 'Sun' },
                  { id: 'modules.calendar.monthView.monShort', defaultMessage: 'Mon' },
                  { id: 'modules.calendar.monthView.tueShort', defaultMessage: 'Tue' },
                  { id: 'modules.calendar.monthView.wedShort', defaultMessage: 'Wed' },
                  { id: 'modules.calendar.monthView.thuShort', defaultMessage: 'Thu' },
                  { id: 'modules.calendar.monthView.friShort', defaultMessage: 'Fri' },
                  { id: 'modules.calendar.monthView.satShort', defaultMessage: 'Sat' }
                ].map(day => (
                  <div key={day.id} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {intl.formatMessage({ id: day.id, defaultMessage: day.defaultMessage })}
                  </div>
                ))}

                {/* Days */}
                {days.map(day => {
                  const dayTasks = getTasksForDay(day)
                  const isCurrentDay = isToday(day)
                  const dayId = format(day, 'yyyy-MM-dd')

                  return (
                    <Droppable key={day.toISOString()} droppableId={dayId}>
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[120px] transition-colors ${
                            isCurrentDay ? 'ring-2 ring-blue-500' : ''
                          } ${
                            snapshot.isDraggingOver ? 'bg-blue-50 border-blue-300' : ''
                          }`}
                        >
                          <CardHeader className="p-2">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-medium ${isCurrentDay ? 'text-blue-600' : 'text-muted-foreground'}`}>
                                {day.getDate()}
                              </span>
                              {dayTasks.length > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {dayTasks.length}
                                </Badge>
                              )}
                            </div>
                          </CardHeader>
                          <CardContent className="p-2 space-y-1">
                            {dayTasks.slice(0, 3).map((task, index) => {
                              const assigneeDisplay = resolveAssigneeDisplay(task)
                              return (
                              <Draggable key={task.id} draggableId={task.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    {...bindTaskPointerEvents(task)}
                                    className={`p-1.5 rounded text-xs ${getStatusColor(task.status)} relative cursor-grab active:cursor-grabbing transition-transform ${
                                      snapshot.isDragging ? 'scale-105 shadow-lg z-50' : ''
                                    }`}
                                    style={provided.draggableProps.style}
                                  >
                                    <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${getPriorityColor(task.priority)}`} />
                                    <div className="pl-2">
                                      <div className="font-medium truncate">{task.title}</div>
                                      {assigneeDisplay && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <Avatar className="w-4 h-4" title={assigneeDisplay.name}>
                                            <AvatarImage src={assigneeDisplay.avatarUrl} />
                                            <AvatarFallback className="text-xs">
                                              {getNameInitials(assigneeDisplay.name)}
                                            </AvatarFallback>
                                          </Avatar>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            )})}
                            {dayTasks.length > 3 && (
                              <div className="text-xs text-muted-foreground text-center py-1">
                                +{dayTasks.length - 3} more
                              </div>
                            )}
                            {provided.placeholder}
                          </CardContent>
                        </Card>
                      )}
                    </Droppable>
                  )
                })}
              </div>
            </DragDropContext>

            {/* Unscheduled Tasks */}
            {tasks.filter(task => !getEffectiveDueDate(task)).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Unscheduled Tasks ({tasks.filter(task => !getEffectiveDueDate(task)).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {tasks
                      .filter(task => !getEffectiveDueDate(task))
                      .map(task => {
                        const assigneeDisplay = resolveAssigneeDisplay(task)
                        return (
                          <div
                          key={task.id}
                          className={`p-2 rounded text-xs ${getStatusColor(task.status)} relative cursor-pointer`}
                          >
                            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l ${getPriorityColor(task.priority)}`} />
                            <div className="pl-2">
                              <div className="font-medium truncate">{task.title}</div>
                              {assigneeDisplay && (
                                <div className="flex items-center gap-1 mt-1">
                                  <Avatar className="w-4 h-4" title={assigneeDisplay.name}>
                                    <AvatarImage src={assigneeDisplay.avatarUrl} />
                                    <AvatarFallback className="text-xs">
                                      {getNameInitials(assigneeDisplay.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    }
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Upcoming Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  {intl.formatMessage({ id: 'tasks.upcomingTasks', defaultMessage: 'Upcoming Tasks' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tasks
                    .filter(task => {
                      const effectiveDueDate = getEffectiveDueDate(task)
                      return effectiveDueDate ? new Date(effectiveDueDate) > new Date() : false
                    })
                    .sort((a, b) => {
                      const aDueDate = getEffectiveDueDate(a)
                      const bDueDate = getEffectiveDueDate(b)
                      return new Date(aDueDate!).getTime() - new Date(bDueDate!).getTime()
                    })
                    .slice(0, 5)
                    .map(task => {
                      const assigneeDisplay = resolveAssigneeDisplay(task)
                      const effectiveDueDate = getEffectiveDueDate(task)
                      return (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                          onClick={() => onTaskClick?.(task)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${getPriorityColor(task.priority)}`} title={getPriorityLabel(task.priority)} />
                            <div>
                              <div className="font-medium">{task.title}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {assigneeDisplay && (
                              <Avatar className="w-6 h-6" title={assigneeDisplay.name}>
                                <AvatarImage src={assigneeDisplay.avatarUrl} />
                                <AvatarFallback className="text-xs">
                                  {getNameInitials(assigneeDisplay.name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className="text-sm text-muted-foreground">
                              {effectiveDueDate
                                ? intl.formatDate(new Date(effectiveDueDate), { month: 'short', day: '2-digit' })
                                : ''}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

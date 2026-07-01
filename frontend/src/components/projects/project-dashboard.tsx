import { useState, useMemo } from 'react'
import { useIntl } from 'react-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  BarChart3,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Clock,
  User,
  Loader2,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Archive,
  Copy,
  Star,
  XCircle,
  FolderKanban
} from 'lucide-react'
import { projectService, type Project, projectKeys, useDeleteProject, useProjects } from '@/lib/api/projects-api'
import { useQueries } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'
import { DeleteConfirmationModal } from '@/components/ui/delete-confirmation-modal'
import { useAuth } from '@/contexts/AuthContext'
import { useProjectsStore } from '@/stores/useProjectsStore'
import { getProjectTypePreset } from '@/lib/project-type-presets'

const stripHtml = (html: string): string => {
  if (!html) return ''
  try {
    const preprocessed = html
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
    const doc = new DOMParser().parseFromString(preprocessed, 'text/html')
    return (doc.body.textContent || '').trim().replace(/\n\s*\n+/g, '\n')
  } catch (e) {
    return html.replace(/<[^>]*>/g, '\n').trim().replace(/\n\s*\n+/g, '\n')
  }
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22C55E',
  medium: '#3B82F6',
  high: '#F97316',
  critical: '#EF4444',
}

const getPriorityColor = (priority?: string): string => PRIORITY_COLORS[priority || 'medium'] || PRIORITY_COLORS.medium

interface ProjectDashboardProps {
  workspaceId: string
  onProjectSelect?: (projectId: string) => void
  onEditProject?: (project: any) => void
}

export function ProjectDashboard({ workspaceId, onProjectSelect, onEditProject }: ProjectDashboardProps) {
  const intl = useIntl()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'updated_desc' | 'updated_asc' | 'progress_desc'>('updated_desc')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()

  // Use the delete mutation hook that updates Zustand store
  const deleteProjectMutation = useDeleteProject()

  // ALWAYS use Zustand store as single source of truth
  const allProjects = useProjectsStore((state) => state.projects) || []
  const lastRefresh = useProjectsStore((state) => state.lastRefresh)

  // Fetch projects - this automatically syncs with Zustand store
  const { isLoading, error, refetch } = useProjects(workspaceId)

  console.log('[Dashboard] Projects:', allProjects.length, 'Sort:', sortBy, 'lastRefresh:', lastRefresh)
  console.log('[Dashboard] Project names:', allProjects.map(p => p.name))
  const projects = allProjects

  // Fetch tasks for all projects
  // Use the same query key as sidebar and task view for cache consistency
  const taskQueries = useQueries({
    queries: projects.map(project => ({
      queryKey: projectKeys.tasks(project.id),
      queryFn: () => projectService.getTasks(workspaceId, project.id),
      enabled: !!workspaceId && !!project.id,
      staleTime: 60 * 1000,
    }))
  })

  // Calculate project metrics based on actual tasks
  const projectsWithMetrics = useMemo(() => {
    return projects.map((project, index) => {
      const tasks = taskQueries[index]?.data || []

      // Get the last stage (completed stage) from kanban_stages
      const fallbackCompletion = getProjectTypePreset(project.type).completionStageId
      const lastStageId = project.kanban_stages && project.kanban_stages.length > 0
        ? project.kanban_stages.sort((a: any, b: any) => b.order - a.order)[0]?.id
        : fallbackCompletion

      // Calculate metrics
      const totalTasks = tasks.length
      const doneTasks = tasks.filter((task: any) => task.status === lastStageId).length
      const pendingTasks = totalTasks - doneTasks

      // Calculate average progress
      let averageProgress = 0
      if (totalTasks > 0 && project.kanban_stages && project.kanban_stages.length > 0) {
        const sortedStages = project.kanban_stages.sort((a: any, b: any) => a.order - b.order)
        const totalStages = sortedStages.length

        const totalProgress = tasks.reduce((sum: number, task: any) => {
          const stageIndex = sortedStages.findIndex((stage: any) => stage.id === task.status)
          if (stageIndex === -1) return sum
          const taskProgress = ((stageIndex + 1) / totalStages) * 100
          return sum + taskProgress
        }, 0)

        averageProgress = Math.round(totalProgress / totalTasks)
      }

      return {
        ...project,
        taskCount: totalTasks,
        completedTaskCount: doneTasks,
        pendingTaskCount: pendingTasks,
        averageProgress
      }
    })
  }, [projects, taskQueries])

  // Filter by search term only (type filtering is done by API)
  const filteredProjects = useMemo(() => {
    const normalizedSearch = searchTerm.toLowerCase()
    const visibleProjects = projectsWithMetrics.filter(project => {
      const matchesSearch = project.name.toLowerCase().includes(normalizedSearch) ||
                           (project.description ? stripHtml(project.description).toLowerCase().includes(normalizedSearch) : false)
      return matchesSearch
    })

    const getUpdatedTimestamp = (project: any) => {
      const rawValue = project.updatedAt || project.updated_at || project.createdAt || project.created_at
      const timestamp = rawValue ? new Date(rawValue).getTime() : 0
      return Number.isNaN(timestamp) ? 0 : timestamp
    }

    return [...visibleProjects].sort((a, b) => {
      if (sortBy === 'updated_asc') {
        return getUpdatedTimestamp(a) - getUpdatedTimestamp(b)
      }

      if (sortBy === 'progress_desc') {
        return (b.averageProgress || 0) - (a.averageProgress || 0)
      }

      return getUpdatedTimestamp(b) - getUpdatedTimestamp(a)
    })
  }, [projectsWithMetrics, searchTerm, sortBy])

  const getProjectProgress = (project: any) => {
    return project.averageProgress || 0
  }

  const getProjectMemberCount = (project: any) => {
    const collaborativeData = project.collaborative_data
    const memberIds: string[] = []

    if (collaborativeData?.project_lead) {
      memberIds.push(collaborativeData.project_lead)
    }

    if (Array.isArray(collaborativeData?.default_assignee_ids)) {
      memberIds.push(...collaborativeData.default_assignee_ids)
    }

    const uniqueCollaborators = [...new Set(memberIds.filter(Boolean))]
    if (uniqueCollaborators.length > 0) {
      return uniqueCollaborators.length
    }

    if (Array.isArray(project.members) && project.members.length > 0) {
      return project.members.length
    }

    if (Array.isArray(project.teamMembers) && project.teamMembers.length > 0) {
      return project.teamMembers.length
    }

    return 0
  }

  const getOverallStats = () => {
    const totalProjects = projectsWithMetrics.length
    const totalTasks = projectsWithMetrics.reduce((sum, p) => sum + (p.taskCount || 0), 0)
    const completedTasks = projectsWithMetrics.reduce((sum, p) => sum + (p.completedTaskCount || 0), 0)

    // A project is completed when its progress is 100%
    const completedProjects = projectsWithMetrics.filter(p => (p as any).averageProgress === 100).length
    const inProgressProjects = projectsWithMetrics.filter(p => (p as any).averageProgress > 0 && (p as any).averageProgress < 100).length

    // Calculate average progress of all projects
    const totalProgress = projectsWithMetrics.reduce((sum, p) => sum + ((p as any).averageProgress || 0), 0)
    const averageCompletionRate = totalProjects > 0 ? totalProgress / totalProjects : 0

    return {
      totalProjects,
      totalTasks,
      completedTasks,
      inProgressProjects,
      completedProjects,
      completionRate: averageCompletionRate
    }
  }

  const stats = getOverallStats()

  // Check if current user is the project owner
  const isProjectOwner = (project: Project) => {
    return project.owner_id === user?.id
  }

  // Project action handlers
  const handleViewProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onProjectSelect?.(projectId)
  }

  const handleEditProject = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEditProject) {
      onEditProject(project)
    }
  }

  const handleDuplicateProject = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    toast({
      title: "Duplicate Project",
      description: "Project duplication coming soon",
    })
  }

  const handleArchiveProject = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await projectService.archiveProject(projectId)
      toast({
        title: "Project Archived",
        description: "Project has been archived successfully",
      })
      refetch()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to archive project",
        variant: "destructive",
      })
    }
  }

  const handleDeleteProject = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation()
    setProjectToDelete({ id: project.id, name: project.name })
    setDeleteModalOpen(true)
  }

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return

    setIsDeleting(true)
    try {
      // Use the mutation hook that automatically updates Zustand store
      await deleteProjectMutation.mutateAsync({
        workspaceId,
        projectId: projectToDelete.id
      })

      toast({
        title: intl.formatMessage({ id: 'projects.projectDeleted' }),
        description: intl.formatMessage({ id: 'projects.deletedSuccessfully' }, { name: projectToDelete.name }),
      })
      setDeleteModalOpen(false)
      setProjectToDelete(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-2" />
          <p className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'projects.loadingProjects' })}</p>
        </div>
      </div>
    )
  }

  // Don't show error if we have mock data
  if (error && projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <XCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2">{intl.formatMessage({ id: 'projects.errorLoading' })}</h3>
          <p className="text-muted-foreground mb-4">{error instanceof Error ? error.message : intl.formatMessage({ id: 'projects.failedToLoad' })}</p>
          <Button onClick={() => refetch()}>
            {intl.formatMessage({ id: 'common.tryAgain' })}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{intl.formatMessage({ id: 'projects.totalProjects' })}</p>
                <p className="text-xl font-bold">{stats.totalProjects}</p>
              </div>
              <BarChart3 className="w-6 h-6 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{intl.formatMessage({ id: 'projects.totalTasks' })}</p>
                <p className="text-xl font-bold">{stats.totalTasks}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{intl.formatMessage({ id: 'projects.inProgress' })}</p>
                <p className="text-xl font-bold">{stats.inProgressProjects}</p>
              </div>
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{intl.formatMessage({ id: 'projects.completed' })}</p>
                <p className="text-xl font-bold">{stats.completedProjects}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            {intl.formatMessage({ id: 'projects.overallCompletionRate' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{intl.formatMessage({ id: 'projects.progress' })}</span>
              <span>{stats.completionRate.toFixed(1)}%</span>
            </div>
            <Progress value={stats.completionRate} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{intl.formatMessage({ id: 'projects.completedTasks' }, { count: stats.completedTasks })}</span>
              <span>{intl.formatMessage({ id: 'projects.totalCount' }, { count: stats.totalTasks })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Search and Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[300px] relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={intl.formatMessage({ id: 'projects.searchProjects' })}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={(value) => setSortBy(value as 'updated_desc' | 'updated_asc' | 'progress_desc')}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Sắp xếp" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_desc">Mới cập nhật gần nhất</SelectItem>
            <SelectItem value="updated_asc">Mới cập nhật cũ nhất</SelectItem>
            <SelectItem value="progress_desc">Tiến độ cao nhất</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,380px))] justify-start gap-4">
        {filteredProjects.map(project => {
          const progress = getProjectProgress(project)

          return (
            <Card
              key={project.id}
              className="h-full hover:shadow-md transition-shadow cursor-pointer relative"
              onClick={() => onProjectSelect?.(project.id)}
            >
              <CardHeader className="pb-3">
                {/* Action Menu - Top Right Corner */}
                <div className="absolute top-3 right-3 z-10">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-accent"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={(e) => handleViewProject(project.id, e)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {intl.formatMessage({ id: 'projects.viewProject' })}
                      </DropdownMenuItem>
                      {isProjectOwner(project) && (
                        <>
                          <DropdownMenuItem onClick={(e) => handleEditProject(project, e)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {intl.formatMessage({ id: 'common.edit' })}
                          </DropdownMenuItem>
                          {/* <DropdownMenuItem onClick={(e) => handleDuplicateProject(project.id, e)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem> */}
                          {/* <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={(e) => handleArchiveProject(project.id, e)}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem> */}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => handleDeleteProject(project, e)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {intl.formatMessage({ id: 'common.delete' })}
                          </DropdownMenuItem>
                        </>
                      )}
                      {!isProjectOwner(project) && (
                        <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                          {intl.formatMessage({ id: 'projects.onlyOwnerCanEdit' })}
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-start justify-between gap-2 pr-8">
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: getPriorityColor(project.priority) }}
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {intl.formatMessage({ id: `projects.status.${project.status}` }, { defaultMessage: project.status.charAt(0).toUpperCase() + project.status.slice(1) })}
                      </p>
                    </div>
                  </div>
                </div>
                {project.description && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p
                          className="mt-2 line-clamp-2 break-words text-sm text-muted-foreground"
                          title={stripHtml(project.description)}
                        >
                          {stripHtml(project.description)}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm whitespace-pre-wrap break-words text-sm">
                        {stripHtml(project.description)}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </CardHeader>

              <CardContent className="flex h-full flex-col space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{intl.formatMessage({ id: 'projects.progress' })}</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-blue-600">{project.taskCount || 0}</p>
                    <p className="text-xs text-muted-foreground break-words">{intl.formatMessage({ id: 'tasks.total' })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-green-600">{project.completedTaskCount || 0}</p>
                    <p className="text-xs text-muted-foreground break-words">{intl.formatMessage({ id: 'tasks.done' })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-orange-600">
                      {(project as any).pendingTaskCount || 0}
                    </p>
                    <p className="text-xs text-muted-foreground break-words">{intl.formatMessage({ id: 'tasks.pending' })}</p>
                  </div>
                </div>

                {/* Team Members */}
                <div className="mt-auto flex flex-col gap-3 border-t pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-1 min-w-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {intl.formatMessage({ id: 'projects.members' }, { count: getProjectMemberCount(project) })}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs self-start sm:self-auto max-w-full whitespace-normal break-words">
                    {project.status === 'active' ? intl.formatMessage({ id: 'projects.status.active' }) : intl.formatMessage({ id: 'projects.status.completed' })}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">{intl.formatMessage({ id: 'projects.noProjectsFound' })}</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? intl.formatMessage({ id: 'projects.tryAdjustingSearch' }) : intl.formatMessage({ id: 'projects.getStartedCreate' })}
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={confirmDeleteProject}
        title={intl.formatMessage({ id: 'projects.deleteProject' })}
        itemName={projectToDelete?.name}
        description={intl.formatMessage({ id: 'projects.deleteConfirmation' }, { name: projectToDelete?.name })}
        isLoading={isDeleting}
      />
    </div>
  )
}

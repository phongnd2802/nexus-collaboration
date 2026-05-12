import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { useAuth } from '../../contexts/AuthContext'
import { useIntl } from 'react-intl'
import { cn } from '../../lib/utils'
import {
  Search,
  Home,
  MessageSquare,
  ClipboardList,
  FileText,
  Calendar,
  Video,
  FolderOpen,
  Settings,
  Link2,
  BarChart3,
  Radio,
  LayoutGrid,
  Plug,
  Wrench,
  BookOpen,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNotesStore } from '../../stores/notesStore'

export type ViewType =
  | 'dashboard'
  | 'chat'
  | 'projects'
  | 'notes'
  | 'calendar'
  | 'video'
  | 'files'
  | 'ai-chat'
  | 'bots'
  | 'search'
  | 'settings'
  | 'integrations'
  | 'analytics'
  | 'monitoring'
  | 'apps'
  | 'more'
  | 'whiteboard'

interface NavigationItem {
  view: ViewType
  icon: LucideIcon
  labelKey: string
  path: string
}

const navigationItems: NavigationItem[] = [
  { view: 'dashboard', icon: Home, labelKey: 'navigation.dashboard', path: 'dashboard' },
  { view: 'chat', icon: MessageSquare, labelKey: 'navigation.messages', path: 'chat' },
  { view: 'ai-chat', icon: Sparkles, labelKey: 'navigation.aiChat', path: 'ai-chat' },
  { view: 'projects', icon: ClipboardList, labelKey: 'navigation.projects', path: 'projects' },
  { view: 'notes', icon: FileText, labelKey: 'navigation.notes', path: 'notes' },
  { view: 'calendar', icon: Calendar, labelKey: 'navigation.calendar', path: 'calendar' },
  { view: 'video', icon: Video, labelKey: 'navigation.videoCall', path: 'video-calls' },
  { view: 'files', icon: FolderOpen, labelKey: 'navigation.files', path: 'files' },
   /* { view: 'integrations', icon: Link2, labelKey: 'navigation.integrations', path: 'integrations' },
   { view: 'analytics', icon: BarChart3, labelKey: 'navigation.analytics', path: 'analytics' },
   { view: 'monitoring', icon: Radio, labelKey: 'navigation.monitoring', path: 'monitoring' }, */
]

const bottomItems: NavigationItem[] = [
  // { view: 'apps', icon: Plug, labelKey: 'navigation.connectors', path: 'apps' },
  // { view: 'more', icon: Wrench, labelKey: 'navigation.tools', path: 'more' },
  { view: 'settings', icon: Settings, labelKey: 'navigation.settings', path: 'settings' },
]

export function NavigationRail() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentWorkspace } = useWorkspace()
  const { user } = useAuth()
  const { clearSelection } = useNotesStore()
  const intl = useIntl()

  // Check if user is admin
  const isAdmin = user?.role === 'admin'

  // Extract workspace ID from current URL if available
  const getWorkspaceIdFromUrl = () => {
    const pathMatch = location.pathname.match(/\/workspaces\/([^\/]+)/)
    return pathMatch ? pathMatch[1] : null
  }

  const workspaceId = currentWorkspace?.id || getWorkspaceIdFromUrl()

  // Helper function to construct workspace-based URLs
  const getWorkspaceUrl = (path: string) => {
    if (!workspaceId) {
      // If no workspace ID, redirect to root which will handle workspace selection
      return '/'
    }
    return `/workspaces/${workspaceId}/${path}`
  }

  // Helper function to check if navigation item is active
  const isItemActive = (path: string) => {
    const pathname = location.pathname
    if (!workspaceId) {
      return pathname.endsWith(`/${path}`)
    }
    return pathname.includes(`/workspaces/${workspaceId}/${path}`)
  }

  // Handle notes click - always navigate to base notes page
  const handleNotesClick = (e: React.MouseEvent) => {
    e.preventDefault()
    clearSelection()
    if (workspaceId) {
      navigate(`/workspaces/${workspaceId}/notes`)
    }
  }

  return (
    <nav
      className="flex flex-col items-center w-16 bg-[#FAF9F5] border-r border-[rgba(31,30,29,0.1)] z-50 dark:bg-[#141413] dark:border-[rgba(31,30,29,0.2)]"
    >
      <div className="flex-1 flex flex-col gap-2 pt-4 pb-4">
        {navigationItems.map((item) => {
          const isActive = isItemActive(item.path)
          const href = getWorkspaceUrl(item.path)
          return (
            <Link
              key={item.view}
              to={href}
              title={intl.formatMessage({ id: item.labelKey })}
              onClick={item.view === 'notes' ? handleNotesClick : undefined}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                "hover:bg-[rgba(31,30,29,0.04)] text-[#1F1E1D] dark:text-[#FAF9F5] dark:hover:bg-[rgba(255,255,255,0.06)]",
                isActive && "bg-[#1F1E1D] text-white hover:bg-[#0A0A0A] dark:bg-[#FAF9F5] dark:text-[#1F1E1D] dark:hover:bg-[#e8e8e5]"
              )}
            >
              <item.icon className="h-5 w-5 min-w-[20px]" />
            </Link>
          )
        })}

        {/* Blog button - Admin only */}
        {isAdmin && (
          <Link
            to="/blog"
            title="Blog"
            className={cn(
              "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
              "hover:bg-[rgba(31,30,29,0.04)] text-[#1F1E1D] dark:text-[#FAF9F5] dark:hover:bg-[rgba(255,255,255,0.06)]",
              location.pathname.includes('/blog') && "bg-[#1F1E1D] text-white hover:bg-[#0A0A0A] dark:bg-[#FAF9F5] dark:text-[#1F1E1D] dark:hover:bg-[#e8e8e5]"
            )}
          >
            <BookOpen className="h-5 w-5 min-w-[20px]" />
          </Link>
        )}

        {/* Search button */}
        <Link
          to={getWorkspaceUrl('search')}
          title={intl.formatMessage({ id: 'navigation.search' })}
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
            "hover:bg-[rgba(31,30,29,0.04)] text-[#1F1E1D] dark:text-[#FAF9F5] dark:hover:bg-[rgba(255,255,255,0.06)]",
            isItemActive('search') && "bg-[#1F1E1D] text-white hover:bg-[#0A0A0A] dark:bg-[#FAF9F5] dark:text-[#1F1E1D] dark:hover:bg-[#e8e8e5]"
          )}
        >
          <Search className="h-5 w-5 min-w-[20px]" />
        </Link>
      </div>

      <div className="mt-auto pb-4 flex flex-col gap-2">
        {bottomItems.map((item) => {
          const isActive = isItemActive(item.path)
          const href = getWorkspaceUrl(item.path)
          return (
            <Link
              key={item.view}
              to={href}
              title={intl.formatMessage({ id: item.labelKey })}
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                "hover:bg-[rgba(31,30,29,0.04)] text-[#1F1E1D] dark:text-[#FAF9F5] dark:hover:bg-[rgba(255,255,255,0.06)]",
                isActive && "bg-[#1F1E1D] text-white hover:bg-[#0A0A0A] dark:bg-[#FAF9F5] dark:text-[#1F1E1D] dark:hover:bg-[#e8e8e5]"
              )}
            >
              <item.icon className="h-5 w-5 min-w-[20px]" />
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
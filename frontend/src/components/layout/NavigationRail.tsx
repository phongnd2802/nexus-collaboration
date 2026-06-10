import React, { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
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
  LayoutGrid,
  Plug,
  Wrench,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
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
  | 'email'
  | 'search'
  | 'settings'
  | 'integrations'
  | 'analytics'
  | 'apps'
  | 'more'

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
   { view: 'analytics', icon: BarChart3, labelKey: 'navigation.analytics', path: 'analytics' }, */
]

const bottomItems: NavigationItem[] = [
  // { view: 'apps', icon: Plug, labelKey: 'navigation.connectors', path: 'apps' },
  // { view: 'more', icon: Wrench, labelKey: 'navigation.tools', path: 'more' },
  { view: 'settings', icon: Settings, labelKey: 'navigation.settings', path: 'settings' },
]

interface NavigationRailProps {
  defaultExpanded?: boolean
}

export function NavigationRail({ defaultExpanded = false }: NavigationRailProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { workspaceId: routeWorkspaceId } = useParams<{ workspaceId: string }>()
  const { currentWorkspace } = useWorkspace()
  const { user } = useAuth()
  const { clearSelection } = useNotesStore()
  const intl = useIntl()
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isBrandHovered, setIsBrandHovered] = useState(false)
  const [isHoverLocked, setIsHoverLocked] = useState(false)

  // Check if user is admin
  const isAdmin = user?.role === 'admin'

  // Extract workspace ID from current URL if available
  const getWorkspaceIdFromUrl = () => {
    const pathMatch = location.pathname.match(/\/workspaces\/([^\/]+)/)
    return pathMatch ? pathMatch[1] : null
  }

  const workspaceId = currentWorkspace?.id || routeWorkspaceId || getWorkspaceIdFromUrl()
  const logoTarget = workspaceId ? `/workspaces/${workspaceId}/dashboard` : '/'

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

  const handleBrandMouseEnter = () => {
    if (!isHoverLocked) {
      setIsBrandHovered(true)
    }
  }

  const handleBrandMouseLeave = () => {
    setIsBrandHovered(false)
    setIsHoverLocked(false)
  }

  const handleExpandSidebar = () => {
    setIsExpanded(true)
    setIsBrandHovered(false)
    setIsHoverLocked(true)
    window.dispatchEvent(new Event('nexus:layout-changed'))
    setTimeout(() => window.dispatchEvent(new Event('nexus:layout-changed')), 320)
  }

  const handleCollapseSidebar = () => {
    setIsExpanded(false)
    setIsBrandHovered(false)
    setIsHoverLocked(true)
    window.dispatchEvent(new Event('nexus:layout-changed'))
    setTimeout(() => window.dispatchEvent(new Event('nexus:layout-changed')), 320)
  }

  return (
    <nav
      className={cn(
        "flex flex-col bg-[#FAF9F5] border-r border-[rgba(31,30,29,0.1)] z-50 dark:bg-[#141413] dark:border-[rgba(31,30,29,0.2)] transition-all duration-300",
        isExpanded ? "w-60 px-3" : "w-16 items-center"
      )}
    >
      <div
        className={cn("pt-4 pb-3 border-b border-[rgba(31,30,29,0.1)] dark:border-[rgba(31,30,29,0.2)]", isExpanded ? "px-1" : "")}
        onMouseEnter={handleBrandMouseEnter}
        onMouseLeave={handleBrandMouseLeave}
      >
        {!isExpanded ? (
          <button
            type="button"
            title={intl.formatMessage({ id: 'navigation.toggleSidebar', defaultMessage: 'Toggle sidebar info' })}
            aria-label={intl.formatMessage({ id: 'navigation.toggleSidebar', defaultMessage: 'Toggle sidebar info' })}
            onClick={handleExpandSidebar}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 hover:bg-[rgba(31,30,29,0.04)] text-[#1F1E1D] dark:text-[#FAF9F5] dark:hover:bg-[rgba(255,255,255,0.06)]"
          >
            {isBrandHovered ? (
              <PanelLeftOpen className="h-5 w-5 min-w-[20px]" />
            ) : (
              <img src="/nexus-logo.png" alt="Nexus" className="w-6 h-6 min-w-[24px]" />
            )}
          </button>
        ) : (
          <div className="flex items-center justify-between gap-2 px-3 h-10 rounded-xl">
            <Link to={logoTarget} className="flex items-center gap-2 min-w-0 hover:opacity-80">
              <img src="/nexus-logo.png" alt="Nexus Logo" className="w-8 h-8" />
              <span className="font-bold text-2xl leading-none bg-gradient-to-r from-[#D97757] to-[#DC6038] bg-clip-text text-transparent truncate">
                Nexus
              </span>
            </Link>
            <button
              type="button"
              onClick={handleCollapseSidebar}
              className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200 hover:bg-[rgba(31,30,29,0.04)]"
            >
              <PanelLeftClose className="h-5 w-5 min-w-[20px]" />
            </button>
          </div>
        )}

      </div>
      <div className={cn("flex-1 flex flex-col gap-2 pt-4 pb-4", isExpanded ? "px-1" : "")}>
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
                "flex items-center rounded-xl transition-all duration-200 h-10",
                isExpanded ? "w-full justify-start gap-3 px-3" : "justify-center w-10",
                "hover:bg-[rgba(31,30,29,0.04)] text-[#1F1E1D] dark:text-[#FAF9F5] dark:hover:bg-[rgba(255,255,255,0.06)]",
                isActive && "bg-[#1F1E1D] text-white hover:bg-[#0A0A0A] dark:bg-[#FAF9F5] dark:text-[#1F1E1D] dark:hover:bg-[#e8e8e5]"
              )}
            >
              <item.icon className="h-5 w-5 min-w-[20px]" />
              {isExpanded && (
                <span className="text-sm font-medium truncate">
                  {intl.formatMessage({ id: item.labelKey })}
                </span>
              )}
            </Link>
          )
        })}

        {/* Search button */}
        <Link
          to={getWorkspaceUrl('search')}
          title={intl.formatMessage({ id: 'navigation.search' })}
          className={cn(
            "flex items-center rounded-xl transition-all duration-200 h-10",
            isExpanded ? "w-full justify-start gap-3 px-3" : "justify-center w-10",
            "hover:bg-[rgba(31,30,29,0.04)] text-[#1F1E1D] dark:text-[#FAF9F5] dark:hover:bg-[rgba(255,255,255,0.06)]",
            isItemActive('search') && "bg-[#1F1E1D] text-white hover:bg-[#0A0A0A] dark:bg-[#FAF9F5] dark:text-[#1F1E1D] dark:hover:bg-[#e8e8e5]"
          )}
        >
          <Search className="h-5 w-5 min-w-[20px]" />
          {isExpanded && (
            <span className="text-sm font-medium truncate">
              {intl.formatMessage({ id: 'navigation.search' })}
            </span>
          )}
        </Link>
      </div>

      <div className={cn("mt-auto pb-4 flex flex-col gap-2", isExpanded ? "px-1" : "")}>
        {bottomItems.map((item) => {
          const isActive = isItemActive(item.path)
          const href = getWorkspaceUrl(item.path)
          return (
            <Link
              key={item.view}
              to={href}
              title={intl.formatMessage({ id: item.labelKey })}
              className={cn(
                "flex items-center rounded-xl transition-all duration-200 h-10",
                isExpanded ? "w-full justify-start gap-3 px-3" : "justify-center w-10",
                "hover:bg-[rgba(31,30,29,0.04)] text-[#1F1E1D] dark:text-[#FAF9F5] dark:hover:bg-[rgba(255,255,255,0.06)]",
                isActive && "bg-[#1F1E1D] text-white hover:bg-[#0A0A0A] dark:bg-[#FAF9F5] dark:text-[#1F1E1D] dark:hover:bg-[#e8e8e5]"
              )}
            >
              <item.icon className="h-5 w-5 min-w-[20px]" />
              {isExpanded && (
                <span className="text-sm font-medium truncate">
                  {intl.formatMessage({ id: item.labelKey })}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

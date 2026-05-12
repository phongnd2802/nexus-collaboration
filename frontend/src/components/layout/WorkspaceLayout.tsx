import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { Helmet } from '@dr.pogodin/react-helmet'
import { NavigationRail } from './NavigationRail'
import type { ViewType } from './NavigationRail'
import { LeftSidebar } from './LeftSidebar'
import { MainContent } from './MainContent'
import { RightSidebar } from './RightSidebar'
import { DeskiAssistantModal, DeskiAssistantFloatingButton } from '../ai/DeskiAssistantModal'
import { WorkspaceHeader } from './WorkspaceHeader'
import { VideoCallManager } from '@/components/video-call'
import { WebRTCCallWrapper } from '@/components/video-call/WebRTCCallWrapper'
import { IncomingCallModal } from '@/components/video-call/IncomingCallModal'
import { MemberProfilePanel } from '@/components/workspace/MemberProfilePanel'
import { useVideoCallSocket } from '@/hooks/useVideoCallSocket'
import { useMemberProfile } from '@/hooks/useMemberProfile'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from 'sonner'
import { FilesSidebarProvider } from '../../contexts/FilesSidebarContext'
import { RightSidebarProvider, useRightSidebar } from '../../contexts/RightSidebarContext'
import { useQueries } from '@tanstack/react-query'
import { useProjects, projectService, projectKeys, type Project } from '@/lib/api/projects-api'
import { useQueryClient } from '@tanstack/react-query'
import { useDashboard } from '@/lib/api/dashboard-api'
import { getRingtone } from '@/utils/ringtone'
import { useNavigate } from 'react-router-dom'

export interface SidebarStates {
  left: boolean
  right: boolean
}

interface WorkspaceLayoutProps {
  children?: React.ReactNode
}

function WorkspaceLayoutInner({ children }: WorkspaceLayoutProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const { user } = useAuth()
  const { isMinimized, toggleMinimized, chatData } = useRightSidebar()
  const { incomingCall, clearIncomingCall, declineCall, broadcastCallAccepted, broadcastCallDeclined } = useVideoCallSocket()
  const { isOpen: isMemberProfileOpen, selectedMember, closeMemberProfile } = useMemberProfile()
  const queryClient = useQueryClient()
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [sidebarStates, setSidebarStates] = useState<SidebarStates>({
    left: true,
    right: true,
  })
  const [isTabActive, setIsTabActive] = useState(true)
  const [isAIModalOpen, setIsAIModalOpen] = useState(false)

  const incomingCallWindowRef = useRef<Window | null>(null)
  const currentIncomingCallIdRef = useRef<string | null>(null)

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isActive = !document.hidden
      setIsTabActive(isActive)
    }

    const handleFocus = () => setIsTabActive(true)
    const handleBlur = () => setIsTabActive(false)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
    }
  }, [])

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      const requestPermissionOnClick = () => {
        Notification.requestPermission().catch(_err => {})
        document.removeEventListener('click', requestPermissionOnClick)
      }
      document.addEventListener('click', requestPermissionOnClick, { once: true })
    }
  }, [])

  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const workspaceIndex = pathSegments.indexOf('workspaces')
    const viewSegment = workspaceIndex >= 0 && pathSegments[workspaceIndex + 2]
      ? pathSegments[workspaceIndex + 2]
      : 'dashboard'

    const viewMap: Record<string, ViewType> = {
      'dashboard': 'dashboard', 'chat': 'chat', 'ai-chat': 'ai-chat',
      'projects': 'projects', 'notes': 'notes', 'calendar': 'calendar',
      'video-calls': 'video', 'files': 'files', 'search': 'search',
      'settings': 'settings', 'integrations': 'integrations',
      'analytics': 'analytics', 'monitoring': 'monitoring',
      'notifications': 'dashboard', 'apps': 'apps', 'more': 'more',
    }

    const view = viewMap[viewSegment] || 'dashboard'
    setCurrentView(view)

    if (view === 'settings' || view === 'dashboard' || view === 'search' || view === 'apps' || view === 'more' || view === 'ai-chat') {
      setSidebarStates(prev => ({
        ...prev,
        right: view === 'ai-chat' ? false : false,
        left: view === 'settings' ? true : (view === 'dashboard' || view === 'apps' || view === 'more' || view === 'ai-chat') ? false : prev.left
      }))
    } else {
      setSidebarStates(prev => ({
        ...prev,
        right: true,
        left: true
      }))
    }
  }, [location])

  const toggleSidebar = (side: 'left' | 'right') => {
    setSidebarStates(prev => ({
      ...prev,
      [side]: !prev[side]
    }))
  }

  const toggleAIModal = () => {
    setIsAIModalOpen(prev => !prev)
  }

  const isInActiveCall = location.pathname.includes('/video-calls/') &&
                         !location.pathname.endsWith('/video-calls')

  useEffect(() => {
    const previousCallId = currentIncomingCallIdRef.current
    if (previousCallId && !incomingCall) {
      if (incomingCallWindowRef.current && !incomingCallWindowRef.current.closed) {
        incomingCallWindowRef.current.close()
        incomingCallWindowRef.current = null
      }
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const notification = new Notification('', { tag: previousCallId, silent: true })
          notification.close()
        } catch (err) {}
      }
      currentIncomingCallIdRef.current = null
    }
    if (incomingCall) {
      currentIncomingCallIdRef.current = incomingCall.callId
    }
  }, [incomingCall])

  useEffect(() => {
    if (incomingCall && !isInActiveCall) {
      if (!isTabActive) {
        if (incomingCallWindowRef.current && !incomingCallWindowRef.current.closed) {
          incomingCallWindowRef.current.close()
        }

        const params = new URLSearchParams({
          callId: incomingCall.callId,
          workspaceId: workspaceId || '',
          callerName: incomingCall.from.name,
          callerAvatar: incomingCall.from.avatar || '',
          callType: incomingCall.callType,
          isGroupCall: String(incomingCall.isGroupCall),
        })
        const notificationUrl = `/incoming-call?${params.toString()}`
        const windowFeatures = 'width=400,height=600,menubar=no,toolbar=no,location=no,status=no,scrollbars=no,alwaysRaised=yes'

        const openCallWindow = () => {
          const callWindow = window.open(notificationUrl, `incoming-call-${incomingCall.callId}`, windowFeatures)
          incomingCallWindowRef.current = callWindow
          if (callWindow) { callWindow.focus(); callWindow.focus() }
          return callWindow
        }

        if ('Notification' in window && Notification.permission === 'granted') {
          try {
            const notification = new Notification(
              `Incoming ${incomingCall.callType} call from ${incomingCall.from.name}`,
              {
                body: incomingCall.isGroupCall ? 'Group call' : 'Direct call',
                icon: incomingCall.from.avatar || 'https://cdn.nexusapp.io/nexus-logo.png',
                tag: incomingCall.callId,
                requireInteraction: true,
                badge: 'https://cdn.nexusapp.io/nexus-logo.png',
              }
            )
            notification.onclick = () => {
              notification.close()
              if (incomingCallWindowRef.current && !incomingCallWindowRef.current.closed) {
                incomingCallWindowRef.current.focus()
              } else {
                openCallWindow()
              }
              window.focus()
            }
          } catch (err) {}
        } else if ('Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission()
        }
      }
    }
  }, [incomingCall, workspaceId, isInActiveCall, isTabActive])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const { type, callId, settings } = event.data
      if (type === 'CALL_ACCEPTED' && callId === incomingCall?.callId && incomingCall) {
        broadcastCallAccepted(callId)
        if (settings) sessionStorage.setItem('callMediaSettings', JSON.stringify(settings))
        clearIncomingCall()
        if (incomingCallWindowRef.current && !incomingCallWindowRef.current.closed) {
          incomingCallWindowRef.current.close()
        }
      } else if (type === 'CALL_DECLINED' && callId === incomingCall?.callId && incomingCall) {
        broadcastCallDeclined(callId)
        declineCall(callId, incomingCall.from.id)
        clearIncomingCall()
        if (incomingCallWindowRef.current && !incomingCallWindowRef.current.closed) {
          incomingCallWindowRef.current.close()
        }
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [incomingCall, clearIncomingCall, declineCall, broadcastCallAccepted, broadcastCallDeclined])

  const handleAcceptCallFromModal = (settings?: { micEnabled: boolean; cameraEnabled: boolean }) => {
    if (incomingCall) {
      broadcastCallAccepted(incomingCall.callId)
      try { getRingtone().stop() } catch (err) {}
      if (settings) sessionStorage.setItem('callMediaSettings', JSON.stringify(settings))
      const callUrl = `/call/${workspaceId}/${incomingCall.callId}`
      window.open(callUrl, `video-call-${incomingCall.callId}`, 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no')
      clearIncomingCall()
    }
  }

  const handleDeclineCallFromModal = () => {
    if (!incomingCall) return
    broadcastCallDeclined(incomingCall.callId)
    declineCall(incomingCall.callId, incomingCall.from.id)
    try { getRingtone().stop() } catch (err) {}
    clearIncomingCall()
    toast.info('Call declined')
  }

  const { data: projectsResponse } = useProjects(
    (workspaceId && currentView === 'projects') ? workspaceId : ''
  )
  const { data: dashboardResponse } = useDashboard(
    (workspaceId && currentView === 'dashboard') ? workspaceId : '',
    currentView === 'dashboard' ? {} : undefined
  )
  const projects = Array.isArray(projectsResponse)
    ? projectsResponse
    : (projectsResponse?.data || [])

  const taskQueries = useQueries({
    queries: projects.map(project => ({
      queryKey: projectKeys.tasks(project.id),
      queryFn: () => projectService.getTasks(workspaceId!, project.id),
      enabled: !!workspaceId && !!project.id && currentView === 'projects',
      staleTime: 60 * 1000,
    }))
  })

  const taskQueriesDataString = JSON.stringify(taskQueries.map(q => q.data))
  const taskQueriesData = useMemo(() => {
    return taskQueries.map(query => query.data)
  }, [taskQueriesDataString])

  const projectsData = useMemo(() => {
    if (currentView !== 'projects' || !workspaceId) return undefined
    const allTasks = taskQueriesData.filter(data => data).flatMap(data => data || [])
    const projectsWithMetrics = projects.map((project, index) => {
      const projectTasks = taskQueriesData[index] || []
      const stages = project.kanban_stages && project.kanban_stages.length > 0
        ? project.kanban_stages.sort((a: any, b: any) => a.order - b.order)
        : [{ id: 'todo', order: 1 }, { id: 'in_progress', order: 2 }, { id: 'done', order: 3 }]
      const totalStages = stages.length
      const totalTasks = projectTasks.length
      let averageProgress = 0
      if (totalTasks > 0) {
        const totalProgress = projectTasks.reduce((sum, task) => {
          const currentStage = stages.findIndex((stage: any) => stage.id === task.status)
          return currentStage === -1 ? sum : sum + ((currentStage + 1) / totalStages) * 100
        }, 0)
        averageProgress = Math.round(totalProgress / totalTasks)
      }
      return { ...project, averageProgress }
    })
    return { projects: projectsWithMetrics, allTasks }
  }, [currentView, workspaceId, projects, taskQueriesData])

  return (
    <FilesSidebarProvider>
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
      </Helmet>
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        <WorkspaceHeader />
        <div className="flex flex-1 overflow-hidden">
          <NavigationRail />
          <LeftSidebar
            currentView={currentView}
            isCollapsed={!sidebarStates.left}
            key="left-sidebar"
          />
          <MainContent
            currentView={currentView}
            onToggleSidebar={toggleSidebar}
            isRightSidebarCollapsed={!sidebarStates.right}
          >
            {children}
          </MainContent>
          {!isAIModalOpen && (
            <RightSidebar
              currentView={currentView}
              isCollapsed={!sidebarStates.right}
              isMinimized={isMinimized}
              onToggleMinimized={toggleMinimized}
              workspaceId={workspaceId}
              projectsData={projectsData}
              chatData={chatData}
              dashboardData={dashboardResponse}
            />
          )}
        </div>
        <DeskiAssistantModal
          isOpen={isAIModalOpen}
          onClose={() => setIsAIModalOpen(false)}
          currentView={currentView}
        />
        {!isAIModalOpen && (
          <DeskiAssistantFloatingButton onClick={() => setIsAIModalOpen(true)} />
        )}
        {user && (
          <>
            <VideoCallManager
              userId={user.id || 'user-123'}
              userName={user.name || user.email || 'User'}
            />
            <WebRTCCallWrapper />
          </>
        )}
        {!isInActiveCall && (
          <IncomingCallModal
            isOpen={!!incomingCall}
            onAccept={handleAcceptCallFromModal}
            onDecline={handleDeclineCallFromModal}
            callInvitation={incomingCall ? {
              id: incomingCall.callId,
              callerId: incomingCall.from.id,
              callerName: incomingCall.from.name,
              callerAvatar: incomingCall.from.avatar,
              callType: incomingCall.callType,
              timestamp: new Date(incomingCall.timestamp).getTime(),
              isGroupCall: incomingCall.isGroupCall,
              participants: [],
            } : null}
          />
        )}
        <MemberProfilePanel
          member={selectedMember}
          isOpen={isMemberProfileOpen}
          onClose={closeMemberProfile}
          onSendMessage={(memberId) => {
            closeMemberProfile()
            navigate(`/workspaces/${workspaceId}/chat?userId=${memberId}`)
          }}
          onStartCall={(memberId, type) => {
            closeMemberProfile()
            navigate(`/workspaces/${workspaceId}/video-calls?callUser=${memberId}&type=${type}`)
          }}
        />
      </div>
    </FilesSidebarProvider>
  )
}

export function WorkspaceLayout({ children }: WorkspaceLayoutProps) {
  return (
    <RightSidebarProvider>
      <WorkspaceLayoutInner>{children}</WorkspaceLayoutInner>
    </RightSidebarProvider>
  )
}

/**
 * VideoRightSidebar Component - Video analytics and meeting history
 * Migrated from workspace-suite-frontend with clean architecture
 */

import React, { useCallback, useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useIntl } from 'react-intl'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import {
  Video,
  Clock,
  BarChart3,
  Users,
  Copy,
  X,
  CheckCircle,
  LogIn
} from 'lucide-react'
import { toast } from 'sonner'
import { useVideoCallAnalytics, useVideoCalls } from '@/lib/api/video-call-api'
import { videoCallSocket } from '@/lib/socket/video-call-socket'
import type {
  VideoRightSidebarProps,
  UserAnalytics,
  Meeting
} from '@/types/video'
import type { CallEndedData, IncomingCallData, CallDeclinedData } from '@/lib/socket/video-call-socket'

export const VideoRightSidebar: React.FC<VideoRightSidebarProps> = () => {
  const intl = useIntl()
  const isVietnamese = intl.locale.toLowerCase().startsWith('vi')
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)

  // Fetch real analytics data
  const { data: analyticsData, refetch: refetchAnalytics } = useVideoCallAnalytics(workspaceId || '')

  // Fetch all video calls data (scheduled, active, ended)
  const { data: videoCalls = [], refetch: refetchVideoCalls } = useVideoCalls(workspaceId || '', {
    limit: 20  // Increased limit to show more meetings including scheduled ones
  })

  // Setup WebSocket listeners for real-time updates
  useEffect(() => {
    if (!videoCallSocket.isConnected()) {
      videoCallSocket.connect()
    }

    // Listen for call ended events
    const handleCallEnded = (data: CallEndedData) => {
      console.log('[VideoRightSidebar] Call ended:', data)
      // Refetch both video calls and analytics
      refetchVideoCalls()
      refetchAnalytics()
      toast.info('A video call has ended')
    }

    // Listen for incoming call events
    const handleIncomingCall = (data: IncomingCallData) => {
      console.log('[VideoRightSidebar] Incoming call:', data)
      // Refetch video calls to show new call
      refetchVideoCalls()
    }

    // Listen for call declined events
    const handleCallDeclined = (data: CallDeclinedData) => {
      console.log('[VideoRightSidebar] Call declined:', data)
      // Refetch video calls to update status
      refetchVideoCalls()
      refetchAnalytics()
    }

    // Register event listeners
    videoCallSocket.on('call:ended', handleCallEnded)
    videoCallSocket.on('call:incoming', handleIncomingCall)
    videoCallSocket.on('call:declined', handleCallDeclined)

    // Cleanup on unmount
    return () => {
      videoCallSocket.off('call:ended', handleCallEnded)
      videoCallSocket.off('call:incoming', handleIncomingCall)
      videoCallSocket.off('call:declined', handleCallDeclined)
    }
  }, [refetchVideoCalls, refetchAnalytics])

  // Transform analytics data to component format
  const userAnalytics: UserAnalytics = useMemo(() => {
    if (!analyticsData) {
      return {
        totalMeetings: 0,
        totalDuration: 0,
        avgMeetingDuration: 0,
        meetingsThisWeek: 0,
        meetingsThisMonth: 0,
        totalParticipantsInteracted: 0,
        aiNotesGenerated: 0,
        summariesCreated: 0
      }
    }

    return {
      totalMeetings: analyticsData.total_meetings,
      totalDuration: analyticsData.total_time_seconds * 1000, // Convert to milliseconds
      avgMeetingDuration: analyticsData.avg_duration_seconds * 1000, // Convert to milliseconds
      meetingsThisWeek: analyticsData.this_week,
      meetingsThisMonth: analyticsData.total_meetings, // Assuming monthly = total for now
      totalParticipantsInteracted: 0, // Not provided by API yet
      aiNotesGenerated: 0, // Not provided by API yet
      summariesCreated: 0 // Not provided by API yet
    }
  }, [analyticsData])

  // Transform video calls to meetings format
  const recentMeetings: Meeting[] = useMemo(() => {
    return videoCalls
      .map(call => {
        // Use actual_start_time if available, otherwise use scheduled_start_time
        const startTime = call.actual_start_time
          ? new Date(call.actual_start_time).getTime()
          : call.scheduled_start_time
            ? new Date(call.scheduled_start_time).getTime()
            : Date.now()

        // Calculate duration for ended calls, estimate for others
        let duration = 0
        if (call.status === 'completed' && call.actual_start_time && call.actual_end_time) {
          duration = new Date(call.actual_end_time).getTime() - new Date(call.actual_start_time).getTime()
        } else if (call.scheduled_start_time && call.scheduled_end_time) {
          // For scheduled calls, calculate from scheduled times
          duration = new Date(call.scheduled_end_time).getTime() - new Date(call.scheduled_start_time).getTime()
        } else {
          // Default to 30 minutes for calls without duration info
          duration = 30 * 60 * 1000
        }

        // Map status to display status
        let displayStatus: 'completed' | 'missed' | 'declined' = 'completed'
        if (call.status === 'scheduled') {
          displayStatus = 'completed' // Will be shown differently in UI
        } else if (call.status === 'cancelled') {
          displayStatus = 'declined'
        }

        // Get participants from either participants array or invitees array
        // Keep full participant objects with name and avatar
        const participantObjects = call.participants?.map(p => ({
          name: p.display_name || p.name || 'Unknown',
          avatar: p.avatar || null,
          display_name: p.display_name || p.name
        })) || []

        // Use invitees count if participants is empty (fallback)
        const participantCount = participantObjects.length > 0
          ? participantObjects.length
          : (call.invitees?.length || 0)

        return {
          id: call.id,
          title: call.title,
          duration,
          timestamp: startTime,
          participants: participantObjects.length > 0 ? participantObjects : Array(call.invitees?.length || 0).fill('Participant'),
          status: call.status as any || displayStatus
        }
      })
      // Sort by timestamp (most recent first)
      .sort((a, b) => b.timestamp - a.timestamp)
      // Take top 10
      .slice(0, 10)
  }, [videoCalls])

  // Utility functions
  const formatDuration = useCallback((ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
  }, [])

  const formatAnalyticsDuration = useCallback((ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }, [])

  const formatTimeAgo = useCallback((timestamp: number) => {
    if (!timestamp || timestamp <= 0) return '-'

    const diff = Date.now() - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days > 0) {
      return isVietnamese ? `${days} ngày trước` : `${days}d ago`
    }
    if (hours > 0) {
      return isVietnamese ? `${hours} giờ trước` : `${hours}h ago`
    }
    if (minutes > 0) {
      return isVietnamese ? `${minutes} phút trước` : `${minutes}m ago`
    }
    if (seconds > 0) {
      return isVietnamese ? `${seconds} giây trước` : `${seconds}s ago`
    }
    return isVietnamese ? 'Vừa xong' : 'Just now'
  }, [isVietnamese])

  const getMeetingDisplayTitle = useCallback((title: string) => {
    if (title === 'Video Call') {
      return intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.left.quickActions.videoCall', defaultMessage: 'Video Call' })
    }

    if (title === 'Audio Call') {
      return intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.left.quickActions.audioCall', defaultMessage: 'Audio Call' })
    }

    return title
  }, [intl])

  const getMeetingStatusLabel = useCallback((status: string) => {
    switch (status) {
      case 'ended':
      case 'completed':
        return intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.recentMeetings.status.completed', defaultMessage: 'Completed' })
      case 'active':
        return intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.recentMeetings.status.active', defaultMessage: 'Active' })
      case 'scheduled':
        return intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.recentMeetings.status.scheduled', defaultMessage: 'Scheduled' })
      case 'cancelled':
        return intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.recentMeetings.status.cancelled', defaultMessage: 'Cancelled' })
      default:
        return status
    }
  }, [intl])

  const getMeetingStatusClassName = useCallback((status: string) => {
    switch (status) {
      case 'ended':
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
      case 'active':
        return 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
      case 'scheduled':
        return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800'
      case 'cancelled':
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700'
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700'
    }
  }, [])

  return (
    <>
      <div className="h-full overflow-y-auto">
        <div className="p-4 space-y-6">

        {/* Analytics Dashboard */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            {intl.formatMessage({ id: 'modules.videoCallsApp.analytics.title' })}
          </h3>
          
          <div className="space-y-3 mb-4">
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-950 dark:to-indigo-950 dark:border-blue-800">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-blue-900 dark:text-blue-100">{intl.formatMessage({ id: 'modules.videoCallsApp.analytics.totalMeetings' })}</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{userAnalytics.totalMeetings}</p>
                  </div>
                  <Video className="h-6 w-6 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 dark:from-green-950 dark:to-emerald-950 dark:border-green-800">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-green-900 dark:text-green-100">{intl.formatMessage({ id: 'modules.videoCallsApp.analytics.totalTime' })}</p>
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">
                      {formatAnalyticsDuration(userAnalytics.totalDuration)}
                    </p>
                  </div>
                  <Clock className="h-6 w-6 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-2 gap-2">
              <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 dark:from-purple-950 dark:to-violet-950 dark:border-purple-800">
                <CardContent className="p-2">
                  <div className="text-center">
                    <p className="text-xs font-medium text-purple-900 dark:text-purple-100">{intl.formatMessage({ id: 'modules.videoCallsApp.analytics.thisWeek' })}</p>
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {userAnalytics.meetingsThisWeek}
                    </p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 dark:from-orange-950 dark:to-amber-950 dark:border-orange-800">
                <CardContent className="p-2">
                  <div className="text-center">
                    <p className="text-xs font-medium text-orange-900 dark:text-orange-100">{intl.formatMessage({ id: 'modules.videoCallsApp.analytics.avgDuration' })}</p>
                    <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                      {formatAnalyticsDuration(userAnalytics.avgMeetingDuration)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Recent Meetings */}
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Video className="h-5 w-5 text-green-500" />
            {intl.formatMessage({ id: 'modules.videoCallsApp.analytics.recentMeetings' })}
          </h3>
          
          <div className="space-y-3">
            {recentMeetings.map((meeting) => (
              <Card key={meeting.id} className="bg-muted/50 border-border hover:bg-muted/70 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium truncate">{getMeetingDisplayTitle(meeting.title)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(meeting.timestamp)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">
                      {formatDuration(meeting.duration)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {intl.formatMessage(
                        { id: 'modules.videoCallsApp.sidebar.right.recentMeetings.participants', defaultMessage: '{count} participants' },
                        { count: meeting.participants.length }
                      )}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <Badge variant="outline" className={getMeetingStatusClassName(meeting.status)}>
                      {getMeetingStatusLabel(meeting.status)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/40"
                      onClick={() => setSelectedMeeting(meeting)}
                    >
                      {intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.recentMeetings.viewDetails', defaultMessage: 'View Details' })}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        </div>
      </div>

      {/* Meeting details dialog */}
      <Dialog open={selectedMeeting !== null} onOpenChange={() => setSelectedMeeting(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-green-500" />
              {intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.details.meetingDetails', defaultMessage: 'Meeting Details' })}
            </DialogTitle>
          </DialogHeader>
          {selectedMeeting && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">{selectedMeeting.title}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">
                      {intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.details.duration', defaultMessage: 'Duration:' })}
                    </span>
                    <div className="font-medium">{formatDuration(selectedMeeting.duration)}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.details.date', defaultMessage: 'Date:' })}
                    </span>
                    <div className="font-medium">
                      {new Date(selectedMeeting.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.details.time', defaultMessage: 'Time:' })}
                    </span>
                    <div className="font-medium">
                      {new Date(selectedMeeting.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.details.status', defaultMessage: 'Status:' })}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {getMeetingStatusLabel(selectedMeeting.status)}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {intl.formatMessage(
                    { id: 'modules.videoCallsApp.sidebar.right.details.participants', defaultMessage: 'Participants ({count})' },
                    { count: selectedMeeting.participants.length }
                  )}
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {selectedMeeting.participants.map((participant: any, index: number) => {
                    // Handle both string (legacy) and object (new API format) participants
                    const isObject = typeof participant === 'object' && participant !== null;
                    const participantName = isObject ? (participant.display_name || participant.name || 'Unknown') : participant;
                    const participantAvatar = isObject ? participant.avatar : null;
                    const initials = participantName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);

                    return (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                        {participantAvatar && participantAvatar !== 'null' ? (
                          <img
                            src={participantAvatar}
                            alt={participantName}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              // Fallback to initials if image fails to load
                              (e.target as HTMLImageElement).style.display = 'none';
                              const fallback = document.createElement('div');
                              fallback.className = 'w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium';
                              fallback.textContent = initials;
                              (e.target as HTMLImageElement).parentElement?.appendChild(fallback);
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {initials}
                          </div>
                        )}
                        <span className="text-sm font-medium truncate">{participantName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                {/* Show Join button for scheduled/active meetings */}
                {(selectedMeeting.status === 'scheduled' || selectedMeeting.status === 'active') && (
                  <Button onClick={() => {
                    setSelectedMeeting(null)
                    // Open video call in new window
                    const callUrl = `/call/${workspaceId}/${selectedMeeting.id}`
                    const windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
                    window.open(callUrl, `video-call-${selectedMeeting.id}`, windowFeatures)
                  }}>
                    <LogIn className="h-4 w-4 mr-2" />
                    {intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.details.joinMeeting', defaultMessage: 'Join Meeting' })}
                  </Button>
                )}

                <Button variant="outline" onClick={() => {
                  const participantNames = selectedMeeting.participants.map(p =>
                    typeof p === 'string' ? p : p.name
                  ).join(', ')
                  const details = `${intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.details.meetingDetails', defaultMessage: 'Meeting Details' })}: ${selectedMeeting.title}\n${intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.details.date', defaultMessage: 'Date:' })} ${new Date(selectedMeeting.timestamp).toLocaleString()}\n${intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.details.duration', defaultMessage: 'Duration:' })} ${formatDuration(selectedMeeting.duration)}\n${intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.details.participants', defaultMessage: 'Participants ({count})' }, { count: selectedMeeting.participants.length })}: ${participantNames}`
                  navigator.clipboard.writeText(details)
                  toast.success(intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.details.detailsCopied', defaultMessage: 'Meeting details copied to clipboard' }))
                }}>
                  <Copy className="h-4 w-4 mr-2" />
                  {intl.formatMessage({ id: 'modules.videoCallsApp.sidebar.right.details.copyDetails', defaultMessage: 'Copy Details' })}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

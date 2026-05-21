import { useMemo, useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { format, isToday, isTomorrow, addDays, startOfDay, endOfDay, isWithinInterval, addHours, isAfter, isBefore } from 'date-fns'
import { useIntl } from 'react-intl'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '../ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '../ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '../ui/input'
import { Label } from '@/components/ui/label'
import { useCalendarStore, useAnalyticsStore } from '../../stores/calendarStore'
import type { CalendarEvent } from '../../types/calendar'
import { QuickMeetingDialog } from './QuickMeetingDialog'
import { useMeetingRooms, useRoomBookings } from '../../lib/api/calendar-api'
import { useWorkspace } from '../../contexts/WorkspaceContext'
import { toast } from 'sonner'
import {
  Calendar,
  Clock,
  Users,
  MapPin,
  AlertCircle,
  TrendingUp,
  Target,
  Coffee,
  Video,
  Settings,
  Plus,
} from 'lucide-react'

// Component for individual meeting room with booking status
interface MeetingRoomItemProps {
  room: any
  workspaceId?: string
  events: CalendarEvent[]
}

function MeetingRoomItem({ room, workspaceId, events }: MeetingRoomItemProps) {
  const intl = useIntl()
  // Fetch bookings for this specific room
  const { data: bookings = [], isLoading, error } = useRoomBookings(workspaceId, room.id)

  // Debug: Log bookings data
  console.log(`Room ${room.name} (${room.id}) bookings:`, bookings, 'Loading:', isLoading, 'Error:', error)

  const getRoomStatus = () => {
    const now = new Date()
    const twoHoursFromNow = addHours(now, 2)
    
    console.log(`[DEBUG] Current time: ${now.toISOString()}`)
    console.log(`[DEBUG] Room ${room.name} is_active: ${room.is_active}`)
    
    if (!room.is_active) {
      return {
        status: 'inactive',
        text: intl.formatMessage({ id: 'modules.calendar.rightSidebar.roomStatusInactive' }),
        color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
        booking: null,
        event: null
      }
    }

    if (isLoading) {
      return {
        status: 'loading',
        text: intl.formatMessage({ id: 'modules.calendar.rightSidebar.roomStatusChecking' }),
        color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
        booking: null,
        event: null
      }
    }
    
    // If there are any bookings, check their status
    if (bookings && bookings.length > 0) {
      console.log(`[DEBUG] Room ${room.name} has ${bookings.length} bookings:`, bookings)
      
      // Check if room is currently booked
      const currentBooking = bookings.find((booking: any) => {
        const startTime = new Date(booking.start_time)
        const endTime = new Date(booking.end_time)
        // Use simple comparison for current booking
        const isCurrentlyBooked = (!booking.status || booking.status === 'confirmed') && 
                                  now >= startTime && 
                                  now <= endTime
        
        console.log(`[DEBUG] Booking ${booking.id}:`)
        console.log(`  Start: ${startTime.toISOString()}`)
        console.log(`  End: ${endTime.toISOString()}`)
        console.log(`  Now: ${now.toISOString()}`)
        console.log(`  Status: ${booking.status}`)
        console.log(`  Is Current: ${isCurrentlyBooked}`)
        console.log(`  Conditions: now >= start: ${now >= startTime}, now <= end: ${now <= endTime}`)
        return isCurrentlyBooked
      })
      
      if (currentBooking) {
        // Find the event details for this booking
        const event = events.find(e => e.id === currentBooking.event_id)
        const endTime = new Date(currentBooking.end_time)
        const hoursRemaining = (endTime.getTime() - now.getTime()) / (1000 * 60 * 60)
        
        // If event ends within 2 hours, show as "soon"
        if (hoursRemaining <= 2 && hoursRemaining > 0) {
          return {
            status: 'soon',
            text: intl.formatMessage({ id: 'modules.calendar.rightSidebar.roomStatusFreeIn' }, { minutes: Math.ceil(hoursRemaining * 60) }),
            color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
            booking: currentBooking,
            event
          }
        }

        return {
          status: 'booked',
          text: intl.formatMessage({ id: 'modules.calendar.rightSidebar.roomStatusBooked' }),
          color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
          booking: currentBooking,
          event
        }
      }
      
      // Check for any future bookings
      const futureBookings = bookings.filter((booking: any) => {
        const startTime = new Date(booking.start_time)
        return (!booking.status || booking.status === 'confirmed') && startTime > now
      }).sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      
      if (futureBookings.length > 0) {
        const nextBooking = futureBookings[0]
        const startTime = new Date(nextBooking.start_time)
        const minutesUntilBooking = Math.ceil((startTime.getTime() - now.getTime()) / (1000 * 60))
        
        // If next booking is within 2 hours
        if (minutesUntilBooking <= 120) {
          const event = events.find(e => e.id === nextBooking.event_id)
          return {
            status: 'soon',
            text: intl.formatMessage({ id: 'modules.calendar.rightSidebar.roomStatusFreeFor' }, { minutes: minutesUntilBooking }),
            color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
            booking: nextBooking,
            event
          }
        }

        // Has future bookings but not within 2 hours - show as booked with next booking info
        const event = events.find(e => e.id === nextBooking.event_id)
        return {
          status: 'booked',
          text: intl.formatMessage({ id: 'modules.calendar.rightSidebar.roomStatusReserved' }),
          color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
          booking: nextBooking,
          event
        }
      }
    }

    // Room is available
    return {
      status: 'available',
      text: intl.formatMessage({ id: 'modules.calendar.rightSidebar.roomStatusAvailable' }),
      color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      booking: null,
      event: null
    }
  }
  
  const roomStatus = getRoomStatus()
  
  return (
    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: room.color || '#6b7280' }}
          />
          <div className="text-sm font-medium truncate">{room.name}</div>
        </div>
        <div className="text-xs text-muted-foreground">
          {room.room_code && `${intl.formatMessage({ id: 'modules.calendar.rightSidebar.room' })} ${room.room_code} • `}
          {room.location} • {intl.formatMessage({ id: 'modules.calendar.rightSidebar.capacity' })}: {room.capacity}
        </div>
        {roomStatus.booking && (
          <div className="text-xs text-muted-foreground mt-1">
            {roomStatus.status === 'booked' && roomStatus.text === intl.formatMessage({ id: 'modules.calendar.rightSidebar.roomStatusBooked' }) && (
              <>{intl.formatMessage({ id: 'modules.calendar.rightSidebar.currentMeeting' })}: {roomStatus.event?.title || intl.formatMessage({ id: 'modules.calendar.rightSidebar.meeting' })} {intl.formatMessage({ id: 'modules.calendar.rightSidebar.until' })} {format(new Date(roomStatus.booking.end_time), 'h:mm a')}</>
            )}
            {roomStatus.status === 'booked' && roomStatus.text === intl.formatMessage({ id: 'modules.calendar.rightSidebar.roomStatusReserved' }) && (
              <>{intl.formatMessage({ id: 'modules.calendar.rightSidebar.nextMeeting' })}: {roomStatus.event?.title || intl.formatMessage({ id: 'modules.calendar.rightSidebar.meeting' })} {intl.formatMessage({ id: 'modules.calendar.rightSidebar.at' })} {format(new Date(roomStatus.booking.start_time), 'h:mm a')}</>
            )}
            {roomStatus.status === 'soon' && roomStatus.text.includes(intl.formatMessage({ id: 'modules.calendar.rightSidebar.freeIn' })) && (
              <>{intl.formatMessage({ id: 'modules.calendar.rightSidebar.currentMeeting' })}: {roomStatus.event?.title || intl.formatMessage({ id: 'modules.calendar.rightSidebar.meeting' })} {intl.formatMessage({ id: 'modules.calendar.rightSidebar.endingSoon' })}</>
            )}
            {roomStatus.status === 'soon' && roomStatus.text.includes(intl.formatMessage({ id: 'modules.calendar.rightSidebar.freeFor' })) && (
              <>{intl.formatMessage({ id: 'modules.calendar.rightSidebar.nextMeeting' })}: {roomStatus.event?.title || intl.formatMessage({ id: 'modules.calendar.rightSidebar.meeting' })} {intl.formatMessage({ id: 'modules.calendar.rightSidebar.at' })} {format(new Date(roomStatus.booking.start_time), 'h:mm a')}</>
            )}
          </div>
        )}
        {room.facilities && room.facilities.length > 0 && (
          <div className="flex gap-1 mt-1">
            {room.facilities.slice(0, 3).map((facility: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs py-0 h-5">
                {facility}
              </Badge>
            ))}
            {room.facilities.length > 3 && (
              <span className="text-xs text-muted-foreground">+{room.facilities.length - 3}</span>
            )}
          </div>
        )}
      </div>
      <Badge 
        variant="secondary" 
        className={`text-xs ml-2 ${roomStatus.color}`}
      >
        {roomStatus.text}
      </Badge>
    </div>
  )
}

export function CalendarRightSidebar() {
  const intl = useIntl()
  const queryClient = useQueryClient()
  const { events, categories, conflicts } = useCalendarStore()
  const { setShowAnalytics } = useAnalyticsStore()
  const { currentWorkspace } = useWorkspace()
  const [showQuickMeetingDialog, setShowQuickMeetingDialog] = useState(false)

  

  // Fetch meeting rooms from API
  const { data: meetingRooms = [], isLoading: roomsLoading } = useMeetingRooms(currentWorkspace?.id)

  // Get today's events
  const todayEvents = useMemo(() => {
    const today = startOfDay(new Date())
    const endToday = endOfDay(new Date())
    
    return events
      .filter(event => {
        const eventStart = new Date(event.startTime)
        return isWithinInterval(eventStart, { start: today, end: endToday })
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 5)
  }, [events])

  // Get upcoming events (next 7 days, excluding today)
  const upcomingEvents = useMemo(() => {
    const tomorrow = startOfDay(addDays(new Date(), 1))
    const weekFromNow = endOfDay(addDays(new Date(), 7))
    
    return events
      .filter(event => {
        const eventStart = new Date(event.startTime)
        return isWithinInterval(eventStart, { start: tomorrow, end: weekFromNow })
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, 4)
  }, [events])

  // Get active conflicts
  const activeConflicts = conflicts?.filter(conflict => !conflict.resolvedAt).slice(0, 3) || []

  // Calculate day progress
  const dayProgress = useMemo(() => {
    const now = new Date()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 0)
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0)
    
    if (now < dayStart) return 0
    if (now > dayEnd) return 100
    
    const totalMinutes = (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60)
    const passedMinutes = (now.getTime() - dayStart.getTime()) / (1000 * 60)
    
    return Math.round((passedMinutes / totalMinutes) * 100)
  }, [])

  const formatEventDate = (date: Date) => {
    if (isToday(date)) return intl.formatMessage({ id: 'modules.calendar.rightSidebar.today' })
    if (isTomorrow(date)) return intl.formatMessage({ id: 'modules.calendar.rightSidebar.tomorrow' })
    return format(date, 'EEE, MMM d')
  }

  const formatEventTime = (start: Date, end: Date, isAllDay: boolean) => {
    if (isAllDay) return intl.formatMessage({ id: 'modules.calendar.rightSidebar.allDay' })
    return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`
  }

  const getEventIcon = (event: CalendarEvent) => {
    if (event.location && typeof event.location === 'object' && event.location.type === 'virtual') return <Video className="h-3 w-3" />
    if (event.location && typeof event.location === 'object' && event.location.type === 'physical') return <MapPin className="h-3 w-3" />
    if (event.location) return <MapPin className="h-3 w-3" />
    if (event.attendees && event.attendees.length > 0) return <Users className="h-3 w-3" />
    return <Calendar className="h-3 w-3" />
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'normal': return 'bg-blue-500'
      case 'low': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }


  const handleViewAnalytics = () => {
    setShowAnalytics(true)
  }

  const handleOpenSettings = () => {
    // Dispatch event to open calendar settings
    window.dispatchEvent(new CustomEvent('openCalendarSettings'))
  }

  const handleOpenCreateRoom = () => {
    // Dispatch event to open create meeting room dialog
    window.dispatchEvent(new CustomEvent('openCreateMeetingRoom'))
  }

  return (
    <div className="flex-1 overflow-y-auto sidebar-scroll p-4 space-y-6">
      {/* Day Progress */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="h-5 w-5" />
            {intl.formatMessage({ id: 'modules.calendar.rightSidebar.dayProgress' })}
          </h3>
          <Badge variant="outline" className="text-xs">
            {dayProgress}%
          </Badge>
        </div>
        <Progress value={dayProgress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>8:00 AM</span>
          <span>{format(new Date(), 'h:mm a')}</span>
          <span>6:00 PM</span>
        </div>
      </div>

      <Separator />

      {/* Active Conflicts */}
      {activeConflicts.length > 0 && (
        <>
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              {intl.formatMessage({ id: 'modules.calendar.rightSidebar.conflicts' })}
              <Badge variant="destructive" className="text-xs">
                {activeConflicts.length}
              </Badge>
            </h3>
            
            <div className="space-y-2">
              {activeConflicts.map((conflict) => (
                <div key={conflict.id} className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">
                    {conflict.type.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {conflict.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Today's Schedule */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Calendar className="h-5 w-5 text-green-500" />
          {intl.formatMessage({ id: 'modules.calendar.rightSidebar.todaySchedule' })}
          <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-950/50 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800">
            {todayEvents.length}
          </Badge>
        </h3>

        {todayEvents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Coffee className="h-8 w-8 mx-auto mb-2" />
            <div className="text-sm">{intl.formatMessage({ id: 'modules.calendar.rightSidebar.noEventsToday' })}</div>
            <div className="text-xs">{intl.formatMessage({ id: 'modules.calendar.rightSidebar.timeForFocus' })}</div>
          </div>
        ) : (
          <div className="space-y-3">
            {todayEvents.map((event) => {
              const category = categories.find(cat => cat.id === event.categoryId)
              
              return (
                <div 
                  key={event.id} 
                  className="group relative overflow-hidden rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/50 hover:bg-green-100 dark:hover:bg-green-900/50 transition-all duration-200 hover:shadow-md"
                >
                  {/* Left accent bar */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 dark:bg-green-400"
                  />
                  
                  <div className="pl-4 pr-3 py-3">
                    {/* Header with title and priority */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div 
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(event.priority)}`}
                        />
                        <h4 className="text-sm font-semibold truncate text-foreground">
                          {event.title}
                        </h4>
                      </div>
                      {event.priority === 'urgent' && (
                        <Badge variant="destructive" className="text-xs h-5">{intl.formatMessage({ id: 'modules.calendar.rightSidebar.urgent' })}</Badge>
                      )}
                    </div>

                    {/* Time */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                      <Clock className="h-3 w-3" />
                      {formatEventTime(new Date(event.startTime), new Date(event.endTime), event.isAllDay)}
                    </div>
                    
                    {/* Footer with location and category */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {getEventIcon(event)}
                        <span className="truncate">
                          {typeof event.location === 'string' ? event.location : event.location?.name || `${event.attendees?.length || 0} attendees`}
                        </span>
                      </div>
                      
                      {category && (
                        <div className="flex items-center gap-1.5">
                          {category.icon && <span className="text-sm">{category.icon}</span>}
                          <span className="text-xs font-medium" style={{ color: category.color }}>
                            {category.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Upcoming Events */}
      <div>
        <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Clock className="h-5 w-5 text-blue-500" />
          {intl.formatMessage({ id: 'modules.calendar.rightSidebar.upcomingEvents' })}
          <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
            {upcomingEvents.length}
          </Badge>
        </h3>

        {upcomingEvents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Calendar className="h-8 w-8 mx-auto mb-2" />
            <div className="text-sm">{intl.formatMessage({ id: 'modules.calendar.rightSidebar.noUpcomingEvents' })}</div>
            <div className="text-xs">{intl.formatMessage({ id: 'modules.calendar.rightSidebar.schedClear' })}</div>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingEvents.map((event) => {
              const category = categories.find(cat => cat.id === event.categoryId)
              const attendeeEmails = (event.attendees || []).filter(attendee => {
                if (!attendee) return false
                if (typeof attendee === 'string') return true
                if (typeof attendee === 'object' && attendee !== null && 'email' in attendee) {
                  return !!attendee.email
                }
                return false
              })
              
              return (
                <div 
                  key={event.id} 
                  className="group relative overflow-hidden rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all duration-200 hover:shadow-md"
                >
                  {/* Left accent bar */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 dark:bg-blue-400"
                  />
                  
                  <div className="pl-4 pr-3 py-3">
                    {/* Header with title and priority */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div 
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(event.priority)}`}
                        />
                        <h4 className="text-sm font-semibold truncate text-foreground">
                          {event.title}
                        </h4>
                      </div>
                      {event.priority === 'urgent' && (
                        <Badge variant="destructive" className="text-xs h-5">{intl.formatMessage({ id: 'modules.calendar.rightSidebar.urgent' })}</Badge>
                      )}
                    </div>

                    {/* Date and time */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Calendar className="h-3 w-3" />
                      <span>{formatEventDate(new Date(event.startTime))}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(event.startTime), 'h:mm a')}</span>
                    </div>
                    
                    {/* Footer with attendees and category */}
                    <div className="flex items-center justify-between">
                      {attendeeEmails.length > 0 ? (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <div className="flex -space-x-1">
                            {attendeeEmails.slice(0, 3).map((attendee, i) => {
                              try {
                                if (!attendee) return null
                                const email = typeof attendee === 'string' 
                                  ? attendee 
                                  : (attendee && typeof attendee === 'object' && 'email' in attendee) 
                                    ? attendee.email 
                                    : ''
                                if (!email || typeof email !== 'string') return null
                                const emailParts = email.split('@')
                                if (emailParts.length === 0 || !emailParts[0]) return null
                                const initials = emailParts[0].slice(0, 2).toUpperCase()
                                return (
                                  <Avatar key={i} className="w-6 h-6 border-2 border-background">
                                    <AvatarFallback className="text-xs bg-primary/10">
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                )
                              } catch (error) {
                                console.error('Error rendering attendee:', attendee, error)
                                return null
                              }
                            })}
                            {attendeeEmails.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                                +{attendeeEmails.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {getEventIcon(event)}
                          <span className="truncate">
                            {typeof event.location === 'string' ? event.location : event.location?.name || intl.formatMessage({ id: 'modules.calendar.rightSidebar.noLocation' })}
                          </span>
                        </div>
                      )}

                      {category && (
                        <div className="flex items-center gap-1.5">
                          {category.icon && <span className="text-sm">{category.icon}</span>}
                          <span className="text-xs font-medium" style={{ color: category.color }}>
                            {category.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Meeting Rooms Status */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            {intl.formatMessage({ id: 'modules.calendar.rightSidebar.meetingRooms' })}
          </h3>
          <Button variant="ghost" size="sm" onClick={handleOpenCreateRoom}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {roomsLoading ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              {intl.formatMessage({ id: 'modules.calendar.rightSidebar.loadingRooms' })}
            </div>
          ) : meetingRooms.length === 0 ? (
            <div className="text-center py-4">
              <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-sm text-muted-foreground">{intl.formatMessage({ id: 'modules.calendar.rightSidebar.noRoomsConfigured' })}</div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleOpenSettings}
              >
                <Plus className="h-3 w-3 mr-1" />
                {intl.formatMessage({ id: 'modules.calendar.rightSidebar.addRoom' })}
              </Button>
            </div>
          ) : (
            meetingRooms.map((room: any) => (
              <MeetingRoomItem 
                key={room.id} 
                room={room} 
                workspaceId={currentWorkspace?.id} 
                events={events}
              />
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-3">{intl.formatMessage({ id: 'modules.calendar.rightSidebar.quickActions' })}</h3>

        <div className="grid grid-cols-1 gap-2">
          {/* <Button
            variant="outline"
            className="justify-start"
            size="sm"
            onClick={() => setShowQuickMeetingDialog(true)}
          >
            <Video className="h-4 w-4 mr-2" />
            Quick Meeting
          </Button> */}
          <Button
            variant="outline"
            className="justify-start"
            size="sm"
            onClick={handleViewAnalytics}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            {intl.formatMessage({ id: 'modules.calendar.rightSidebar.viewAnalytics' })}
          </Button>
        </div>
      </div>

      {/* Quick Meeting Dialog */}
      <QuickMeetingDialog
        open={showQuickMeetingDialog}
        onClose={() => setShowQuickMeetingDialog(false)}
      />

    </div>
  )
}

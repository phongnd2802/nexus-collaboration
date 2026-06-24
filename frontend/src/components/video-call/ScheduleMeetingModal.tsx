/**
 * ScheduleMeetingModal Component - Schedule video meetings
 * Migrated from workspace-suite-frontend with clean architecture
 */

import { useState, useEffect } from 'react'
import { useIntl } from 'react-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Video,
  Users,
  Calendar,
  Loader2,
  CalendarPlus,
  X,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, addMinutes } from 'date-fns'
import { toast } from 'sonner'
import { useParams, useNavigate } from 'react-router-dom'
import { useCreateVideoCall } from '@/lib/api/video-call-api'
import { useWorkspaceMembers } from '@/lib/api/workspace-api'
import { useGenerateDescriptionSuggestions } from '@/lib/api/ai-api'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/contexts/AuthContext'

interface ScheduleMeetingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: Date
  defaultHour?: number
}

interface RecurrencePattern {
  frequency: 'none' | 'daily' | 'weekly' | 'monthly'
  interval: number
  endDate?: Date
  occurrences?: number
}

export function ScheduleMeetingModal({ open, onOpenChange, defaultDate, defaultHour }: ScheduleMeetingModalProps) {
  const intl = useIntl()
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const navigate = useNavigate()
  const createVideoCall = useCreateVideoCall()
  const { user } = useAuth()

  // Fetch workspace members for attendee selection
  const { data: workspaceMembers = [] } = useWorkspaceMembers(workspaceId || '')

  // Basic meeting details
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingDescription, setMeetingDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]) // Array of user IDs

  // Date and time settings
  const [meetingDate, setMeetingDate] = useState(defaultDate || new Date())
  const [meetingTime, setMeetingTime] = useState(
    defaultHour !== undefined && defaultHour !== null
      ? `${defaultHour.toString().padStart(2, '0')}:00`
      : format(new Date(), 'HH:mm')
  )
  const [meetingDuration, setMeetingDuration] = useState('60')

  // Recurrence
  const [recurrence, setRecurrence] = useState<RecurrencePattern>({
    frequency: 'none',
    interval: 1
  })

  // Invitations and notifications
  const [sendEmailInvites, setSendEmailInvites] = useState(true)
  const [sendMessengerInvites, setSendMessengerInvites] = useState(true)

  // Start immediately option
  const [startImmediately, setStartImmediately] = useState(false)

  // AI Description states
  const [aiDescriptionLoading, setAiDescriptionLoading] = useState(false)
  const [descriptionSuggestions, setDescriptionSuggestions] = useState<string[]>([])
  const [showDescriptionSuggestions, setShowDescriptionSuggestions] = useState(false)
  const descriptionMutation = useGenerateDescriptionSuggestions()

  useEffect(() => {
    if (defaultDate) {
      setMeetingDate(defaultDate)
    }
    if (defaultHour !== undefined && defaultHour !== null) {
      setMeetingTime(`${defaultHour.toString().padStart(2, '0')}:00`)
    }
  }, [defaultDate, defaultHour])

  const handleCreateMeeting = async () => {
    if (!workspaceId) {
      toast.error('Workspace not found')
      return
    }

    // Validation
    if (!meetingTitle.trim()) {
      toast.error('Please enter a meeting title')
      return
    }

    // Attendees are required only for scheduled meetings, not for immediate calls
    if (!startImmediately && selectedAttendees.length === 0) {
      toast.error('Please select at least one attendee')
      return
    }

    setIsCreating(true)

    try {
      const callType = 'video'
      const isGroupCall = selectedAttendees.length > 1

      if (startImmediately) {
        // START IMMEDIATELY - Create instant call and send real-time notifications
        console.log('🚀 [ScheduleMeetingModal] Starting immediate call with attendees:', selectedAttendees)

        const call = await createVideoCall.mutateAsync({
          workspaceId,
          data: {
            title: meetingTitle,
            description: meetingDescription,
            call_type: callType,
            is_group_call: isGroupCall,
            max_participants: 50,
            recording_enabled: false,
            participant_ids: selectedAttendees, // Backend will send real-time notifications
            // No scheduled_start_time = instant call
            metadata: {
              started_from: 'schedule_meeting_modal',
            }
          }
        })

        toast.success('Call started! Joining now...')
        console.log('✅ [ScheduleMeetingModal] Instant call created:', call.id)

        // Close modal and reset form BEFORE navigation
        onOpenChange(false)
        resetForm()

        // Auto-join caller to the call in new window
        const callUrl = `/call/${workspaceId}/${call.id}`
        const windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
        window.open(callUrl, `video-call-${call.id}`, windowFeatures)
        console.log('📞 [ScheduleMeetingModal] Caller joining call:', call.id)

        return // Exit early to avoid duplicate cleanup

      } else {
        // SCHEDULE FOR LATER - Create scheduled meeting
        const [hours, minutes] = meetingTime.split(':').map(Number)
        const meetingDateTime = new Date(meetingDate)
        meetingDateTime.setHours(hours, minutes, 0, 0)

        const duration = parseInt(meetingDuration)
        const endDateTime = addMinutes(meetingDateTime, duration)

        console.log('📅 [ScheduleMeetingModal] Creating scheduled meeting for:', meetingDateTime.toISOString())

        const call = await createVideoCall.mutateAsync({
          workspaceId,
          data: {
            title: meetingTitle,
            description: meetingDescription,
            call_type: callType,
            is_group_call: isGroupCall,
            max_participants: 50,
            scheduled_start_time: meetingDateTime.toISOString(),
            scheduled_end_time: endDateTime.toISOString(),
            recording_enabled: false,
            participant_ids: selectedAttendees,
            metadata: {
              recurrence,
              send_email_invites: sendEmailInvites,
              send_messenger_invites: sendMessengerInvites,
            }
          }
        })

        toast.success('Meeting scheduled successfully!')
        console.log('✅ [ScheduleMeetingModal] Scheduled meeting created:', call.id)
      }

      // Close dialog and reset form
      onOpenChange(false)
      resetForm()

    } catch (error: any) {
      console.error('Error creating meeting:', error)
      toast.error(error.message || `Failed to ${startImmediately ? 'start call' : 'schedule meeting'}`)
    } finally {
      setIsCreating(false)
    }
  }

  const resetForm = () => {
    setMeetingTitle('')
    setMeetingDescription('')
    setMeetingDuration('60')
    setMeetingTime(format(new Date(), 'HH:mm'))
    setMeetingDate(new Date())
    setRecurrence({ frequency: 'none', interval: 1 })
    setSendEmailInvites(true)
    setSendMessengerInvites(true)
    setSelectedAttendees([])
    setStartImmediately(false)
    // Reset AI states
    setAiDescriptionLoading(false)
    setDescriptionSuggestions([])
    setShowDescriptionSuggestions(false)
  }

  const handleClose = () => {
    onOpenChange(false)
    resetForm()
  }

  const generateAIMeetingDescription = async () => {
    // Validate that meeting title is filled
    if (!meetingTitle.trim()) {
      toast.error('Please enter a meeting title first before generating AI description')
      return
    }

    setAiDescriptionLoading(true)
    setDescriptionSuggestions([])
    setShowDescriptionSuggestions(false)

    try {
      const title = meetingTitle.trim()
      const duration = meetingDuration

      // Build context based on meeting details
      const contextParts: string[] = ['Video conference meeting']
      contextParts.push(`Duration: ${duration} minutes`)

      // Call the unified description suggestions endpoint
      const response = await descriptionMutation.mutateAsync({
        type: 'meeting',
        title: title,
        context: contextParts.join('. '),
        count: 3,
        tone: 'professional',
        length: 'medium'
      })

      // Use pre-parsed suggestions from backend
      let suggestions = response.suggestions

      // Fallback if no suggestions returned
      if (suggestions.length === 0) {
        const fallbackDescriptions = [
          `Join us for ${title}. This ${duration}-minute video meeting will cover key topics and provide an opportunity for discussion and collaboration.`,
          `${title} - A ${duration}-minute session to discuss important matters and align on next steps. All participants are encouraged to come prepared with questions.`,
          `This meeting focuses on ${title.toLowerCase()}. We will review progress, address any concerns, and plan the way forward. Duration: ${duration} minutes.`
        ]
        suggestions = fallbackDescriptions
      }

      setDescriptionSuggestions(suggestions)
      setShowDescriptionSuggestions(true)

      toast.success('Descriptions generated! Select one below.')
    } catch (error) {
      console.error('AI description generation failed:', error)
      toast.error('Failed to generate descriptions. Please try again or write one manually.')
    } finally {
      setAiDescriptionLoading(false)
    }
  }

  const selectDescriptionSuggestion = (suggestion: string) => {
    setMeetingDescription(suggestion)
    setShowDescriptionSuggestions(false)
    setDescriptionSuggestions([])
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" />
            {intl.formatMessage({ id: 'modules.videoCallsApp.modal.scheduleTitle' })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-6">
              {/* Meeting Details */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="meeting-title">{intl.formatMessage({ id: 'modules.videoCallsApp.modal.meetingTitle' })} *</Label>
                    <Input
                      id="meeting-title"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      placeholder={intl.formatMessage({ id: 'modules.videoCallsApp.modal.meetingTitlePlaceholder' })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">{intl.formatMessage({ id: 'modules.videoCallsApp.modal.duration' })}</Label>
                    <Select value={meetingDuration} onValueChange={setMeetingDuration}>
                      <SelectTrigger>
                        <SelectValue placeholder={intl.formatMessage({ id: 'modules.videoCallsApp.modal.selectDuration' })} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">{intl.formatMessage({ id: 'modules.videoCallsApp.modal.durations.15min' })}</SelectItem>
                        <SelectItem value="30">{intl.formatMessage({ id: 'modules.videoCallsApp.modal.durations.30min' })}</SelectItem>
                        <SelectItem value="45">{intl.formatMessage({ id: 'modules.videoCallsApp.modal.durations.45min' })}</SelectItem>
                        <SelectItem value="60">{intl.formatMessage({ id: 'modules.videoCallsApp.modal.durations.1hour' })}</SelectItem>
                        <SelectItem value="90">{intl.formatMessage({ id: 'modules.videoCallsApp.modal.durations.1.5hours' })}</SelectItem>
                        <SelectItem value="120">{intl.formatMessage({ id: 'modules.videoCallsApp.modal.durations.2hours' })}</SelectItem>
                        <SelectItem value="180">{intl.formatMessage({ id: 'modules.videoCallsApp.modal.durations.3hours' })}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Start Immediately Option */}
                <div className="flex items-center space-x-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <input
                    type="checkbox"
                    id="start-immediately"
                    checked={startImmediately}
                    onChange={(e) => setStartImmediately(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="start-immediately" className="cursor-pointer flex items-center gap-2">
                    <span className="font-medium">{intl.formatMessage({ id: 'modules.videoCallsApp.modal.startImmediately' })}</span>
                    <span className="text-sm text-muted-foreground">
                      ({intl.formatMessage({ id: 'modules.videoCallsApp.modal.startImmediatelyHint' })})
                    </span>
                  </Label>
                </div>

                {/* Date and Time - Hidden when Start Immediately is checked */}
                {!startImmediately && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="meeting-date">{intl.formatMessage({ id: 'modules.videoCallsApp.modal.date' })}</Label>
                      <Input
                        id="meeting-date"
                        type="date"
                        value={format(meetingDate, 'yyyy-MM-dd')}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        onChange={(e) => {
                          const newDate = new Date(e.target.value)
                          setMeetingDate(newDate)
                          // If selected date is today and current time is in the past, reset to next hour
                          const today = new Date()
                          if (format(newDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
                            const [hours, minutes] = meetingTime.split(':').map(Number)
                            const selectedTime = new Date(newDate)
                            selectedTime.setHours(hours, minutes, 0, 0)
                            if (selectedTime <= today) {
                              // Set to next hour
                              const nextHour = new Date()
                              nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0)
                              setMeetingTime(format(nextHour, 'HH:mm'))
                            }
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="meeting-time">{intl.formatMessage({ id: 'modules.videoCallsApp.modal.time' })}</Label>
                      <Input
                        id="meeting-time"
                        type="time"
                        value={meetingTime}
                        min={format(meetingDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                          ? format(new Date(), 'HH:mm')
                          : undefined}
                        onChange={(e) => {
                          const newTime = e.target.value
                          // Validate that selected time is not in the past for today
                          const today = new Date()
                          if (format(meetingDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
                            const [hours, minutes] = newTime.split(':').map(Number)
                            const selectedDateTime = new Date(meetingDate)
                            selectedDateTime.setHours(hours, minutes, 0, 0)
                            if (selectedDateTime <= today) {
                              toast.error('Cannot select a time in the past')
                              return
                            }
                          }
                          setMeetingTime(newTime)
                        }}
                      />
                    </div>

                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="meeting-description">{intl.formatMessage({ id: 'modules.videoCallsApp.modal.description' })}</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateAIMeetingDescription}
                      disabled={aiDescriptionLoading || !meetingTitle.trim()}
                      className="text-xs"
                    >
                      {aiDescriptionLoading ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          {intl.formatMessage({ id: 'modules.videoCallsApp.modal.ai.generating', defaultMessage: 'Generating...' })}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 mr-1" />
                          {intl.formatMessage({ id: 'modules.videoCallsApp.modal.ai.createWithAI', defaultMessage: 'Create with AI' })}
                        </>
                      )}
                    </Button>
                  </div>
                  <RichTextEditor
                    value={meetingDescription}
                    onChange={setMeetingDescription}
                    placeholder={intl.formatMessage({ id: 'modules.videoCallsApp.modal.descriptionPlaceholder' })}
                    minHeight="100px"
                    enableMentions={true}
                  />

                  {/* AI Description Suggestions */}
                  {showDescriptionSuggestions && descriptionSuggestions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="text-sm font-medium text-muted-foreground">
                        {intl.formatMessage({ id: 'modules.videoCallsApp.modal.ai.suggestions', defaultMessage: 'AI Suggestions (click to select):' })}
                      </div>
                      {descriptionSuggestions.map((suggestion, index) => (
                        <div
                          key={index}
                          className="p-3 text-sm bg-muted rounded-md cursor-pointer hover:bg-muted/80 transition-colors border border-border/50"
                          onClick={() => selectDescriptionSuggestion(suggestion)}
                        >
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Attendees Selection */}
                <div className="space-y-3">
                  <Label>{intl.formatMessage({ id: 'modules.videoCallsApp.modal.addAttendees' })}</Label>
                  <Select
                    value=""
                    onValueChange={(userId) => {
                      if (!selectedAttendees.includes(userId)) {
                        setSelectedAttendees(prev => [...prev, userId])
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={intl.formatMessage({ id: 'modules.videoCallsApp.modal.selectMembers' })} />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaceMembers
                        .filter(member =>
                          !selectedAttendees.includes(member.user_id) &&
                          member.user_id !== user?.id
                        )
                        .map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{member.user?.name || member.user?.email || 'Unknown'}</span>
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {/* Selected Attendees */}
                  {selectedAttendees.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedAttendees.map((userId) => {
                        const member = workspaceMembers.find(m => m.user_id === userId)
                        const userName = member?.user?.name || member?.user?.email || 'Unknown'
                        return (
                          <Badge
                            key={userId}
                            variant="secondary"
                            className="flex items-center gap-1 pr-1"
                          >
                            <span>{userName}</span>
                            <button
                              onClick={() => setSelectedAttendees(prev => prev.filter(id => id !== userId))}
                              className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        )
                      })}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {startImmediately
                      ? intl.formatMessage({ id: 'modules.videoCallsApp.modal.attendeesHintOptional' }, { fallback: 'Optional for instant calls - you can invite others later' })
                      : intl.formatMessage({ id: 'modules.videoCallsApp.modal.attendeesHint' })}
                  </p>
                </div>
              </div>

          {/* Meeting Summary */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {intl.formatMessage({ id: 'modules.videoCallsApp.modal.summary.title' })}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{intl.formatMessage({ id: 'modules.videoCallsApp.modal.summary.dateTime' })}</span>
                <span className="font-medium">
                  {new Intl.DateTimeFormat(intl.locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(meetingDate)} {intl.formatMessage({ id: 'modules.videoCallsApp.modal.summary.at' })} {meetingTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span>{intl.formatMessage({ id: 'modules.videoCallsApp.modal.summary.duration' })}</span>
                <span className="font-medium">{meetingDuration} {intl.formatMessage({ id: 'modules.videoCallsApp.modal.summary.minutes' })}</span>
              </div>
              <div className="flex justify-between">
                <span>{intl.formatMessage({ id: 'modules.videoCallsApp.modal.summary.location' })}</span>
                <span className="font-medium">Trực tuyến</span>
              </div>
              {recurrence.frequency !== 'none' && (
                <div className="flex justify-between">
                  <span>{intl.formatMessage({ id: 'modules.videoCallsApp.modal.summary.recurrence' })}</span>
                  <span className="font-medium">
                    {intl.formatMessage({ id: `modules.videoCallsApp.modal.summary.frequencies.${recurrence.frequency}` })}
                    {' '}({intl.formatMessage({ id: 'modules.videoCallsApp.modal.summary.every' })} {recurrence.interval} {intl.formatMessage({ id: `modules.videoCallsApp.modal.summary.${recurrence.interval > 1 ? (recurrence.frequency === 'daily' ? 'days' : recurrence.frequency === 'weekly' ? 'weeks' : 'months') : (recurrence.frequency === 'daily' ? 'day' : recurrence.frequency === 'weekly' ? 'week' : 'month')}` })})
                  </span>
                </div>
              )}
              {selectedAttendees.length > 0 && (
                <div className="flex justify-between">
                  <span>{intl.formatMessage({ id: 'modules.videoCallsApp.modal.summary.attendees' })}</span>
                  <span className="font-medium">{selectedAttendees.length} {intl.formatMessage({ id: 'modules.videoCallsApp.modal.summary.selected' })}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleCreateMeeting}
              disabled={isCreating || !meetingTitle.trim() || (!startImmediately && selectedAttendees.length === 0)}
              className="flex-1 btn-gradient-primary border-0"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {startImmediately
                    ? intl.formatMessage({ id: 'modules.videoCallsApp.modal.actions.startingCall' })
                    : intl.formatMessage({ id: 'modules.videoCallsApp.modal.actions.schedulingMeeting' })}
                </>
              ) : (
                <>
                  {startImmediately ? (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      {intl.formatMessage({ id: 'modules.videoCallsApp.modal.actions.startCallNow' })}
                    </>
                  ) : (
                    <>
                      <CalendarPlus className="h-4 w-4 mr-2" />
                      {intl.formatMessage({ id: 'modules.videoCallsApp.modal.actions.scheduleMeeting' })}
                    </>
                  )}
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              className="flex-1"
            >
              {intl.formatMessage({ id: 'modules.videoCallsApp.modal.cancel' })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

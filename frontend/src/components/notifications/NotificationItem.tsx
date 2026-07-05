import React from 'react';
import { useIntl } from 'react-intl';
import { formatDistanceToNow, format } from 'date-fns';
import { enUS, vi as viLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { type Notification } from '@/lib/api/notifications-api';
import { NoteAccessRequestNotification } from '../notes/NoteAccessRequestNotification';
import { NotePermissionChangeNotification } from '../notes/NotePermissionChangeNotification';
import {
  FolderIcon,
  CalendarIcon,
  CheckSquareIcon,
  FolderOpenIcon,
  MessageSquareIcon,
  BellIcon,
  FileTextIcon,
  VideoIcon,
} from 'lucide-react';

// Helper to strip HTML tags and decode entities for plain text display
const stripHtml = (html: string): string => {
  if (!html) return '';
  // Create a temporary element to decode HTML entities
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
};

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
  onResponded?: (action: 'approve' | 'deny') => void;
}

// Re-formats an ISO timestamp using the viewer's locale, matching the
// "MMM d, yyyy 'at' h:mm a" shape the backend originally hardcoded in en-US.
const formatEventDateTime = (isoString: string | undefined, intl: ReturnType<typeof useIntl>) => {
  if (!isoString) return '';
  const dateLocale = intl.locale === 'vi' ? viLocale : enUS;
  return format(new Date(isoString), "MMM d, yyyy 'at' h:mm a", { locale: dateLocale });
};

// `remind_before` is one of the backend's internal window labels
// ('1 giờ', '3 giờ', '12 giờ', '1 ngày', '3 ngày') used as a dedup key —
// it is never shown to the user. It only tells us whether to express the
// remaining time in hours or days; the actual rounded value is recomputed
// from remaining_ms so it reflects the number the backend used at send time.
const getReminderRemaining = (notification: Notification) => {
  const remindBefore = notification.data?.remind_before as string | undefined;
  const remainingMs = notification.data?.remaining_ms;
  if (!remindBefore || typeof remainingMs !== 'number') return null;

  const usesDays = remindBefore === '3 ngày' || remindBefore === '1 ngày';
  const value = usesDays
    ? Math.ceil(remainingMs / (24 * 60 * 60 * 1000))
    : Math.ceil(remainingMs / (60 * 60 * 1000));
  return { value, usesDays };
};

const getWorkspaceInvitationContext = (notification: Notification) => {
  const isWorkspaceInvitation =
    notification.data?.entity_type === 'workspace_invitation' ||
    notification.data?.notification_type === 'workspace_invitation';

  if (!isWorkspaceInvitation) {
    return null;
  }

  const inviterName =
    notification.data?.inviter_name ||
    notification.title.match(/^(.*) invited you to /)?.[1] ||
    '';
  const workspaceName =
    notification.data?.workspace_name ||
    notification.title.match(/ invited you to (.*)$/)?.[1] ||
    '';

  return {
    inviterName,
    workspaceName,
  };
};

export const getLocalizedNotificationTitle = (notification: Notification, intl: ReturnType<typeof useIntl>) => {
  if (notification.type === 'note_access_request') {
    return intl.formatMessage({ id: 'modules.notes.accessRequest.notifTitle' });
  }

  if (notification.type === 'note_permission_change_request') {
    return intl.formatMessage({ id: 'modules.notes.permissionChangeRequest.notifTitle' });
  }

  if (notification.type === 'note_access_response') {
    const isApproved = notification.data?.action === 'note_access_approved';
    return isApproved
      ? intl.formatMessage({ id: 'modules.notes.accessDenied.requestApproved' })
      : intl.formatMessage({ id: 'modules.notes.accessDenied.requestDenied' });
  }

  const workspaceInvitation = getWorkspaceInvitationContext(notification);
  if (workspaceInvitation) {
    return intl.formatMessage(
      {
        id: 'notifications.items.workspaceInvitationTitle',
        defaultMessage: '{inviterName} invited you to {workspaceName}',
      },
      {
        inviterName: workspaceInvitation.inviterName,
        workspaceName: workspaceInvitation.workspaceName,
      }
    );
  }

  if (
    notification.data?.channel_name &&
    notification.title.startsWith('New message in #')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.newMessageInChannel' },
      { channelName: notification.data.channel_name }
    );
  }

  if (notification.title === 'New Task Assigned') {
    return intl.formatMessage({ id: 'notifications.items.taskAssigned' });
  }

  if (notification.title === 'Task Assigned to You') {
    return intl.formatMessage({ id: 'notifications.items.taskAssignedToYou' });
  }

  if (notification.title === 'Task Unassigned') {
    return intl.formatMessage({ id: 'notifications.items.taskUnassigned' });
  }

  if (notification.title === 'Task Completed') {
    return intl.formatMessage({ id: 'notifications.items.taskCompleted' });
  }

  if (notification.title === 'Task Completed in Your Project') {
    return intl.formatMessage({ id: 'notifications.items.taskCompletedInProject' });
  }

  if (notification.title === 'New Calendar Event') {
    return intl.formatMessage({ id: 'notifications.items.eventNew' });
  }

  if (notification.title === 'Added to Calendar Event') {
    return intl.formatMessage({ id: 'notifications.items.eventAdded' });
  }

  if (notification.title === 'Removed from Calendar Event') {
    return intl.formatMessage({ id: 'notifications.items.eventRemoved' });
  }

  if (notification.title === 'Calendar Event Cancelled') {
    return intl.formatMessage({ id: 'notifications.items.eventCancelled' });
  }

  if (notification.title === 'Event Title Changed') {
    return intl.formatMessage({ id: 'notifications.items.eventTitleChanged' });
  }

  if (notification.title === 'Event Time Changed') {
    return intl.formatMessage({ id: 'notifications.items.eventTimeChanged' });
  }

  if (notification.title === 'Event Location Changed') {
    return intl.formatMessage({ id: 'notifications.items.eventLocationChanged' });
  }

  if (notification.title === 'Event Category Changed') {
    return intl.formatMessage({ id: 'notifications.items.eventCategoryChanged' });
  }

  if (notification.title === 'Event Details Updated') {
    return intl.formatMessage({ id: 'notifications.items.eventDetailsUpdated' });
  }

  if (notification.title === 'Event Priority Changed') {
    return intl.formatMessage({ id: 'notifications.items.eventPriorityChanged' });
  }

  if (notification.title === 'Event Status Changed') {
    return intl.formatMessage({ id: 'notifications.items.eventStatusChanged' });
  }

  if (notification.title === 'Event Updated') {
    return intl.formatMessage({ id: 'notifications.items.eventUpdated' });
  }

  if (
    notification.type === 'channel_created' &&
    notification.data?.channel_name &&
    notification.title.startsWith('Added to private channel #')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.channelCreatedPrivate' },
      { channelName: notification.data.channel_name }
    );
  }

  if (
    notification.type === 'channel_created' &&
    notification.data?.channel_name &&
    notification.title.startsWith('New channel created: #')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.channelCreatedPublic' },
      { channelName: notification.data.channel_name }
    );
  }

  if (
    notification.data?.sender_name &&
    notification.title === `New message from ${notification.data.sender_name}`
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.newMessageFrom' },
      { senderName: notification.data.sender_name }
    );
  }

  if (
    notification.data?.channel_name &&
    notification.title.startsWith('@channel in #')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.channelMention' },
      { channelName: notification.data.channel_name }
    );
  }

  if (
    notification.data?.is_mention &&
    notification.data?.sender_name &&
    notification.data?.channel_name &&
    notification.title === `${notification.data.sender_name} mentioned you in #${notification.data.channel_name}`
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.userMentionInChannel' },
      { senderName: notification.data.sender_name, channelName: notification.data.channel_name }
    );
  }

  if (
    notification.data?.is_mention &&
    notification.data?.sender_name &&
    notification.title === `${notification.data.sender_name} mentioned you`
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.userMentionDirect' },
      { senderName: notification.data.sender_name }
    );
  }

  if (
    notification.type === 'channel_member_added' &&
    notification.data?.channel_name &&
    notification.title.startsWith('Added to private channel #')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.channelMemberAddedPrivate' },
      { channelName: notification.data.channel_name }
    );
  }

  if (
    notification.type === 'channel_member_added' &&
    notification.data?.channel_name &&
    notification.title.startsWith('Added to channel #')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.channelMemberAdded' },
      { channelName: notification.data.channel_name }
    );
  }

  if (
    notification.type === 'channel_member_removed' &&
    notification.data?.channel_name
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.channelMemberRemoved' },
      { channelName: notification.data.channel_name }
    );
  }

  if (notification.title === 'Note Shared with You') {
    return intl.formatMessage({ id: 'notifications.items.noteShared' });
  }

  if (
    notification.data?.entity_type === 'note_permission_change_response' &&
    notification.data?.action === 'permission_change_approved'
  ) {
    return intl.formatMessage({ id: 'notifications.items.notePermissionGranted' });
  }

  if (
    notification.data?.entity_type === 'note_permission_change_response' &&
    notification.data?.action === 'permission_change_denied'
  ) {
    return intl.formatMessage({ id: 'notifications.items.notePermissionDenied' });
  }

  if (notification.type === 'reminder' && notification.data?.task_title) {
    return intl.formatMessage(
      { id: 'notifications.items.taskDueSoon' },
      { taskTitle: notification.data.task_title }
    );
  }

  return notification.title;
};

export const getLocalizedNotificationMessage = (
  notification: Notification,
  intl: ReturnType<typeof useIntl>
) => {
  if (!notification.message) {
    return '';
  }

  if (notification.type === 'note_access_request') {
    const requester = notification.data?.requester_name || 'Someone';
    const title = notification.data?.note_title || 'a note';
    return intl.formatMessage(
      { id: 'modules.notes.accessRequest.notifMessage' },
      { requester, title }
    );
  }

  if (notification.type === 'note_permission_change_request') {
    const requester = notification.data?.requester_name || 'Someone';
    const title = notification.data?.note_title || 'a note';
    const perm = notification.data?.requested_permission === 'write' ? 'Editor' : 'Viewer';
    return intl.formatMessage(
      { id: 'modules.notes.permissionChangeRequest.notifMessage' },
      { requester, title, permission: perm }
    );
  }

  if (notification.type === 'note_access_response') {
    const isApproved = notification.data?.action === 'note_access_approved';
    const title = notification.data?.note_title || 'a note';
    return isApproved
      ? intl.formatMessage({ id: 'modules.notes.accessDenied.requestApproved' })
      : intl.formatMessage({ id: 'modules.notes.accessDenied.requestDenied' });
  }

  if (getWorkspaceInvitationContext(notification)) {
    return intl.formatMessage({
      id: 'notifications.items.workspaceInvitationMessage',
      defaultMessage: 'You have a new workspace invitation waiting for you on Nexus.',
    });
  }

  if (
    notification.data?.task_title &&
    notification.message.includes("You've been assigned to task")
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.taskAssignedMessage' },
      { taskTitle: notification.data.task_title }
    );
  }

  if (
    notification.data?.task_title &&
    notification.message.includes('has been assigned to you')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.taskAssignedToYouMessage' },
      { taskTitle: notification.data.task_title }
    );
  }

  if (
    notification.data?.task_title &&
    notification.message.includes('has been unassigned from you')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.taskUnassignedMessage' },
      { taskTitle: notification.data.task_title }
    );
  }

  if (
    notification.data?.task_title &&
    notification.message.includes('has been marked as completed')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.taskCompletedMessage' },
      { taskTitle: notification.data.task_title }
    );
  }

  if (
    notification.data?.task_title &&
    notification.message.includes('has been completed in project')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.taskCompletedInProjectMessage' },
      {
        taskTitle: notification.data.task_title,
        projectName: notification.data?.project_name || '',
      }
    );
  }

  const eventTitle = notification.data?.event_title;
  const eventDateTime = formatEventDateTime(notification.data?.event_start_time, intl);

  if (eventTitle && notification.title === 'New Calendar Event') {
    return intl.formatMessage(
      { id: 'notifications.items.eventNewMessage' },
      { eventTitle, eventDateTime }
    );
  }

  if (eventTitle && notification.title === 'Added to Calendar Event') {
    return intl.formatMessage(
      { id: 'notifications.items.eventAddedMessage' },
      { eventTitle, eventDateTime }
    );
  }

  if (eventTitle && notification.title === 'Removed from Calendar Event') {
    return intl.formatMessage(
      { id: 'notifications.items.eventRemovedMessage' },
      { eventTitle, eventDateTime }
    );
  }

  if (eventTitle && notification.title === 'Calendar Event Cancelled') {
    return intl.formatMessage(
      { id: 'notifications.items.eventCancelledMessage' },
      { eventTitle, eventDateTime }
    );
  }

  if (eventTitle && notification.title === 'Event Title Changed') {
    return intl.formatMessage(
      { id: 'notifications.items.eventTitleChangedMessage' },
      { eventTitle, eventDateTime }
    );
  }

  if (eventTitle && notification.title === 'Event Time Changed') {
    return intl.formatMessage(
      { id: 'notifications.items.eventTimeChangedMessage' },
      {
        eventTitle,
        eventDateTime,
        oldEventDateTime: formatEventDateTime(notification.data?.old_event_start_time, intl),
      }
    );
  }

  if (eventTitle && notification.title === 'Event Location Changed') {
    return intl.formatMessage(
      { id: 'notifications.items.eventLocationChangedMessage' },
      { eventTitle, eventDateTime, location: notification.data?.event_location || '' }
    );
  }

  if (eventTitle && notification.title === 'Event Category Changed') {
    return intl.formatMessage(
      { id: 'notifications.items.eventCategoryChangedMessage' },
      { eventTitle, eventDateTime }
    );
  }

  if (eventTitle && notification.title === 'Event Details Updated') {
    return intl.formatMessage(
      { id: 'notifications.items.eventDetailsUpdatedMessage' },
      { eventTitle, eventDateTime }
    );
  }

  if (eventTitle && notification.title === 'Event Priority Changed') {
    return intl.formatMessage(
      { id: 'notifications.items.eventPriorityChangedMessage' },
      { eventTitle, eventDateTime, priority: notification.data?.event_priority || '' }
    );
  }

  if (eventTitle && notification.title === 'Event Status Changed') {
    return intl.formatMessage(
      { id: 'notifications.items.eventStatusChangedMessage' },
      { eventTitle, eventDateTime, status: notification.data?.event_status || '' }
    );
  }

  if (eventTitle && notification.title === 'Event Updated') {
    const changeLabels: Record<string, string> = {
      title: intl.formatMessage({ id: 'notifications.items.eventChangeField.title' }),
      description: intl.formatMessage({ id: 'notifications.items.eventChangeField.description' }),
      time: intl.formatMessage({ id: 'notifications.items.eventChangeField.time' }),
      location: intl.formatMessage({ id: 'notifications.items.eventChangeField.location' }),
      category: intl.formatMessage({ id: 'notifications.items.eventChangeField.category' }),
      priority: intl.formatMessage({ id: 'notifications.items.eventChangeField.priority' }),
      status: intl.formatMessage({ id: 'notifications.items.eventChangeField.status' }),
      attendees: intl.formatMessage({ id: 'notifications.items.eventChangeField.attendees' }),
    };
    const changes: string[] = Array.isArray(notification.data?.changes)
      ? notification.data.changes
      : [];
    const changesText = changes
      .map((c) => changeLabels[c] || c)
      .join(', ')
      .replace(/,([^,]*)$/, ` ${intl.formatMessage({ id: 'notifications.items.eventChangeAnd' })}$1`);
    return intl.formatMessage(
      { id: 'notifications.items.eventUpdatedMessage' },
      { eventTitle, eventDateTime, changesText }
    );
  }

  if (
    notification.type === 'channel_created' &&
    notification.data?.channel_name &&
    notification.message.includes('added to the private channel')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.channelCreatedPrivateMessage' },
      { channelName: notification.data.channel_name }
    );
  }

  if (
    notification.type === 'channel_created' &&
    notification.data?.channel_name &&
    notification.message.includes('has been created in the workspace')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.channelCreatedPublicMessage' },
      { channelName: notification.data.channel_name }
    );
  }

  if (
    notification.type === 'channel_member_added' &&
    notification.data?.channel_name &&
    notification.message.includes('has been added to the channel')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.channelMemberAddedMessage' },
      { channelName: notification.data.channel_name }
    );
  }

  if (
    notification.type === 'channel_member_removed' &&
    notification.data?.channel_name &&
    notification.message.includes('has been removed from the channel')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.channelMemberRemovedMessage' },
      { channelName: notification.data.channel_name }
    );
  }

  if (notification.data?.note_title && notification.title === 'Note Shared with You') {
    return intl.formatMessage(
      { id: 'notifications.items.noteSharedMessage' },
      { noteTitle: notification.data.note_title }
    );
  }

  if (
    notification.data?.entity_type === 'note_permission_change_response' &&
    notification.data?.action === 'permission_change_approved'
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.notePermissionGrantedMessage' },
      { noteTitle: notification.data?.note_title || '' }
    );
  }

  if (
    notification.data?.entity_type === 'note_permission_change_response' &&
    notification.data?.action === 'permission_change_denied'
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.notePermissionDeniedMessage' },
      { noteTitle: notification.data?.note_title || '' }
    );
  }

  if (notification.type === 'reminder' && notification.data?.task_title) {
    const taskTitle = notification.data.task_title;
    const dueDate = formatEventDateTime(notification.data?.due_date, intl);
    const remaining = getReminderRemaining(notification);

    if (notification.data?.remind_before === '1 giờ') {
      return intl.formatMessage(
        { id: 'notifications.items.taskDueSoonHourMessage' },
        { taskTitle, dueDate }
      );
    }

    // Older notifications sent before `remaining_ms` was added to `data`
    // fall back to parsing the value/unit out of the original English
    // message so they still re-translate instead of showing raw English.
    const parsedFallback = notification.message.match(/is due in (\d+) (day|days|hour|hours)/);
    const value = remaining?.value ?? (parsedFallback ? parseInt(parsedFallback[1], 10) : null);
    const usesDays = remaining?.usesDays ?? parsedFallback?.[2].startsWith('day');

    if (value !== null) {
      const unitKey = usesDays
        ? value === 1
          ? 'notifications.items.unit.day'
          : 'notifications.items.unit.days'
        : value === 1
          ? 'notifications.items.unit.hour'
          : 'notifications.items.unit.hours';
      return intl.formatMessage(
        { id: 'notifications.items.taskDueSoonMessage' },
        { taskTitle, value, unit: intl.formatMessage({ id: unitKey }), dueDate }
      );
    }
  }

  return stripHtml(notification.message);
};

const getNotificationIcon = (type?: string, category?: string) => {
  const key = (category || type || '').toLowerCase();
  switch (key) {
    case 'projects':
    case 'project':
      return FolderIcon;
    case 'tasks':
    case 'task':
      return CheckSquareIcon;
    case 'calendar':
    case 'event':
      return CalendarIcon;
    case 'files':
    case 'file':
      return FolderOpenIcon;
    case 'messages':
    case 'message':
      return MessageSquareIcon;
    case 'notes':
    case 'note':
      return FileTextIcon;
    case 'video_call':
    case 'video':
    case 'call':
      return VideoIcon;
    default:
      return BellIcon;
  }
};

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case 'urgent':
      return 'text-red-600';
    case 'high':
      return 'text-orange-600';
    case 'normal':
      return 'text-blue-600';
    case 'low':
      return 'text-gray-600';
    default:
      return 'text-blue-600';
  }
};

export function NotificationItem({ notification, onClick, onResponded }: NotificationItemProps) {
  const intl = useIntl();

  // Extract category from data object if it exists
  const category = notification.data?.category;
  const Icon = getNotificationIcon(notification.type, category);
  const priorityColor = getPriorityColor(notification.priority);
  const dateLocale = intl.locale === 'vi' ? viLocale : enUS;
  const title = getLocalizedNotificationTitle(notification, intl);
  const message = getLocalizedNotificationMessage(notification, intl);

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors',
        !notification.is_read && 'bg-muted/30'
      )}
    >
      <div className={cn('mt-1', priorityColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h4
            className={cn(
              'text-sm font-medium line-clamp-1',
              !notification.is_read && 'font-semibold'
            )}
          >
            {title}
          </h4>
          {!notification.is_read && (
            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
          )}
        </div>
        {message && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {message}
          </p>
        )}
        {notification.type === 'note_access_request' && (
          <div onClick={(e) => e.stopPropagation()}>
            <NoteAccessRequestNotification
              requestId={notification.data?.request_id || notification.data?.entity_id}
              workspaceId={notification.data?.workspace_id}
              requesterName={notification.data?.requester_name || 'Someone'}
              noteTitle={notification.data?.note_title || 'a note'}
              onResponded={onResponded}
            />
          </div>
        )}
        {notification.type === 'note_permission_change_request' && (
          <div onClick={(e) => e.stopPropagation()}>
            <NotePermissionChangeNotification
              noteId={notification.data?.note_id}
              workspaceId={notification.data?.workspace_id}
              requesterId={notification.data?.requester_id}
              requesterName={notification.data?.requester_name || 'Someone'}
              noteTitle={notification.data?.note_title || 'a note'}
              initialResponse={notification.data?.responded}
              onResponded={onResponded}
            />
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          {notification.created_at
            ? formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: dateLocale,
              })
            : intl.formatMessage({ id: 'notifications.justNow' })
          }
        </p>
      </div>
    </div>
  );
}

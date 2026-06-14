import React from 'react';
import { useIntl } from 'react-intl';
import { formatDistanceToNow } from 'date-fns';
import { enUS, vi as viLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { type Notification } from '@/lib/api/notifications-api';
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
}

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

const getLocalizedNotificationTitle = (notification: Notification, intl: ReturnType<typeof useIntl>) => {
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

  // Handle Channel Add/Create notifications
  if (notification.type === 'channel_member_added' || notification.type === 'CHANNEL_MEMBER_ADDED' || notification.title.startsWith('Added to ')) {
    if (notification.data?.channel_name) {
      if (notification.data.is_private || notification.title.includes('private channel')) {
        return intl.formatMessage(
          { id: 'notifications.items.addedToPrivateChannel', defaultMessage: 'Added to private channel #{channelName}' },
          { channelName: notification.data.channel_name }
        );
      } else {
        return intl.formatMessage(
          { id: 'notifications.items.addedToChannel', defaultMessage: 'Added to channel #{channelName}' },
          { channelName: notification.data.channel_name }
        );
      }
    }
  }

  if (notification.type === 'channel_created' || notification.type === 'CHANNEL_CREATED' || notification.title.startsWith('New channel created: #')) {
    if (notification.data?.channel_name) {
      return intl.formatMessage(
        { id: 'notifications.items.newChannelCreated', defaultMessage: 'New channel created: #{channelName}' },
        { channelName: notification.data.channel_name }
      );
    }
  }

  if (notification.title === 'Task Unassigned') {
    return intl.formatMessage({ id: 'notifications.items.taskUnassigned' });
  }

  if (notification.title === 'New Task Assigned') {
    return intl.formatMessage({ id: 'notifications.items.newTaskAssigned', defaultMessage: 'New Task Assigned' });
  }

  return notification.title;
};

const getLocalizedNotificationMessage = (
  notification: Notification,
  intl: ReturnType<typeof useIntl>
) => {
  if (!notification.message) {
    return '';
  }

  if (getWorkspaceInvitationContext(notification)) {
    return intl.formatMessage({
      id: 'notifications.items.workspaceInvitationMessage',
      defaultMessage: 'You have a new workspace invitation waiting for you on Nexus.',
    });
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
    (notification.message.includes('You\'ve been assigned to task') || notification.title === 'New Task Assigned')
  ) {
    return intl.formatMessage(
      { id: 'notifications.items.newTaskAssignedMessage', defaultMessage: 'You\'ve been assigned to task "{taskTitle}"' },
      { taskTitle: notification.data.task_title }
    );
  }

  // Handle Channel Add/Create notifications
  if (notification.type === 'channel_member_added' || notification.type === 'CHANNEL_MEMBER_ADDED' || notification.message.startsWith('You have been added to ')) {
    if (notification.data?.channel_name) {
      if (notification.data.is_private || notification.message.includes('private channel')) {
        return intl.formatMessage(
          { id: 'notifications.items.addedToPrivateChannelMessage', defaultMessage: 'You have been added to the private channel #{channelName}' },
          { channelName: notification.data.channel_name }
        );
      } else {
        return intl.formatMessage(
          { id: 'notifications.items.addedToChannelMessage', defaultMessage: 'You have been added to the channel #{channelName}' },
          { channelName: notification.data.channel_name }
        );
      }
    }
  }

  if (notification.type === 'channel_created' || notification.type === 'CHANNEL_CREATED' || notification.message.startsWith('A new public channel #')) {
    if (notification.data?.channel_name) {
      return intl.formatMessage(
        { id: 'notifications.items.newChannelCreatedMessage', defaultMessage: 'A new public channel #{channelName} has been created in the workspace' },
        { channelName: notification.data.channel_name }
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

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
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


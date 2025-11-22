import { format, formatDistanceToNow } from "date-fns";

/**
 * Format a date string to time (e.g., "3:45 PM")
 * Used in ChatMessage and MessageAdapter components
 */
export function formatTime(dateString: string): string {
  return format(new Date(dateString), "h:mm a");
}

/**
 * Truncate a message to a maximum length with ellipsis
 * Used in ConversationList component
 */
export function truncateMessage(message: string, maxLength = 30): string {
  if (!message) return "New conversation";
  if (message.length <= maxLength) return message;
  return `${message.substring(0, maxLength)}...`;
}

/**
 * Format a date to relative time (e.g., "2 hours ago")
 * Used in ConversationList component
 */
export function formatLastActive(date: string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

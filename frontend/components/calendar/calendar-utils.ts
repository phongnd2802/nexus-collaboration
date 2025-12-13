/**
 * Calendar utility functions for event processing and date calculations
 */

import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  parseISO,
  isSameDay,
} from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { CalendarEvent } from "@/types/index";

/**
 * Event type constants
 */
export const EVENT_TYPES = {
  PROJECT_START: "project-start",
  PROJECT_DUE: "project-due",
  TASK_DUE: "task-due",
} as const;

/**
 * Event color configuration based on event type and properties
 */
export const EVENT_COLOR_MAP = {
  [EVENT_TYPES.PROJECT_START]:
    "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  [EVENT_TYPES.PROJECT_DUE]:
    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  TASK_DUE_COMPLETED:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  TASK_DUE_PENDING:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  DEFAULT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
} as const;

/**
 * Color hex codes
 */
const COMPLETED_TASK_COLOR = "#22c55e";

/**
 * Generates array of calendar days for display including overflow weeks
 * @param selectedDate - The currently selected month/date
 * @param weeksToShow - Number of weeks to display (default: 6)
 * @returns Array of Date objects for calendar grid
 */
export function generateCalendarDays(
  selectedDate: Date,
  weeksToShow: number = 6
): Date[] {
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const startDate = startOfWeek(monthStart);

  const daysNeeded = weeksToShow * 7; // 6 weeks = 42 days
  const days: Date[] = [];

  for (let i = 0; i < daysNeeded; i++) {
    days.push(addDays(startDate, i));
  }

  return days;
}

/**
 * Filters and returns events for a specific day
 * @param events - Array of all calendar events
 * @param day - The date to filter events for
 * @returns Array of events occurring on the specified day
 */
export function getEventsForDay(
  events: CalendarEvent[],
  day: Date
): CalendarEvent[] {
  return events.filter(event => {
    if (!event.start) return false;

    const eventDate =
      typeof event.start === "string"
        ? parseISO(event.start)
        : new Date(event.start);

    return isSameDay(day, eventDate);
  });
}

/**
 * Determines the appropriate color class for an event based on its type and properties
 * @param event - The calendar event
 * @returns CSS class string for event styling
 */
export function getEventColor(event: CalendarEvent): string {
  const type = event.type || "";

  if (type === EVENT_TYPES.PROJECT_START) {
    return EVENT_COLOR_MAP[EVENT_TYPES.PROJECT_START];
  }

  if (type === EVENT_TYPES.PROJECT_DUE) {
    return EVENT_COLOR_MAP[EVENT_TYPES.PROJECT_DUE];
  }

  if (type === EVENT_TYPES.TASK_DUE) {
    // Check if task is completed based on color
    if (event.color === COMPLETED_TASK_COLOR) {
      return EVENT_COLOR_MAP.TASK_DUE_COMPLETED;
    }
    return EVENT_COLOR_MAP.TASK_DUE_PENDING;
  }

  return EVENT_COLOR_MAP.DEFAULT;
}

/**
 * Returns the appropriate event type label for display
 * @param eventType - The type of event
 * @returns Human-readable event type label
 */
export function getEventTypeLabel(eventType: string): string {
  switch (eventType) {
    case EVENT_TYPES.PROJECT_START:
      return "projectStart";
    case EVENT_TYPES.PROJECT_DUE:
      return "projectDue";
    case EVENT_TYPES.TASK_DUE:
      return "taskDue";
    default:
      return "event";
  }
}

/**
 * Extracts clean event title (removes prefixes and suffixes)
 * @param event - The calendar event
 * @returns Cleaned event title
 */
export function extractEventTitle(event: CalendarEvent): string {
  const { title, type } = event;

  // For project events, remove the part in parentheses
  if (type === EVENT_TYPES.PROJECT_START || type === EVENT_TYPES.PROJECT_DUE) {
    return title.includes("(") ? title.split("(")[0].trim() : title;
  }

  // For task events, remove the "Task Due: " prefix
  if (type === EVENT_TYPES.TASK_DUE) {
    return title.replace("Task Due: ", "");
  }

  return title;
}

/**
 * Determines the appropriate navigation link for an event
 * @param event - The calendar event
 * @returns URL path for event navigation
 */
export function getEventNavigationUrl(event: CalendarEvent): string {
  if (
    event.projectId &&
    (event.type === EVENT_TYPES.PROJECT_START ||
      event.type === EVENT_TYPES.PROJECT_DUE)
  ) {
    return `/projects/${event.projectId}`;
  }

  if (event.taskId) {
    return `/tasks/${event.taskId}`;
  }

  return "#";
}

/**
 * Determines navigation label based on event type
 * @param event - The calendar event
 * @returns Navigation label text
 */
export function getEventNavigationLabel(event: CalendarEvent): string {
  if (event.type.includes("project")) {
    return "project";
  }
  return "task";
}

/**
 * Returns the date-fns locale object based on the locale string
 * @param locale - The locale string (e.g., "vi", "en")
 * @returns The date-fns locale object
 */
export function getLocaleObject(locale: string) {
  switch (locale) {
    case "vi":
      return vi;
    default:
      return enUS;
  }
}

/**
 * Event icon mapping component
 * Maps event types to their corresponding icons
 */

import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  BookOpen,
  ClipboardList,
} from "lucide-react";
import { CalendarEvent } from "@/types/index";
import { EVENT_TYPES } from "./calendar-utils";

interface EventIconProps {
  event: CalendarEvent;
  className?: string;
}

/**
 * Determines and renders the appropriate icon for a calendar event
 */
export function EventIcon({ event, className = "h-3 w-3" }: EventIconProps) {
  const type = event.type || "";

  if (type === EVENT_TYPES.PROJECT_START) {
    return <BookOpen className={className} />;
  }

  if (type === EVENT_TYPES.PROJECT_DUE) {
    return <AlertTriangle className={className} />;
  }

  if (type === EVENT_TYPES.TASK_DUE) {
    // Completed tasks have green color
    if (event.color === "#22c55e") {
      return <CheckCircle2 className={className} />;
    }
    return <Clock className={className} />;
  }

  return <ClipboardList className={className} />;
}

/**
 * Calendar header component
 * Displays the weekday names at the top of the calendar
 */

"use client";

import { cn } from "@/lib/utils";

interface CalendarHeaderProps {
  isMobile: boolean;
}

const WEEKDAYS_FULL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];

/**
 * Renders the weekday header row for the calendar
 */
export function CalendarHeader({ isMobile }: CalendarHeaderProps) {
  const weekDays = isMobile ? WEEKDAYS_SHORT : WEEKDAYS_FULL;

  return (
    <div className="grid grid-cols-7 border-b border-border">
      {weekDays.map((day, i) => (
        <div
          key={i}
          className={cn(
            "py-2 text-center font-medium text-muted-foreground",
            isMobile ? "text-xs" : "text-sm"
          )}
        >
          {day}
        </div>
      ))}
    </div>
  );
}

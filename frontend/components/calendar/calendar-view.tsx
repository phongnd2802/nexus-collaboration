"use client";

/**
 * Main Calendar View Component
 *
 * Displays a monthly calendar grid with events from projects and tasks.
 * Shows different views for mobile and desktop devices.
 *
 * Features:
 * - Monthly calendar view with overflow weeks
 * - Event indicators and details
 * - Click handlers for days and events
 * - Responsive mobile/desktop layouts
 * - Event details dialogs
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { CalendarEvent } from "@/types/index";

// Sub-components
import { CalendarHeader } from "./calendar-header";
import { CalendarDayCell } from "./calendar-day-cell";
import { EventDetailsDialog } from "./event-details-dialog";
import { DayEventsDialog } from "./day-events-dialog";

// Utility functions
import { generateCalendarDays, getEventsForDay } from "./calendar-utils";

interface CalendarViewProps {
  /** Array of calendar events to display */
  events: CalendarEvent[];
  /** Currently selected date (determines which month to show) */
  selectedDate: Date;
  /** Callback when a date is selected */
  onDateChange: (date: Date) => void;
}

/**
 * CalendarView - Main calendar display component
 *
 * This component renders a monthly calendar grid with events.
 * It handles both mobile and desktop views, showing event indicators
 * and allowing users to view event details.
 */
export default function CalendarView({
  events = [],
  selectedDate,
  onDateChange,
}: CalendarViewProps) {
  const isMobile = useIsMobile();

  // State for calendar days
  const [calendarDays, setCalendarDays] = useState<Date[]>([]);

  // State for event details dialog
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [isEventDialogOpen, setIsEventDialogOpen] = useState(false);

  // State for day events dialog (mobile)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isDayDialogOpen, setIsDayDialogOpen] = useState(false);

  /**
   * Generate calendar days whenever the selected month changes
   */
  useEffect(() => {
    const days = generateCalendarDays(selectedDate);
    setCalendarDays(days);
  }, [selectedDate]);

  /**
   * Memoized events map for performance optimization
   * Groups events by day to avoid repeated filtering
   */
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();

    calendarDays.forEach((day) => {
      const dayKey = day.toISOString().split("T")[0];
      const dayEvents = getEventsForDay(events, day);
      if (dayEvents.length > 0) {
        map.set(dayKey, dayEvents);
      }
    });

    return map;
  }, [events, calendarDays]);

  /**
   * Get events for a specific day from the memoized map
   */
  const getEventsForDayMemoized = useCallback(
    (day: Date): CalendarEvent[] => {
      const dayKey = day.toISOString().split("T")[0];
      return eventsByDay.get(dayKey) || [];
    },
    [eventsByDay]
  );

  /**
   * Handle event click - opens event details dialog
   */
  const handleEventClick = useCallback(
    (event: CalendarEvent, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }
      setSelectedEvent(event);
      setIsEventDialogOpen(true);
    },
    []
  );

  /**
   * Handle day click - on mobile, shows day events dialog if events exist
   */
  const handleDayClick = useCallback(
    (day: Date) => {
      if (isMobile) {
        setSelectedDay(day);
        const dayEvents = getEventsForDayMemoized(day);
        if (dayEvents.length > 0) {
          setIsDayDialogOpen(true);
        }
      }
      onDateChange(day);
    },
    [isMobile, getEventsForDayMemoized, onDateChange]
  );

  return (
    <Card>
      <CardContent className={isMobile ? "p-0 sm:p-1" : "p-0 sm:p-1"}>
        {/* Weekday header */}
        <CalendarHeader isMobile={isMobile} />

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, i) => (
            <CalendarDayCell
              key={i}
              day={day}
              selectedDate={selectedDate}
              events={getEventsForDayMemoized(day)}
              isMobile={isMobile}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
            />
          ))}
        </div>
      </CardContent>

      {/* Event details dialog */}
      <EventDetailsDialog
        event={selectedEvent}
        isOpen={isEventDialogOpen}
        onOpenChange={setIsEventDialogOpen}
      />

      {/* Day events dialog (mobile) */}
      <DayEventsDialog
        day={selectedDay}
        events={selectedDay ? getEventsForDayMemoized(selectedDay) : []}
        isOpen={isDayDialogOpen}
        onOpenChange={setIsDayDialogOpen}
        onEventClick={handleEventClick}
      />
    </Card>
  );
}

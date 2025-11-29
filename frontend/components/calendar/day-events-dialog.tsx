/**
 * Day events dialog component
 * Shows all events for a selected day (primarily for mobile view)
 */

"use client";

import { format, isToday } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ArrowUpRight, Info } from "lucide-react";
import Link from "next/link";
import { CalendarEvent } from "@/types/index";
import {
  getEventColor,
  getEventNavigationUrl,
  getEventNavigationLabel,
} from "./calendar-utils";
import { EventIcon } from "./event-icon";

interface DayEventsDialogProps {
  day: Date | null;
  events: CalendarEvent[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onEventClick: (event: CalendarEvent) => void;
}

/**
 * Dialog showing all events for a specific day
 */
export function DayEventsDialog({
  day,
  events,
  isOpen,
  onOpenChange,
  onEventClick,
}: DayEventsDialogProps) {
  if (!day) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {format(day, "MMMM d, yyyy")}
            {isToday(day) && (
              <Badge className="bg-violet-500 hover:bg-violet-600 ml-2">
                Today
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <h3 className="text-sm font-medium mb-2">Events</h3>
          <div className="space-y-2">
            {events.length > 0 ? (
              events.map((event, index) => (
                <EventListItem
                  key={index}
                  event={event}
                  onClick={() => onEventClick(event)}
                />
              ))
            ) : (
              <EmptyEventsMessage />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Individual event item in the day's event list
 */
function EventListItem({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: () => void;
}) {
  return (
    <div
      className={`p-2 rounded flex items-start gap-2 cursor-pointer hover:opacity-80 transition-opacity ${getEventColor(
        event
      )}`}
      onClick={onClick}
    >
      <div className="mt-0.5">
        <EventIcon event={event} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-sm">{event.title}</p>
        <div className="flex items-center gap-1 mt-1">
          <Button
            variant="neutral"
            size="sm"
            className="h-6 px-2 text-xs"
            asChild
          >
            <Link href={getEventNavigationUrl(event)}>
              View {getEventNavigationLabel(event)}
              <ArrowUpRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Message displayed when no events exist for the day
 */
function EmptyEventsMessage() {
  return (
    <div className="text-center p-4 bg-muted rounded-md">
      <Info className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">No events for this day</p>
    </div>
  );
}

/**
 * Event details dialog component
 * Displays full event information in a modal dialog
 */

"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarDays, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { CalendarEvent } from "@/types/index";
import {
  getEventTypeLabel,
  extractEventTitle,
  getEventNavigationUrl,
  getEventNavigationLabel,
} from "./calendar-utils";

interface EventDetailsDialogProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog showing detailed information about a calendar event
 */
export function EventDetailsDialog({
  event,
  isOpen,
  onOpenChange,
}: EventDetailsDialogProps) {
  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{event.title}</DialogTitle>
          <DialogDescription>
            {format(new Date(event.start), "MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Event Type Info */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{getEventTypeLabel(event.type)}</span>
          </div>

          {/* Project Info */}
          {event.projectId && (
            <div className="bg-muted p-3 rounded-md">
              <h4 className="text-sm font-medium mb-1">Project</h4>
              <p className="text-sm text-muted-foreground">
                {extractEventTitle(event)}
              </p>
            </div>
          )}

          {/* Task Info */}
          {event.taskId && (
            <div className="bg-muted p-3 rounded-md">
              <h4 className="text-sm font-medium mb-1">Task</h4>
              <p className="text-sm text-muted-foreground">
                {extractEventTitle(event)}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {(event.projectId || event.taskId) && (
            <Button asChild>
              <Link href={getEventNavigationUrl(event)}>
                Go to {getEventNavigationLabel(event)}{" "}
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

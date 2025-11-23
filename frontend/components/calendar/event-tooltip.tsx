/**
 * Event tooltip component
 * Displays event details on hover
 */

"use client";

import { format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CalendarEvent } from "@/types/index";

interface EventTooltipProps {
  event: CalendarEvent;
  children: React.ReactNode;
}

/**
 * Wraps event elements with a tooltip showing event details
 */
export function EventTooltip({ event, children }: EventTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{event.title}</p>
          <p className="text-xs">
            {format(new Date(event.start), "MMM d, yyyy")}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

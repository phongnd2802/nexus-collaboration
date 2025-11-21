"use client";

import { Deadline } from "@/types/index";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, ChevronDown, ChevronRight } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatDueDate, isOverdue } from "@/lib/deadline-utils";
import { DeadlineItem } from "./deadline-item";

interface DeadlineGroupProps {
  dateStr: string;
  deadlines: Deadline[];
  isMobile: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}

/**
 * Groups deadlines by date and displays them in a collapsible section (mobile)
 * or a simple list (desktop).
 */
export function DeadlineGroup({
  dateStr,
  deadlines,
  isMobile,
  isOpen = false,
  onToggle,
}: DeadlineGroupProps) {
  const overdue = isOverdue(dateStr);
  const formattedDate = formatDueDate(dateStr);
  const overdueText = overdue ? " (Overdue)" : "";

  // Mobile view with collapsible sections
  if (isMobile) {
    return (
      <Collapsible
        open={isOpen}
        onOpenChange={onToggle}
        className="border rounded-lg overflow-hidden"
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full p-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <h3
              className={cn("text-sm font-medium", {
                "text-red-600 dark:text-red-400": overdue,
              })}
            >
              {formattedDate}
              {overdueText}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="text-xs">{deadlines.length}</Badge>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="divide-y">
            {deadlines.map((deadline) => (
              <DeadlineItem
                key={deadline.id}
                deadline={deadline}
                isMobile={isMobile}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  // Desktop view with simple layout
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <h3
          className={cn("text-sm font-medium", {
            "text-red-600 dark:text-red-400": overdue,
          })}
        >
          {formattedDate}
          {overdueText}
        </h3>
      </div>

      <div className="pl-6 space-y-3">
        {deadlines.map((deadline) => (
          <DeadlineItem
            key={deadline.id}
            deadline={deadline}
            isMobile={isMobile}
          />
        ))}
      </div>
    </div>
  );
}

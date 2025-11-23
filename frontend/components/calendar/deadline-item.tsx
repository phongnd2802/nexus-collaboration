"use client";

import { Deadline } from "@/types/index";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { getPriorityBadge } from "@/lib/badge-utils";
import {
  getDeadlineIconConfig,
  getDeadlineUrl,
  getInitials,
} from "@/lib/deadline-utils";
import { cn } from "@/lib/utils";

interface DeadlineItemProps {
  deadline: Deadline;
  isMobile: boolean;
}

/**
 * Individual deadline item display.
 * Shows deadline title, project link (for tasks), assignee, priority badge, and action button.
 */
export function DeadlineItem({ deadline, isMobile }: DeadlineItemProps) {
  const { Icon, className: iconClassName } = getDeadlineIconConfig(deadline);
  const deadlineUrl = getDeadlineUrl(deadline);

  return (
    <div
      className={cn(
        isMobile
          ? "p-3 hover:bg-muted/50"
          : "border rounded-lg p-3 hover:bg-muted/50 transition-colors"
      )}
    >
      <div
        className={cn(
          isMobile
            ? "flex items-start gap-3"
            : "flex items-start justify-between"
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(isMobile ? "mt-0.5 shrink-0" : "mt-0.5")}>
            <Icon className={iconClassName} />
          </div>

          <div className={cn(isMobile && "flex-1 min-w-0")}>
            <h4 className={cn("font-medium", isMobile ? "text-sm" : "")}>
              {deadline.title}
            </h4>

            {/* Project link for tasks */}
            {deadline.type === "task" && (
              <div
                className={cn(
                  "text-muted-foreground mt-1",
                  isMobile ? "text-xs" : "text-sm"
                )}
              >
                Project:{" "}
                <Link
                  className={cn(
                    "text-violet-600 dark:text-violet-400 hover:underline",
                    isMobile ? "" : "text-sm mt-1"
                  )}
                  href={`/projects/${deadline.project.id}`}
                >
                  {deadline.project.name}
                </Link>
              </div>
            )}

            {/* Assignee for tasks */}
            {deadline.type === "task" && deadline.assignee && (
              <div className="flex items-center gap-2 mt-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage
                    src={deadline.assignee.image || undefined}
                    alt={deadline.assignee.name}
                  />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(deadline.assignee.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {deadline.assignee.name}
                </span>
              </div>
            )}

            {/* Priority badge and action button for mobile */}
            {isMobile && (
              <div className="flex justify-between items-center mt-2">
                {deadline.type === "task" &&
                  getPriorityBadge(deadline.priority!)}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-violet-700 dark:text-violet-400 ml-auto"
                  asChild
                >
                  <Link href={deadlineUrl}>
                    Go to {deadline.type === "project" ? "Project" : "Task"}
                    <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Priority badge and action button for desktop */}
        {!isMobile && (
          <div className="flex flex-col items-end gap-2">
            {deadline.type === "task" && getPriorityBadge(deadline.priority!)}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-violet-700 dark:text-violet-400"
              asChild
            >
              <Link href={deadlineUrl}>
                Go to {deadline.type === "project" ? "Project" : "Task"}
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Description for desktop only */}
      {!isMobile && deadline.description && (
        <div className="mt-2 text-sm text-muted-foreground">
          {deadline.description.length > 100
            ? `${deadline.description.substring(0, 100)}...`
            : deadline.description}
        </div>
      )}
    </div>
  );
}

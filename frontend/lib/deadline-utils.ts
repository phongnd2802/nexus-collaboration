import { format, isToday, isTomorrow } from "date-fns";
import { Deadline } from "@/types/index";
import {
  AlertTriangle,
  Clock,
  FileBox,
  FolderKanban,
  LucideIcon,
} from "lucide-react";

/**
 * Formats a due date string into a human-readable format.
 * Returns "Today" or "Tomorrow" for near dates, otherwise full format.
 */
export function formatDueDate(dateString: string): string {
  const date = new Date(dateString);
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMMM d, yyyy");
}

/**
 * Checks if a deadline is overdue by comparing with today's date.
 */
export function isOverdue(dateString: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(dateString);
  return dueDate < today;
}

/**
 * Generates initials from a user's name.
 * Returns "U" if name is not provided.
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/**
 * Determines the appropriate icon for a deadline based on its type and priority.
 */
export function getDeadlineIconConfig(deadline: Deadline): {
  Icon: LucideIcon;
  className: string;
} {
  const { type, priority } = deadline;

  if (type === "project") {
    return {
      Icon: FolderKanban,
      className: "h-4 w-4 text-violet-600 dark:text-violet-400",
    };
  }

  if (type === "task") {
    if (priority === "HIGH") {
      return {
        Icon: AlertTriangle,
        className: "h-4 w-4 text-red-600 dark:text-red-400",
      };
    }
    return {
      Icon: FileBox,
      className: "h-4 w-4 text-blue-600 dark:text-blue-400",
    };
  }

  return {
    Icon: Clock,
    className: "h-4 w-4 text-muted-foreground",
  };
}

/**
 * Generates the URL path for a deadline based on its type.
 */
export function getDeadlineUrl(deadline: Deadline): string {
  if (deadline.type === "project") {
    return `/projects/${deadline.project.id}`;
  }
  return `/tasks/${deadline.id.replace("task-", "")}`;
}

/**
 * Sorts deadlines by due date in ascending order.
 */
export function sortDeadlinesByDate(deadlines: Deadline[]): Deadline[] {
  return [...deadlines].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );
}

/**
 * Groups deadlines by their due date.
 */
export function groupDeadlinesByDate(
  deadlines: Deadline[]
): Record<string, Deadline[]> {
  return deadlines.reduce(
    (groups: Record<string, Deadline[]>, deadline) => {
      const dueDate = deadline.dueDate;
      if (!dueDate) return groups;

      const date = new Date(dueDate);
      const dateStr = format(date, "yyyy-MM-dd");

      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(deadline);
      return groups;
    },
    {}
  );
}

/**
 * Filters deadlines by type (project, task, or all).
 */
export function filterDeadlinesByType(
  deadlines: Deadline[],
  filterType: string
): Deadline[] {
  if (filterType === "all") {
    return deadlines;
  }
  return deadlines.filter((deadline) => deadline.type === filterType);
}

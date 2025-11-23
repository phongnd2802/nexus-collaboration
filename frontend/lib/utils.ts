import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isTomorrow, isBefore, startOfDay } from "date-fns";

/**
 * Merges Tailwind CSS classes with clsx.
 * @param inputs - Class values to merge.
 * @returns Merged class string.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Checks if a password meets security requirements:
 * - At least 8 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one digit
 * - At least one special character
 * @param password - The password to check.
 * @returns True if the password meets all requirements, false otherwise.
 */
export const checkPassword = (password: string): boolean => {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
  return regex.test(password);
};

/**
 * Logs messages to the console only in non-production environments.
 * @param args - Arguments to log.
 */
export const debugLog = (...args: any[]): void => {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
};

/**
 * Logs errors to the console only in non-production environments.
 * @param args - Arguments to log.
 */
export const debugError = (...args: any[]): void => {
  if (process.env.NODE_ENV !== "production") {
    console.error(...args);
  }
};

/**
 * Generates initials from a name.
 * @param name - The full name.
 * @returns The initials (uppercase).
 */
export const getInitials = (name: string | null): string => {
  if (!name) return "";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
};

/**
 * Formats a date string to "h:mm a".
 * @param dateString - The date string to format.
 * @returns Formatted time string.
 */
export const formatTime = (dateString: string): string => {
  return format(new Date(dateString), "h:mm a");
};

/**
 * Formats a date string with options for relative dates (Today, Tomorrow) and time inclusion.
 * @param dateString - The date string to format.
 * @param options - Formatting options.
 * @returns Formatted date string.
 */
export const formatDate = (
  dateString: string | null,
  options: { includeTime?: boolean; relative?: boolean } = {}
): string => {
  if (!dateString) return "No due date";
  
  const date = new Date(dateString);
  const { includeTime = false, relative = false } = options;

  // Check if time is significant (not default 23:59 or midnight)
  // This logic was preserved from original utils
  const hasSignificantTime =
    date.getHours() !== 23 ||
    (date.getHours() === 23 && date.getMinutes() !== 59);

  let dateStr = "";

  if (relative) {
    if (isToday(date)) {
      dateStr = "Today";
    } else if (isTomorrow(date)) {
      dateStr = "Tomorrow";
    } else {
      dateStr = format(date, "MMM d, yyyy");
    }
  } else {
    dateStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // Add time if it's significant or explicitly requested
  if (hasSignificantTime || includeTime) {
    const timeStr = format(date, "HH:mm");
    // If relative and today/tomorrow, we might want to append time differently or not at all depending on UI
    // But based on previous TaskCard logic:
    return `${dateStr} at ${timeStr}`;
  }

  return dateStr;
};

/**
 * Formats a date string to a relative time string (e.g., "5 minutes ago").
 * @param dateString - The date string to format.
 * @returns Relative time string.
 */
export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""}`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours > 1 ? "s" : ""}`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""}`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

/**
 * Checks if a task is overdue.
 * @param dateString - The due date string.
 * @param status - The task status.
 * @returns True if overdue, false otherwise.
 */
export const isOverdue = (dateString: string | null, status: string): boolean => {
  if (!dateString || status === "DONE") return false;
  
  const today = startOfDay(new Date());
  const dueDate = startOfDay(new Date(dateString));
  
  return isBefore(dueDate, today);
};

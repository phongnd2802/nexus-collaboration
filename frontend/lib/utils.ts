import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  isToday,
  isTomorrow,
  isBefore,
  startOfDay,
  formatDistanceToNow,
} from "date-fns";
import { vi, enUS } from "date-fns/locale";

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
    .map(n => n[0])
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

type TFunc = (key: string, opts?: any) => string;

export const formatDate = (
  dateString: string | null,
  t: TFunc,
  locale: string,
  options: { includeTime?: boolean; relative?: boolean } = {}
): string => {
  if (!dateString) return t("date.noDueDate");

  const date = new Date(dateString);
  const { includeTime = false, relative = false } = options;

  const hasSignificantTime =
    date.getHours() !== 23 ||
    (date.getHours() === 23 && date.getMinutes() !== 59);

  let dateStr = "";

  // 🌍 CHỌN FORMAT THEO LOCALE
  const dateFormat = locale === "vi" ? "dd-MM-yyyy" : "MM-dd-yyyy";

  if (relative) {
    if (isToday(date)) {
      dateStr = t("date.today");
    } else if (isTomorrow(date)) {
      dateStr = t("date.tomorrow");
    } else {
      dateStr = format(date, dateFormat);
    }
  } else {
    dateStr = format(date, dateFormat);
  }

  // ⏱ time phần
  if (hasSignificantTime || includeTime) {
    const timeStr = format(date, "HH:mm");
    return t("date.withTime", { date: dateStr, time: timeStr });
  }

  return dateStr;
};
/**
 * Formats a date string to a relative time string (e.g., "5 minutes ago").
 * @param dateString - The date string to format.
 * @returns Relative time string.
 */
export const formatRelativeTime = (
  dateString: string,
  locale: string = "en"
): string => {
  const date = new Date(dateString);
  const localeObj = locale === "vi" ? vi : enUS;

  return formatDistanceToNow(date, {
    addSuffix: true,
    locale: localeObj,
  });
};

/**
 * Checks if a task is overdue.
 * @param dateString - The due date string.
 * @param status - The task status.
 * @returns True if overdue, false otherwise.
 */
export const isOverdue = (
  dateString: string | null,
  status: string
): boolean => {
  if (!dateString || status === "DONE") return false;

  const today = startOfDay(new Date());
  const dueDate = startOfDay(new Date(dateString));

  return isBefore(dueDate, today);
};

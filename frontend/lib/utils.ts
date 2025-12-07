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
export const isOverdue = (
  dateString: string | null,
  status: string
): boolean => {
  if (!dateString || status === "DONE") return false;

  const today = startOfDay(new Date());
  const dueDate = startOfDay(new Date(dateString));

  return isBefore(dueDate, today);
};


export function randomString(length: number): string {
  let result = '';
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export function generateRoomId(): string {
  return `${randomString(4)}-${randomString(4)}`;
}


export function encodePassphrase(passphrase: string) {
  return encodeURIComponent(passphrase);
}

export function decodePassphrase(base64String: string) {
  return decodeURIComponent(base64String);
}

export function isLowPowerDevice() {
  return navigator.hardwareConcurrency < 6;
}
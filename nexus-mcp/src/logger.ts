import { getRequestContext } from "./context";

type LogLevel = "info" | "error" | "debug" | "warn";

type LogFields = Record<string, unknown>;

const ANSI = {
  reset: "\u001b[0m",
  dim: "\u001b[2m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  blue: "\u001b[34m",
  magenta: "\u001b[35m",
  cyan: "\u001b[36m",
  gray: "\u001b[90m",
};

const safeContext = (): LogFields => {
  try {
    const context = getRequestContext();
    return {
      requestId: context.requestId,
      workspaceId: context.workspaceId ?? null,
    };
  } catch {
    return {};
  }
};

const serializeError = (value: unknown): unknown => {
  if (!(value instanceof Error)) {
    return value;
  }

  return {
    name: value.name,
    message: value.message,
  };
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return String(value);
  }

  if (typeof value === "string") {
    return value.includes(" ") ? JSON.stringify(value) : value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
};

const colorize = (text: string, color: string): string => `${color}${text}${ANSI.reset}`;

const levelColor = (level: LogLevel): string => {
  switch (level) {
    case "error":
      return ANSI.red;
    case "warn":
      return ANSI.yellow;
    case "debug":
      return ANSI.magenta;
    default:
      return ANSI.blue;
  }
};

const statusColor = (status: string): string => {
  switch (status.toLowerCase()) {
    case "ok":
    case "ready":
    case "connected":
      return ANSI.green;
    case "started":
      return ANSI.cyan;
    case "unauthorized":
    case "client_error":
    case "timeout":
      return ANSI.yellow;
    case "error":
    case "server_error":
      return ANSI.red;
    default:
      return ANSI.gray;
  }
};

const write = (level: LogLevel, message: string, fields?: LogFields) => {
  const payload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...safeContext(),
    ...(fields
      ? Object.fromEntries(
          Object.entries(fields).map(([key, value]) => [key, key === "error" ? serializeError(value) : value]),
        )
      : {}),
  };

  const { timestamp, status, ...rest } = payload as LogFields & {
    timestamp: string;
    status?: unknown;
  };

  const fieldText = Object.entries(rest)
    .map(([key, value]) => `${key}=${formatValue(value)}`)
    .join(" ");

  const levelText = colorize(level.toUpperCase(), levelColor(level));
  const statusText = colorize(`[${String(status ?? "na").toUpperCase()}]`, statusColor(String(status ?? "na")));
  const timestampText = colorize(timestamp, ANSI.dim);

  const line = [
    timestampText,
    levelText,
    statusText,
    message,
    fieldText,
  ]
    .filter(Boolean)
    .join(" ");

  switch (level) {
    case "error":
      console.error(line);
      break;
    case "warn":
      console.warn(line);
      break;
    default:
      console.log(line);
      break;
  }
};

export const logger = {
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
  debug: (message: string, fields?: LogFields) => write("debug", message, fields),
};

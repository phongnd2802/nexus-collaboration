import { config } from "../config";
import { getRequestContext } from "../context";
import { McpToolError } from "../errors";
import { logger } from "../logger";

type QueryValue = string | number | boolean | null | undefined | Array<string | number | boolean>;

type BackendRequestOptions = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  query?: Record<string, QueryValue>;
  body?: unknown;
  responseType?: "json" | "text";
};

const buildUrl = (path: string, query?: Record<string, QueryValue>): string => {
  const url = new URL(`${config.backendBaseUrl}${path}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (Array.isArray(value)) {
      if (value.length > 0) {
        url.searchParams.set(key, value.join(","));
      }
      continue;
    }

    url.searchParams.set(key, String(value));
  }

  return url.toString();
};

const backendErrorMessage = (statusCode: number, fallback: string): string => {
  switch (statusCode) {
    case 400:
      return fallback || "Backend rejected the request. Check tool arguments and try again.";
    case 401:
      return "Backend rejected the bearer token. Re-authenticate and retry.";
    case 403:
      return "Backend denied access to this workspace or resource.";
    case 404:
      return fallback || "The requested resource was not found.";
    case 409:
      return fallback || "The request conflicts with current backend state.";
    default:
      return fallback || "Backend request failed.";
  }
};

export const requireWorkspaceId = (): string => {
  const { workspaceId } = getRequestContext();
  if (!workspaceId) {
    throw new McpToolError("x-workspace-id header is required for this tool.");
  }

  return workspaceId;
};

export const requestBackend = async <T>({
  method,
  path,
  query,
  body,
  responseType = "json",
}: BackendRequestOptions): Promise<T> => {
  const context = getRequestContext();
  const url = buildUrl(path, query);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  const startedAt = Date.now();

  logger.debug("backend_request_started", {
    status: "started",
    method,
    path,
    queryKeys: Object.keys(query ?? {}),
    bodyKeys: body && typeof body === "object" && !Array.isArray(body) ? Object.keys(body as Record<string, unknown>) : [],
  });

  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        Authorization: context.authorization,
        "Content-Type": "application/json",
        ...(context.workspaceId ? { "x-workspace-id": context.workspaceId } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      let fallback = "";

      try {
        const payload = (await response.json()) as { message?: string | string[]; error?: string };
        if (Array.isArray(payload.message)) {
          fallback = payload.message.join("; ");
        } else {
          fallback = payload.message || payload.error || "";
        }
      } catch {
        fallback = await response.text();
      }

      logger.warn("backend_request_failed", {
        status: "error",
        method,
        path,
        statusCode: response.status,
        durationMs: Date.now() - startedAt,
        detail: fallback || null,
      });

      throw new McpToolError(backendErrorMessage(response.status, fallback), response.status);
    }

    logger.debug("backend_request_succeeded", {
      status: "ok",
      method,
      path,
      statusCode: response.status,
      durationMs: Date.now() - startedAt,
    });

    if (responseType === "text") {
      return (await response.text()) as T;
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof McpToolError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      logger.error("backend_request_timeout", {
        status: "timeout",
        method,
        path,
        durationMs: Date.now() - startedAt,
      });
      throw new McpToolError("Backend request timed out. Retry with narrower inputs.");
    }

    logger.error("backend_request_transport_error", {
      status: "error",
      method,
      path,
      durationMs: Date.now() - startedAt,
      error,
    });
    throw new McpToolError(`Failed to reach backend: ${error instanceof Error ? error.message : "unknown error"}`);
  } finally {
    clearTimeout(timeout);
  }
};

import { DEFAULT_API_BASE_URL, DEFAULT_TIMEOUT_MS } from '../constants.js';
import type { ApiRequestOptions } from '../types.js';

export class NexusApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'NexusApiError';
  }
}

export class NexusApiClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly timeoutMs: number;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.baseUrl = normalizeBaseUrl(env.NEXUS_API_BASE_URL || DEFAULT_API_BASE_URL);
    this.token = env.NEXUS_API_TOKEN;
    this.timeoutMs = Number(env.NEXUS_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  }

  async request<T = unknown>(options: ApiRequestOptions): Promise<T> {
    if (!this.token) {
      throw new NexusApiError(
        'Missing NEXUS_API_TOKEN. Set it to a valid Nexus bearer token before using authenticated tools.',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.buildUrl(options.path, options.query), {
        method: options.method || 'GET',
        headers: this.buildHeaders(options.body),
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });

      const text = await response.text();
      const payload = parseJson(text);

      if (!response.ok) {
        throw new NexusApiError(
          buildErrorMessage(response.status, payload),
          response.status,
          payload,
        );
      }

      return payload as T;
    } catch (error) {
      if (error instanceof NexusApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new NexusApiError(
          `Nexus API request timed out after ${this.timeoutMs}ms. Try a narrower query or increase NEXUS_API_TIMEOUT_MS.`,
        );
      }

      const message = error instanceof Error ? error.message : String(error);
      throw new NexusApiError(
        `Failed to reach Nexus API at ${this.baseUrl}: ${message}. Verify NEXUS_API_BASE_URL and that the backend is running.`,
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const url = new URL(`${this.baseUrl}/${path.replace(/^\/+/, '')}`);

    for (const [key, value] of Object.entries(query || {})) {
      if (value === undefined || value === null || value === '') {
        continue;
      }

      if (Array.isArray(value)) {
        url.searchParams.set(key, value.join(','));
      } else {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  private buildHeaders(body: unknown): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      Authorization: `Bearer ${this.token}`,
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const optionalHeaders: Array<[string, string]> = [
      ['NEXUS_API_KEY', 'X-API-Key'],
      ['NEXUS_PROJECT_ID', 'X-Project-ID'],
      ['NEXUS_APP_ID', 'X-App-ID'],
      ['NEXUS_ORGANIZATION_ID', 'X-Organization-ID'],
    ];

    for (const [envKey, headerName] of optionalHeaders) {
      const value = process.env[envKey];
      if (value) {
        headers[headerName] = value;
      }
    }

    return headers;
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function parseJson(text: string): unknown {
  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    return { text };
  }
}

function buildErrorMessage(status: number, payload: unknown): string {
  if (isRecord(payload)) {
    const message = payload.message;
    if (Array.isArray(message)) {
      return `Nexus API returned ${status}: ${message.join('; ')}`;
    }

    if (typeof message === 'string') {
      return `Nexus API returned ${status}: ${message}`;
    }

    if (typeof payload.error === 'string') {
      return `Nexus API returned ${status}: ${payload.error}`;
    }
  }

  return `Nexus API returned ${status}. Check token permissions, workspace membership, and request parameters.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

import { DEFAULT_API_BASE_URL, DEFAULT_TIMEOUT_MS } from '../constants.js';
import type { ApiRequestOptions, NexusMcpRequestContext } from '../types.js';

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
  private readonly internalApiKey?: string;
  private readonly timeoutMs: number;
  private readonly context?: NexusMcpRequestContext;

  constructor(
    env: NodeJS.ProcessEnv = process.env,
    context?: NexusMcpRequestContext,
  ) {
    this.baseUrl = normalizeBaseUrl(env.NEXUS_API_BASE_URL || DEFAULT_API_BASE_URL);
    this.token = extractBearerToken(context?.authorizationHeader) || env.NEXUS_API_TOKEN;
    this.internalApiKey = env.NEXUS_API_KEY;
    this.timeoutMs = Number(env.NEXUS_API_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
    this.context = context;
  }

  async request<T = unknown>(options: ApiRequestOptions): Promise<T> {
    if (!this.token) {
      throw new NexusApiError(
        'Missing Authorization bearer token. For HTTP MCP, pass Authorization to /mcp. For stdio, set NEXUS_API_TOKEN.',
      );
    }

    if (!this.internalApiKey) {
      throw new NexusApiError(
        'Missing NEXUS_API_KEY. Set it to the internal Nexus API key used for MCP-to-backend calls.',
      );
    }

    this.assertWorkspaceScope(options);

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
      'X-API-Key': this.internalApiKey || '',
      'X-Nexus-Source': this.context?.source || 'mcp',
      'X-Nexus-Actor-Type': 'agent',
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.context?.workspaceId) {
      headers['X-Nexus-Workspace-ID'] = this.context.workspaceId;
    }

    if (this.context?.requestId) {
      headers['X-Nexus-Request-ID'] = this.context.requestId;
    }

    if (this.context?.timezone) {
      headers['X-Nexus-Timezone'] = this.context.timezone;
    }

    const optionalHeaders: Array<[string, string]> = [
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

  assertWorkspaceId(workspaceId: unknown): void {
    if (!this.context?.workspaceId || workspaceId === undefined || workspaceId === null) {
      return;
    }

    if (String(workspaceId) !== this.context.workspaceId) {
      throw new NexusApiError(
        `Workspace mismatch: tool requested workspace '${String(workspaceId)}' but MCP request is scoped to '${this.context.workspaceId}'.`,
      );
    }
  }

  private assertWorkspaceScope(options: ApiRequestOptions): void {
    if (!this.context?.workspaceId) {
      return;
    }

    const pathWorkspaceId = extractWorkspaceIdFromPath(options.path);
    if (pathWorkspaceId && pathWorkspaceId !== this.context.workspaceId) {
      throw new NexusApiError(
        `Workspace mismatch: backend path uses workspace '${pathWorkspaceId}' but MCP request is scoped to '${this.context.workspaceId}'.`,
      );
    }
  }
}

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, '');
}

function extractBearerToken(authorizationHeader?: string): string | undefined {
  const [type, token] = authorizationHeader?.split(' ') ?? [];
  return type?.toLowerCase() === 'bearer' && token ? token : undefined;
}

function extractWorkspaceIdFromPath(path: string): string | undefined {
  const match = path.match(/^\/?workspaces\/([^/?#]+)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
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

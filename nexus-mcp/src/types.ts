export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ResponseFormat = 'json' | 'markdown';

export interface ApiRequestOptions {
  method?: HttpMethod;
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
}

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

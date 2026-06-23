import type { ResponseFormat, ToolResult } from '../types.js';

export function okResult(data: unknown, responseFormat: ResponseFormat, title: string): ToolResult {
  const structuredContent = toStructuredContent(data);

  return {
    content: [
      {
        type: 'text',
        text:
          responseFormat === 'json'
            ? JSON.stringify(data, null, 2)
            : formatMarkdown(data, title),
      },
    ],
    structuredContent,
  };
}

export function errorResult(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : String(error);

  return {
    isError: true,
    content: [{ type: 'text', text: `Error: ${message}` }],
  };
}

function toStructuredContent(data: unknown): Record<string, unknown> {
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }

  return { data };
}

function formatMarkdown(data: unknown, title: string): string {
  if (Array.isArray(data)) {
    return [`## ${title}`, '', ...data.slice(0, 50).map((item, index) => `### ${index + 1}\n${formatValue(item)}`)].join(
      '\n',
    );
  }

  if (typeof data === 'object' && data !== null) {
    return `## ${title}\n\n${formatValue(data)}`;
  }

  return `## ${title}\n\n${String(data)}`;
}

function formatValue(value: unknown): string {
  if (typeof value !== 'object' || value === null) {
    return String(value);
  }

  return `\`\`\`json\n${JSON.stringify(value, null, 2)}\n\`\`\``;
}

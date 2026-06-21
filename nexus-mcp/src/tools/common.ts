import { McpToolError } from "../errors";

export const successSchemaShape = {
  ok: true,
  summary: "",
  data: {},
};

export const makeToolResult = (summary: string, data: unknown) => {
  const payload = {
    ok: true as const,
    summary,
    data,
  };

  return {
    content: [
      {
        type: "text" as const,
        text: summary,
      },
    ],
    structuredContent: payload,
  };
};

export const normalizeError = (error: unknown) => {
  if (error instanceof McpToolError) {
    return error;
  }

  return new McpToolError(error instanceof Error ? error.message : "Unknown tool error");
};

export const summarizeCollection = (label: string, data: unknown): string => {
  if (Array.isArray(data)) {
    return `${label}: ${data.length} item(s).`;
  }

  if (data && typeof data === "object") {
    return `${label}: request completed.`;
  }

  if (data === undefined || data === null) {
    return `${label}: no content returned.`;
  }

  return `${label}: ${String(data)}`;
};

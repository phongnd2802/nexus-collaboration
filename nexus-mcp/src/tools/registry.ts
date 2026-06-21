import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { z } from "zod";

import { logger } from "../logger";
import { normalizeError, makeToolResult } from "./common";
import { successSchema } from "./schemas";

type ToolAnnotations = {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
};

export const registerTool = (
  server: McpServer,
  name: string,
  description: string,
  inputSchema: z.ZodRawShape,
  annotations: ToolAnnotations,
  handler: (params: Record<string, unknown>) => Promise<ReturnType<typeof makeToolResult>>,
) => {
  server.registerTool(
    name,
    {
      title: name,
      description,
      inputSchema,
      outputSchema: successSchema.shape,
      annotations,
    },
    async (params) => {
      const startedAt = Date.now();
      logger.info("tool_started", {
        status: "started",
        toolName: name,
        inputKeys: Object.keys(params as Record<string, unknown>),
      });

      try {
        const result = await handler(params as Record<string, unknown>);
        logger.info("tool_succeeded", {
          status: "ok",
          toolName: name,
          durationMs: Date.now() - startedAt,
        });
        return result;
      } catch (error) {
        const normalized = normalizeError(error);
        logger.error("tool_failed", {
          status: "error",
          toolName: name,
          durationMs: Date.now() - startedAt,
          error: normalized,
        });
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: normalized.message,
            },
          ],
        };
      }
    },
  );
};

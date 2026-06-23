import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShape, ZodTypeAny } from 'zod';
import { z } from 'zod';
import { NexusApiClient } from '../services/nexus-api.js';
import { errorResult, okResult } from '../services/format.js';
import { responseFormatSchema } from '../schemas/common.js';
import type { HttpMethod, ResponseFormat } from '../types.js';

interface ApiToolConfig {
  name: string;
  title: string;
  description: string;
  inputSchema: ZodRawShape;
  outputSchema?: ZodTypeAny;
  outputTransform?: (data: unknown) => unknown;
  method?: HttpMethod;
  path: (params: Record<string, unknown>) => string;
  query?: (params: Record<string, unknown>) => Record<string, unknown> | undefined;
  body?: (params: Record<string, unknown>) => unknown;
  annotations: {
    readOnlyHint: boolean;
    destructiveHint: boolean;
    idempotentHint: boolean;
    openWorldHint: boolean;
  };
}

export function registerApiTool(server: McpServer, client: NexusApiClient, config: ApiToolConfig) {
  server.registerTool(
    config.name,
    {
      title: config.title,
      description: config.description,
      inputSchema: {
        ...config.inputSchema,
        response_format: responseFormatSchema,
      },
      ...(config.outputSchema
        ? {
            outputSchema: config.outputSchema,
          }
        : {}),
      annotations: config.annotations,
    },
    async (params) => {
      const parsed = z.object({
        ...config.inputSchema,
        response_format: responseFormatSchema,
      }).parse(params);
      const requestParams = parsed as Record<string, unknown>;
      const responseFormat = requestParams.response_format as ResponseFormat;

      try {
        client.assertWorkspaceId(requestParams.workspace_id);

        const data = await client.request({
          method: config.method,
          path: config.path(requestParams),
          query: config.query?.(requestParams),
          body: config.body?.(requestParams),
        });

        const outputData = config.outputTransform ? config.outputTransform(data) : data;
        const structuredData = config.outputSchema
          ? config.outputSchema.parse(outputData)
          : data;

        return okResult(structuredData, responseFormat, config.title);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

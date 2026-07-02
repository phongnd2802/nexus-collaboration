import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ZodRawShape, ZodTypeAny } from 'zod';
import { z } from 'zod';
import { normalizeBySchema } from '../services/normalize.js';
import { NexusApiClient } from '../services/nexus-api.js';
import { errorResult, okResult } from '../services/format.js';
import { responseFormatSchema } from '../schemas/common.js';
import type { HttpMethod, ResponseFormat } from '../types.js';

interface ApiToolConfig {
  name: string;
  title: string;
  description: string;
  search?: {
    aliases?: string[];
    intents?: string[];
    entities?: string[];
    verbs?: string[];
    keywords?: string[];
  };
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
  const description = toolDescription(config);

  server.registerTool(
    config.name,
    {
      title: config.title,
      description,
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
        const structuredData = config.outputSchema ? normalizeBySchema(config.outputSchema, outputData) : data;

        return okResult(structuredData, responseFormat, config.title);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

function toolDescription(config: ApiToolConfig): string {
  const searchText = searchMetadataText(config.search);
  return searchText ? `${config.description}\n\nSearch metadata: ${searchText}.` : config.description;
}

function searchMetadataText(search: ApiToolConfig['search']): string {
  if (!search) return '';
  const parts = [
    labeledValues('aliases', search.aliases),
    labeledValues('intents', search.intents),
    labeledValues('entities', search.entities),
    labeledValues('verbs', search.verbs),
    labeledValues('keywords', search.keywords),
  ].filter(Boolean);
  return parts.join('; ');
}

function labeledValues(label: string, values: string[] | undefined): string {
  if (!values || values.length === 0) return '';
  return `${label}: ${dedupe(values).join(', ')}`;
}

function dedupe(values: string[]): string[] {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      if (!value || seen.has(value.toLowerCase())) return false;
      seen.add(value.toLowerCase());
      return true;
    });
}

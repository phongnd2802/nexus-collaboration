import { Injectable } from '@nestjs/common';
import { ToolDefinition } from '../ai-provider/providers';
import { McpClientRegistryService } from './mcp-client-registry.service';
import { McpTool, McpToolDefinition, McpTrustedContext } from './interfaces/mcp-agent.interface';

@Injectable()
export class McpToolAdapterService {
  constructor(private readonly registry: McpClientRegistryService) {}

  async getToolDefinitions(): Promise<McpToolDefinition[]> {
    const tools = await this.registry.listTools();
    return tools.map((tool) => this.toToolDefinition(tool));
  }

  async callTool(
    definition: McpToolDefinition,
    args: Record<string, unknown>,
    context: McpTrustedContext,
  ): Promise<string> {
    const safeArgs = this.withTrustedContext(args, context);
    const result = await this.registry.callTool(
      definition.serverName,
      definition.originalName,
      safeArgs,
    );
    return this.stringifyToolResult(result);
  }

  findTool(name: string, tools: McpToolDefinition[]): McpToolDefinition | undefined {
    return tools.find((tool) => tool.name === name);
  }

  private toToolDefinition(tool: McpTool): McpToolDefinition {
    return {
      name: this.toProviderToolName(tool.serverName, tool.name),
      originalName: tool.name,
      serverName: tool.serverName,
      description: tool.description || `Tool "${tool.name}" from MCP server "${tool.serverName}"`,
      parameters: this.normalizeInputSchema(tool.inputSchema),
    };
  }

  private toProviderToolName(serverName: string, toolName: string): string {
    const name = `${serverName}__${toolName}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    return name.slice(0, 64);
  }

  private normalizeInputSchema(schema?: Record<string, unknown>): ToolDefinition['parameters'] {
    if (!schema || typeof schema !== 'object') {
      return { type: 'object', properties: {} };
    }

    return {
      type: 'object',
      properties: {},
      ...schema,
    };
  }

  private withTrustedContext(
    args: Record<string, unknown>,
    context: McpTrustedContext,
  ): Record<string, unknown> {
    const safeArgs = { ...(args || {}) };

    delete safeArgs.userId;
    delete safeArgs.workspaceId;
    delete safeArgs.executeActions;
    delete safeArgs.sessionId;
    delete safeArgs.currentView;
    delete safeArgs.referencedItems;
    delete safeArgs.__nexusContext;

    return {
      ...safeArgs,
      __nexusContext: context,
    };
  }

  private stringifyToolResult(result: any): string {
    if (typeof result === 'string') return result;

    if (Array.isArray(result?.content)) {
      return result.content
        .map((part: any) => {
          if (part?.type === 'text') return part.text;
          return JSON.stringify(part);
        })
        .join('\n');
    }

    return JSON.stringify(result);
  }
}

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { z } from 'zod';
import { McpServerConfig, McpTool } from './interfaces/mcp-agent.interface';

interface McpClient {
  connect(): Promise<void>;
  listTools(): Promise<McpTool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<any>;
  close(): void;
}

const McpServerConfigSchema = z
  .object({
    name: z.string().min(1),
    transport: z.enum(['stdio', 'http', 'sse']).default('stdio'),
    command: z.string().optional(),
    args: z.array(z.string()).default([]),
    env: z.record(z.string(), z.string()).optional(),
    cwd: z.string().optional(),
    url: z.string().url().optional(),
    enabled: z.boolean().default(true),
  })
  .refine(
    (cfg) => (cfg.transport === 'stdio' ? !!cfg.command : !!cfg.url),
    { message: 'stdio configs require "command"; http and sse configs require "url"' },
  );

const McpServersSchema = z.array(McpServerConfigSchema);

class StdioMcpClient implements McpClient {
  private readonly logger = new Logger(`MCP:${this.config.name}`);
  private client?: Client;
  private transport?: StdioClientTransport;

  constructor(private readonly config: McpServerConfig) {}

  async connect(): Promise<void> {
    if (this.client) return;
    if (!this.config.command) {
      throw new Error(`MCP stdio server "${this.config.name}" is missing command`);
    }

    const transport = new StdioClientTransport({
      command: this.config.command,
      args: this.config.args || [],
      ...(this.config.env ? { env: this.config.env } : {}),
      cwd: this.config.cwd,
      stderr: 'pipe',
    });
    const stderr = transport.stderr;
    if (stderr) {
      stderr.on('data', (chunk) => {
        this.logger.debug(String(chunk).trim());
      });
    }

    const client = new Client({ name: 'nexus-backend', version: '1.0.0' });
    await client.connect(transport);
    this.transport = transport;
    this.client = client;
  }

  async listTools(): Promise<McpTool[]> {
    const client = this.getClient();
    const result = await client.listTools();
    const tools = Array.isArray(result?.tools) ? result.tools : [];
    return tools.map((tool: any) => ({
      serverName: this.config.name,
      name: String(tool.name),
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    const client = this.getClient();
    return client.callTool({ name, arguments: args || {} });
  }

  close(): void {
    const client = this.client;
    this.client = undefined;
    this.transport = undefined;
    void client?.close();
  }

  private getClient(): Client {
    if (!this.client) {
      throw new Error(`MCP server "${this.config.name}" is not connected`);
    }

    return this.client;
  }
}

class HttpMcpClient implements McpClient {
  private readonly logger = new Logger(`MCP:${this.config.name}`);
  private client?: Client;
  private transport?: StreamableHTTPClientTransport;

  constructor(private readonly config: McpServerConfig) {}

  async connect(): Promise<void> {
    if (this.client) return;
    if (!this.config.url) {
      throw new Error(`MCP HTTP server "${this.config.name}" is missing url`);
    }

    const transport = new StreamableHTTPClientTransport(new URL(this.config.url));
    const client = new Client({ name: 'nexus-backend', version: '1.0.0' });

    try {
      await client.connect(transport);
      this.transport = transport;
      this.client = client;
    } catch (error) {
      this.logger.warn(`MCP HTTP request failed: ${(error as Error).message}`);
      await client.close().catch(() => undefined);
      throw error;
    }
  }

  async listTools(): Promise<McpTool[]> {
    try {
      const result = await this.withReconnect(() => this.getClient().listTools());
      const tools = Array.isArray(result?.tools) ? result.tools : [];
      return tools.map((tool: any) => ({
        serverName: this.config.name,
        name: String(tool.name),
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
    } catch (error) {
      this.logger.warn(`MCP HTTP request failed: ${(error as Error).message}`);
      throw error;
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    try {
      return await this.withReconnect(() =>
        this.getClient().callTool({ name, arguments: args || {} }),
      );
    } catch (error) {
      this.logger.warn(`MCP HTTP request failed: ${(error as Error).message}`);
      throw error;
    }
  }

  close(): void {
    const client = this.client;
    this.client = undefined;
    this.transport = undefined;
    void client?.close();
  }

  private getClient(): Client {
    if (!this.client) {
      throw new Error(`MCP server "${this.config.name}" is not connected`);
    }

    return this.client;
  }

  private async withReconnect<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (!this.isSessionLostError(error)) {
        throw error;
      }

      this.logger.warn(`MCP HTTP session lost, reconnecting: ${(error as Error).message}`);
      this.close();
      await this.connect();
      return operation();
    }
  }

  private isSessionLostError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return message.includes('session not found') || message.includes('404');
  }
}

class SseMcpClient implements McpClient {
  private readonly logger = new Logger(`MCP:${this.config.name}`);
  private client?: Client;
  private transport?: SSEClientTransport;

  constructor(private readonly config: McpServerConfig) {}

  async connect(): Promise<void> {
    if (this.client) return;
    if (!this.config.url) {
      throw new Error(`MCP SSE server "${this.config.name}" is missing url`);
    }

    const transport = new SSEClientTransport(new URL(this.config.url));
    const client = new Client({ name: 'nexus-backend', version: '1.0.0' });

    try {
      await client.connect(transport);
      this.transport = transport;
      this.client = client;
    } catch (error) {
      this.logger.warn(`MCP SSE request failed: ${(error as Error).message}`);
      await client.close().catch(() => undefined);
      throw error;
    }
  }

  async listTools(): Promise<McpTool[]> {
    try {
      const result = await this.withReconnect(() => this.getClient().listTools());
      const tools = Array.isArray(result?.tools) ? result.tools : [];
      return tools.map((tool: any) => ({
        serverName: this.config.name,
        name: String(tool.name),
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
    } catch (error) {
      this.logger.warn(`MCP SSE request failed: ${(error as Error).message}`);
      throw error;
    }
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    try {
      return await this.withReconnect(() =>
        this.getClient().callTool({ name, arguments: args || {} }),
      );
    } catch (error) {
      this.logger.warn(`MCP SSE request failed: ${(error as Error).message}`);
      throw error;
    }
  }

  close(): void {
    const client = this.client;
    this.client = undefined;
    this.transport = undefined;
    void client?.close();
  }

  private getClient(): Client {
    if (!this.client) {
      throw new Error(`MCP server "${this.config.name}" is not connected`);
    }

    return this.client;
  }

  private async withReconnect<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (!this.isSessionLostError(error)) {
        throw error;
      }

      this.logger.warn(`MCP SSE session lost, reconnecting: ${(error as Error).message}`);
      this.close();
      await this.connect();
      return operation();
    }
  }

  private isSessionLostError(error: unknown): boolean {
    const message = error instanceof Error ? error.message.toLowerCase() : '';
    return message.includes('session not found') || message.includes('404');
  }
}

@Injectable()
export class McpClientRegistryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(McpClientRegistryService.name);
  private readonly clients = new Map<string, McpClient>();
  private configs: McpServerConfig[] = [];

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.configs = this.loadConfigs();
    for (const config of this.configs) {
      if (config.enabled === false) continue;
      await this.connectConfig(config).catch((error) => {
        this.logger.warn(
          `Failed to connect MCP server "${config.name}": ${(error as Error).message}`,
        );
      });
    }
  }

  onModuleDestroy(): void {
    for (const client of this.clients.values()) {
      client.close();
    }
    this.clients.clear();
  }

  async listTools(): Promise<McpTool[]> {
    await this.ensureConfiguredClients();
    const results = await Promise.allSettled(
      Array.from(this.clients.values()).map((client) => client.listTools()),
    );
    return results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  }

  async callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<any> {
    const client = await this.getClient(serverName);
    if (!client) {
      throw new Error(`MCP server not connected: ${serverName}`);
    }
    return client.callTool(toolName, args);
  }

  private async ensureConfiguredClients(): Promise<void> {
    const pendingConfigs = this.configs.filter(
      (config) => config.enabled !== false && !this.clients.has(config.name),
    );
    if (pendingConfigs.length === 0) return;

    await Promise.allSettled(pendingConfigs.map((config) => this.connectConfig(config)));
  }

  private async getClient(serverName: string): Promise<McpClient | undefined> {
    const existing = this.clients.get(serverName);
    if (existing) return existing;

    const config = this.configs.find((item) => item.name === serverName && item.enabled !== false);
    if (!config) return undefined;

    return this.connectConfig(config);
  }

  private async connectConfig(config: McpServerConfig): Promise<McpClient> {
    const existing = this.clients.get(config.name);
    if (existing) return existing;

    let client: McpClient;
    if (config.transport === 'http') client = new HttpMcpClient(config);
    else if (config.transport === 'sse') client = new SseMcpClient(config);
    else client = new StdioMcpClient(config);
    await client.connect();
    this.clients.set(config.name, client);
    this.logger.log(`Connected MCP server: ${config.name}`);
    return client;
  }

  private loadConfigs(): McpServerConfig[] {
    const raw = this.configService.get<string>('MCP_SERVERS_JSON');
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      const result = McpServersSchema.safeParse(parsed);
      if (!result.success) {
        this.logger.warn(`Invalid MCP_SERVERS_JSON: ${JSON.stringify(result.error.flatten())}`);
        return [];
      }

      return result.data;
    } catch (error) {
      this.logger.warn(`Invalid MCP_SERVERS_JSON: ${(error as Error).message}`);
      return [];
    }
  }
}

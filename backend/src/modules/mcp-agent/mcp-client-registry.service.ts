import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { McpServerConfig, McpTool } from './interfaces/mcp-agent.interface';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  id?: number;
  result?: any;
  error?: { message?: string; code?: number; data?: any };
  method?: string;
}

interface McpClient {
  connect(): Promise<void>;
  listTools(): Promise<McpTool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<any>;
  close(): void;
}

class StdioMcpClient implements McpClient {
  private readonly logger = new Logger(`MCP:${this.config.name}`);
  private child?: ChildProcessWithoutNullStreams;
  private nextId = 1;
  private buffer = Buffer.alloc(0);
  private pending = new Map<
    number,
    { resolve: (value: any) => void; reject: (reason?: any) => void; timeout: NodeJS.Timeout }
  >();

  constructor(private readonly config: McpServerConfig) {}

  async connect(): Promise<void> {
    if (this.child) return;
    if (!this.config.command) {
      throw new Error(`MCP stdio server "${this.config.name}" is missing command`);
    }

    this.child = spawn(this.config.command, this.config.args || [], {
      cwd: this.config.cwd,
      env: { ...process.env, ...(this.config.env || {}) },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.child.stdout.on('data', (chunk) => this.handleData(chunk));
    this.child.stderr.on('data', (chunk) => {
      this.logger.debug(String(chunk).trim());
    });
    this.child.on('exit', (code, signal) => {
      this.rejectAll(new Error(`MCP server exited (${code ?? signal ?? 'unknown'})`));
      this.child = undefined;
    });

    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'nexus-backend', version: '1.0.0' },
    });
    this.notify('notifications/initialized', {});
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.request('tools/list', {});
    const tools = Array.isArray(result?.tools) ? result.tools : [];
    return tools.map((tool: any) => ({
      serverName: this.config.name,
      name: String(tool.name),
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    return this.request('tools/call', { name, arguments: args || {} });
  }

  close(): void {
    this.rejectAll(new Error('MCP client closed'));
    this.child?.kill();
    this.child = undefined;
  }

  private request(method: string, params?: any): Promise<any> {
    if (!this.child) {
      return Promise.reject(new Error(`MCP server "${this.config.name}" is not connected`));
    }

    const id = this.nextId++;
    const payload: JsonRpcRequest = { jsonrpc: '2.0', id, method, params };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP request timed out: ${method}`));
      }, 30000);

      this.pending.set(id, { resolve, reject, timeout });
      this.writeMessage(payload);
    });
  }

  private notify(method: string, params?: any): void {
    if (!this.child) return;
    this.writeMessage({ jsonrpc: '2.0', method, params });
  }

  private writeMessage(payload: any): void {
    const body = Buffer.from(JSON.stringify(payload), 'utf8');
    const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'utf8');
    this.child!.stdin.write(Buffer.concat([header, body]));
  }

  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (true) {
      const headerEnd = this.buffer.indexOf('\r\n\r\n');
      if (headerEnd === -1) return;

      const header = this.buffer.subarray(0, headerEnd).toString('utf8');
      const match = /Content-Length:\s*(\d+)/i.exec(header);
      if (!match) {
        this.buffer = this.buffer.subarray(headerEnd + 4);
        continue;
      }

      const length = Number(match[1]);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + length;
      if (this.buffer.length < bodyEnd) return;

      const body = this.buffer.subarray(bodyStart, bodyEnd).toString('utf8');
      this.buffer = this.buffer.subarray(bodyEnd);
      this.handleMessage(body);
    }
  }

  private handleMessage(body: string): void {
    let message: JsonRpcResponse;
    try {
      message = JSON.parse(body);
    } catch (error) {
      this.logger.warn(`Invalid MCP JSON-RPC message: ${(error as Error).message}`);
      return;
    }

    if (typeof message.id !== 'number') return;
    const pending = this.pending.get(message.id);
    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pending.delete(message.id);

    if (message.error) {
      pending.reject(new Error(message.error.message || `MCP error ${message.error.code}`));
      return;
    }

    pending.resolve(message.result);
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

class HttpMcpClient implements McpClient {
  private readonly logger = new Logger(`MCP:${this.config.name}`);

  constructor(private readonly config: McpServerConfig) {}

  async connect(): Promise<void> {
    await this.withClient(async () => undefined);
  }

  async listTools(): Promise<McpTool[]> {
    const result = await this.withClient((client) => client.listTools());
    const tools = Array.isArray(result?.tools) ? result.tools : [];
    return tools.map((tool: any) => ({
      serverName: this.config.name,
      name: String(tool.name),
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<any> {
    return this.withClient((client) => client.callTool({ name, arguments: args || {} }));
  }

  close(): void {}

  private async withClient<T>(operation: (client: Client) => Promise<T>): Promise<T> {
    if (!this.config.url) {
      throw new Error(`MCP HTTP server "${this.config.name}" is missing url`);
    }

    const transport = new StreamableHTTPClientTransport(new URL(this.config.url));
    const client = new Client({ name: 'nexus-backend', version: '1.0.0' });

    try {
      await client.connect(transport);
      return await operation(client);
    } catch (error) {
      this.logger.warn(`MCP HTTP request failed: ${(error as Error).message}`);
      throw error;
    } finally {
      await client.close().catch(() => undefined);
    }
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

    const client =
      config.transport === 'http' ? new HttpMcpClient(config) : new StdioMcpClient(config);
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
      if (!Array.isArray(parsed)) {
        this.logger.warn('MCP_SERVERS_JSON must be an array');
        return [];
      }

      return parsed
        .filter((item) => {
          const transport = item?.transport === 'http' ? 'http' : 'stdio';
          return item?.name && (transport === 'http' ? item.url : item.command);
        })
        .map((item) => ({
          name: String(item.name),
          transport: item.transport === 'http' ? 'http' : 'stdio',
          command: item.command ? String(item.command) : undefined,
          args: Array.isArray(item.args) ? item.args.map(String) : [],
          env: item.env && typeof item.env === 'object' ? item.env : undefined,
          cwd: item.cwd ? String(item.cwd) : undefined,
          url: item.url ? String(item.url) : undefined,
          enabled: item.enabled !== false,
        }));
    } catch (error) {
      this.logger.warn(`Invalid MCP_SERVERS_JSON: ${(error as Error).message}`);
      return [];
    }
  }
}

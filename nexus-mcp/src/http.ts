#!/usr/bin/env node
import './load-env.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import type { Request, Response } from 'express';
import { createNexusMcpServer } from './server.js';
import type { NexusMcpRequestContext } from './types.js';

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 3333;
const DEFAULT_PATH = '/mcp';

function getConfig() {
  const host = process.env.NEXUS_MCP_HTTP_HOST || DEFAULT_HOST;
  const port = Number(process.env.NEXUS_MCP_HTTP_PORT || DEFAULT_PORT);
  const path = normalizePath(process.env.NEXUS_MCP_HTTP_PATH || DEFAULT_PATH);
  const allowedHosts = process.env.NEXUS_MCP_ALLOWED_HOSTS
    ?.split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('NEXUS_MCP_HTTP_PORT must be an integer between 1 and 65535.');
  }

  return { host, port, path, allowedHosts };
}

async function main() {
  const { host, port, path, allowedHosts } = getConfig();
  const app = createMcpExpressApp({ host, allowedHosts });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', transport: 'streamable-http' });
  });

  app.post(path, async (req: Request, res: Response) => {
    const context = getRequestContext(req, res);
    if (!context) {
      return;
    }

    const server = createNexusMcpServer(context);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on('close', () => {
      void transport.close();
      void server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Error handling MCP HTTP request: ${message}`);

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  app.get(path, (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed. This stateless Streamable HTTP server accepts POST requests.',
      },
      id: null,
    });
  });

  app.delete(path, (_req: Request, res: Response) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed.',
      },
      id: null,
    });
  });

  app.listen(port, host, () => {
    console.error(`Nexus MCP Streamable HTTP server listening at http://${host}:${port}${path}`);
  });
}

function getRequestContext(req: Request, res: Response): NexusMcpRequestContext | undefined {
  const authorizationHeader = getHeader(req, 'authorization');
  const workspaceId = getHeader(req, 'x-nexus-workspace-id');
  const requestId = getHeader(req, 'x-nexus-request-id');
  const timezone = getHeader(req, 'x-nexus-timezone');
  const bearerToken = extractBearerToken(authorizationHeader);

  console.error(
    '[nexus-mcp] incoming /mcp request',
    JSON.stringify({
      hasAuthorizationHeader: Boolean(authorizationHeader),
      bearerTokenPresent: Boolean(bearerToken),
      bearerTokenPrefix: bearerToken ? bearerToken.slice(0, 8) : null,
      workspaceIdPresent: Boolean(workspaceId),
      workspaceId,
      requestId: requestId || null,
      timezone: timezone || null,
    }),
  );

  if (!authorizationHeader?.toLowerCase().startsWith('bearer ')) {
    console.error('[nexus-mcp] rejecting request: missing or invalid Authorization bearer token.');
    res.status(401).json({
      jsonrpc: '2.0',
      error: {
        code: -32001,
        message: 'Missing or invalid Authorization bearer token.',
      },
      id: null,
    });
    return undefined;
  }

  if (!workspaceId) {
    console.error('[nexus-mcp] rejecting request: missing X-Nexus-Workspace-ID header.');
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32602,
        message: 'Missing X-Nexus-Workspace-ID header.',
      },
      id: null,
    });
    return undefined;
  }

  return {
    authorizationHeader,
    workspaceId,
    requestId,
    timezone,
    source: 'mcp',
  };
}

function getHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function extractBearerToken(authorizationHeader?: string): string | undefined {
  const [type, token] = authorizationHeader?.split(' ') ?? [];
  return type?.toLowerCase() === 'bearer' && token ? token : undefined;
}

function normalizePath(value: string): string {
  const path = value.trim();

  if (!path) {
    return DEFAULT_PATH;
  }

  return path.startsWith('/') ? path : `/${path}`;
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exit(1);
});

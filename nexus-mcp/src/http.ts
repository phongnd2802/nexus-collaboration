#!/usr/bin/env node
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import type { Request, Response } from 'express';
import { createNexusMcpServer } from './server.js';

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
    const server = createNexusMcpServer();
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

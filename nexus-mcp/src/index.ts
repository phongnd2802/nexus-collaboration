#!/usr/bin/env node
import './load-env.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createNexusMcpServer } from './server.js';

async function main() {
  const server = createNexusMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stdin.resume();

  const keepAlive = setInterval(() => undefined, 2147483647);
  const shutdown = () => {
    clearInterval(keepAlive);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

main().catch((error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  process.exit(1);
});

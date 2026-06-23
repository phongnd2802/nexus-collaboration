import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SERVER_NAME, SERVER_VERSION } from './constants.js';
import { NexusApiClient } from './services/nexus-api.js';
import { registerTools } from './tools/index.js';

export function createNexusMcpServer() {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  registerTools(server, new NexusApiClient());

  return server;
}

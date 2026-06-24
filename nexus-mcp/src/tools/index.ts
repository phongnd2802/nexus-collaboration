import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { NexusApiClient } from '../services/nexus-api.js';
import { registerCalendarTools } from './calendar.js';
import { registerChatTools } from './chat.js';
import { registerDashboardTools } from './dashboard.js';
import { registerNotesTools } from './notes.js';
import { registerProjectTools } from './projects.js';
import { registerSearchTools } from './search.js';
import { registerWorkspaceTools } from './workspace.js';

export function registerTools(server: McpServer, client: NexusApiClient) {
  registerWorkspaceTools(server, client);
  registerDashboardTools(server, client);
  registerSearchTools(server, client);
  registerNotesTools(server, client);
  registerProjectTools(server, client);
  registerChatTools(server, client);
  registerCalendarTools(server, client);
}

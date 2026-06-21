import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";

import { registerCalendarTools } from "./modules/calendar";
import { registerChatTools } from "./modules/chat";
import { registerFileTools } from "./modules/files";
import { registerNoteTools } from "./modules/notes";
import { registerProjectTools } from "./modules/projects";
import { registerSearchTools } from "./modules/search";
import { registerWorkspaceTools } from "./modules/workspace";

export const registerTools = (server: McpServer) => {
  registerWorkspaceTools(server);
  registerChatTools(server);
  registerProjectTools(server);
  registerSearchTools(server);
  registerNoteTools(server);
  registerCalendarTools(server);
  registerFileTools(server);
};

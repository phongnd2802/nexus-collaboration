import { ToolDefinition } from '../../ai-provider/providers';

export interface McpServerConfig {
  name: string;
  transport?: 'stdio' | 'http';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  url?: string;
  enabled?: boolean;
}

export interface McpTool {
  serverName: string;
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpToolDefinition extends ToolDefinition {
  serverName: string;
  originalName: string;
}

export interface McpTrustedContext {
  userId: string;
  workspaceId: string;
  executeActions: boolean;
  sessionId?: string;
  currentView?: string;
  referencedItems?: any[];
}

export interface AiChatStreamEvent {
  type: 'status' | 'step' | 'text_delta' | 'complete' | 'error';
  data: any;
}

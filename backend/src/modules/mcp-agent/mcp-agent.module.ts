import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiProviderModule } from '../ai-provider/ai-provider.module';
import { ProjectsModule } from '../projects/projects.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { InternalMcpController } from './internal-mcp.controller';
import { McpAgentController } from './mcp-agent.controller';
import { McpClientRegistryService } from './mcp-client-registry.service';
import { McpToolAdapterService } from './mcp-tool-adapter.service';
import { McpChatAgentService } from './mcp-chat-agent.service';

@Module({
  imports: [AuthModule, AiProviderModule, ProjectsModule, WorkspaceModule],
  controllers: [McpAgentController, InternalMcpController],
  providers: [McpClientRegistryService, McpToolAdapterService, McpChatAgentService],
  exports: [McpChatAgentService],
})
export class McpAgentModule {}

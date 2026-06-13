import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiProviderModule } from '../ai-provider/ai-provider.module';
import { CalendarModule } from '../calendar/calendar.module';
import { FilesModule } from '../files/files.module';
import { NotesModule } from '../notes/notes.module';
import { ProjectsModule } from '../projects/projects.module';
import { SearchModule } from '../search/search.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { InternalMcpController } from './internal-mcp.controller';
import { McpAgentController } from './mcp-agent.controller';
import { McpClientRegistryService } from './mcp-client-registry.service';
import { McpToolAdapterService } from './mcp-tool-adapter.service';
import { McpChatAgentService } from './mcp-chat-agent.service';

@Module({
  imports: [
    AuthModule,
    AiProviderModule,
    ProjectsModule,
    WorkspaceModule,
    CalendarModule,
    NotesModule,
    FilesModule,
    SearchModule,
  ],
  controllers: [McpAgentController, InternalMcpController],
  providers: [McpClientRegistryService, McpToolAdapterService, McpChatAgentService],
  exports: [McpChatAgentService],
})
export class McpAgentModule {}

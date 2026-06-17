import { Module } from '@nestjs/common';
import { ProjectsModule } from '../projects/projects.module';
import { WorkspaceModule } from '../workspace/workspace.module';
import { InternalAgentController } from './internal-agent.controller';
import { InternalAgentGuard } from './internal-agent.guard';

@Module({
  imports: [ProjectsModule, WorkspaceModule],
  controllers: [InternalAgentController],
  providers: [InternalAgentGuard],
})
export class InternalAgentModule {}

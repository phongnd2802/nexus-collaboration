import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { AgentChatController } from './agent-chat.controller';
import { AgentChatService } from './agent-chat.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [AgentChatController],
  providers: [AgentChatService],
})
export class AgentChatModule {}

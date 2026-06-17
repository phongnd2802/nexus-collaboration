import { Module } from '@nestjs/common';
import { AgentChatController } from './agent-chat.controller';
import { AgentChatService } from './agent-chat.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [AgentChatController],
  providers: [AgentChatService],
})
export class AgentChatModule {}

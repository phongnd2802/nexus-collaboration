import { Module, forwardRef } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarAgentService } from './calendar-agent.service';
import { CalendarController } from './calendar.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { ConversationMemoryModule } from '../conversation-memory/conversation-memory.module';
import { ChatModule } from '../chat/chat.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    SchedulerModule,
    ConversationMemoryModule,
    forwardRef(() => ChatModule),
    forwardRef(() => WorkflowsModule),
  ],
  controllers: [CalendarController],
  providers: [
    CalendarService,
    CalendarAgentService,
  ],
  exports: [
    CalendarService,
    CalendarAgentService,
  ],
})
export class CalendarModule {}

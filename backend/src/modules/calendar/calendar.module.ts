import { Module, forwardRef } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { CalendarController } from './calendar.controller';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { ChatModule } from '../chat/chat.module';
import { WorkflowsModule } from '../workflows/workflows.module';

@Module({
  imports: [
    AuthModule,
    NotificationsModule,
    SchedulerModule,
    forwardRef(() => ChatModule),
    forwardRef(() => WorkflowsModule),
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}

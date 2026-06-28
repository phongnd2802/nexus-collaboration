import { Module, forwardRef } from '@nestjs/common';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { ScheduledMessageProcessorService } from './scheduled-message-processor.service';
import { TaskReminderService } from './task-reminder.service';
import { SchedulerController } from './scheduler.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailProviderModule } from '../email/email.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    forwardRef(() => NotificationsModule),
    EmailProviderModule,
    forwardRef(() => ChatModule),
  ],
  controllers: [SchedulerController],
  providers: [
    NotificationSchedulerService,
    ScheduledMessageProcessorService,
    TaskReminderService,
  ],
  exports: [
    NotificationSchedulerService,
    ScheduledMessageProcessorService,
    TaskReminderService,
  ],
})
export class SchedulerModule {}

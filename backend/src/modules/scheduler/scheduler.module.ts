import { Module, forwardRef } from '@nestjs/common';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { RecordingProcessorService } from './recording-processor.service';
import { ScheduledMessageProcessorService } from './scheduled-message-processor.service';
import { TaskReminderService } from './task-reminder.service';
import { SchedulerController } from './scheduler.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmailProviderModule } from '../email/email.module';
import { VideoCallsModule } from '../video-calls/video-calls.module';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [
    forwardRef(() => NotificationsModule),
    EmailProviderModule,
    forwardRef(() => VideoCallsModule),
    forwardRef(() => ChatModule),
  ],
  controllers: [SchedulerController],
  providers: [
    NotificationSchedulerService,
    RecordingProcessorService,
    ScheduledMessageProcessorService,
    TaskReminderService,
  ],
  exports: [
    NotificationSchedulerService,
    RecordingProcessorService,
    ScheduledMessageProcessorService,
    TaskReminderService,
  ],
})
export class SchedulerModule {}

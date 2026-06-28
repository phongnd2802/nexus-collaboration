import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { DatabaseModule } from './modules/database/database.module';
import { StorageModule } from './modules/storage/storage.module';
import { RedisModule } from './modules/redis/redis.module';
import { AiProviderModule } from './modules/ai-provider/ai-provider.module';
import { EmailProviderModule } from './modules/email/email.module';
import { PushModule } from './modules/push/push.module';
import { SearchProviderModule } from './modules/search-provider/search-provider.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { WebSocketModule } from './common/gateways/websocket.module';
import { CommonModule } from './common/common.module';

// Nexus specific modules
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { ChatModule } from './modules/chat/chat.module';
import { CryptoModule } from './modules/crypto/crypto.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { FilesModule } from './modules/files/files.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { NotesModule } from './modules/notes/notes.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SearchModule } from './modules/search/search.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { EventsModule } from './modules/events/events.module';
import { VideoCallsModule } from './modules/video-calls/video-calls.module';
import { SettingsModule } from './modules/settings/settings.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { IntegrationFrameworkModule } from './modules/integration-framework/integration-framework.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { AgentChatModule } from './modules/agent-chat/agent-chat.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    WebSocketModule,
    CommonModule,
    DatabaseModule,
    StorageModule,
    RedisModule,
    AiProviderModule,
    PushModule,
    SearchProviderModule,
    HealthModule,
    AuthModule,
    // Nexus modules
    WorkspaceModule,
    ChatModule,
    CryptoModule,
    VideoCallsModule,
    ProjectsModule,
    FilesModule,
    CalendarModule,
    NotesModule,
    NotificationsModule,
    SearchModule,
    IntegrationModule,
    DashboardModule,
    AnalyticsModule,
    EventsModule,
    SettingsModule,
    SchedulerModule,
    EmailProviderModule,
    IntegrationsModule,
    IntegrationFrameworkModule,
    WorkflowsModule,
    AgentChatModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}

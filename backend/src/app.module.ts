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
import { AIModule } from './modules/ai/ai.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { EventsModule } from './modules/events/events.module';
import { VideoCallsModule } from './modules/video-calls/video-calls.module';
import { SettingsModule } from './modules/settings/settings.module';
import { ConversationMemoryModule } from './modules/conversation-memory/conversation-memory.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { GoogleDriveModule } from './modules/integration-framework/google-drive/google-drive.module';
import { GoogleSheetsModule } from './modules/integration-framework/google-sheets/google-sheets.module';
import { DropboxModule } from './modules/integration-framework/dropbox/dropbox.module';
import { YoutubeModule } from './modules/integration-framework/youtube/youtube.module';
import { OpenAIModule } from './modules/openai/openai.module';
import { EmailModule } from './modules/integration-framework/email/email.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { GitHubModule } from './modules/integration-framework/github/github.module';
import { AsanaModule } from './modules/integration-framework/asana/asana.module';
import { ClickUpModule } from './modules/integration-framework/clickup/clickup.module';
import { JiraModule } from './modules/integration-framework/jira/jira.module';
import { LinearModule } from './modules/integration-framework/linear/linear.module';
import { NotionModule } from './modules/integration-framework/notion/notion.module';
import { TrelloModule } from './modules/integration-framework/trello/trello.module';
import { AutoPilotModule } from './modules/autopilot/autopilot.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { IntegrationFrameworkModule } from './modules/integration-framework/integration-framework.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { SignaturesModule } from './modules/signatures/signatures.module';
import { BotsModule } from './modules/bots/bots.module';
import { BudgetModule } from './modules/budget/budget.module';
import { FormsModule } from './modules/forms/forms.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { RagModule } from './modules/rag/rag.module';

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
    // Core AI memory module (global)
    ConversationMemoryModule,
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
    AIModule,
    DashboardModule,
    AnalyticsModule,
    MonitoringModule,
    EventsModule,
    SettingsModule,
    SchedulerModule,
    GoogleDriveModule,
    GoogleSheetsModule,
    DropboxModule,
    YoutubeModule,
    OpenAIModule,
    EmailModule,
    EmailProviderModule,
    IntegrationsModule,
    GitHubModule,
    AsanaModule,
    ClickUpModule,
    JiraModule,
    LinearModule,
    NotionModule,
    TrelloModule,
    AutoPilotModule,
    ApprovalsModule,
    BotsModule,
    IntegrationFrameworkModule,
    TemplatesModule,
    DocumentsModule,
    SignaturesModule,
    BudgetModule,
    FormsModule,
    WorkflowsModule,
    RagModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule {}

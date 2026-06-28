import { Module } from '@nestjs/common';
import { GoogleOAuthController } from './google-oauth.controller';
import { CalendarModule } from '../calendar/calendar.module';
import { IntegrationFrameworkModule } from '../integration-framework/integration-framework.module';

/**
 * Integrations Module
 *
 * Provides unified OAuth callbacks for third-party services.
 * This module consolidates all OAuth redirects to a single endpoint per provider.
 *
 * Supported Google services:
 * - Gmail, Google Calendar (dedicated handlers)
 * - Google Chat, Google Meet, Google Cloud, Google Analytics, YouTube (generic handlers)
 */
@Module({
  imports: [
    CalendarModule,
    IntegrationFrameworkModule,
  ],
  controllers: [GoogleOAuthController],
})
export class IntegrationsModule {}

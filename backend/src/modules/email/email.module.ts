import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EmailProviderService } from './email.service';
import { EmailTemplatesService } from './email-templates.service';
import { EmailQueueProcessor } from './email-queue.processor';

/**
 * Email module — exposes the pluggable EmailProviderService for all transactional
 * email needs (auth verification, order confirmations, shipping updates,
 * etc.).
 *
 * Email sending is offloaded to a BullMQ background queue so the caller
 * never waits on SMTP / REST API latency. The queue retries up to 3 times
 * with exponential backoff.
 *
 * Pick a provider by setting EMAIL_PROVIDER in your .env. See
 * `docs/providers/email.md` for the full list.
 *
 * This module deliberately has no controllers — email is an outbound
 * concern. A future `/admin/email/test` endpoint can land in a follow-up
 * when the admin Integrations page needs it.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
          db: config.get('REDIS_DB', 0),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: 'email' }),
  ],
  providers: [EmailProviderService, EmailTemplatesService, EmailQueueProcessor],
  exports: [EmailProviderService, EmailTemplatesService],
})
export class EmailProviderModule {}

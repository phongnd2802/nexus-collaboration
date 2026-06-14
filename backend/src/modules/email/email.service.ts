/**
 * EmailProviderService — the app's transactional email façade.
 *
 * Every module that needs to send email (auth verification, password
 * reset, order confirmation, shipment tracking, vendor notifications,
 * refund updates, etc.) should inject EmailProviderService and call `send()`.
 *
 * Internally this dispatches to whichever provider the operator has
 * selected via EMAIL_PROVIDER in .env. See `./providers/` and
 * `docs/providers/email.md` for the full list (smtp, resend, postmark,
 * ses, mailgun, none).
 *
 * Nexus has three pre-existing email code paths that this module does
 * NOT touch, to keep the diff reviewable:
 *
 *   1. `backend/src/modules/database/email-helpers.ts` — legacy
 *      nodemailer SMTP sender used by DatabaseService.sendEmail().
 *   2. `backend/src/modules/integration-framework/email/` — IMAP
 *      polling + email event extraction (inbound, different concern).
 *
 * Call sites should migrate to EmailProviderService. Old paths can be
 * deleted in follow-ups once every caller is moved.
 */
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { createEmailProvider, EmailProvider, SendEmailInput, SendEmailResult } from './providers';

@Injectable()
export class EmailProviderService implements OnModuleInit {
  private readonly logger = new Logger(EmailProviderService.name);
  private provider!: EmailProvider;

  constructor(
    private readonly config: ConfigService,
    @InjectQueue('email') private readonly emailQueue: Queue,
  ) {}

  onModuleInit() {
    this.provider = createEmailProvider(this.config);
    this.logger.log(
      `Email provider initialized: ${this.provider.name} (available=${this.provider.isAvailable()})`,
    );
  }

  getProviderName(): string {
    return this.provider?.name ?? 'none';
  }

  isAvailable(): boolean {
    return !!this.provider && this.provider.isAvailable();
  }

  /** Send a single transactional email via background queue. */
  async send(input: SendEmailInput): Promise<SendEmailResult> {
    this.logger.log(
      `send subject="${input.subject}" to=${Array.isArray(input.to) ? input.to.join(',') : input.to} via=${this.provider.name}`,
    );
    const job = await this.emailQueue.add('send', input, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
    this.logger.log(`send queued as job ${job.id}`);
    return {
      messageId: `queued-${job.id}`,
      provider: this.provider.name,
      accepted: true,
    };
  }

  /** Send many emails via background queue. */
  async sendBulk(inputs: SendEmailInput[]): Promise<SendEmailResult[]> {
    this.logger.log(`sendBulk count=${inputs.length} via=${this.provider.name}`);
    const jobs = await this.emailQueue.addBulk(
      inputs.map((data) => ({
        name: 'send',
        data,
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      })),
    );
    return jobs.map((job) => ({
      messageId: `queued-${job.id}`,
      provider: this.provider.name,
      accepted: true,
    }));
  }

  /** Direct send, bypassing the queue. Used by the queue processor. */
  async sendDirect(input: SendEmailInput): Promise<SendEmailResult> {
    return this.provider.send(input);
  }

  /**
   * Direct access to the underlying provider for advanced call sites.
   * Prefer the higher-level methods above.
   */
  getProvider(): EmailProvider {
    return this.provider;
  }
}

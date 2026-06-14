import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { EmailProviderService } from './email.service';
import { SendEmailInput } from './providers';

@Processor('email')
export class EmailQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailQueueProcessor.name);

  constructor(private readonly emailService: EmailProviderService) {
    super();
  }

  async process(job: Job<SendEmailInput>): Promise<void> {
    const { data } = job;
    this.logger.log(
      `Processing email job ${job.id}: subject="${data.subject}" to=${Array.isArray(data.to) ? data.to.join(',') : data.to}`,
    );

    try {
      const result = await this.emailService.sendDirect(data);
      this.logger.log(
        `Email job ${job.id} completed: provider=${result.provider} accepted=${result.accepted} messageId=${result.messageId}`,
      );
    } catch (error: any) {
      this.logger.error(`Email job ${job.id} failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}

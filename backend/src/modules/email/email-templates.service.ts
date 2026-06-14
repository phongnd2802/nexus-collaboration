import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { EmailProviderService } from './email.service';
import { buildTaskReminderEmail, SendEmailInput, TaskReminderEmailData } from './providers';

export interface SendTaskReminderOptions {
  to: string;
  taskTitle: string;
  assigneeName: string;
  projectName: string;
  dueDate: string;
  priority: string;
  remindBeforeLabel: string;
  reminderHeadline: string;
  taskUrl: string;
  taskDescription?: string;
}

@Injectable()
export class EmailTemplatesService {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(
    private readonly emailProvider: EmailProviderService,
    private readonly db: DatabaseService,
  ) {}

  async sendTaskReminderEmail(opts: SendTaskReminderOptions): Promise<boolean> {
    if (!opts.to) {
      this.logger.warn('[EmailTemplates] No recipient email, skipping');
      return false;
    }

    const data: TaskReminderEmailData = {
      assigneeName: opts.assigneeName,
      taskTitle: opts.taskTitle,
      taskDescription: opts.taskDescription,
      projectName: opts.projectName,
      dueDate: opts.dueDate,
      priority: opts.priority,
      remindBeforeLabel: opts.remindBeforeLabel,
      reminderHeadline: opts.reminderHeadline,
      taskUrl: opts.taskUrl,
    };

    const { html, text } = buildTaskReminderEmail(data);

    const input: SendEmailInput = {
      to: opts.to,
      subject: `[Nexus] Nhắc nhở: ${opts.reminderHeadline}`,
      html,
      text,
      tags: { type: 'task-reminder' },
    };

    if (this.emailProvider.isAvailable()) {
      await this.emailProvider.send(input);

      this.logger.log(
        `[EmailTemplates] Queued task reminder to ${opts.to} for "${opts.taskTitle}" (${opts.remindBeforeLabel})`,
      );
      return true;
    }

    this.logger.warn(
      '[EmailTemplates] Email provider not available, falling back to legacy SMTP sender',
    );
    const legacyResult = await this.db.sendEmail(opts.to, input.subject, html, text);

    if (!legacyResult?.success) {
      this.logger.warn(
        `[EmailTemplates] Legacy SMTP send failed for ${opts.to} (${opts.remindBeforeLabel}): ${legacyResult?.error || 'unknown error'}`,
      );
      return false;
    }

    this.logger.log(
      `[EmailTemplates] Sent task reminder via legacy SMTP to ${opts.to} for "${opts.taskTitle}" (${opts.remindBeforeLabel})`,
    );
    return true;
  }
}

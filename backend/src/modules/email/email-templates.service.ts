import { Injectable, Logger } from '@nestjs/common';
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
  taskUrl: string;
  taskDescription?: string;
}

@Injectable()
export class EmailTemplatesService {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(private readonly emailProvider: EmailProviderService) {}

  async sendTaskReminderEmail(opts: SendTaskReminderOptions): Promise<void> {
    if (!opts.to) {
      this.logger.warn('[EmailTemplates] No recipient email, skipping');
      return;
    }

    if (!this.emailProvider.isAvailable()) {
      this.logger.warn('[EmailTemplates] Email provider not available, skipping');
      return;
    }

    const data: TaskReminderEmailData = {
      assigneeName: opts.assigneeName,
      taskTitle: opts.taskTitle,
      taskDescription: opts.taskDescription,
      projectName: opts.projectName,
      dueDate: opts.dueDate,
      priority: opts.priority,
      remindBeforeLabel: opts.remindBeforeLabel,
      taskUrl: opts.taskUrl,
    };

    const { html, text } = buildTaskReminderEmail(data);

    const input: SendEmailInput = {
      to: opts.to,
      subject: `[Nexus] Nhắc nhở: "${opts.taskTitle}" sẽ hết hạn sau ${opts.remindBeforeLabel}`,
      html,
      text,
      tags: { type: 'task-reminder' },
    };

    await this.emailProvider.send(input);

    this.logger.log(
      `[EmailTemplates] Sent task reminder to ${opts.to} for "${opts.taskTitle}" (${opts.remindBeforeLabel})`,
    );
  }
}

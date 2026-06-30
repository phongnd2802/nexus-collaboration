/**
 * Email provider factory.
 *
 * Reads EMAIL_PROVIDER from config and returns the SMTP provider.
 * Only SMTP is supported (via nodemailer). Other values fall back
 * to SMTP with a warning.
 */
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { EmailProvider } from './email-provider.interface';
import { SmtpProvider } from './smtp.provider';

const log = new Logger('EmailProviderFactory');

export function createEmailProvider(config: ConfigService): EmailProvider {
  const choice = (config.get<string>('EMAIL_PROVIDER') || 'smtp').toLowerCase().trim();

  if (choice === 'smtp' || choice === 'nodemailer') {
    const p = new SmtpProvider(config);
    log.log(`Selected email provider: smtp (available=${p.isAvailable()})`);
    return p;
  }

  log.warn(
    `Unknown EMAIL_PROVIDER="${choice}". Falling back to smtp.`,
  );
  return new SmtpProvider(config);
}

export * from './email-provider.interface';
export { SmtpProvider } from './smtp.provider';
export { buildTaskReminderEmail, TaskReminderEmailData } from './task-reminder-email.provider';
export { buildNoteAccessRequestEmail, NoteAccessRequestEmailData } from './note-access-request-email.provider';
export { buildNotePermissionChangeEmail, NotePermissionChangeEmailData } from './note-permission-change-email.provider';

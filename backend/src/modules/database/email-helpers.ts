/**
 * Real SMTP email helpers using nodemailer.
 *
 * Replaces the fluxez SDK email stub with a concrete implementation. Works
 * with any SMTP provider (Resend, Mailgun, AWS SES, Postmark,
 * Gmail, self-hosted Postfix, etc.).
 *
 * Required env vars:
 *   SMTP_HOST       (e.g. smtp.resend.com, email-smtp.us-east-1.amazonaws.com)
 *   SMTP_PORT       (e.g. 587 for STARTTLS, 465 for TLS)
 *   SMTP_USER       (provider username / API key user)
 *   SMTP_PASSWORD   (provider password / API key)
 *   SMTP_FROM       (default From address, e.g. "Nexus <noreply@nexusapp.io>")
 *   SMTP_SECURE     (optional - "true" for port 465 implicit TLS)
 */
import * as nodemailer from 'nodemailer';

export interface EmailConfig {
  host: string;
  hostIp: string;
  port: number;
  user: string;
  password: string;
  from: string;
  secure: boolean;
  tlsServername?: string;
  connectionTimeout: number;
  greetingTimeout: number;
  socketTimeout: number;
  dnsTimeout: number;
}

export function getEmailConfig(getConfig: (key: string, fallback?: any) => any): EmailConfig {
  return {
    host: getConfig('SMTP_HOST', ''),
    hostIp: getConfig('SMTP_HOST_IP', ''),
    port: parseInt(getConfig('SMTP_PORT', '587'), 10),
    user: getConfig('SMTP_USER', ''),
    password: getConfig('SMTP_PASSWORD', ''),
    from: getConfig('SMTP_FROM', 'noreply@example.com'),
    secure: String(getConfig('SMTP_SECURE', 'false')).toLowerCase() === 'true',
    tlsServername: getConfig('SMTP_TLS_SERVERNAME', getConfig('SMTP_HOST', '')),
    connectionTimeout: parseInt(getConfig('SMTP_CONNECTION_TIMEOUT_MS', '20000'), 10),
    greetingTimeout: parseInt(getConfig('SMTP_GREETING_TIMEOUT_MS', '15000'), 10),
    socketTimeout: parseInt(getConfig('SMTP_SOCKET_TIMEOUT_MS', '30000'), 10),
    dnsTimeout: parseInt(getConfig('SMTP_DNS_TIMEOUT_MS', '8000'), 10),
  };
}

let cachedTransport: nodemailer.Transporter | null = null;

function getTransport(cfg: EmailConfig): nodemailer.Transporter {
  if (cachedTransport) return cachedTransport;
  cachedTransport = nodemailer.createTransport({
    host: cfg.hostIp || cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    connectionTimeout: cfg.connectionTimeout,
    greetingTimeout: cfg.greetingTimeout,
    socketTimeout: cfg.socketTimeout,
    dnsTimeout: cfg.dnsTimeout,
    auth: cfg.user
      ? {
          user: cfg.user,
          pass: cfg.password,
        }
      : undefined,
    tls: cfg.tlsServername ? { servername: cfg.tlsServername } : undefined,
  });
  return cachedTransport;
}

export async function sendEmailFn(
  cfg: EmailConfig,
  to: string | string[],
  subject: string,
  html: string,
  text?: string,
  options?: {
    from?: string;
    replyTo?: string;
    attachments?: any[];
    cc?: string | string[];
    bcc?: string | string[];
  },
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!cfg.host) {
    return { success: false, error: 'SMTP_HOST not configured' };
  }
  try {
    const transport = getTransport(cfg);
    const info = await transport.sendMail({
      from: options?.from || cfg.from,
      to: Array.isArray(to) ? to.join(', ') : to,
      cc: options?.cc,
      bcc: options?.bcc,
      replyTo: options?.replyTo,
      subject,
      html,
      text: text || stripHtml(html),
      attachments: options?.attachments,
    });
    return { success: true, messageId: info.messageId };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

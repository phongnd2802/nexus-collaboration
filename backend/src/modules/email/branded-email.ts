const BRAND_COLORS = {
  text: '#1F1E1D',
  textStrong: '#141413',
  textMuted: '#73726C',
  surface: '#FFFFFF',
  background: '#FAF9F5',
  border: 'rgba(31, 30, 29, 0.15)',
  borderStrong: 'rgba(31, 30, 29, 0.3)',
  accent: '#D97757',
  button: '#1F1E1D',
  buttonText: '#FFFFFF',
};

type EmailTone = 'default' | 'warning' | 'critical' | 'info';

export interface BrandedEmailDetail {
  label: string;
  value: string;
}

export interface BrandedEmailCallout {
  title?: string;
  body: string;
  tone?: EmailTone;
}

export interface BrandedEmailAction {
  label: string;
  url: string;
}

export interface BrandedEmailOptions {
  eyebrow?: string;
  title: string;
  greeting?: string;
  intro?: string;
  paragraphs?: string[];
  details?: BrandedEmailDetail[];
  callout?: BrandedEmailCallout;
  action?: BrandedEmailAction;
  actionHint?: string;
  footer?: string;
  accentColor?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMultilineText(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br>');
}

function getToneStyles(tone: EmailTone = 'default') {
  switch (tone) {
    case 'warning':
      return {
        background: 'rgba(210, 153, 34, 0.1)',
        border: 'rgba(210, 153, 34, 0.3)',
        title: '#B45309',
      };
    case 'critical':
      return {
        background: 'rgba(224, 30, 90, 0.08)',
        border: 'rgba(224, 30, 90, 0.25)',
        title: '#BE123C',
      };
    case 'info':
      return {
        background: 'rgba(94, 106, 210, 0.08)',
        border: 'rgba(94, 106, 210, 0.24)',
        title: '#5E6AD2',
      };
    default:
      return {
        background: BRAND_COLORS.background,
        border: BRAND_COLORS.border,
        title: BRAND_COLORS.textStrong,
      };
  }
}

export function buildBrandedEmail(options: BrandedEmailOptions): { html: string; text: string } {
  const accentColor = options.accentColor || BRAND_COLORS.accent;
  const toneStyles = options.callout ? getToneStyles(options.callout.tone) : null;

  const eyebrowHtml = options.eyebrow
    ? `<div style="margin:0 0 16px;color:${accentColor};font:400 13px/18px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;letter-spacing:0.6px;text-transform:uppercase;">${escapeHtml(options.eyebrow)}</div>`
    : '';

  const greetingHtml = options.greeting
    ? `<p style="margin:0 0 20px;color:${BRAND_COLORS.text};font:400 16px/24px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(options.greeting)}</p>`
    : '';

  const introHtml = options.intro
    ? `<p style="margin:0 0 20px;color:${BRAND_COLORS.text};font:400 16px/24px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(options.intro)}</p>`
    : '';

  const paragraphsHtml = (options.paragraphs || [])
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;color:${BRAND_COLORS.text};font:400 15px/22.5px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(paragraph)}</p>`,
    )
    .join('');

  const detailsHtml =
    options.details && options.details.length > 0
      ? `
        <div style="margin:28px 0 0;padding:24px;background:${BRAND_COLORS.surface};border:1px solid ${BRAND_COLORS.border};border-left:4px solid ${accentColor};border-radius:12px;box-shadow:rgba(0,0,0,0.04) 0px 4px 20px 0px;">
          ${options.details
            .map(
              (detail, index) => `
                <div style="${index > 0 ? 'margin-top:16px;padding-top:16px;border-top:1px solid rgba(31,30,29,0.08);' : ''}">
                  <div style="margin:0 0 6px;color:${BRAND_COLORS.textMuted};font:430 14px/19.6px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(detail.label)}</div>
                  <div style="color:${BRAND_COLORS.textStrong};font:400 16px/24px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${renderMultilineText(detail.value)}</div>
                </div>`,
            )
            .join('')}
        </div>`
      : '';

  const calloutHtml =
    options.callout && toneStyles
      ? `
        <div style="margin:24px 0 0;padding:20px;background:${toneStyles.background};border:1px solid ${toneStyles.border};border-radius:12px;">
          ${
            options.callout.title
              ? `<div style="margin:0 0 8px;color:${toneStyles.title};font:430 14px/19.6px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(options.callout.title)}</div>`
              : ''
          }
          <div style="color:${BRAND_COLORS.text};font:400 15px/22.5px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${renderMultilineText(options.callout.body)}</div>
        </div>`
      : '';

  const actionHtml = options.action
    ? `
      <div style="margin:32px 0 0;">
        <a href="${escapeHtml(options.action.url)}" style="display:inline-block;min-height:44px;padding:12px 24px;background:${BRAND_COLORS.button};border-radius:9.6px;color:${BRAND_COLORS.buttonText};text-decoration:none;font:400 15px/22.5px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;box-shadow:rgba(0,0,0,0.04) 0px 4px 20px 0px;">${escapeHtml(options.action.label)}</a>
      </div>`
    : '';

  const actionHintHtml = options.actionHint
    ? `<p style="margin:16px 0 0;color:${BRAND_COLORS.textMuted};font:400 12px/16px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${renderMultilineText(options.actionHint)}</p>`
    : '';

  const footerText =
    options.footer ||
    'Email này được gửi từ Nexus. Nếu bạn không mong đợi email này, bạn có thể bỏ qua.';

  const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(options.title)}</title>
  </head>
  <body style="margin:0;background:${BRAND_COLORS.background};padding:32px 20px;">
    <div style="max-width:640px;margin:0 auto;">
      <div style="background:${BRAND_COLORS.surface};border:1px solid ${BRAND_COLORS.border};border-top:4px solid ${accentColor};border-radius:12px;box-shadow:rgba(0,0,0,0.04) 0px 4px 20px 0px;overflow:hidden;">
        <div style="padding:36px 40px 28px;">
          ${eyebrowHtml}
          <h1 style="margin:0;color:${BRAND_COLORS.text};font:400 42px/1.15 Georgia,'Times New Roman',serif;">${escapeHtml(options.title)}</h1>
        </div>
        <div style="border-top:1px solid rgba(31,30,29,0.08);padding:32px 40px 40px;">
          ${greetingHtml}
          ${introHtml}
          ${paragraphsHtml}
          ${detailsHtml}
          ${calloutHtml}
          ${actionHtml}
          ${actionHintHtml}
        </div>
      </div>
      <p style="margin:18px 0 0;padding:0 4px;color:${BRAND_COLORS.textMuted};font:400 12px/16px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(footerText)}</p>
    </div>
  </body>
</html>`;

  const textParts = [
    options.title,
    options.greeting,
    options.intro,
    ...(options.paragraphs || []),
    ...(options.details || []).map((detail) => `${detail.label}: ${detail.value}`),
    options.callout
      ? `${options.callout.title ? options.callout.title + ': ' : ''}${options.callout.body}`
      : '',
    options.action ? `${options.action.label}: ${options.action.url}` : '',
    options.actionHint,
    footerText,
  ].filter(Boolean);

  return {
    html,
    text: textParts.join('\n\n'),
  };
}

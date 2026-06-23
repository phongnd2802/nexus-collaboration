const brandAccentColor = '#D97757';

const urgencyColors: Record<string, string> = {
  '3 ngày': '#5E6AD2',
  '1 ngày': '#D29922',
  '12 giờ': '#DC6038',
  '3 giờ': '#E01E5A',
  '1 giờ': '#141413',
};

const urgencyLabels: Record<string, string> = {
  '3 ngày': 'Bình tĩnh — nhắc sớm',
  '1 ngày': 'Cần chú ý',
  '12 giờ': 'Khá gấp',
  '3 giờ': 'Gấp cao',
  '1 giờ': 'Khẩn cấp nhất',
};

export interface EventReminderEmailData {
  attendeeName: string;
  eventTitle: string;
  eventDescription?: string;
  startTime: string;
  endTime?: string;
  location?: string;
  meetingUrl?: string;
  organizerName?: string;
  remindBeforeLabel: string;
  eventUrl: string;
}

export function buildEventReminderEmail(data: EventReminderEmailData): { html: string; text: string } {
  const urgencyColor = urgencyColors[data.remindBeforeLabel] || '#D29922';
  const urgencyLabel = urgencyLabels[data.remindBeforeLabel] || 'Cần chú ý';

  const locationRow = data.location
    ? `<tr><td style="padding:6px 0;color:#73726C;font-size:14px;line-height:19.6px;width:110px;vertical-align:top">Địa điểm</td><td style="padding:6px 0;color:#1F1E1D;font-size:15px;line-height:22.5px">${data.location}</td></tr>`
    : '';

  const meetingUrlRow = data.meetingUrl
    ? `<tr><td style="padding:6px 0;color:#73726C;font-size:14px;line-height:19.6px;vertical-align:top">Link họp</td><td style="padding:6px 0"><a href="${data.meetingUrl}" style="color:${brandAccentColor};text-decoration:none">${data.meetingUrl}</a></td></tr>`
    : '';

  const descriptionRow = data.eventDescription
    ? `<tr><td style="padding:6px 0;color:#73726C;font-size:14px;line-height:19.6px;vertical-align:top">Mô tả</td><td style="padding:6px 0;color:#1F1E1D;font-size:15px;line-height:22.5px">${data.eventDescription}</td></tr>`
    : '';

  const endTimeRow = data.endTime
    ? ` – ${data.endTime}`
    : '';

  const html = [
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<div style="background:#FAF9F5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F1E1D">`,
    `<div style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid rgba(31,30,29,0.15);border-radius:12px;box-shadow:rgba(0,0,0,0.04) 0px 4px 20px 0px;overflow:hidden;border-top:4px solid ${urgencyColor}">`,
    `<div style="padding:24px 32px;border-bottom:1px solid rgba(31,30,29,0.1);background:#FFFFFF">`,
    `<p style="margin:0 0 8px;color:${urgencyColor};font-size:12px;line-height:16px;letter-spacing:0.25px;text-transform:uppercase">Nhắc nhở sự kiện · ${urgencyLabel}</p>`,
    `<h1 style="margin:0;color:#1F1E1D;font-size:24px;line-height:28.8px;font-weight:400">Sự kiện sắp diễn ra</h1>`,
    `</div>`,
    `<div style="padding:24px 32px;background:#FFFFFF">`,
    `<p style="margin:0 0 16px;color:#1F1E1D;font-size:15px;line-height:22.5px">Xin chào <strong>${data.attendeeName}</strong>,</p>`,
    `<p style="margin:0 0 24px;color:#1F1E1D;font-size:15px;line-height:22.5px">Bạn có một sự kiện sắp diễn ra trong <strong style="color:${urgencyColor}">${data.remindBeforeLabel}</strong> nữa.</p>`,
    `<div style="border:1px solid rgba(31,30,29,0.15);border-left:4px solid ${urgencyColor};border-radius:12px;padding:20px 16px;background:#FFFFFF;margin-bottom:24px">`,
    `<table style="width:100%;border-collapse:collapse">`,
    `<tr><td style="padding:6px 0;color:#73726C;font-size:14px;line-height:19.6px;width:110px;vertical-align:top">Sự kiện</td><td style="padding:6px 0;color:#1F1E1D;font-size:15px;line-height:22.5px;font-weight:600">${data.eventTitle}</td></tr>`,
    descriptionRow,
    `<tr><td style="padding:6px 0;color:#73726C;font-size:14px;line-height:19.6px;vertical-align:top">Thời gian</td><td style="padding:6px 0;color:#1F1E1D;font-size:15px;line-height:22.5px">${data.startTime}${endTimeRow}</td></tr>`,
    locationRow,
    meetingUrlRow,
    data.organizerName ? `<tr><td style="padding:6px 0;color:#73726C;font-size:14px;line-height:19.6px;vertical-align:top">Tổ chức bởi</td><td style="padding:6px 0;color:#1F1E1D;font-size:15px;line-height:22.5px">${data.organizerName}</td></tr>` : '',
    `</table>`,
    `</div>`,
    `<a href="${data.eventUrl}" style="display:inline-block;background:${brandAccentColor};color:#FFFFFF;padding:12px 24px;text-decoration:none;border-radius:9.6px;font-size:15px;line-height:22.5px;font-weight:400">Xem chi tiết sự kiện</a>`,
    `</div>`,
    `<div style="padding:16px 32px;background:#FAF9F5;border-top:1px solid rgba(31,30,29,0.1)">`,
    `<p style="margin:0;color:#73726C;font-size:12px;line-height:16px">Bạn nhận được email này vì bạn là người tham dự sự kiện này trên Nexus.</p>`,
    `</div>`,
    `</div>`,
    `</div>`,
  ].join('');

  const text = [
    `Nhắc nhở sự kiện [${urgencyLabel}]`,
    ``,
    `Xin chào ${data.attendeeName},`,
    ``,
    `Bạn có một sự kiện sắp diễn ra trong ${data.remindBeforeLabel} nữa.`,
    ``,
    `Sự kiện: ${data.eventTitle}`,
    `Thời gian: ${data.startTime}${endTimeRow}`,
    data.location ? `Địa điểm: ${data.location}` : '',
    data.meetingUrl ? `Link họp: ${data.meetingUrl}` : '',
    data.organizerName ? `Tổ chức bởi: ${data.organizerName}` : '',
    ``,
    `Xem chi tiết: ${data.eventUrl}`,
    ``,
    `- Nexus Collaboration`,
  ].filter(Boolean).join('\n');

  return { html, text };
}

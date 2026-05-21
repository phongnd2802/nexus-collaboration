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

const priorityLabels: Record<string, string> = {
  urgent: 'Khẩn cấp',
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
};

export interface TaskReminderEmailData {
  assigneeName: string;
  taskTitle: string;
  taskDescription?: string;
  projectName: string;
  workspaceName?: string;
  dueDate: string;
  priority: string;
  remindBeforeLabel: string;
  reminderHeadline: string;
  taskUrl: string;
}

export function buildTaskReminderEmail(data: TaskReminderEmailData): { html: string; text: string } {
  const urgencyColor = urgencyColors[data.remindBeforeLabel] || '#D29922';
  const urgencyLabel = urgencyLabels[data.remindBeforeLabel] || 'Cần chú ý';
  const priorityLabel = priorityLabels[data.priority] || 'Trung bình';
  const isCriticalUrgency = data.remindBeforeLabel === '1 giờ';
  const badgeTextColor = isCriticalUrgency ? '#FFFFFF' : '#FFFFFF';

  const html = [
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<div style="background:#FAF9F5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F1E1D">`,
    `<div style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid rgba(31,30,29,0.15);border-radius:12px;box-shadow:rgba(0,0,0,0.04) 0px 4px 20px 0px;overflow:hidden;border-top:4px solid ${urgencyColor}">`,
    `<div style="padding:24px 32px;border-bottom:1px solid rgba(31,30,29,0.1);background:#FFFFFF">`,
    `<p style="margin:0 0 8px;color:${urgencyColor};font-size:12px;line-height:16px;letter-spacing:0.25px;text-transform:uppercase">Task Reminder · ${urgencyLabel}</p>`,
    `<h1 style="margin:0;color:#1F1E1D;font-size:24px;line-height:28.8px;font-weight:400">Task sắp tới hạn</h1>`,
    `</div>`,
    `<div style="padding:24px 32px;background:#FFFFFF">`,
    `<p style="margin:0 0 16px;color:#1F1E1D;font-size:15px;line-height:22.5px">Xin chào <strong>${data.assigneeName}</strong>,</p>`,
    `<p style="margin:0 0 24px;color:#1F1E1D;font-size:15px;line-height:22.5px"><strong style="color:${urgencyColor}">${data.reminderHeadline}</strong>.</p>`,
    `<div style="border:1px solid rgba(31,30,29,0.15);border-left:4px solid ${urgencyColor};border-radius:12px;padding:20px 16px;background:#FFFFFF;margin-bottom:24px">`,
    `<table style="width:100%;border-collapse:collapse">`,
    `<tr><td style="padding:6px 0;color:#73726C;font-size:14px;line-height:19.6px;width:110px;vertical-align:top">Task</td><td style="padding:6px 0;color:#1F1E1D;font-size:15px;line-height:22.5px;font-weight:600">${data.taskTitle}</td></tr>`,
    data.taskDescription
      ? `<tr><td style="padding:6px 0;color:#73726C;font-size:14px;line-height:19.6px;vertical-align:top">Mô tả</td><td style="padding:6px 0;color:#1F1E1D;font-size:15px;line-height:22.5px">${data.taskDescription}</td></tr>`
      : '',
    `<tr><td style="padding:6px 0;color:#73726C;font-size:14px;line-height:19.6px;vertical-align:top">Dự án</td><td style="padding:6px 0;color:#1F1E1D;font-size:15px;line-height:22.5px">${data.projectName}</td></tr>`,
    `<tr><td style="padding:6px 0;color:#73726C;font-size:14px;line-height:19.6px;vertical-align:top">Hạn chót</td><td style="padding:6px 0;color:#1F1E1D;font-size:15px;line-height:22.5px">${data.dueDate}</td></tr>`,
    `<tr><td style="padding:6px 0;color:#73726C;font-size:14px;line-height:19.6px;vertical-align:top">Mức ưu tiên</td><td style="padding:6px 0"><span style="display:inline-block;background:${urgencyColor};color:${badgeTextColor};padding:4px 12px;border-radius:8px;font-size:12px;line-height:16px;font-weight:600">${priorityLabel}</span></td></tr>`,
    `</table>`,
    `</div>`,
    `<a href="${data.taskUrl}" style="display:inline-block;background:${urgencyColor};color:#FFFFFF;padding:12px 24px;text-decoration:none;border-radius:9.6px;font-size:15px;line-height:22.5px;font-weight:400">Xem chi tiết task</a>`,
    `</div>`,
    `<div style="padding:16px 32px;background:#FAF9F5;border-top:1px solid rgba(31,30,29,0.1)">`,
    `<p style="margin:0;color:#73726C;font-size:12px;line-height:16px">Bạn nhận được email này vì bạn được gán task này trên Nexus.</p>`,
    `</div>`,
    `</div>`,
    `</div>`,
  ].join('');

  const text = [
    `Nhắc nhở: Task sắp tới hạn [${urgencyLabel}]`,
    ``,
    `Xin chào ${data.assigneeName},`,
    ``,
    `${data.reminderHeadline}.`,
    ``,
    `Task: ${data.taskTitle}`,
    `Dự án: ${data.projectName}`,
    `Hạn chót: ${data.dueDate}`,
    `Mức ưu tiên: ${priorityLabel}`,
    `Mức độ khẩn: ${urgencyLabel}`,
    ``,
    `Xem chi tiết: ${data.taskUrl}`,
    ``,
    `- Nexus Collaboration`,
  ].join('\n');

  return { html, text };
}

const priorityColors: Record<string, string> = {
  urgent: '#DC2626',
  high: '#EA580C',
  medium: '#D97706',
  low: '#059669',
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
  taskUrl: string;
}

export function buildTaskReminderEmail(data: TaskReminderEmailData): { html: string; text: string } {
  const color = priorityColors[data.priority] || '#6B7280';
  const label = priorityLabels[data.priority] || 'Trung bình';

  const html = [
    `<!doctypehtml><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 16px">`,
    `<div style="background:#4F46E5;padding:24px 32px;border-radius:8px 8px 0 0">`,
    `<h1 style="margin:0;color:#fff;font-size:18px">⏰ Nhắc nhở: Task sắp tới hạn</h1></div>`,
    `<div style="background:#fff;padding:24px 32px;border:1px solid #e5e7eb;border-top:0">`,
    `<p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.5">Xin chào <strong>${data.assigneeName}</strong>,</p>`,
    `<p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.5">Task <strong>"${data.taskTitle}"</strong> sẽ hết hạn sau <strong>${data.remindBeforeLabel}</strong>.</p>`,
    `<table style="width:100%;border-collapse:collapse;margin-bottom:24px">`,
    `<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;width:100px;vertical-align:top">Task:</td><td style="padding:6px 0;color:#111827;font-size:14px;font-weight:600">${data.taskTitle}</td></tr>`,
    data.taskDescription ? `<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top">Mô tả:</td><td style="padding:6px 0;color:#111827;font-size:14px">${data.taskDescription}</td></tr>` : '',
    `<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top">Dự án:</td><td style="padding:6px 0;color:#111827;font-size:14px">${data.projectName}</td></tr>`,
    `<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top">Hạn chót:</td><td style="padding:6px 0;color:#111827;font-size:14px">${data.dueDate}</td></tr>`,
    `<tr><td style="padding:6px 0;color:#6B7280;font-size:14px;vertical-align:top">Mức ưu tiên:</td><td style="padding:6px 0"><span style="display:inline-block;background:${color};color:#fff;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600">${label}</span></td></tr>`,
    `</table>`,
    `<a href="${data.taskUrl}" style="display:inline-block;background:#3B82F6;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600">Xem chi tiết task</a>`,
    `</div>`,
    `<div style="background:#f9fafb;padding:16px 32px;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 8px 8px">`,
    `<p style="margin:0;font-size:12px;color:#9CA3AF">Bạn nhận được email này vì bạn được gán task này trên Nexus.</p></div></div>`,
  ].join('');

  const text = [
    `Nhắc nhở: Task sắp tới hạn`,
    ``,
    `Xin chào ${data.assigneeName},`,
    ``,
    `Task "${data.taskTitle}" sẽ hết hạn sau ${data.remindBeforeLabel}.`,
    ``,
    `Task: ${data.taskTitle}`,
    `Dự án: ${data.projectName}`,
    `Hạn chót: ${data.dueDate}`,
    `Mức ưu tiên: ${label}`,
    ``,
    `Xem chi tiết: ${data.taskUrl}`,
    ``,
    `— Nexus Collaboration`,
  ].join('\n');

  return { html, text };
}

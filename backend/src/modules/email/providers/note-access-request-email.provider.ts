const brandAccentColor = '#D97757';

export interface NoteAccessRequestEmailData {
  requesterName: string;
  noteTitle: string;
  message?: string;
  approveUrl: string;
  denyUrl: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildNoteAccessRequestEmail(data: NoteAccessRequestEmailData): { html: string; text: string } {
  const html = [
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">`,
    `<div style="background:#FAF9F5;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F1E1D">`,
    `<div style="max-width:640px;margin:0 auto;background:#FFFFFF;border:1px solid rgba(31,30,29,0.15);border-radius:12px;box-shadow:rgba(0,0,0,0.04) 0px 4px 20px 0px;overflow:hidden;border-top:4px solid ${brandAccentColor}">`,
    `<div style="padding:24px 32px;border-bottom:1px solid rgba(31,30,29,0.1);background:#FFFFFF">`,
    `<p style="margin:0 0 8px;color:${brandAccentColor};font-size:12px;line-height:16px;letter-spacing:0.25px;text-transform:uppercase">Yêu cầu truy cập</p>`,
    `<h1 style="margin:0;color:#1F1E1D;font-size:24px;line-height:28.8px;font-weight:400">Yêu cầu truy cập vào note của bạn</h1>`,
    `</div>`,
    `<div style="padding:24px 32px;background:#FFFFFF">`,
    `<p style="margin:0 0 16px;color:#1F1E1D;font-size:15px;line-height:22.5px">Chào bạn,</p>`,
    `<p style="margin:0 0 16px;color:#1F1E1D;font-size:15px;line-height:22.5px"><strong>${data.requesterName}</strong> đang yêu cầu quyền truy cập vào note: <strong>"${data.noteTitle}"</strong>.</p>`,
    data.message
      ? `<div style="margin:20px 0;padding:16px;background:#FAF9F5;border-left:4px solid ${brandAccentColor};border-radius:8px;font-style:italic;color:#73726C;">"${escapeHtml(data.message)}"</div>`
      : '',
    `<p style="margin:24px 0 12px;color:#1F1E1D;font-size:15px;line-height:22px;">Bạn có thể trực tiếp chấp nhận hoặc từ chối yêu cầu này ngay từ email này:</p>`,
    `<div style="margin:24px 0 32px;">`,
    `<a href="${data.approveUrl}" style="display:inline-block;background:#1F1E1D;color:#FFFFFF;padding:12px 24px;text-decoration:none;border-radius:8px;font-size:15px;line-height:22.5px;font-weight:500;box-shadow:rgba(0,0,0,0.04) 0px 4px 20px 0px;margin-right:12px;">Chấp nhận truy cập</a>`,
    `<a href="${data.denyUrl}" style="display:inline-block;background:#FFFFFF;border:1px solid rgba(31, 30, 29, 0.3);color:#1F1E1D;padding:12px 24px;text-decoration:none;border-radius:8px;font-size:15px;line-height:22.5px;font-weight:500;box-shadow:rgba(0,0,0,0.04) 0px 4px 20px 0px;">Từ chối yêu cầu</a>`,
    `</div>`,
    `<p style="margin:16px 0 0;color:#73726C;font-size:12px;line-height:16px;">Nếu nút không hoạt động, bạn có thể sao chép và dán liên kết sau vào trình duyệt:<br>`,
    `- Chấp nhận: ${data.approveUrl}<br>`,
    `- Từ chối: ${data.denyUrl}</p>`,
    `</div>`,
    `<div style="padding:16px 32px;background:#FAF9F5;border-top:1px solid rgba(31,30,29,0.1)">`,
    `<p style="margin:0;color:#73726C;font-size:12px;line-height:16px">Email này được gửi từ Nexus. Nếu bạn không mong đợi yêu cầu này, bạn có thể bỏ qua.</p>`,
    `</div>`,
    `</div>`,
    `</div>`,
  ].join('');

  const text = [
    `Yêu cầu truy cập Note`,
    ``,
    `Chào bạn,`,
    ``,
    `${data.requesterName} đang yêu cầu quyền truy cập vào note: "${data.noteTitle}".`,
    ``,
    data.message ? `Lời nhắn: "${data.message}"\n` : '',
    `Chấp nhận truy cập: ${data.approveUrl}`,
    `Từ chối yêu cầu: ${data.denyUrl}`,
    ``,
    `Nếu bạn không mong đợi email này, bạn có thể bỏ qua.`,
    ``,
    `- Nexus Collaboration`,
  ].join('\n');

  return { html, text };
}

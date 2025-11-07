import nodemailer from "nodemailer";

const BASE_URL = process.env.FRONTEND_URL || "http://localhost:3000";

let transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from) {
    throw new Error(
      "Thiếu cấu hình SMTP (.env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM)"
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  // Fail-fast nếu cấu hình sai
  await transporter.verify();
  return transporter;
}

async function sendMail(options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  try {
    const tx = await getTransporter();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
    const info = await tx.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return info;
  } catch (err: any) {
    console.error("Gmail SMTP error:", err);
    throw new Error(`Email sending failed: ${err?.message || "Unknown error"}`);
  }
}

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<void> {
  const resetUrl = `${BASE_URL}/auth/reset-password?token=${resetToken}`;
  const subject = "Password Reset Request";

  try {
    await sendMail({
      to: email,
      subject,
      text: `Your password reset link: ${resetUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested a password reset. Click the button below:</p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:white;text-decoration:none;border-radius:5px;">Reset Password</a>
          <p>This link will expire in 1 hour.</p>
          <p>If the button doesn't work, copy and paste this link: ${resetUrl}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error(
      `Failed to send password reset email: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function sendDeleteVerificationEmail(
  email: string,
  code: string
): Promise<void> {
  const subject = "Account Deletion Verification";

  try {
    await sendMail({
      to: email,
      subject,
      text: `Your account deletion code: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Account Deletion Verification</h2>
          <p>Use the following code to confirm deletion:</p>
          <div style="padding:16px;background:#f3f4f6;text-align:center;font-size:24px;font-weight:bold;letter-spacing:3px;border-radius:5px;margin:20px 0;">${code}</div>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending delete verification email:", error);
    throw new Error(
      `Failed to send verification email: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function sendEmailVerificationEmail(
  email: string,
  verificationCode: string
): Promise<void> {
  const verificationUrl = `${BASE_URL}/auth/verify-email?code=${verificationCode}&email=${encodeURIComponent(email)}`;
  const subject = "Email Verification";

  try {
    await sendMail({
      to: email,
      subject,
      text: `Verify your email: ${verificationUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Nexus!</h2>
          <p>Please verify your email address:</p>
          <a href="${verificationUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:white;text-decoration:none;border-radius:5px;">Verify Email</a>
          <p>This link will expire in 24 hours.</p>
          <p>If the button doesn't work, copy and paste this link: ${verificationUrl}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending email verification email:", error);
    throw new Error(
      `Failed to send verification email: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function sendProjectInvitationEmail(
  email: string,
  token: string,
  projectName: string,
  inviterName: string
): Promise<void> {
  const invitationUrl = `${BASE_URL}/invitations/accept?token=${token}`;
  const subject = `Invitation to join the "${projectName}" project`;

  try {
    await sendMail({
      to: email,
      subject,
      text: `${inviterName} invited you to join "${projectName}" on Nexus. Accept here: ${invitationUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Project Invitation</h2>
          <p><strong>${inviterName}</strong> has invited you to join the project <strong>"${projectName}"</strong> on Nexus.</p>
          <a href="${invitationUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:white;text-decoration:none;border-radius:5px;">Accept Invitation</a>
          <p>This invitation will expire in 24 hours.</p>
          <p>If the button doesn't work, use this link: ${invitationUrl}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending project invitation email:", error);
    throw new Error(
      `Failed to send invitation email: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function sendSubsEmail(email: string): Promise<void> {
  const NexusUrl = `${BASE_URL}`;
  const subject = `Subscription to Nexus`;

  try {
    await sendMail({
      to: email,
      subject,
      text: `Thank you for subscribing to Nexus! You can start using it here: ${NexusUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Subscription Confirmation</h2>
          <p>Thank you for subscribing to Nexus! We're excited to have you on board.</p>
          <p>You can start using Nexus by clicking the button below:</p>
          <a href="${NexusUrl}" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:white;text-decoration:none;border-radius:5px;">Nexus Home</a>
          <p>If the button doesn't work, copy and paste this link: ${NexusUrl}</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending project invitation email:", error);
    throw new Error(
      `Failed to send invitation email: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function sendTaskDueReminderEmail(
  email: string,
  taskTitle: string,
  taskId: string | number,
  projectName: string,
  dueDate: Date,
  hoursUntilDue: number
): Promise<void> {
  const taskUrl = `${BASE_URL}/tasks/${taskId}`;

  // Xác định urgency và màu sắc
  let urgencyLabel = "REMINDER";
  let urgencyColor = "#3b82f6"; // blue
  let timeLabel = `${hoursUntilDue} hour${hoursUntilDue !== 1 ? "s" : ""}`;

  if (hoursUntilDue === 0) {
    urgencyLabel = "URGENT - LESS THAN 1 HOUR";
    urgencyColor = "#dc2626"; // red
    timeLabel = "less than 1 hour";
  } else if (hoursUntilDue === 1) {
    urgencyLabel = "URGENT";
    urgencyColor = "#dc2626"; // red
  } else if (hoursUntilDue === 3) {
    urgencyLabel = "HIGH PRIORITY";
    urgencyColor = "#f59e0b"; // orange
  }

  const subject = `⏰ Task Reminder: "${taskTitle}" is due in ${timeLabel}`;

  try {
    await sendMail({
      to: email,
      subject,
      text: `Your task "${taskTitle}" in project "${projectName}" is due in ${timeLabel}. View it here: ${taskUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${urgencyColor}; color: white; padding: 12px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="margin: 0; font-size: 18px;">${urgencyLabel}</h2>
          </div>
          <div style="border: 2px solid ${urgencyColor}; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
            <h3 style="margin-top: 0; color: #111827;">Task Due Soon</h3>
            <p style="font-size: 16px; margin: 16px 0;">
              <strong style="color: #1f2937;">${taskTitle}</strong>
            </p>
            <p style="color: #6b7280; margin: 8px 0;">
              <strong>Project:</strong> ${projectName}
            </p>
            <p style="color: #6b7280; margin: 8px 0;">
              <strong>Due:</strong> ${dueDate.toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            <p style="color: ${urgencyColor}; font-weight: bold; font-size: 18px; margin: 16px 0;">
              ⏰ Time remaining: ${timeLabel}
            </p>
            <a href="${taskUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:${urgencyColor};color:white;text-decoration:none;border-radius:6px;font-weight:bold;">
              View Task →
            </a>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending task reminder email:", error);
    throw new Error(
      `Failed to send task reminder email: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export async function sendProjectDueReminderEmail(
  email: string,
  projectName: string,
  projectId: string | number,
  dueDate: Date,
  hoursUntilDue: number
): Promise<void> {
  const projectUrl = `${BASE_URL}/projects/${projectId}`;

  // Xác định urgency và màu sắc
  let urgencyLabel = "REMINDER";
  let urgencyColor = "#3b82f6"; // blue
  let timeLabel = `${hoursUntilDue} hour${hoursUntilDue !== 1 ? "s" : ""}`;

  if (hoursUntilDue === 0) {
    urgencyLabel = "URGENT - LESS THAN 1 HOUR";
    urgencyColor = "#dc2626"; // red
    timeLabel = "less than 1 hour";
  } else if (hoursUntilDue === 1) {
    urgencyLabel = "URGENT";
    urgencyColor = "#dc2626"; // red
  } else if (hoursUntilDue === 3) {
    urgencyLabel = "HIGH PRIORITY";
    urgencyColor = "#f59e0b"; // orange
  }

  const subject = `⏰ Project Reminder: "${projectName}" is due in ${timeLabel}`;

  try {
    await sendMail({
      to: email,
      subject,
      text: `The project "${projectName}" is due in ${timeLabel}. View it here: ${projectUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${urgencyColor}; color: white; padding: 12px; border-radius: 8px 8px 0 0; text-align: center;">
            <h2 style="margin: 0; font-size: 18px;">${urgencyLabel}</h2>
          </div>
          <div style="border: 2px solid ${urgencyColor}; border-top: none; padding: 20px; border-radius: 0 0 8px 8px;">
            <h3 style="margin-top: 0; color: #111827;">Project Due Soon</h3>
            <p style="font-size: 18px; margin: 16px 0;">
              <strong style="color: #1f2937;">${projectName}</strong>
            </p>
            <p style="color: #6b7280; margin: 8px 0;">
              <strong>Deadline:</strong> ${dueDate.toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
            <p style="color: ${urgencyColor}; font-weight: bold; font-size: 18px; margin: 16px 0;">
              ⏰ Time remaining: ${timeLabel}
            </p>
            <a href="${projectUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:${urgencyColor};color:white;text-decoration:none;border-radius:6px;font-weight:bold;">
              View Project →
            </a>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error sending project reminder email:", error);
    throw new Error(
      `Failed to send project reminder email: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

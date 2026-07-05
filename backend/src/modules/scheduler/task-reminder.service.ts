import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { EmailTemplatesService } from '../email/email-templates.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto';

interface ReminderWindow {
  targetMs: number;   // exact ms-before-deadline to fire
  toleranceMs: number; // ±tolerance — window = [targetMs - tolerance, targetMs + tolerance]
  label: string;
}

interface ReminderCopy {
  headline: string;
  inAppTitle: string;
  inAppMessage: string;
}

type NotificationLanguage = 'en' | 'vi';

// Cron runs every 5 minutes → tolerance = 5 min so no cron tick is missed.
// Each window fires when: targetMs - toleranceMs < remainingMs <= targetMs + toleranceMs
const CRON_INTERVAL_MS = 5 * 60 * 1000;
const REMINDER_WINDOWS: ReminderWindow[] = [
  { targetMs: 3 * 24 * 60 * 60 * 1000, toleranceMs: CRON_INTERVAL_MS, label: '3 ngày'  },
  { targetMs:     24 * 60 * 60 * 1000, toleranceMs: CRON_INTERVAL_MS, label: '1 ngày'  },
  { targetMs:  12 * 60 * 60 * 1000,    toleranceMs: CRON_INTERVAL_MS, label: '12 giờ'  },
  { targetMs:   3 * 60 * 60 * 1000,    toleranceMs: CRON_INTERVAL_MS, label: '3 giờ'   },
  { targetMs:       60 * 60 * 1000,    toleranceMs: CRON_INTERVAL_MS, label: '1 giờ'   },
];

const COMPLETED_STATUSES = ['done', 'completed', 'cancelled'];
// Query window: fetch tasks due within [now + 1h - tolerance, now + 3d + tolerance]
// so every reminder target is covered.
const MAX_LOOKAHEAD_MS = 3 * 24 * 60 * 60 * 1000 + CRON_INTERVAL_MS;
const MIN_LOOKAHEAD_MS = 60 * 60 * 1000 - CRON_INTERVAL_MS;

// Maps interval keys (stored in reminder_settings.intervals) to Vietnamese labels
// used as dedup keys in the notifications table.
const INTERVAL_KEY_TO_LABEL: Record<string, string> = {
  '3d': '3 ngày',
  '1d': '1 ngày',
  '12h': '12 giờ',
  '3h': '3 giờ',
  '1h': '1 giờ',
};
const EMAIL_DEDUP_KEY = 'task_reminder_email';
const IN_APP_CHANNEL_KEY = 'in_app';
const IN_MAIL_CHANNEL_KEY = 'in_mail';

@Injectable()
export class TaskReminderService implements OnModuleInit {
  private readonly logger = new Logger(TaskReminderService.name);
  private isProcessing = false;
  private lastRunAt: Date | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly emailTemplates: EmailTemplatesService,
    private readonly notificationsService: NotificationsService,
  ) {}
  onModuleInit() {
    setTimeout(() => {
      void this.runInitialCheck();
    }, 5000);
  }

  private async runInitialCheck(): Promise<void> {
    this.logger.log('[TaskReminder] Running initial check...');
    await this.handleTaskDeadlineReminders();
  }

  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'task-deadline-reminders',
    timeZone: 'UTC',
  })
  async handleTaskDeadlineReminders(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('[TaskReminder] Previous job still running, skipping...');
      return;
    }

    try {
      this.isProcessing = true;
      this.lastRunAt = new Date();
      const now = new Date();
      this.logger.log(`[TaskReminder] Checking task reminders at ${now.toISOString()}`);

      await this.processReminderBuckets(now);
    } catch (error: any) {
      this.logger.error(`[TaskReminder] Error: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processReminderBuckets(now: Date): Promise<void> {
    const tasks = await this.findUpcomingTasks(now);
    this.logger.log(
      `[TaskReminder] Found ${tasks.length} upcoming task(s) matching query`,
    );

    if (tasks.length === 0) {
      await this.logUnmatchedTasks(now);
      return;
    }

    for (const task of tasks) {
      // Parse per-task reminder_settings; default to not sending if missing or malformed.
      let reminderSettings: { enabled?: boolean; intervals?: string[] } | null = null;
      try {
        reminderSettings = task.reminder_settings
          ? (typeof task.reminder_settings === 'string'
            ? JSON.parse(task.reminder_settings)
            : task.reminder_settings)
          : null;
      } catch {
        this.logger.warn(
          `[TaskReminder] Malformed reminder_settings for task "${task.title}" (id=${task.id}), skipping`,
        );
        continue;
      }

      // Reminders are opt-in: skip unless user explicitly enabled them.
      if (!reminderSettings?.enabled) {
        this.logger.debug(
          `[TaskReminder] Task "${task.title}" (id=${task.id}) — reminders not enabled, skipping`,
        );
        continue;
      }

      const intervals = reminderSettings.intervals ?? [];
      if (intervals.length === 0) {
        this.logger.debug(
          `[TaskReminder] Task "${task.title}" (id=${task.id}) — enabled but no intervals selected, skipping`,
        );
        continue;
      }

      const allowedLabels = new Set(
        intervals.map((k) => INTERVAL_KEY_TO_LABEL[k]).filter(Boolean),
      );

      const dueAt = new Date(task.due_date).getTime();
      const remainingMs = dueAt - now.getTime();
      // Match if |remainingMs - targetMs| <= toleranceMs (i.e. cron fired within ±5min of the target)
      const window = REMINDER_WINDOWS.find(
        (w) => Math.abs(remainingMs - w.targetMs) <= w.toleranceMs,
      );

      if (!window) {
        this.logger.debug(
          `[TaskReminder] Task "${task.title}" (id=${task.id}) due=${task.due_date} remainingMs=${Math.round(remainingMs / 60000)}min — not at any reminder target, skipping`,
        );
        continue;
      }

      if (!allowedLabels.has(window.label)) {
        this.logger.debug(
          `[TaskReminder] Task "${task.title}" (id=${task.id}) window="${window.label}" not in user's selected intervals, skipping`,
        );
        continue;
      }

      await this.processTaskReminder(task, window);
    }
  }

  private async logUnmatchedTasks(now: Date): Promise<void> {
    try {
      const end = new Date(now.getTime() + MAX_LOOKAHEAD_MS);
      const start = new Date(now.getTime() + MIN_LOOKAHEAD_MS);
      const result = await this.db.query(
        `SELECT t.id, t.title, t.due_date, t.status, t.assigned_to, t.project_id
         FROM tasks t
         WHERE t.due_date IS NOT NULL
           AND t.due_date >= $1
           AND t.due_date <= $2`,
        [start.toISOString(), end.toISOString()],
      );
      const allTasks = result.rows || [];
      if (allTasks.length === 0) {
        this.logger.log(
          `[TaskReminder] No tasks with due_date in [${now.toISOString()}, ${end.toISOString()}] at all`,
        );
        return;
      }
      for (const t of allTasks) {
        const reasons: string[] = [];
        if (COMPLETED_STATUSES.includes(t.status)) reasons.push(`status=${t.status}`);
        if (!t.assigned_to) reasons.push('assigned_to IS NULL');
        this.logger.warn(
          `[TaskReminder] Task "${t.title}" (id=${t.id}) due=${t.due_date} status=${t.status} assigned_to=${JSON.stringify(t.assigned_to)} — excluded: ${reasons.length ? reasons.join(', ') : 'JOIN projects failed or unknown'}`,
        );
      }
    } catch (error: any) {
      this.logger.error(`[TaskReminder] logUnmatchedTasks error: ${error.message}`);
    }
  }

  private async findUpcomingTasks(now: Date): Promise<any[]> {
    try {
      // Fetch all tasks whose due_date falls within any possible reminder window.
      // Lower bound = soonest window (1h) minus tolerance; upper bound = farthest window (3d) plus tolerance.
      const start = new Date(now.getTime() + MIN_LOOKAHEAD_MS);
      const end = new Date(now.getTime() + MAX_LOOKAHEAD_MS);
      const result = await this.db.query(
        `SELECT t.*, p.name AS project_name, p.workspace_id
         FROM tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE t.due_date IS NOT NULL
           AND t.due_date >= $1
           AND t.due_date <= $2
           AND t.status NOT IN ($3, $4, $5)
           AND t.assigned_to IS NOT NULL`,
        [start.toISOString(), end.toISOString(), ...COMPLETED_STATUSES],
      );
      return result.rows || [];
    } catch (error: any) {
      this.logger.error(`[TaskReminder] Query error: ${error.message}`, error.stack);
      return [];
    }
  }

  private async processTaskReminder(task: any, window: ReminderWindow): Promise<void> {
    let assignees: string[] = [];
    try {
      assignees = typeof task.assigned_to === 'string'
        ? JSON.parse(task.assigned_to)
        : Array.isArray(task.assigned_to)
          ? task.assigned_to
          : [];
    } catch {
      assignees = [];
    }

    if (assignees.length === 0) return;

    for (const assigneeId of assignees) {
      try {
        const user = await this.db.getUserById(assigneeId);
        if (!user) {
          this.logger.warn(`[TaskReminder] User not found: ${assigneeId}`);
          continue;
        }

        const prefOk = await this.checkNotificationPreferences(assigneeId);
        if (!prefOk.email && !prefOk.in_app) continue;

        const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';
        const taskUrl = `${baseUrl}/workspaces/${task.workspace_id}/projects/${task.project_id}`;
        const remainingMs = new Date(task.due_date).getTime() - Date.now();

        if (prefOk.email) {
          const emailAlreadySent = await this.hasEmailReminderBeenSent(
            task.id,
            assigneeId,
            window.label,
          );
          if (!emailAlreadySent) {
            // Email is a one-shot send, so it's translated at send time using
            // the user's language preference (unlike in-app, it can't be
            // re-translated later when the viewer switches UI language).
            const emailLanguage = await this.getUserLanguage(assigneeId);
            const emailDueDate = new Date(task.due_date).toLocaleString(
              emailLanguage === 'en' ? 'en-US' : 'vi-VN',
              { dateStyle: 'medium', timeStyle: 'short' },
            );
            const emailCopy = this.buildReminderCopy(task.title, remainingMs, window, emailLanguage);
            const emailSent = await this.sendTaskReminderEmail(
              user,
              task,
              window,
              taskUrl,
              emailDueDate,
              emailCopy,
            );
            if (emailSent) {
              await this.markEmailReminderSent(task, assigneeId, window.label);
            }
          }
        }

        if (prefOk.in_app) {
          const inAppAlreadySent = await this.hasReminderBeenSent(
            task.id,
            assigneeId,
            window.label,
          );
          if (!inAppAlreadySent) {
            // In-app copy is always built in English; NotificationItem.tsx
            // re-translates it at render time from the raw data fields.
            const dueDate = new Date(task.due_date).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });
            const reminderCopy = this.buildReminderCopy(task.title, remainingMs, window);
            await this.createTaskReminderNotification(
              task,
              assigneeId,
              window,
              taskUrl,
              dueDate,
              reminderCopy,
              remainingMs,
            );
          }
        }

        this.logger.log(
          `[TaskReminder] Processed ${window.label} reminder for "${task.title}" to user ${assigneeId} (email=${prefOk.email}, in_app=${prefOk.in_app})`,
        );
      } catch (error: any) {
        this.logger.error(
          `[TaskReminder] Error processing task=${task.id} user=${assigneeId}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  private async hasReminderBeenSent(
    taskId: string,
    userId: string,
    remindBefore: string,
  ): Promise<boolean> {
    try {
      const result = await this.db.query(
        `SELECT id FROM notifications
         WHERE user_id = $1
           AND type = $2
           AND entity_type = 'task'
           AND entity_id = $3
           AND data->>'remind_before' = $4
           AND (
             data->>'channel' = $5
             OR (
               COALESCE(data->>'channel', '') = ''
               AND COALESCE(data->>'reminder_kind', '') = ''
             )
           )
         LIMIT 1`,
        [userId, NotificationType.REMINDER, taskId, remindBefore, IN_APP_CHANNEL_KEY],
      );
      return (result.rows?.length || 0) > 0;
    } catch (error: any) {
      this.logger.error(`[TaskReminder] Dedup error: ${error.message}`);
      return false;
    }
  }

  private async hasEmailReminderBeenSent(
    taskId: string,
    userId: string,
    remindBefore: string,
  ): Promise<boolean> {
    try {
      const result = await this.db.query(
        `SELECT id FROM notifications
         WHERE user_id = $1
           AND type = $2
           AND entity_type = 'task'
           AND entity_id = $3
           AND data->>'remind_before' = $4
           AND (
             data->>'channel' = $5
             OR data->>'reminder_kind' = $6
           )
         LIMIT 1`,
        [
          userId,
          NotificationType.REMINDER,
          taskId,
          remindBefore,
          IN_MAIL_CHANNEL_KEY,
          EMAIL_DEDUP_KEY,
        ],
      );
      return (result.rows?.length || 0) > 0;
    } catch (error: any) {
      this.logger.error(`[TaskReminder] Email dedup check error: ${error.message}`);
      return false;
    }
  }

  private async markEmailReminderSent(
    task: any,
    userId: string,
    remindBefore: string,
  ): Promise<void> {
    try {
      await this.db.insert('notifications', {
        user_id: userId,
        workspace_id: task.workspace_id || null,
        type: NotificationType.REMINDER,
        title: 'Task reminder email sent',
        message: null,
        category: 'tasks',
        entity_type: 'task',
        entity_id: task.id,
        is_read: true,
        is_archived: true,
        priority: 'low',
        sent_via: { email: true, in_app: false },
        data: {
          channel: IN_MAIL_CHANNEL_KEY,
          in_mail: true,
          in_app: false,
          reminder_kind: EMAIL_DEDUP_KEY,
          remind_before: remindBefore,
          task_id: task.id,
          project_id: task.project_id,
          due_date: task.due_date,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `[TaskReminder] Failed to persist email dedup marker task=${task.id} user=${userId}: ${error.message}`,
      );
    }
  }

  private async getUserLanguage(userId: string): Promise<NotificationLanguage> {
    try {
      const userSettings = await this.db.findOne('user_settings', {
        user_id: userId,
      });
      return userSettings?.language === 'en' ? 'en' : 'vi';
    } catch {
      return 'vi';
    }
  }

  private async checkNotificationPreferences(
    userId: string,
  ): Promise<{ email: boolean; in_app: boolean }> {
    try {
      const userSettings = await this.db.findOne('user_settings', {
        user_id: userId,
      });

      if (!userSettings || !userSettings.notifications) {
        return { email: true, in_app: true };
      }

      const notifSettings =
        typeof userSettings.notifications === 'string'
          ? JSON.parse(userSettings.notifications)
          : userSettings.notifications;

      const generalSettings = notifSettings?.generalSettings || {};
      if (generalSettings.doNotDisturb === true) {
        return { email: false, in_app: false };
      }

      const categories = Array.isArray(notifSettings?.categories)
        ? notifSettings.categories
        : [];
      const reminderCategory = categories.find(
        (category: any) => category?.id === 'reminder' || category?.id === NotificationType.REMINDER,
      );

      if (reminderCategory?.settings) {
        return {
          email: reminderCategory.settings.email !== false,
          in_app: reminderCategory.settings.inApp !== false,
        };
      }

      return {
        email: notifSettings?.email !== false,
        in_app: true,
      };
    } catch {
      return { email: true, in_app: true };
    }
  }

  private async sendTaskReminderEmail(
    user: any,
    task: any,
    window: ReminderWindow,
    taskUrl: string,
    dueDate: string,
    reminderCopy: ReminderCopy,
  ): Promise<boolean> {
    if (!user.email) {
      this.logger.warn(`[TaskReminder] No email for user ${user.id}, skipping email`);
      return false;
    }

    const assigneeName = user.name || user.username || user.email?.split('@')[0] || 'User';
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const sent = await this.emailTemplates.sendTaskReminderEmail({
          to: user.email,
          assigneeName,
          taskTitle: task.title,
          taskDescription: task.description || undefined,
          projectName: task.project_name || 'Untitled Project',
          dueDate,
          priority: task.priority || 'medium',
          remindBeforeLabel: window.label,
          reminderHeadline: reminderCopy.headline,
          taskUrl,
        });
        return sent;
      } catch (error: any) {
        const isLastAttempt = attempt === maxAttempts;
        const retryable = this.isRetryableEmailError(error);

        if (!retryable || isLastAttempt) {
          if (isLastAttempt) {
            this.logger.error(
              `[TaskReminder] Email send failed after ${maxAttempts} attempts for user=${user.id}: ${error?.message || 'unknown error'}`,
            );
          }
          throw error;
        }

        this.logger.warn(
          `[TaskReminder] Email send attempt ${attempt}/${maxAttempts} failed for user=${user.id}, retrying: ${error?.message || 'unknown error'}`,
        );
        await this.sleep(500 * attempt);
      }
    }

    return false;
  }

  private isRetryableEmailError(error: any): boolean {
    const message = String(error?.message || '').toUpperCase();
    const code = String(error?.code || '').toUpperCase();

    return (
      code === 'ETIMEOUT' ||
      code === 'ESOCKET' ||
      code === 'ECONNECTION' ||
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN' ||
      message.includes('ETIMEOUT') ||
      message.includes('ENOTFOUND') ||
      message.includes('EAI_AGAIN')
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async createTaskReminderNotification(
    task: any,
    assigneeId: string,
    window: ReminderWindow,
    taskUrl: string,
    dueDate: string,
    reminderCopy: ReminderCopy,
    remainingMs: number,
  ): Promise<void> {
    try {
      await this.notificationsService.sendNotification({
        user_id: assigneeId,
        type: NotificationType.REMINDER,
        title: reminderCopy.inAppTitle,
        message: `${reminderCopy.inAppMessage}. Due: ${dueDate}`,
        action_url: taskUrl,
        priority: (task.priority === 'urgent' || task.priority === 'high'
          ? 'high'
          : 'normal') as any,
        send_push: true,
        send_email: false,
        data: {
          channel: IN_APP_CHANNEL_KEY,
          in_app: true,
          in_mail: false,
          category: 'tasks',
          entity_type: 'task',
          entity_id: task.id,
          workspace_id: task.workspace_id,
          task_title: task.title,
          task_id: task.id,
          project_id: task.project_id,
          remind_before: window.label,
          remaining_ms: remainingMs,
          due_date: task.due_date,
          priority: task.priority,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `[TaskReminder] In-app notification error: ${error.message}`,
        error.stack,
      );
    }
  }

  async getReminderStats(): Promise<{ lastRunAt: Date | null; isRunning: boolean }> {
    return {
      lastRunAt: this.lastRunAt,
      isRunning: this.isProcessing,
    };
  }

  // `language` only matters for the one-shot email copy. In-app copy is
  // always requested with the default ('en') — NotificationItem.tsx
  // re-translates the in-app title/message at render time from the raw
  // remaining_ms/reminder_window in `data`, so switching UI language
  // re-translates already-delivered notifications instead of leaving them
  // frozen in whatever language was active when the reminder was sent.
  private buildReminderCopy(
    taskTitle: string,
    remainingMs: number,
    window: ReminderWindow,
    language: NotificationLanguage = 'en',
  ): ReminderCopy {
    if (language === 'en') {
      if (window.label === '1 giờ') {
        return {
          headline: 'Task will be due within the next hour',
          inAppTitle: `Task due soon: ${taskTitle}`,
          inAppMessage: `Task "${taskTitle}" will be due within the next hour`,
        };
      }

      const usesDays = window.label === '3 ngày' || window.label === '1 ngày';
      const roundedValue = usesDays
        ? Math.ceil(remainingMs / (24 * 60 * 60 * 1000))
        : Math.ceil(remainingMs / (60 * 60 * 1000));
      const unit = usesDays ? (roundedValue === 1 ? 'day' : 'days') : (roundedValue === 1 ? 'hour' : 'hours');
      const headline = `Task is due in ${roundedValue} ${unit}`;

      return {
        headline,
        inAppTitle: `Task due soon: ${taskTitle}`,
        inAppMessage: `Task "${taskTitle}" is due in ${roundedValue} ${unit}`,
      };
    }

    if (window.label === '1 giờ') {
      return {
        headline: 'Task sẽ hết hạn trong vòng 1 giờ tới',
        inAppTitle: `Task sắp hết hạn: ${taskTitle}`,
        inAppMessage: `Task "${taskTitle}" sẽ hết hạn trong vòng 1 giờ tới`,
      };
    }

    const usesDays = window.label === '3 ngày' || window.label === '1 ngày';
    const roundedValue = usesDays
      ? Math.ceil(remainingMs / (24 * 60 * 60 * 1000))
      : Math.ceil(remainingMs / (60 * 60 * 1000));
    const unit = usesDays ? 'ngày' : 'giờ';
    const headline = `Còn ${roundedValue} ${unit} nữa task sẽ hết hạn`;

    return {
      headline,
      inAppTitle: `Task sắp tới hạn: ${taskTitle}`,
      inAppMessage: `Task "${taskTitle}" còn ${roundedValue} ${unit} nữa sẽ hết hạn`,
    };
  }
}


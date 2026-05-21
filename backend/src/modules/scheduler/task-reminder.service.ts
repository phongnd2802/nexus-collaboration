import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { EmailTemplatesService } from '../email/email-templates.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto';

interface ReminderWindow {
  minMsExclusive: number;
  maxMsInclusive: number;
  label: string;
}

const REMINDER_WINDOWS: ReminderWindow[] = [
  { minMsExclusive: 1 * 24 * 60 * 60 * 1000, maxMsInclusive: 3 * 24 * 60 * 60 * 1000, label: '3 ngày' },
  { minMsExclusive: 12 * 60 * 60 * 1000, maxMsInclusive: 1 * 24 * 60 * 60 * 1000, label: '1 ngày' },
  { minMsExclusive: 3 * 60 * 60 * 1000, maxMsInclusive: 12 * 60 * 60 * 1000, label: '12 giờ' },
  { minMsExclusive: 1 * 60 * 60 * 1000, maxMsInclusive: 3 * 60 * 60 * 1000, label: '3 giờ' },
  { minMsExclusive: 0, maxMsInclusive: 1 * 60 * 60 * 1000, label: '1 giờ' },
];

const COMPLETED_STATUSES = ['done', 'completed', 'cancelled'];
const MAX_LOOKAHEAD_MS = 3 * 24 * 60 * 60 * 1000;
const EMAIL_DEDUP_KEY = 'task_reminder_email';

@Injectable()
export class TaskReminderService {
  private readonly logger = new Logger(TaskReminderService.name);
  private isProcessing = false;
  private lastRunAt: Date | null = null;

  constructor(
    private readonly db: DatabaseService,
    private readonly emailTemplates: EmailTemplatesService,
    private readonly notificationsService: NotificationsService,
  ) {}

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
      const dueAt = new Date(task.due_date).getTime();
      const remainingMs = dueAt - now.getTime();
      const window = REMINDER_WINDOWS.find(
        (w) => remainingMs > w.minMsExclusive && remainingMs <= w.maxMsInclusive,
      );

      if (!window) {
        this.logger.debug(
          `[TaskReminder] Task "${task.title}" (id=${task.id}) due=${task.due_date} remainingMs=${remainingMs} — no matching window, skipping`,
        );
        continue;
      }
      await this.processTaskReminder(task, window);
    }
  }

  private async logUnmatchedTasks(now: Date): Promise<void> {
    try {
      const end = new Date(now.getTime() + MAX_LOOKAHEAD_MS);
      const result = await this.db.query(
        `SELECT t.id, t.title, t.due_date, t.status, t.assigned_to, t.project_id
         FROM tasks t
         WHERE t.due_date IS NOT NULL
           AND t.due_date >= $1
           AND t.due_date <= $2`,
        [now.toISOString(), end.toISOString()],
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
        [now.toISOString(), end.toISOString(), ...COMPLETED_STATUSES],
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
        const alreadySent = await this.hasReminderBeenSent(
          task.id,
          assigneeId,
          window.label,
        );
        if (alreadySent) continue;

        const user = await this.db.getUserById(assigneeId);
        if (!user) {
          this.logger.warn(`[TaskReminder] User not found: ${assigneeId}`);
          continue;
        }

        const prefOk = await this.checkNotificationPreferences(assigneeId);
        if (!prefOk.email && !prefOk.in_app) continue;

        const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';
        const taskUrl = `${baseUrl}/workspaces/${task.workspace_id}/projects/${task.project_id}`;
        const dueDate = new Date(task.due_date).toLocaleString('vi-VN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });

        if (prefOk.email) {
          const emailAlreadySent = await this.hasEmailReminderBeenSent(
            task.id,
            assigneeId,
            window.label,
          );
          if (!emailAlreadySent) {
            await this.sendTaskReminderEmail(user, task, window, taskUrl, dueDate);
            await this.markEmailReminderSent(task, assigneeId, window.label);
          }
        }
        if (prefOk.in_app) {
          await this.createTaskReminderNotification(task, assigneeId, window, taskUrl, dueDate);
        }

        this.logger.log(
          `[TaskReminder] Sent ${window.label} reminder for "${task.title}" to user ${assigneeId} (email=${prefOk.email}, in_app=${prefOk.in_app})`,
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
         LIMIT 1`,
        [userId, NotificationType.REMINDER, taskId, remindBefore],
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
           AND data->>'reminder_kind' = $4
           AND data->>'remind_before' = $5
         LIMIT 1`,
        [userId, NotificationType.REMINDER, taskId, EMAIL_DEDUP_KEY, remindBefore],
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

  private async checkNotificationPreferences(
    userId: string,
  ): Promise<{ email: boolean; in_app: boolean }> {
    try {
      const prefs = await this.notificationsService.getNotificationPreferences(userId);

      if (prefs.metadata?.doNotDisturb) return { email: false, in_app: false };

      const reminderPrefs = prefs.types?.['reminder'] || prefs.types?.[NotificationType.REMINDER];

      return {
        email: reminderPrefs ? reminderPrefs.email !== false : prefs.global.email !== false,
        in_app: reminderPrefs ? reminderPrefs.in_app !== false : prefs.global.in_app !== false,
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
  ): Promise<void> {
    if (!user.email) {
      this.logger.warn(`[TaskReminder] No email for user ${user.id}, skipping email`);
      return;
    }

    const assigneeName = user.name || user.username || user.email?.split('@')[0] || 'User';
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.emailTemplates.sendTaskReminderEmail({
          to: user.email,
          assigneeName,
          taskTitle: task.title,
          taskDescription: task.description || undefined,
          projectName: task.project_name || 'Untitled Project',
          dueDate,
          priority: task.priority || 'medium',
          remindBeforeLabel: window.label,
          taskUrl,
        });
        return;
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
  ): Promise<void> {
    try {
      await this.notificationsService.sendNotification({
        user_id: assigneeId,
        type: NotificationType.REMINDER,
        title: `Task sắp tới hạn: ${task.title}`,
        message: `Task "${task.title}" sẽ hết hạn sau ${window.label}. Hạn: ${dueDate}`,
        action_url: taskUrl,
        priority: (task.priority === 'urgent' || task.priority === 'high'
          ? 'high'
          : 'normal') as any,
        send_push: true,
        send_email: false,
        data: {
          category: 'tasks',
          entity_type: 'task',
          entity_id: task.id,
          workspace_id: task.workspace_id,
          task_title: task.title,
          task_id: task.id,
          project_id: task.project_id,
          remind_before: window.label,
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
}

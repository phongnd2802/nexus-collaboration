import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { EmailTemplatesService } from '../email/email-templates.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/dto';

interface ReminderWindow {
  milliseconds: number;
  label: string;
}

const REMINDER_WINDOWS: ReminderWindow[] = [
  { milliseconds: 3 * 24 * 60 * 60 * 1000, label: '3 ngày' },
  { milliseconds: 1 * 24 * 60 * 60 * 1000, label: '1 ngày' },
  { milliseconds: 12 * 60 * 60 * 1000, label: '12 giờ' },
  { milliseconds: 3 * 60 * 60 * 1000, label: '3 giờ' },
  { milliseconds: 1 * 60 * 60 * 1000, label: '1 giờ' },
];

const COMPLETED_STATUSES = ['done', 'completed', 'cancelled'];

const HALF_INTERVAL_MS = 2.5 * 60 * 1000;
const DEDUP_WINDOW_MS = 30 * 60 * 1000;

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

      for (const window of REMINDER_WINDOWS) {
        await this.processReminderWindow(now, window);
      }
    } catch (error) {
      this.logger.error(`[TaskReminder] Error: ${error.message}`, error.stack);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processReminderWindow(now: Date, window: ReminderWindow): Promise<void> {
    const windowStart = new Date(now.getTime() + window.milliseconds - HALF_INTERVAL_MS);
    const windowEnd = new Date(now.getTime() + window.milliseconds + HALF_INTERVAL_MS);

    const tasks = await this.findTasksDueInWindow(windowStart, windowEnd);

    if (tasks.length === 0) return;

    this.logger.log(
      `[TaskReminder] Found ${tasks.length} task(s) due within ${window.label}`,
    );

    for (const task of tasks) {
      await this.processTaskReminder(task, window);
    }
  }

  private async findTasksDueInWindow(
    windowStart: Date,
    windowEnd: Date,
  ): Promise<any[]> {
    try {
      const result = await this.db.query(
        `SELECT t.*, p.name AS project_name, p.workspace_id
         FROM tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE t.due_date IS NOT NULL
           AND t.due_date >= $1
           AND t.due_date <= $2
           AND t.status NOT IN ($3, $4, $5)
           AND t.assigned_to IS NOT NULL`,
        [windowStart.toISOString(), windowEnd.toISOString(), ...COMPLETED_STATUSES],
      );
      return result.rows || [];
    } catch (error) {
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

        const preferenceOk = await this.checkNotificationPreferences(assigneeId);
        if (!preferenceOk) continue;

        const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:5173';
        const taskUrl = `${baseUrl}/workspaces/${task.workspace_id}/projects/${task.project_id}`;
        const dueDate = new Date(task.due_date).toLocaleString('vi-VN', {
          dateStyle: 'medium',
          timeStyle: 'short',
        });

        await this.sendTaskReminderEmail(user, task, window, taskUrl, dueDate);

        await this.createTaskReminderNotification(task, assigneeId, window, taskUrl, dueDate);

        this.logger.log(
          `[TaskReminder] Sent ${window.label} reminder for "${task.title}" to user ${assigneeId}`,
        );
      } catch (error) {
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
      const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
      const result = await this.db.query(
        `SELECT id FROM notifications
         WHERE user_id = $1
           AND type = $2
           AND entity_type = 'task'
           AND entity_id = $3
           AND created_at >= $4
           AND data->>'remind_before' = $5
         LIMIT 1`,
        [userId, NotificationType.REMINDER, taskId, since, remindBefore],
      );
      return (result.rows?.length || 0) > 0;
    } catch (error) {
      this.logger.error(`[TaskReminder] Dedup error: ${error.message}`);
      return false;
    }
  }

  private async checkNotificationPreferences(userId: string): Promise<boolean> {
    try {
      const prefs = await this.notificationsService.getNotificationPreferences(userId);

      if (prefs.metadata?.doNotDisturb) return false;

      const reminderPrefs = prefs.types?.['reminder'] || prefs.types?.[NotificationType.REMINDER];
      if (reminderPrefs && reminderPrefs.email === false && reminderPrefs.in_app === false) {
        return false;
      }

      if (!prefs.global.email && !prefs.global.in_app) return false;

      return true;
    } catch {
      return true;
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
    } catch (error) {
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

import { PrismaClient } from "@prisma/client";
import { reminderQueue, ReminderJobData } from "../queues/reminderQueue";

const prisma = new PrismaClient();

// Các ngưỡng reminder (phút trước deadline)
export const REMINDER_THRESHOLDS = {
  "24h": 24 * 60, // 1440 phút
  "3h": 3 * 60, // 180 phút
  "1h": 1 * 60, // 60 phút
} as const;

/**
 * Tạo hoặc cập nhật reminders khi Task được tạo/cập nhật
 */
export async function upsertTaskReminders(
  taskId: string,
  dueDate: Date
): Promise<void> {
  console.log(`📝 Upserting reminders for task ${taskId}`);

  for (const [label, threshold] of Object.entries(REMINDER_THRESHOLDS)) {
    await upsertReminder("task", taskId, threshold, dueDate);
  }
}

/**
 * Tạo hoặc cập nhật reminders khi Project được tạo/cập nhật
 */
export async function upsertProjectReminders(
  projectId: string,
  dueDate: Date
): Promise<void> {
  console.log(`📝 Upserting reminders for project ${projectId}`);

  for (const [label, threshold] of Object.entries(REMINDER_THRESHOLDS)) {
    await upsertReminder("project", projectId, threshold, dueDate);
  }
}

/**
 * Core function: Upsert reminder và schedule job
 */
async function upsertReminder(
  entityType: "task" | "project",
  entityId: string,
  threshold: number,
  dueDate: Date
): Promise<void> {
  const fireAt = new Date(dueDate.getTime() - threshold * 60 * 1000);
  const now = new Date();

  // Nếu fireAt đã qua => bỏ qua (không gửi reminder cho quá khứ)
  if (fireAt < now) {
    console.log(
      `⏭️  Skipping ${entityType} ${entityId} threshold ${threshold}m (fireAt in past)`
    );
    return;
  }

  // Tìm reminder hiện tại
  const existingReminder = await prisma.reminderLog.findUnique({
    where: {
      entityType_entityId_threshold: {
        entityType,
        entityId,
        threshold,
      },
    },
  });

  // Nếu đã tồn tại và fireAt không đổi => không làm gì
  if (
    existingReminder &&
    existingReminder.fireAt.getTime() === fireAt.getTime()
  ) {
    console.log(
      `✓ Reminder ${existingReminder.id} already scheduled correctly`
    );
    return;
  }

  // Nếu đã tồn tại nhưng fireAt thay đổi => hủy job cũ
  if (existingReminder?.jobId) {
    try {
      const job = await reminderQueue.getJob(existingReminder.jobId);
      if (job) {
        await job.remove();
        console.log(`🗑️  Removed old job ${existingReminder.jobId}`);
      }
    } catch (error) {
      console.warn(
        `⚠️  Failed to remove job ${existingReminder.jobId}:`,
        error
      );
    }
  }

  // Tạo job mới với delay
  const delay = fireAt.getTime() - now.getTime();
  const jobData: ReminderJobData = {
    reminderId: existingReminder?.id || "", // Sẽ update sau
    entityType,
    entityId,
    threshold,
  };

  const job = await reminderQueue.add(
    `${entityType}-${entityId}-${threshold}`,
    jobData,
    {
      delay, // Delay tính bằng milliseconds
      jobId: `${entityType}-${entityId}-${threshold}-${Date.now()}`, // Unique job ID
    }
  );

  console.log(
    `📅 Scheduled job ${job.id} to fire at ${fireAt.toISOString()} (delay: ${Math.round(delay / 1000)}s)`
  );

  // Upsert reminder vào database
  const reminder = await prisma.reminderLog.upsert({
    where: {
      entityType_entityId_threshold: {
        entityType,
        entityId,
        threshold,
      },
    },
    create: {
      entityType,
      entityId,
      threshold,
      fireAt,
      jobId: job.id!,
      sentAt: null,
    },
    update: {
      fireAt,
      jobId: job.id!,
      sentAt: null, // Reset sentAt khi dueDate thay đổi
    },
  });

  // Update reminderId trong job data
  if (!existingReminder) {
    await job.updateData({
      ...jobData,
      reminderId: reminder.id,
    });
  }

  console.log(`✅ Reminder ${reminder.id} upserted successfully`);
}

/**
 * Xóa tất cả reminders khi Task/Project bị xóa hoặc hoàn thành
 */
export async function deleteReminders(
  entityType: "task" | "project",
  entityId: string
): Promise<void> {
  const reminders = await prisma.reminderLog.findMany({
    where: { entityType, entityId },
  });

  // Hủy tất cả jobs
  for (const reminder of reminders) {
    if (reminder.jobId) {
      try {
        const job = await reminderQueue.getJob(reminder.jobId);
        if (job) {
          await job.remove();
        }
      } catch (error) {
        console.warn(`⚠️  Failed to remove job ${reminder.jobId}:`, error);
      }
    }
  }

  // Xóa reminders khỏi DB
  await prisma.reminderLog.deleteMany({
    where: { entityType, entityId },
  });

  console.log(`🗑️  Deleted all reminders for ${entityType} ${entityId}`);
}

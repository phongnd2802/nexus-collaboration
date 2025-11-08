import cron, { ScheduledTask } from "node-cron";
import { PrismaClient } from "@prisma/client";
import { reminderQueue, ReminderJobData } from "../queues/reminderQueue";

const prisma = new PrismaClient();

// Drift để bù clock skew (milliseconds)
const DRIFT_MS = 5 * 60 * 1000; // 5 phút
const WINDOW_MS = 30 * 60 * 1000; // 30 phút

// Cleanup threshold: 25 giờ
const CLEANUP_THRESHOLD_MS = 25 * 60 * 60 * 1000; // 25 hours

/**
 * Cleanup thông minh: Xóa logs theo logic
 * 1. Đã gửi thành công và createdAt > 25h (để audit trail)
 * 2. Chưa gửi NHƯNG fireAt đã quá > 25h (missed reminder vô dụng)
 * 3. GIỮ LẠI logs pending có fireAt trong tương lai
 */
async function cleanupOldReminderLogs(): Promise<void> {
  const cutoffDate = new Date(Date.now() - CLEANUP_THRESHOLD_MS);
  const now = new Date();

  console.log(
    `\n🧹 [Cleanup] Removing old reminder logs (cutoff: ${cutoffDate.toISOString()})`
  );

  try {
    const result = await prisma.reminderLog.deleteMany({
      where: {
        OR: [
          {
            // Case 1: Đã gửi và createdAt cũ hơn 25h
            sentAt: {
              not: null,
            },
            createdAt: {
              lt: cutoffDate,
            },
          },
          {
            // Case 2: Chưa gửi NHƯNG fireAt đã quá > threshold (quá hạn vô dụng)
            sentAt: null,
            fireAt: {
              lt: cutoffDate,
            },
          },
        ],
      },
    });

    if (result.count > 0) {
      console.log(`✅ [Cleanup] Deleted ${result.count} old reminder logs`);
    } else {
      console.log(`✓ [Cleanup] No old logs to delete`);
    }

    // Log thống kê
    const remaining = await prisma.reminderLog.count();
    const pending = await prisma.reminderLog.count({
      where: { sentAt: null, fireAt: { gte: now } },
    });

    console.log(
      `📊 [Cleanup] Stats: ${remaining} total logs, ${pending} pending reminders\n`
    );
  } catch (error) {
    console.error(`❌ [Cleanup] Error:`, error);
  }
}

/**
 * Backfill: Quét DB tìm reminders bị lỡ và gửi ngay
 * Chạy mỗi 30 phút
 */
async function backfillMissedReminders(): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - WINDOW_MS - DRIFT_MS);
  const windowEnd = new Date(now.getTime() + DRIFT_MS);

  console.log(
    `\n🔍 [Backfill] Scanning for missed reminders (${windowStart.toISOString()} to ${windowEnd.toISOString()})`
  );

  try {
    // Tìm reminders chưa gửi và fireAt trong cửa sổ
    const missedReminders = await prisma.reminderLog.findMany({
      where: {
        sentAt: null,
        fireAt: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
    });

    if (missedReminders.length === 0) {
      console.log(`✓ [Backfill] No missed reminders found`);
      return;
    }

    console.log(
      `⚠️  [Backfill] Found ${missedReminders.length} missed reminders, enqueueing...`
    );

    for (const reminder of missedReminders) {
      // Enqueue job "send-now" với delay = 0
      const jobData: ReminderJobData = {
        reminderId: reminder.id,
        entityType: reminder.entityType as "task" | "project",
        entityId: reminder.entityId,
        threshold: reminder.threshold,
      };

      await reminderQueue.add(`backfill-${reminder.id}`, jobData, {
        delay: 0, // Gửi ngay
        priority: 10, // Priority cao hơn để ưu tiên xử lý
      });

      console.log(`📬 [Backfill] Enqueued reminder ${reminder.id}`);
    }

    console.log(`✅ [Backfill] Enqueued ${missedReminders.length} reminders\n`);
  } catch (error) {
    console.error(`❌ [Backfill] Error:`, error);
  }
}

// Chạy backfill mỗi 30 phút
let backfillTask: ScheduledTask | null = null;

export async function startBackfillCron(): Promise<void> {
  if (backfillTask) {
    console.log("⚠️  Backfill cron already running");
    return;
  }

  // Run cleanup immediately on server start
  console.log("🚀 [STARTUP] Running initial cleanup...");
  await cleanupOldReminderLogs();

  // Cron pattern: */30 * * * * = every 30 minutes
  backfillTask = cron.schedule("*/30 * * * *", async () => {
    console.log("⏰ [CRON] Running scheduled tasks...");

    // 1. Backfill missed reminders
    await backfillMissedReminders();

    // 2. Cleanup old reminder logs
    await cleanupOldReminderLogs();
  });

  console.log("⏰ Backfill cron started:");
  console.log("   - Checking missed reminders every 30 minutes");
  console.log("   - Cleaning up old logs (>25h) every 30 minutes");
}

export function stopBackfillCron(): void {
  if (backfillTask) {
    backfillTask.stop();
    backfillTask = null;
    console.log("⏹️  Backfill cron stopped");
  }
}

// Export manual triggers
export { backfillMissedReminders, cleanupOldReminderLogs };

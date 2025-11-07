import cron, { ScheduledTask } from "node-cron";
import {
  runAllReminders,
  cleanupReminderCache,
} from "../services/reminderService";

let reminderTask: ScheduledTask | null = null;
let cleanupTask: ScheduledTask | null = null;

/**
 * Khởi động scheduler để tự động gửi email nhắc nhở
 * Chạy mỗi 30 phút để kiểm tra tasks/projects sắp hết hạn
 */
export function startReminderScheduler(): void {
  if (reminderTask) {
    console.log("⚠️  Reminder scheduler is already running");
    return;
  }

  // Chạy reminder check mỗi 30 phút
  // Cron format: */30 * * * * = every 30 minutes
  reminderTask = cron.schedule("*/30 * * * *", async () => {
    console.log("⏰ [CRON] Running scheduled reminder check...");
    try {
      await runAllReminders();
    } catch (error) {
      console.error("❌ [CRON] Error in scheduled reminder check:", error);
    }
  });

  // Cleanup cache mỗi ngày lúc 3:00 AM
  // Cron format: 0 3 * * * = at 03:00 every day
  cleanupTask = cron.schedule("0 3 * * *", () => {
    console.log("🧹 [CRON] Running scheduled cache cleanup...");
    try {
      cleanupReminderCache();
    } catch (error) {
      console.error("❌ [CRON] Error in scheduled cache cleanup:", error);
    }
  });

  console.log("⏰ Reminder scheduler started - checking every 30 minutes");
  console.log("🧹 Cache cleanup scheduled daily at 03:00 AM");
}

/**
 * Dừng scheduler
 */
export function stopReminderScheduler(): void {
  if (reminderTask) {
    reminderTask.stop();
    reminderTask = null;
    console.log("⏹️  Reminder scheduler stopped");
  }

  if (cleanupTask) {
    cleanupTask.stop();
    cleanupTask = null;
    console.log("⏹️  Cleanup scheduler stopped");
  }
}

/**
 * Kiểm tra xem scheduler có đang chạy không
 */
export function isSchedulerRunning(): boolean {
  return reminderTask !== null;
}

/**
 * Chạy reminder ngay lập tức (manual trigger)
 */
export async function triggerReminderNow(): Promise<void> {
  console.log("🔔 [MANUAL] Triggering reminder check now...");
  try {
    await runAllReminders();
    console.log("✅ [MANUAL] Manual reminder check completed");
  } catch (error) {
    console.error("❌ [MANUAL] Error in manual reminder check:", error);
    throw error;
  }
}

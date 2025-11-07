import cron, { ScheduledTask } from "node-cron";
import {
  runAllReminders,
  cleanupReminderCache,
} from "../services/reminderService";

let reminderTask: ScheduledTask | null = null;

/**
 * Khởi động scheduler để tự động gửi email nhắc nhở và cleanup
 * Chạy mỗi 30 phút để:
 * 1. Kiểm tra và gửi reminder cho tasks/projects sắp hết hạn
 * 2. Xóa các reminder logs đã quá hạn (> 25 giờ)
 */
export function startReminderScheduler(): void {
  if (reminderTask) {
    console.log("⚠️  Reminder scheduler is already running");
    return;
  }

  // Chạy reminder check + cleanup mỗi 30 phút
  // Cron format: */30 * * * * = every 30 minutes
  reminderTask = cron.schedule("*/30 * * * * *", async () => {
    console.log("⏰ [CRON] Running scheduled tasks...");
    try {
      // 1. Gửi reminder emails
      await runAllReminders();

      // 2. Cleanup expired reminder logs
      await cleanupReminderCache();
    } catch (error) {
      console.error("❌ [CRON] Error in scheduled tasks:", error);
    }
  });

  console.log("⏰ Reminder scheduler started:");
  console.log("   - Checking reminders every 30 minutes");
  console.log("   - Cleaning up expired logs every 30 minutes");
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
}

/**
 * Kiểm tra xem scheduler có đang chạy không
 */
export function isSchedulerRunning(): boolean {
  return reminderTask !== null;
}

/**
 * Chạy reminder + cleanup ngay lập tức (manual trigger)
 */
export async function triggerReminderNow(): Promise<void> {
  console.log("🔔 [MANUAL] Triggering reminder check and cleanup now...");
  try {
    await runAllReminders();
    await cleanupReminderCache();
    console.log("✅ [MANUAL] Manual tasks completed");
  } catch (error) {
    console.error("❌ [MANUAL] Error in manual tasks:", error);
    throw error;
  }
}

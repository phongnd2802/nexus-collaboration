import { Queue, QueueOptions } from "bullmq";
import { redisConnection } from "../config/redis";

export interface ReminderJobData {
  reminderId: string; // ID của ReminderLog
  entityType: "task" | "project";
  entityId: string;
  threshold: number; // Phút
}

const queueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: true, // Tự động xóa job sau khi hoàn thành
    removeOnFail: {
      age: 24 * 3600, // Giữ failed jobs trong 24h để debug
    },
    attempts: 3, // Retry 3 lần nếu gửi lỗi
    backoff: {
      type: "exponential",
      delay: 2000, // Bắt đầu với 2s, tăng theo cấp số nhân
    },
  },
};

// Queue cho reminder jobs
export const reminderQueue = new Queue<ReminderJobData>(
  "reminder-notifications",
  queueOptions
);

console.log("📬 Reminder queue initialized");

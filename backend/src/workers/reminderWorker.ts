import { Worker, Job } from "bullmq";
import { redisConnection } from "../config/redis";
import { ReminderJobData } from "../queues/reminderQueue";
import { PrismaClient } from "@prisma/client";
import {
  sendTaskDueReminderEmail,
  sendProjectDueReminderEmail,
} from "../utils/email";

const prisma = new PrismaClient();

/**
 * Worker xử lý reminder jobs
 * Sử dụng UPDATE với WHERE sentAt IS NULL để đảm bảo idempotency
 */
async function processReminderJob(job: Job<ReminderJobData>): Promise<void> {
  const { reminderId, entityType, entityId, threshold } = job.data;

  try {
    // BƯỚC 1: Cố gắng "claim" reminder bằng cách set sentAt
    // Chỉ worker đầu tiên update thành công mới được gửi email
    const updateResult = await prisma.$executeRaw`
      UPDATE "ReminderLog"
      SET "sentAt" = NOW()
      WHERE "id" = ${reminderId}
        AND "sentAt" IS NULL
    `;

    // Nếu count == 0 => reminder đã được gửi bởi worker/backfill khác
    if (updateResult === 0) {
      return;
    }

    // BƯỚC 2: Update thành công => Worker này được quyền gửi email

    // Lấy thông tin entity để gửi email
    if (entityType === "task") {
      await sendTaskReminder(entityId, threshold);
    } else if (entityType === "project") {
      await sendProjectReminder(entityId, threshold);
    }

  } catch (error) {
    console.error(
      `[Worker] Error processing reminder ${reminderId}:`,
      error
    );
    // Throw để BullMQ retry
    throw error;
  }
}

/**
 * Gửi reminder cho Task
 */
async function sendTaskReminder(
  taskId: string,
  threshold: number
): Promise<void> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      assignee: {
        select: { email: true, name: true },
      },
      project: {
        select: { name: true },
      },
    },
  });

  if (!task || !task.assignee?.email || !task.dueDate) {
    console.warn(`Task ${taskId} not found or missing required fields`);
    return;
  }

  // Convert threshold (phút) sang hours cho email template
  const hours = threshold / 60;

  await sendTaskDueReminderEmail(
    task.assignee.email,
    task.title,
    task.id,
    task.project?.name || "Unknown Project",
    task.dueDate,
    hours
  );
}

/**
 * Gửi reminder cho Project
 */
async function sendProjectReminder(
  projectId: string,
  threshold: number
): Promise<void> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: {
            select: { email: true, name: true },
          },
        },
      },
    },
  });

  if (!project || !project.dueDate) {
    console.warn(`Project ${projectId} not found or missing dueDate`);
    return;
  }

  // Gửi email cho tất cả members
  const hours = threshold / 60;
  const emailPromises = project.members.map(async (member) => {
    if (!member.user.email) return;

    await sendProjectDueReminderEmail(
      member.user.email,
      project.name,
      project.id,
      project.dueDate!,
      hours
    );
  });

  await Promise.allSettled(emailPromises);
}

// Tạo worker
export const reminderWorker = new Worker<ReminderJobData>(
  "reminder-notifications",
  processReminderJob,
  {
    connection: redisConnection,
    concurrency: 5, // Xử lý 5 jobs đồng thời
  }
);

// Event listeners
reminderWorker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

reminderWorker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});


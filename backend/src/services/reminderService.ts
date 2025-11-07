import { PrismaClient } from "@prisma/client";
import {
  sendTaskDueReminderEmail,
  sendProjectDueReminderEmail,
} from "../utils/email";

const prisma = new PrismaClient();

/**
 * Kiểm tra xem reminder đã được gửi chưa (từ database)
 */
async function hasReminderBeenSent(
  entityType: "task" | "project",
  entityId: string,
  reminderType: string
): Promise<boolean> {
  const existing = await prisma.reminderLog.findUnique({
    where: {
      entityType_entityId_reminderType: {
        entityType,
        entityId,
        reminderType,
      },
    },
  });

  return existing !== null;
}

/**
 * Lưu log reminder đã gửi vào database
 * expiresAt = sentAt + 25 giờ (để tự động cleanup)
 */
async function markReminderAsSent(
  entityType: "task" | "project",
  entityId: string,
  reminderType: string
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 25 * 60 * 60 * 1000); // +25 giờ

  await prisma.reminderLog.create({
    data: {
      entityType,
      entityId,
      reminderType,
      sentAt: now,
      expiresAt,
    },
  });
}

export async function checkAndSendTaskReminders(): Promise<void> {
  try {
    const now = new Date();

    // Lấy tất cả tasks chưa hoàn thành và có dueDate
    const tasks = await prisma.task.findMany({
      where: {
        status: {
          not: "DONE",
        },
        dueDate: {
          not: null,
        },
      },
      include: {
        assignee: {
          select: {
            email: true,
            name: true,
          },
        },
        project: {
          select: {
            name: true,
          },
        },
      },
    });

    for (const task of tasks) {
      if (!task.dueDate || !task.assignee?.email) continue;

      const dueDate = new Date(task.dueDate);
      const minutesUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60);
      const hoursUntilDue = minutesUntilDue / 60;

      // Kiểm tra các mốc thời gian chính xác
      const tolerance = 1 / 60; // ±1 phút

      if (hoursUntilDue > 24) {
        // Chưa đến thời điểm gửi
        continue;
      } else if (Math.abs(hoursUntilDue - 24) <= tolerance) {
        // due = 24h ± 1p: gửi reminder 24h
        if (!(await hasReminderBeenSent("task", task.id, "24h"))) {
          try {
            await sendTaskDueReminderEmail(
              task.assignee.email,
              task.title,
              task.id,
              task.project?.name || "Unknown Project",
              dueDate,
              24
            );

            await markReminderAsSent("task", task.id, "24h");
            console.log(
              `✅ Sent 24h reminder for task: ${task.title} to ${task.assignee.email}`
            );
          } catch (error) {
            console.error(
              `❌ Failed to send 24h reminder for task ${task.id}:`,
              error
            );
          }
        }
      } else if (Math.abs(hoursUntilDue - 3) <= tolerance) {
        // due = 3h ± 1p: gửi reminder 3h
        if (!(await hasReminderBeenSent("task", task.id, "3h"))) {
          try {
            await sendTaskDueReminderEmail(
              task.assignee.email,
              task.title,
              task.id,
              task.project?.name || "Unknown Project",
              dueDate,
              3
            );

            await markReminderAsSent("task", task.id, "3h");
            console.log(
              `✅ Sent 3h reminder for task: ${task.title} to ${task.assignee.email}`
            );
          } catch (error) {
            console.error(
              `❌ Failed to send 3h reminder for task ${task.id}:`,
              error
            );
          }
        }
      } else if (Math.abs(hoursUntilDue - 1) <= tolerance) {
        // due = 1h ± 1p: gửi reminder 1h
        if (!(await hasReminderBeenSent("task", task.id, "1h"))) {
          try {
            await sendTaskDueReminderEmail(
              task.assignee.email,
              task.title,
              task.id,
              task.project?.name || "Unknown Project",
              dueDate,
              1
            );

            await markReminderAsSent("task", task.id, "1h");
            console.log(
              `✅ Sent 1h reminder for task: ${task.title} to ${task.assignee.email}`
            );
          } catch (error) {
            console.error(
              `❌ Failed to send 1h reminder for task ${task.id}:`,
              error
            );
          }
        }
      } else if (hoursUntilDue > 0 && hoursUntilDue < 1 - tolerance) {
        // 0 < due < 1h: gửi reminder urgent
        if (!(await hasReminderBeenSent("task", task.id, "urgent"))) {
          try {
            await sendTaskDueReminderEmail(
              task.assignee.email,
              task.title,
              task.id,
              task.project?.name || "Unknown Project",
              dueDate,
              0 // Gửi với hours = 0 để đánh dấu là urgent
            );

            await markReminderAsSent("task", task.id, "urgent");
            console.log(
              `✅ Sent urgent reminder for task: ${task.title} to ${task.assignee.email} (${Math.round(minutesUntilDue)} minutes left)`
            );
          } catch (error) {
            console.error(
              `❌ Failed to send urgent reminder for task ${task.id}:`,
              error
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error in checkAndSendTaskReminders:", error);
  }
}

export async function checkAndSendProjectReminders(): Promise<void> {
  try {
    const now = new Date();

    // Lấy tất cả projects chưa hoàn thành và có dueDate
    const projects = await prisma.project.findMany({
      where: {
        status: {
          not: "COMPLETED",
        },
        dueDate: {
          not: null,
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    for (const project of projects) {
      if (!project.dueDate) continue;

      const dueDate = new Date(project.dueDate);
      const minutesUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60);
      const hoursUntilDue = minutesUntilDue / 60;

      // Kiểm tra các mốc thời gian chính xác
      const tolerance = 1 / 60; // ±1 phút

      if (hoursUntilDue > 24) {
        // Chưa đến thời điểm gửi
        continue;
      } else if (Math.abs(hoursUntilDue - 24) <= tolerance) {
        // due = 24h ± 1p: gửi reminder 24h
        if (!(await hasReminderBeenSent("project", project.id, "24h"))) {
          const emailPromises = project.members.map(async (member) => {
            if (!member.user.email) return;

            try {
              await sendProjectDueReminderEmail(
                member.user.email,
                project.name,
                project.id,
                dueDate,
                24
              );
              console.log(
                `✅ Sent 24h reminder for project: ${project.name} to ${member.user.email}`
              );
            } catch (error) {
              console.error(
                `❌ Failed to send 24h reminder for project ${project.id} to ${member.user.email}:`,
                error
              );
            }
          });

          await Promise.allSettled(emailPromises);
          await markReminderAsSent("project", project.id, "24h");
        }
      } else if (Math.abs(hoursUntilDue - 3) <= tolerance) {
        // due = 3h ± 1p: gửi reminder 3h
        if (!(await hasReminderBeenSent("project", project.id, "3h"))) {
          const emailPromises = project.members.map(async (member) => {
            if (!member.user.email) return;

            try {
              await sendProjectDueReminderEmail(
                member.user.email,
                project.name,
                project.id,
                dueDate,
                3
              );
              console.log(
                `✅ Sent 3h reminder for project: ${project.name} to ${member.user.email}`
              );
            } catch (error) {
              console.error(
                `❌ Failed to send 3h reminder for project ${project.id} to ${member.user.email}:`,
                error
              );
            }
          });

          await Promise.allSettled(emailPromises);
          await markReminderAsSent("project", project.id, "3h");
        }
      } else if (Math.abs(hoursUntilDue - 1) <= tolerance) {
        // due = 1h ± 1p: gửi reminder 1h
        if (!(await hasReminderBeenSent("project", project.id, "1h"))) {
          const emailPromises = project.members.map(async (member) => {
            if (!member.user.email) return;

            try {
              await sendProjectDueReminderEmail(
                member.user.email,
                project.name,
                project.id,
                dueDate,
                1
              );
              console.log(
                `✅ Sent 1h reminder for project: ${project.name} to ${member.user.email}`
              );
            } catch (error) {
              console.error(
                `❌ Failed to send 1h reminder for project ${project.id} to ${member.user.email}:`,
                error
              );
            }
          });

          await Promise.allSettled(emailPromises);
          await markReminderAsSent("project", project.id, "1h");
        }
      } else if (hoursUntilDue > 0 && hoursUntilDue < 1 - tolerance) {
        // 0 < due < 1h: gửi reminder urgent
        if (!(await hasReminderBeenSent("project", project.id, "urgent"))) {
          const emailPromises = project.members.map(async (member) => {
            if (!member.user.email) return;

            try {
              await sendProjectDueReminderEmail(
                member.user.email,
                project.name,
                project.id,
                dueDate,
                0 // Gửi với hours = 0 để đánh dấu là urgent
              );
              console.log(
                `✅ Sent urgent reminder for project: ${project.name} to ${member.user.email} (${Math.round(minutesUntilDue)} minutes left)`
              );
            } catch (error) {
              console.error(
                `❌ Failed to send urgent reminder for project ${project.id} to ${member.user.email}:`,
                error
              );
            }
          });

          await Promise.allSettled(emailPromises);
          await markReminderAsSent("project", project.id, "urgent");
        }
      }
    }
  } catch (error) {
    console.error("Error in checkAndSendProjectReminders:", error);
  }
}

export async function runAllReminders(): Promise<void> {
  console.log("🔔 Running reminder checks...");
  await checkAndSendTaskReminders();
  await checkAndSendProjectReminders();
  console.log("✅ Reminder checks completed");
}

/**
 * Tự động xóa các reminder logs đã hết hạn (expiresAt < now)
 * Chạy mỗi ngày để giữ database sạch sẽ
 */
export async function cleanupReminderCache(): Promise<void> {
  try {
    const now = new Date();

    // Xóa tất cả reminder logs đã hết hạn (> 25 giờ)
    const result = await prisma.reminderLog.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    console.log(
      `🧹 Reminder cache cleaned up - deleted ${result.count} expired logs`
    );
  } catch (error) {
    console.error("❌ Error cleaning up reminder cache:", error);
  }
}

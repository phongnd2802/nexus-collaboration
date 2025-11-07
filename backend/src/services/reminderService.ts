import { PrismaClient } from "@prisma/client";
import {
  sendTaskDueReminderEmail,
  sendProjectDueReminderEmail,
} from "../utils/email";

const prisma = new PrismaClient();

// Map để lưu cache các reminder đã gửi
// Key: "task_123_24h" hoặc "project_456_3h"
// Value: timestamp khi gửi
const sentReminders = new Map<string, number>();

function getReminderKey(type: "task" | "project", id: string | number): string {
  return `${type}_${id}`;
}

function hasReminderBeenSent(key: string, hours: number): boolean {
  return sentReminders.has(`${key}_${hours}h`);
}

function markReminderAsSent(key: string, hours: number): void {
  sentReminders.set(`${key}_${hours}h`, Date.now());
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

      const key = getReminderKey("task", task.id);

      // Kiểm tra các mốc thời gian chính xác
      const tolerance = 1 / 60; // ±1 phút

      if (hoursUntilDue > 24) {
        // Chưa đến thời điểm gửi
        continue;
      } else if (Math.abs(hoursUntilDue - 24) <= tolerance) {
        // due = 24h ± 1p: gửi reminder 24h
        if (!hasReminderBeenSent(key, 24)) {
          try {
            await sendTaskDueReminderEmail(
              task.assignee.email,
              task.title,
              task.id,
              task.project?.name || "Unknown Project",
              dueDate,
              24
            );

            markReminderAsSent(key, 24);
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
        if (!hasReminderBeenSent(key, 3)) {
          try {
            await sendTaskDueReminderEmail(
              task.assignee.email,
              task.title,
              task.id,
              task.project?.name || "Unknown Project",
              dueDate,
              3
            );

            markReminderAsSent(key, 3);
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
        if (!hasReminderBeenSent(key, 1)) {
          try {
            await sendTaskDueReminderEmail(
              task.assignee.email,
              task.title,
              task.id,
              task.project?.name || "Unknown Project",
              dueDate,
              1
            );

            markReminderAsSent(key, 1);
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
        if (!hasReminderBeenSent(key, 0)) {
          try {
            await sendTaskDueReminderEmail(
              task.assignee.email,
              task.title,
              task.id,
              task.project?.name || "Unknown Project",
              dueDate,
              0 // Gửi với hours = 0 để đánh dấu là urgent
            );

            markReminderAsSent(key, 0);
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

      const key = getReminderKey("project", project.id);

      // Kiểm tra các mốc thời gian chính xác
      const tolerance = 1 / 60; // ±1 phút

      if (hoursUntilDue > 24) {
        // Chưa đến thời điểm gửi
        continue;
      } else if (Math.abs(hoursUntilDue - 24) <= tolerance) {
        // due = 24h ± 1p: gửi reminder 24h
        if (!hasReminderBeenSent(key, 24)) {
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
          markReminderAsSent(key, 24);
        }
      } else if (Math.abs(hoursUntilDue - 3) <= tolerance) {
        // due = 3h ± 1p: gửi reminder 3h
        if (!hasReminderBeenSent(key, 3)) {
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
          markReminderAsSent(key, 3);
        }
      } else if (Math.abs(hoursUntilDue - 1) <= tolerance) {
        // due = 1h ± 1p: gửi reminder 1h
        if (!hasReminderBeenSent(key, 1)) {
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
          markReminderAsSent(key, 1);
        }
      } else if (hoursUntilDue > 0 && hoursUntilDue < 1 - tolerance) {
        // 0 < due < 1h: gửi reminder urgent
        if (!hasReminderBeenSent(key, 0)) {
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
          markReminderAsSent(key, 0);
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

// Cleanup cache mỗi ngày để tránh memory leak
export function cleanupReminderCache(): void {
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

  for (const [key, timestamp] of sentReminders.entries()) {
    if (timestamp < oneDayAgo) {
      sentReminders.delete(key);
    }
  }

  console.log("🧹 Reminder cache cleaned up");
}

/**
 * Test script để kiểm tra reminder system
 * Chạy: npx ts-node src/test-reminder.ts
 */

import { PrismaClient } from "@prisma/client";
import { runAllReminders } from "./services/reminderService";

const prisma = new PrismaClient();

async function testReminders() {
  console.log("🧪 Testing reminder system...\n");

  try {
    // Kiểm tra tasks và projects sắp hết hạn
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    console.log("📊 Checking database for upcoming deadlines...\n");

    const upcomingTasks = await prisma.task.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: next24Hours,
        },
        status: {
          not: "DONE",
        },
      },
      include: {
        assignee: true,
        creator: true,
        project: true,
      },
    });

    const upcomingProjects = await prisma.project.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: next24Hours,
        },
        status: {
          not: "COMPLETED",
        },
      },
      include: {
        creator: true,
      },
    });

    console.log(
      `📋 Found ${upcomingTasks.length} tasks with upcoming deadlines:`
    );
    upcomingTasks.forEach((task) => {
      if (task.dueDate) {
        const hoursUntil =
          (new Date(task.dueDate).getTime() - now.getTime()) / (1000 * 60 * 60);
        console.log(
          `  - Task #${task.id}: "${task.title}" (Due in ${hoursUntil.toFixed(2)} hours)`
        );
      }
    });

    console.log(
      `\n📁 Found ${upcomingProjects.length} projects with upcoming deadlines:`
    );
    upcomingProjects.forEach((project) => {
      if (project.dueDate) {
        const hoursUntil =
          (new Date(project.dueDate).getTime() - now.getTime()) /
          (1000 * 60 * 60);
        console.log(
          `  - Project #${project.id}: "${project.name}" (Due in ${hoursUntil.toFixed(2)} hours)`
        );
      }
    });

    console.log("\n🔔 Running reminder checks...\n");
    await runAllReminders();

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }

  process.exit(0);
}

testReminders();

import { Router } from "express";
import {
  cleanupOldReminderLogs,
  backfillMissedReminders,
} from "../services/reminderBackfill";
import { PrismaClient } from "@prisma/client";

const router = Router();
const prisma = new PrismaClient();

/**
 * Test endpoint để trigger cleanup manually
 * GET /api/test/cleanup-reminders
 */
router.get("/cleanup-reminders", async (req, res) => {
  try {
    console.log("\n🧪 [TEST] Manual cleanup triggered via API");

    // Count before cleanup
    const beforeCount = await prisma.reminderLog.count();
    const beforeSent = await prisma.reminderLog.count({
      where: { sentAt: { not: null } },
    });
    const beforePending = await prisma.reminderLog.count({
      where: { sentAt: null },
    });

    // Run cleanup
    await cleanupOldReminderLogs();

    // Count after cleanup
    const afterCount = await prisma.reminderLog.count();
    const afterSent = await prisma.reminderLog.count({
      where: { sentAt: { not: null } },
    });
    const afterPending = await prisma.reminderLog.count({
      where: { sentAt: null },
    });

    const deleted = beforeCount - afterCount;

    res.json({
      success: true,
      before: {
        total: beforeCount,
        sent: beforeSent,
        pending: beforePending,
      },
      after: {
        total: afterCount,
        sent: afterSent,
        pending: afterPending,
      },
      deleted: deleted,
      message: `Cleanup completed. Deleted ${deleted} old logs.`,
    });
  } catch (error) {
    console.error("❌ [TEST] Cleanup error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Test endpoint để xem logs sẽ bị xóa (preview)
 * GET /api/test/preview-cleanup
 */
router.get("/preview-cleanup", async (req, res) => {
  try {
    const cutoffDate = new Date(Date.now() - 25 * 60 * 60 * 1000);

    // Logs sẽ bị xóa
    const toDelete = await prisma.reminderLog.findMany({
      where: {
        OR: [
          {
            sentAt: {
              not: null,
              lt: cutoffDate,
            },
          },
          {
            sentAt: null,
            fireAt: {
              lt: cutoffDate,
            },
          },
        ],
      },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        threshold: true,
        fireAt: true,
        sentAt: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Logs sẽ được giữ lại
    const toKeep = await prisma.reminderLog.findMany({
      where: {
        AND: [
          {
            OR: [{ sentAt: null }, { sentAt: { gte: cutoffDate } }],
          },
          {
            OR: [{ sentAt: { not: null } }, { fireAt: { gte: cutoffDate } }],
          },
        ],
      },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        threshold: true,
        fireAt: true,
        sentAt: true,
        createdAt: true,
      },
      orderBy: {
        fireAt: "asc",
      },
    });

    res.json({
      cutoffDate: cutoffDate.toISOString(),
      toDelete: {
        count: toDelete.length,
        logs: toDelete,
      },
      toKeep: {
        count: toKeep.length,
        logs: toKeep.slice(0, 10), // Chỉ show 10 đầu tiên
      },
      summary: {
        willDelete: toDelete.length,
        willKeep: toKeep.length,
        total: toDelete.length + toKeep.length,
      },
    });
  } catch (error) {
    console.error("❌ [TEST] Preview error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Test endpoint để tạo fake old logs
 * POST /api/test/create-old-logs
 */
router.post("/create-old-logs", async (req, res) => {
  try {
    const { count = 5 } = req.body;

    const oldDate = new Date(Date.now() - 26 * 60 * 60 * 1000); // 26h ago
    const logs = [];

    for (let i = 0; i < count; i++) {
      const log = await prisma.reminderLog.create({
        data: {
          entityType: "task",
          entityId: `test-task-${i}`,
          threshold: 60,
          fireAt: oldDate,
          sentAt: i % 2 === 0 ? oldDate : null, // 50% sent, 50% not sent
          createdAt: oldDate,
        },
      });
      logs.push(log);
    }

    res.json({
      success: true,
      created: logs.length,
      message: `Created ${logs.length} test logs (26 hours old)`,
      logs: logs.map((l) => ({
        id: l.id,
        sentAt: l.sentAt,
        createdAt: l.createdAt,
      })),
    });
  } catch (error) {
    console.error("❌ [TEST] Create logs error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Test endpoint để trigger backfill
 * GET /api/test/backfill-reminders
 */
router.get("/backfill-reminders", async (req, res) => {
  try {
    console.log("\n🧪 [TEST] Manual backfill triggered via API");
    await backfillMissedReminders();

    res.json({
      success: true,
      message: "Backfill completed. Check server logs for details.",
    });
  } catch (error) {
    console.error("❌ [TEST] Backfill error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;

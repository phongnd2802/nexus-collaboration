import { Request, Response } from "express";
import { prisma } from "../index"; // Adjust path if needed
import { PdfService } from "../services/pdfService";
import { canViewTask } from "../utils/permissions";

export const exportTaskPdf = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { taskId } = req.params;
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    if (!(await canViewTask(taskId, userId))) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        assignee: true,
        creator: true,
        subtasks: true,
        project: true,
        sourceLinks: {
          include: {
            targetTask: true,
          },
        },
        targetLinks: {
          include: {
            sourceTask: true,
          },
        },
      },
    });

    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const pdfBuffer = await PdfService.generateTaskPdf(task);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Task-${task.id}-Export.pdf"`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error exporting PDF:", error);
    res.status(500).json({ message: "Failed to export PDF" });
  }
};

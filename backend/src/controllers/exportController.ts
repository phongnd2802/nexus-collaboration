import { Request, Response } from "express";
import { prisma } from "../index"; // Adjust path if needed
import { PdfService } from "../services/pdfService";
import { canViewTask } from "../utils/permissions";
import { canViewProject } from "../utils/permissions"; // Assuming this exists or using generic permission check

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
        subtasks: {
          include: {
            assignee: true,
          },
        },
        project: true,
        sourceLinks: {
          include: {
            targetTask: {
              include: {
                assignee: true,
              },
            },
          },
        },
        targetLinks: {
          include: {
            sourceTask: {
              include: {
                assignee: true,
              },
            },
          },
        },
      },
    });

    if (!task) {
      res.status(404).json({ message: "Task not found" });
      return;
    }

    const lang = (req.query.lang as string) || "en";
    const pdfBuffer = await PdfService.generateTaskPdf(task, lang);

    const filename = `${task.title}_${task.project.name}.pdf`;
    const encodedFilename = encodeURIComponent(filename);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="export.pdf"; filename*=UTF-8''${encodedFilename}`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error exporting PDF:", error);
    res.status(500).json({ message: "Failed to export PDF" });
  }
};

export const exportProjectPdf = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectId } = req.params;
    const { filter } = req.query; // 'assignee' or 'creator'
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const whereClause: any = { projectId };
    if (filter === "assignee") {
      whereClause.assigneeId = userId;
    } else if (filter === "creator") {
      whereClause.creatorId = userId;
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: {
        dueDate: "asc",
      },
      include: {
        assignee: true,
        creator: true,
        subtasks: {
          include: {
            assignee: true,
          },
        },
        project: true,
        sourceLinks: {
          include: {
            targetTask: {
              include: {
                assignee: true,
              },
            },
          },
        },
        targetLinks: {
          include: {
            sourceTask: {
              include: {
                assignee: true,
              },
            },
          },
        },
      },
    });

    if (!tasks || tasks.length === 0) {
      // Return clear message if no tasks found for filter
      res
        .status(404)
        .json({ message: "No tasks found for this export criteria." });
      return;
    }

    // We need project name for filename
    const projectName = tasks[0].project.name;
    const lang = (req.query.lang as string) || "en";

    const pdfBuffer = await PdfService.generateProjectPdf(tasks, lang);

    const filename = `Project-${projectName}-Export.pdf`;
    const encodedFilename = encodeURIComponent(filename);
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="export.pdf"; filename*=UTF-8''${encodedFilename}`,
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error exporting Project PDF:", error);
    res.status(500).json({ message: "Failed to export Project PDF" });
  }
};

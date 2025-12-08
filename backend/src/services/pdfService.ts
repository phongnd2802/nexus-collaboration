import PDFDocument from "pdfkit";
import {
  Task,
  User,
  Subtask,
  TaskLink,
  Project,
  TaskStatus,
  TaskPriority,
} from "@prisma/client";
import { DateTime } from "luxon";

interface TaskWithDetails extends Task {
  assignee: User | null;
  creator: User;
  subtasks: Subtask[];
  sourceLinks: (TaskLink & { targetTask: Task })[];
  targetLinks: (TaskLink & { sourceTask: Task })[];
  project: Project;
}

export class PdfService {
  static async generateTaskPdf(task: TaskWithDetails): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // --- Header ---
      doc.fontSize(20).text("Nexus Collaboration", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(16).text("Task Export", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fillColor("grey")
        .text(
          `Generated on: ${DateTime.now().toLocaleString(DateTime.DATETIME_MED)}`,
          { align: "center" }
        )
        .fillColor("black");
      doc.moveDown(2);

      // --- Section 1: Task Information ---
      doc.fontSize(14).text("1. Task Information", { underline: true });
      doc.moveDown(0.5);

      const infoX = 50;
      let infoY = doc.y;
      const labelWidth = 100;

      const drawField = (label: string, value: string, link?: string) => {
        doc
          .fontSize(10)
          .font("Helvetica-Bold")
          .text(label + ":", infoX, infoY, { width: labelWidth });
        doc.font("Helvetica");
        if (link) {
          doc
            .fillColor("blue")
            .text(value, infoX + labelWidth, infoY, { link, underline: true })
            .fillColor("black");
        } else {
          doc.text(value, infoX + labelWidth, infoY);
        }
        infoY += 15;
      };

      drawField("Task ID", task.id);
      drawField("Title", task.title);
      drawField("Description", task.description || "No description provided");
      drawField(
        "Link",
        "Click to view task",
        `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/projects/${task.projectId}?taskId=${task.id}`
      ); // Adjust URL based on actual route
      drawField("Status", task.status);
      drawField("Priority", task.priority);
      drawField("Assignee", task.assignee?.name || "Unassigned");
      drawField("Creator", task.creator.name || "Unknown");
      drawField(
        "Created Date",
        DateTime.fromJSDate(task.createdAt).toLocaleString(DateTime.DATE_MED)
      );
      drawField(
        "Due Date",
        task.dueDate
          ? DateTime.fromJSDate(task.dueDate).toLocaleString(DateTime.DATE_MED)
          : "No due date"
      );

      doc.moveDown(2);
      infoY = doc.y; // Update Y for next section

      // --- Section 2: Subtasks ---
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("2. Subtasks", 50, infoY, { underline: true });
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(10);

      if (task.subtasks.length === 0) {
        doc.text("No subtasks.");
      } else {
        task.subtasks.forEach(subtask => {
          const statusMark = subtask.status === "DONE" ? "[x]" : "[ ]";
          doc.text(`${statusMark} ${subtask.name} (${subtask.status})`);
        });
      }

      doc.moveDown(2);

      // --- Section 3: Linked Tasks ---
      doc
        .fontSize(14)
        .font("Helvetica-Bold")
        .text("3. Linked Tasks", { underline: true });
      doc.moveDown(0.5);
      doc.font("Helvetica").fontSize(10);

      const links = [
        ...task.sourceLinks.map(l => ({ type: "Blocks", task: l.targetTask })),
        ...task.targetLinks.map(l => ({
          type: "Blocked By",
          task: l.sourceTask,
        })),
      ];

      if (links.length === 0) {
        doc.text("No linked tasks.");
      } else {
        links.forEach(link => {
          doc.text(`${link.type}: ${link.task.title} (${link.task.status})`);
        });
      }

      // --- Footer ---
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .text(`Page ${i + 1} of ${pages.count}`, 50, doc.page.height - 50, {
            align: "center",
            width: doc.page.width - 100,
          });
      }

      doc.end();
    });
  }
}

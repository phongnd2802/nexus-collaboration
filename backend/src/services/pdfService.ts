import PDFDocument from "pdfkit";
import { Task, User, Subtask, TaskLink, Project } from "@prisma/client";
import { DateTime } from "luxon";
import path from "path";
import fs from "fs";
import { ensureFontsLoaded } from "../utils/fontLoader";

interface TaskWithDetails extends Task {
  assignee: User | null;
  creator: User;
  subtasks: (Subtask & { assignee: User | null })[];
  sourceLinks: (TaskLink & { targetTask: Task & { assignee: User | null } })[];
  targetLinks: (TaskLink & { sourceTask: Task & { assignee: User | null } })[];
  project: Project;
}

export class PdfService {
  static async generateTaskPdf(
    task: TaskWithDetails,
    lang: string = "en"
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        // Load fonts that support Vietnamese
        const fonts = await ensureFontsLoaded();
        
        const doc = new PDFDocument({ 
          margin: 40, 
          bufferPages: true
        });
        
        // Register custom fonts
        doc.registerFont('NotoSans', fonts.regular);
        doc.registerFont('NotoSans-Bold', fonts.bold);
        
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", reject);

        this.drawTaskContent(doc, task, lang);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  static async generateProjectPdf(
    tasks: TaskWithDetails[],
    lang: string = "en"
  ): Promise<Buffer> {
    return new Promise(async (resolve, reject) => {
      try {
        // Load fonts that support Vietnamese
        const fonts = await ensureFontsLoaded();
        
        const doc = new PDFDocument({ 
          margin: 50, 
          bufferPages: true
        });
        
        // Register custom fonts
        doc.registerFont('NotoSans', fonts.regular);
        doc.registerFont('NotoSans-Bold', fonts.bold);
        
        const buffers: Buffer[] = [];

        doc.on("data", buffers.push.bind(buffers));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", reject);

        tasks.forEach((task, index) => {
          if (index > 0) {
            doc.addPage();
          }
          this.drawTaskContent(doc, task, lang);
        });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private static drawTaskContent(
    doc: PDFKit.PDFDocument,
    task: TaskWithDetails,
    lang: string = "en"
  ) {
    const t = (key: string) => {
      const translations: any = {
        en: {
          task_info: "1. Task Information",
          subtasks: "2. Subtasks",
          linked_tasks: "3. Linked Tasks",
          title: "Title",
          description: "Description",
          status: "Status",
          priority: "Priority",
          assignee: "Assignee",
          creator: "Creator",
          created_date: "Created Date",
          due_date: "Due Date",
          no_description: "No description provided",
          unassigned: "Unassigned",
          unknown: "Unknown",
          no_due_date: "No due date",
          no_priority: "No priority",
          no_subtasks: "No subtasks.",
          no_linked_tasks: "No linked tasks.",
          name: "Name",
          relationship: "Relationship",
          generated_on: "Generated on",
          page: "Page",
          of: "of",
          // Status
          status_TODO: "To Do",
          status_IN_PROGRESS: "In Progress",
          status_DONE: "Done",
          status_COMPLETED: "Completed",
          status_AT_RISK: "At Risk",
          // Priority
          priority_HIGH: "High",
          priority_MEDIUM: "Medium",
          priority_LOW: "Low",
          // Relationships
          rel_blocks: "Blocks",
          rel_blocked_by: "Blocked By",
        },
        vi: {
          task_info: "1. Thông tin công việc",
          subtasks: "2. Công việc con",
          linked_tasks: "3. Công việc liên kết",
          title: "Tiêu đề",
          description: "Mô tả",
          status: "Trạng thái",
          priority: "Độ ưu tiên",
          assignee: "Người thực hiện",
          creator: "Người tạo",
          created_date: "Ngày tạo",
          due_date: "Hạn chót",
          no_description: "Không có mô tả",
          unassigned: "Chưa giao",
          unknown: "Không xác định",
          no_due_date: "Không có hạn chót",
          no_priority: "Không có ưu tiên",
          no_subtasks: "Không có công việc con.",
          no_linked_tasks: "Không có công việc liên kết.",
          name: "Tên",
          relationship: "Mối quan hệ",
          generated_on: "Được tạo vào",
          page: "Trang",
          of: "trên",
          // Status
          status_TODO: "Đang chờ",
          status_IN_PROGRESS: "Đang tiến hành",
          status_DONE: "Hoàn thành",
          status_COMPLETED: "Hoàn thành",
          status_AT_RISK: "Sắp tới hạn",
          // Priority
          priority_HIGH: "Cao",
          priority_MEDIUM: "Trung bình",
          priority_LOW: "Thấp",
          // Relationships
          rel_blocks: "Chặn",
          rel_blocked_by: "Bị chặn",
        },
      };
      return translations[lang]?.[key] || translations["en"][key] || key;
    };

    // --- Header ---
    doc.fontSize(20).font("NotoSans-Bold").text("Nexus Collaboration", { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(16)
      .font("NotoSans")
      .text(`${task.title} - ${task.project.name}`, { align: "center" });
    doc.moveDown(0.5);
    doc
      .fontSize(10)
      .font("NotoSans")
      .fillColor("grey")
      .text(
        `${t("generated_on")}: ${DateTime.now()
          .setLocale(lang)
          .toLocaleString(DateTime.DATETIME_MED)}`,
        { align: "center" }
      )
      .fillColor("black");
    doc.moveDown(2);

    // --- Section 1: Task Information ---
    doc.fontSize(14).font("NotoSans-Bold").text(t("task_info"));
    doc.moveDown(0.5);

    const infoX = 50;
    let infoY = doc.y;
    const labelWidth = 100;

    const drawField = (label: string, value: string, link?: string) => {
      doc
        .fontSize(10)
        .font("NotoSans-Bold")
        .text(label + ":", infoX, infoY, { width: labelWidth });
      doc.font("NotoSans");
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

    const taskUrl = `${
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    }/projects/${task.projectId}?taskId=${task.id}`;

    drawField(t("title"), task.title, taskUrl);
    drawField(t("description"), task.description || t("no_description"));
    drawField(t("status"), t(`status_${task.status}`));
    drawField(
      t("priority"),
      task.priority ? t(`priority_${task.priority}`) : t("no_priority")
    );
    drawField(t("assignee"), task.assignee?.name || t("unassigned"));
    drawField(t("creator"), task.creator.name || t("unknown"));
    drawField(
      t("created_date"),
      DateTime.fromJSDate(task.createdAt)
        .setLocale(lang)
        .toLocaleString(DateTime.DATE_MED)
    );
    drawField(
      t("due_date"),
      task.dueDate
        ? DateTime.fromJSDate(task.dueDate)
            .setLocale(lang)
            .toLocaleString(DateTime.DATE_MED)
        : t("no_due_date")
    );

    doc.moveDown(2);
    infoY = doc.y; // Update Y for next section

    // --- Section 2: Subtasks ---
    doc.fontSize(14).font("NotoSans-Bold").text(t("subtasks"), 50, infoY);
    infoY += 20; // Move down after title
    doc.font("NotoSans").fontSize(10);

    const subtaskHeaders = [
      t("name"),
      t("priority"),
      t("assignee"),
      t("status"),
    ];
    const subtaskWidths = [200, 80, 100, 100];
    const subtaskData = task.subtasks.map(s => [
      s.name,
      s.priority ? t(`priority_${s.priority}`) : t("no_priority"),
      s.assignee?.name || t("unassigned"),
      t(`status_${s.status}`),
    ]);

    if (subtaskData.length === 0) {
      doc.text(t("no_subtasks"));
      infoY += 20;
    } else {
      infoY = this.drawTable(
        doc,
        subtaskHeaders,
        subtaskData,
        subtaskWidths,
        50,
        infoY
      );
    }

    doc.moveDown(2);
    infoY += 30; // Add explicit spacing before next section

    // --- Section 3: Linked Tasks ---
    doc.fontSize(14).font("NotoSans-Bold").text(t("linked_tasks"), 50, infoY);
    infoY += 20; // Move down after title
    doc.font("NotoSans").fontSize(10);

    const links = [
      ...task.sourceLinks.map(l => ({ type: "blocks", task: l.targetTask })),
      ...task.targetLinks.map(l => ({
        type: "blocked_by",
        task: l.sourceTask,
      })),
    ];

    const linkHeaders = [
      t("name"),
      t("priority"),
      t("assignee"),
      t("status"),
      t("relationship"),
    ];
    const linkWidths = [130, 70, 110, 80, 90];
    const linkData = links.map(l => {
      const url = `${
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      }/projects/${task.projectId}?taskId=${l.task.id}`;
      return [
        { text: l.task.title, link: url },
        l.task.priority ? t(`priority_${l.task.priority}`) : t("no_priority"),
        l.task.assignee?.name || t("unassigned"),
        t(`status_${l.task.status}`),
        t(`rel_${l.type}`),
      ];
    });

    if (linkData.length === 0) {
      doc.text(t("no_linked_tasks"));
    } else {
      this.drawTable(doc, linkHeaders, linkData, linkWidths, 50, infoY);
    }
  }

  private static drawTable(
    doc: PDFKit.PDFDocument,
    headers: string[],
    data: (string | { text: string; link?: string })[][],
    columnWidths: number[],
    x: number,
    y: number
  ): number {
    let currentY = y;
    const padding = 5;

    // Draw headers
    doc.fontSize(10).font("NotoSans-Bold");
    let currentX = x;
    headers.forEach((header, i) => {
      doc.text(header, currentX + padding, currentY + padding, {
        width: columnWidths[i] - 2 * padding,
      });
      currentX += columnWidths[i];
    });

    // Draw header border
    doc
      .rect(
        x,
        currentY,
        columnWidths.reduce((a, b) => a + b, 0),
        20
      )
      .stroke();
    // Vertical lines for header
    currentX = x;
    columnWidths.forEach(w => {
      doc
        .moveTo(currentX, currentY)
        .lineTo(currentX, currentY + 20)
        .stroke();
      currentX += w;
    });
    doc
      .moveTo(currentX, currentY)
      .lineTo(currentX, currentY + 20)
      .stroke(); // Last vertical line

    currentY += 20;

    // Draw rows
    doc.font("NotoSans").fontSize(10);
    data.forEach(row => {
      let maxRowHeight = 20;
      // Calculate max height for the row
      row.forEach((cell, i) => {
        const text = typeof cell === "string" ? cell : cell.text;
        const height = doc.heightOfString(text, {
          width: columnWidths[i] - 2 * padding,
        });
        if (height + 2 * padding > maxRowHeight) {
          maxRowHeight = height + 2 * padding;
        }
      });

      // Check for page break - leave space for footer
      if (currentY + maxRowHeight > doc.page.height - 80) {
        doc.addPage();
        currentY = 50;
      }

      currentX = x;
      row.forEach((cell, i) => {
        const cellX = currentX + padding;
        const cellY = currentY + padding;
        const width = columnWidths[i] - 2 * padding;

        if (typeof cell === "string") {
          doc.fillColor("black").text(cell, cellX, cellY, { width });
        } else {
          doc
            .fillColor("blue")
            .text(cell.text, cellX, cellY, {
              width,
              link: cell.link,
              underline: true,
            })
            .fillColor("black");
        }
        currentX += columnWidths[i];
      });

      // Draw row border
      doc
        .rect(
          x,
          currentY,
          columnWidths.reduce((a, b) => a + b, 0),
          maxRowHeight
        )
        .stroke();

      // Vertical lines for row
      currentX = x;
      columnWidths.forEach(w => {
        doc
          .moveTo(currentX, currentY)
          .lineTo(currentX, currentY + maxRowHeight)
          .stroke();
        currentX += w;
      });
      doc
        .moveTo(currentX, currentY)
        .lineTo(currentX, currentY + maxRowHeight)
        .stroke();

      currentY += maxRowHeight;
    });

    return currentY;
  }
}


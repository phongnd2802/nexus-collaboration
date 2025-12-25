import { PrismaClient, TaskPriority, TaskStatus } from "@prisma/client";
import { DateTime } from "luxon";
import { deleteReminders, upsertTaskReminders } from "./reminderScheduler";
import { subtaskService } from "./subtaskService";
import { taskLinkService } from "./taskLinkService";
import {
  canManageTask,
  canUpdateTaskStatus,
  canCreateTasks,
  canManageFile,
  canViewTaskFiles,
  canViewTask,
  isProjectMember,
  canCompleteTask,
  validateTaskAssignee,
} from "../utils/permissions";
import { AppError } from "../utils/errors";

const prisma = new PrismaClient();

// Helper function to parse date/time from frontend
function parseDueDateTime(
  dueDate?: string,
  dueTime?: string | null
): Date | null {
  if (!dueDate) return null;

  // Combine date and time
  const timeStr = dueTime || "23:59";
  const combined = `${dueDate}T${timeStr}`;

  // Parse as local time (no timezone conversion)
  const parsed = DateTime.fromISO(combined, { zone: "local" });

  if (!parsed.isValid) {
    throw new AppError(400, "INVALID_DUE", "Invalid due date/time");
  }

  // Return as JS Date without timezone conversion
  return parsed.toJSDate();
}

export async function getAllTasks(userId: string, limit?: number | string) {
  const tasks = await prisma.task.findMany({
    where: {
      OR: [{ assigneeId: userId }, { creatorId: userId }],
    },
    include: {
      project: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, image: true, email: true } },
      assignee: {
        select: { id: true, name: true, image: true, email: true },
      },
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take:
      typeof limit === "string" && !isNaN(parseInt(limit))
        ? parseInt(limit)
        : undefined,
  });

  return tasks;
}

export async function getAllAssignedTask(
  userId: string,
  limit?: string | number
) {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: userId },
    include: {
      project: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, image: true, email: true } },
      assignee: {
        select: { id: true, name: true, image: true, email: true },
      },
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take:
      typeof limit === "string" && !isNaN(parseInt(limit))
        ? parseInt(limit)
        : undefined,
  });

  return tasks;
}

export async function getAllCreatedTasks(
  userId: string,
  limit?: string | number
) {
  const tasks = await prisma.task.findMany({
    where: { creatorId: userId },
    include: {
      project: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, image: true, email: true } },
      assignee: {
        select: { id: true, name: true, image: true, email: true },
      },
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take:
      typeof limit === "string" && !isNaN(parseInt(limit))
        ? parseInt(limit)
        : undefined,
  });

  return tasks;
}

export async function getAllTasksByProjectId(
  userId: string,
  projectId: string
) {
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  if (!(await isProjectMember(projectId, userId))) {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You are not a member of this project"
    );
  }

  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: {
      creator: {
        select: { id: true, name: true, image: true, email: true },
      },
      assignee: {
        select: { id: true, name: true, image: true, email: true },
      },
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
  });

  return tasks;
}

export async function createTask(
  projectId: string,
  body: {
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string;
    dueTime?: string;
    priority?: TaskPriority;
    creatorId: string;
    files?: any[];
  }
) {
  const {
    title,
    description,
    assigneeId,
    dueDate,
    dueTime,
    priority,
    creatorId,
    files,
  } = body;

  if (!title || title.length < 3 || title.length > 100) {
    throw new AppError(
      400,
      "INVALID_TITLE",
      "Title must be between 3 and 100 characters"
    );
  }
  if (description && description.length > 2000) {
    throw new AppError(
      400,
      "INVALID_DESCRIPTION",
      "Description must be less than 2000 characters"
    );
  }

  if (!creatorId) {
    throw new AppError(400, "CREATOR_ID_REQUIRED", "Creator ID is required");
  }

  if (!(await canCreateTasks(projectId, creatorId))) {
    throw new AppError(
      403,
      "INSUFFICIENT_PERMISSIONS",
      "You do not have permission to create tasks in this project"
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  if (assigneeId) {
    const assigneeValidation = await validateTaskAssignee(
      projectId,
      assigneeId
    );
    if (!assigneeValidation.valid) {
      throw new AppError(
        400,
        "INVALID_ASSIGNEE",
        assigneeValidation.reason as string
      );
    }
  }

  const result = await prisma.$transaction(async tx => {
    const dueAt = parseDueDateTime(dueDate, dueTime);

    const newTask = await tx.task.create({
      data: {
        title,
        description,
        projectId,
        creatorId,
        assigneeId: assigneeId || null,
        dueDate: dueAt,
        priority: priority ?? TaskPriority.MEDIUM,
        status: "TODO",
      },
      include: {
        creator: { select: { id: true, name: true, image: true } },
        assignee: { select: { id: true, name: true, image: true } },
      },
    });

    if (files && Array.isArray(files) && files.length > 0) {
      const filePromises = files.map(file =>
        tx.file.create({
          data: {
            name: file.name,
            url: file.url,
            size: file.size,
            type: file.type,
            uploaderId: creatorId,
            projectId,
            taskId: newTask.id,
            isTaskDeliverable: false,
          },
        })
      );

      await Promise.all(filePromises);
    }

    return { newTask };
  });

  // Schedule reminders nếu có dueDate (dựa trên priority)
  if (result.newTask.dueDate) {
    const taskPriority = priority ?? TaskPriority.MEDIUM;
    await upsertTaskReminders(
      result.newTask.id,
      result.newTask.dueDate,
      taskPriority
    ).catch(err => {
      console.error(
        `Failed to schedule reminders for task ${result.newTask.id}:`,
        err
      );
    });
  }

  return result.newTask;
}

export async function updateTask(
  taskId: string,
  body: {
    title?: string;
    description?: string;
    assigneeId?: string;
    dueDate?: string | null;
    dueTime?: string | null;
    priority?: TaskPriority;
    status?: TaskStatus;
    userId: string;
  }
) {
  const {
    title,
    description,
    assigneeId,
    dueDate,
    dueTime,
    priority,
    status,
    userId,
  } = body;

  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { include: { members: true } },
    },
  });

  if (!task) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }

  // Status-only update
  if (Object.keys(body).length === 2 && status !== undefined) {
    if (!(await canUpdateTaskStatus(taskId, userId))) {
      throw new AppError(
        403,
        "INSUFFICIENT_PERMISSIONS",
        "You do not have permission to update the status of this task"
      );
    }

    // Check if task is blocked by other tasks
    if (status !== TaskStatus.TODO) {
      const blockCheck = await taskLinkService.canTaskChangeStatus(
        taskId,
        status
      );
      if (!blockCheck.allowed) {
        throw new AppError(403, "TASK_BLOCKED", blockCheck.reason as string);
      }
    }

    // If task is being moved to DONE, check if all subtasks are completed
    if (status === TaskStatus.DONE) {
      const subtasks = await prisma.subtask.findMany({
        where: { taskId },
      });

      const hasIncompleteSubtasks = subtasks.some(
        subtask => subtask.status !== TaskStatus.DONE
      );

      if (hasIncompleteSubtasks) {
        throw new AppError(
          400,
          "INCOMPLETE_SUBTASKS",
          "Cannot mark task as done. All subtasks must be completed first."
        );
      }
    }

    const updated = await prisma.$transaction(async tx => {
      const updatedTask = await tx.task.update({
        where: { id: taskId },
        data: { status },
        include: {
          creator: { select: { id: true, name: true, image: true } },
          assignee: { select: { id: true, name: true, image: true } },
        },
      });

      // If task was DONE and is now not DONE, revert blocked tasks
      let cascadedTasks: any[] = [];
      if (task.status === TaskStatus.DONE && status !== TaskStatus.DONE) {
        cascadedTasks = await taskLinkService.cascadeRevertTaskStatus(
          taskId,
          tx
        );
      }

      return { updatedTask, cascadedTasks };
    });

    return updated;
  }

  if (!(await canManageTask(taskId, userId))) {
    throw new AppError(
      403,
      "INSUFFICIENT_PERMISSIONS",
      "You do not have permission to update this task"
    );
  }

  if (title !== undefined) {
    if (!title.trim() || title.length < 3 || title.length > 100) {
      throw new AppError(
        400,
        "INVALID_TITLE",
        "Title must be between 3 and 100 characters"
      );
    }
  }

  if (description !== undefined && description.length > 2000) {
    throw new AppError(
      400,
      "INVALID_DESCRIPTION",
      "Description must be less than 2000 characters"
    );
  }

  if (assigneeId !== undefined && assigneeId !== null) {
    const assigneeValidation = await validateTaskAssignee(
      task.projectId,
      assigneeId
    );
    if (!assigneeValidation.valid) {
      throw new AppError(
        400,
        "INVALID_ASSIGNEE",
        assigneeValidation.reason as string
      );
    }
  }

  let computedDue: Date | null | undefined = undefined;
  if (dueDate !== undefined) {
    if (dueDate === null || dueDate === "") {
      computedDue = null;
    } else {
      computedDue = parseDueDateTime(dueDate, dueTime);
    }
  }

  // Check if task is blocked when updating status
  if (status !== undefined && status !== TaskStatus.TODO) {
    const blockCheck = await taskLinkService.canTaskChangeStatus(
      taskId,
      status
    );
    if (!blockCheck.allowed) {
      throw new AppError(403, "TASK_BLOCKED", blockCheck.reason as string);
    }
  }

  let finalStatus: TaskStatus | undefined = status ?? undefined;
  if (status === TaskStatus.DONE) {
    const subtasks = await prisma.subtask.findMany({
      where: { taskId },
    });

    const hasIncompleteSubtasks = subtasks.some(
      subtask => subtask.status !== TaskStatus.DONE
    );

    if (hasIncompleteSubtasks) {
      finalStatus = undefined;
    }
  }

  const updatedTask = await prisma.$transaction(async tx => {
    const updated = await tx.task.update({
      where: { id: taskId },
      data: {
        title: title ?? undefined,
        description: description ?? undefined,
        assigneeId: assigneeId ?? undefined,
        dueDate: computedDue,
        priority: priority ?? undefined,
        status: finalStatus,
      },
      include: {
        creator: { select: { id: true, name: true, image: true } },
        assignee: { select: { id: true, name: true, image: true } },
      },
    });

    // If task was DONE and is now not DONE, revert blocked tasks
    let cascadedTasks: any[] = [];
    if (
      status !== undefined &&
      task.status === TaskStatus.DONE &&
      status !== TaskStatus.DONE
    ) {
      cascadedTasks = await taskLinkService.cascadeRevertTaskStatus(taskId, tx);
    }

    return { updatedTask: updated, cascadedTasks };
  });

  // Update reminders nếu dueDate hoặc priority thay đổi
  const finalDueDate = computedDue ?? updatedTask.updatedTask.dueDate;
  const finalPriority = priority ?? updatedTask.updatedTask.priority;

  if (finalDueDate) {
    await upsertTaskReminders(
      updatedTask.updatedTask.id,
      finalDueDate,
      finalPriority
    ).catch(err => {
      console.error(
        `Failed to update reminders for task ${updatedTask.updatedTask.id}:`,
        err
      );
    });
  } else if (task.dueDate && computedDue === null) {
    // Nếu xóa dueDate => xóa reminders
    await deleteReminders("task", updatedTask.updatedTask.id).catch(err => {
      console.error(
        `Failed to delete reminders for task ${updatedTask.updatedTask.id}:`,
        err
      );
    });
  }

  return updatedTask;
}

export async function deleteTask(taskId: string, userId: string) {
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  if (!(await canManageTask(taskId, userId))) {
    throw new AppError(
      403,
      "INSUFFICIENT_PERMISSIONS",
      "You do not have permission to delete this task"
    );
  }

  await prisma.task.delete({ where: { id: taskId } });
  return { message: "Task deleted successfully" };
}

export async function getTask(taskId: string, userId: string) {
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  if (!(await canViewTask(taskId, userId))) {
    throw new AppError(
      403,
      "INSUFFICIENT_PERMISSIONS",
      "You do not have permission to view this task"
    );
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: { members: true },
      },
      creator: { select: { id: true, name: true, image: true } },
      assignee: { select: { id: true, name: true, image: true } },
      taskFiles: true,
      subtasks: {
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!task) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }

  // Get linked tasks
  const linkedTasks = await taskLinkService.getTaskLinksByTaskId(taskId);

  return {
    ...task,
    linkedTasks,
  };
}

export async function completeTask(
  taskId: string,
  body: {
    userId: string;
    completionNote: any;
    deliverables: any[];
  }
) {
  const { userId, completionNote, deliverables } = body;
  const completionCheck = await canCompleteTask(taskId, userId);
  if (!completionCheck.allowed) {
    throw new AppError(
      403,
      "INSUFFICIENT_PERMISSIONS",
      completionCheck.reason as string
    );
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });

  if (!task) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }

  const result = await prisma.$transaction(async tx => {
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: { completionNote },
      include: { taskFiles: true },
    });

    if (Array.isArray(deliverables) && deliverables.length > 0) {
      const existingFiles = await tx.file.findMany({
        where: {
          taskId: taskId,
          isTaskDeliverable: true,
          url: { in: deliverables.map((f: any) => f.url) },
        },
        select: { url: true },
      });
      const existingUrls = new Set(existingFiles.map((f: any) => f.url));

      const newDeliverables = deliverables.filter(
        f => !existingUrls.has(f.url)
      );

      if (newDeliverables.length > 0) {
        const createPromises = newDeliverables.map((file: any) =>
          tx.file.create({
            data: {
              name: file.name,
              url: file.url,
              size: file.size,
              type: file.type,
              uploaderId: userId,
              projectId: task.projectId,
              taskId: taskId,
              isTaskDeliverable: true,
            },
          })
        );
        await Promise.all(createPromises);
      }
    }

    const refreshedTask = await tx.task.findUnique({
      where: { id: taskId },
      include: { taskFiles: true },
    });

    return { updatedTask: refreshedTask! };
  });

  return result.updatedTask;
}

export async function getTaskFiles(taskId: string, userId: string) {
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  if (!(await canViewTaskFiles(taskId, userId))) {
    throw new AppError(
      403,
      "INSUFFICIENT_PERMISSIONS",
      "You do not have permission to view files for this task"
    );
  }

  const files = await prisma.file.findMany({
    where: {
      taskId,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return files;
}

export async function deleteTaskFiles(fileId: string, userId: string) {
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  if (!(await canManageFile(fileId, userId))) {
    throw new AppError(
      403,
      "INSUFFICIENT_PERMISSIONS",
      "You do not have permission to delete this file"
    );
  }

  await prisma.file.delete({
    where: { id: fileId },
  });

  return { message: "File deleted successfully" };
}

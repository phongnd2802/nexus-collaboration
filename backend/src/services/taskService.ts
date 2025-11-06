import { PrismaClient, TaskPriority, TaskStatus } from "@prisma/client";
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

  // Get tasks for this project
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
    dueDate?: Date;
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

  // permission check
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

  const result = await prisma.$transaction(async (tx) => {
    const newTask = await tx.task.create({
      data: {
        title,
        description,
        projectId,
        creatorId,
        assigneeId: assigneeId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority ?? TaskPriority.MEDIUM,
        status: "TODO",
      },
      include: {
        creator: { select: { id: true, name: true, image: true } },
        assignee: { select: { id: true, name: true, image: true } },
      },
    });

    if (files && Array.isArray(files) && files.length > 0) {
      const filePromises = files.map((file) =>
        tx.file.create({
          data: {
            name: file.name,
            url: file.url,
            size: file.size,
            type: file.type,
            uploaderId: creatorId,
            projectId,
            taskId: newTask.id,
            isTaskDeliverable: false, // context file, not a deliverable
          },
        })
      );

      await Promise.all(filePromises);
    }

    return { newTask };
  });

  return result.newTask;
}

export async function updateTask(
  taskId: string,
  body: {
    title: string;
    description?: string;
    assigneeId?: string;
    dueDate?: Date;
    priority?: TaskPriority;
    status?: TaskStatus;
    userId: string;
  }
) {
  const { title, description, assigneeId, dueDate, priority, status, userId } =
    body;

  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  // Check if task exists
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
    // permission check
    if (!(await canUpdateTaskStatus(taskId, userId))) {
      throw new AppError(
        403,
        "INSUFFICIENT_PERMISSIONS",
        "You do not have permission to update the status of this task"
      );
    }

    const updated = await prisma.task.update({
      where: { id: taskId },
      data: { status },
      include: {
        creator: { select: { id: true, name: true, image: true } },
        assignee: { select: { id: true, name: true, image: true } },
      },
    });

    return updated;
  }

  // permission check
  if (!(await canManageTask(taskId, userId))) {
    throw new AppError(
      403,
      "INSUFFICIENT_PERMISSIONS",
      "You do not have permission to update this task"
    );
  }

  // Validate inputs
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

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: title ?? undefined,
      description: description ?? undefined,
      assigneeId: assigneeId ?? undefined,
      dueDate:
        dueDate !== undefined
          ? dueDate
            ? new Date(dueDate)
            : null
          : undefined,
      priority: priority ?? undefined,
      status: status ?? undefined,
    },
    include: {
      creator: { select: { id: true, name: true, image: true } },
      assignee: { select: { id: true, name: true, image: true } },
    },
  });

  return updatedTask;
}

export async function deleteTask(taskId: string, userId: string) {
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  // permission check
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
    },
  });

  if (!task) {
    throw new AppError(404, "TASK_NOT_FOUND", "Task not found");
  }

  return task;
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

  const result = await prisma.$transaction(async (tx) => {
    // completion note
    const updatedTask = await tx.task.update({
      where: { id: taskId },
      data: { completionNote },
      include: { taskFiles: true },
    });

    // deliverables
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
        (f) => !existingUrls.has(f.url)
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

  // permission check
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

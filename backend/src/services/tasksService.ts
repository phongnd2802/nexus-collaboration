import { PrismaClient } from "@prisma/client";
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

const prisma = new PrismaClient();

export async function listAllTasksService(userId: string, limit?: number) {
  const tasks = await prisma.task.findMany({
    where: { OR: [{ assigneeId: userId }, { creatorId: userId }] },
    include: {
      project: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, image: true, email: true } },
      assignee: { select: { id: true, name: true, image: true, email: true } },
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take: limit,
  });
  return tasks;
}

export async function listAssignedTasksService(userId: string, limit?: number) {
  const tasks = await prisma.task.findMany({
    where: { assigneeId: userId },
    include: {
      project: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, image: true, email: true } },
      assignee: { select: { id: true, name: true, image: true, email: true } },
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take: limit,
  });
  return tasks;
}

export async function listCreatedTasksService(userId: string, limit?: number) {
  const tasks = await prisma.task.findMany({
    where: { creatorId: userId },
    include: {
      project: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, image: true, email: true } },
      assignee: { select: { id: true, name: true, image: true, email: true } },
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take: limit,
  });
  return tasks;
}

export async function listProjectTasksService(projectId: string, userId: string) {
  if (!(await isProjectMember(projectId, userId))) {
    return { error: { code: 403, message: "You do not have permission to view tasks for this project" } };
  }
  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: {
      creator: { select: { id: true, name: true, image: true, email: true } },
      assignee: { select: { id: true, name: true, image: true, email: true } },
    },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
  });
  return tasks;
}

export async function createTaskService(projectId: string, payload: any) {
  const { title, description, assigneeId, dueDate, priority, creatorId, files } = payload;

  if (!(await canCreateTasks(projectId, creatorId))) {
    return { error: { code: 403, message: "Only admins or editors can create tasks" } };
  }
  const project = await prisma.project.findUnique({ where: { id: projectId }, include: { members: true } });
  if (!project) return { error: { code: 404, message: "Project not found" } };

  if (assigneeId) {
    const assigneeValidation = await validateTaskAssignee(projectId, assigneeId);
    if (!assigneeValidation.valid) {
      return { error: { code: 400, message: assigneeValidation.reason } };
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
        priority: priority || "MEDIUM",
        status: "TODO",
      },
      include: {
        creator: { select: { id: true, name: true, image: true } },
        assignee: { select: { id: true, name: true, image: true } },
      },
    });

    if (files && Array.isArray(files) && files.length > 0) {
      const filePromises = files.map((file: any) =>
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

  return result.newTask;
}

export async function updateTaskService(taskId: string, userId: string, data: any) {
  if (!(await canManageTask(taskId, userId))) {
    return { error: { code: 403, message: "You do not have permission to update this task" } };
  }
  const { title, description, assigneeId, dueDate, priority, status } = data;

  if (assigneeId) {
    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (task) {
      const assigneeValidation = await validateTaskAssignee(task.projectId, assigneeId);
      if (!assigneeValidation.valid) {
        return { error: { code: 400, message: assigneeValidation.reason } };
      }
    }
  }

  const updatedTask = await prisma.task.update({
    where: { id: taskId },
    data: {
      title: title !== undefined ? title : undefined,
      description: description !== undefined ? description : undefined,
      assigneeId: assigneeId !== undefined ? assigneeId : undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority: priority !== undefined ? priority : undefined,
      status: status !== undefined ? status : undefined,
    },
  });
  return updatedTask;
}

export async function deleteTaskService(taskId: string, userId: string) {
  if (!(await canManageTask(taskId, userId))) {
    return { error: { code: 403, message: "You do not have permission to delete this task" } };
  }
  await prisma.file.deleteMany({ where: { taskId } });
  const task = await prisma.task.delete({ where: { id: taskId } });
  return task;
}

export async function getTaskByIdService(taskId: string, userId: string) {
  if (!(await canViewTask(taskId, userId))) {
    return { error: { code: 403, message: "You do not have permission to view this task" } };
  }
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, image: true } },
      assignee: { select: { id: true, name: true, image: true } },
      taskFiles: true,
    },
  });
  if (!task) return { error: { code: 404, message: "Task not found" } };
  return task;
}

export async function completeTaskService(
  taskId: string,
  userId: string,
  completionNote?: string,
  deliverables?: Array<{ name: string; url: string; size: number; type: string }>
) {
  if (!(await canCompleteTask(taskId, userId))) {
    return { error: { code: 403, message: "You do not have permission to complete this task" } };
  }
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return { error: { code: 404, message: "Task not found" } };

  const result = await prisma.$transaction(async (tx) => {
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
      const newDeliverables = deliverables.filter((f) => !existingUrls.has(f.url));
      if (newDeliverables.length > 0) {
        const createPromises = newDeliverables.map((file) =>
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

    const refreshedTask = await tx.task.findUnique({ where: { id: taskId }, include: { taskFiles: true } });
    return refreshedTask!;
  });

  return result;
}

export async function deleteTaskFileService(fileId: string, userId: string) {
  if (!(await canManageFile(fileId, userId))) {
    return { error: { code: 403, message: "You don't have permission to delete this file" } };
  }
  await prisma.file.delete({ where: { id: fileId } });
  return { message: "File deleted successfully" };
}

export async function listTaskFilesService(taskId: string, userId: string) {
  if (!(await canViewTaskFiles(taskId, userId))) {
    return { error: { code: 403, message: "You do not have permission to view files for this task" } };
  }
  const files = await prisma.file.findMany({
    where: { taskId },
    orderBy: { createdAt: "desc" },
  });
  return { files };
}


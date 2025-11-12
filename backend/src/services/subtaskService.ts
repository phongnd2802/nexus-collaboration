import { PrismaClient, TaskStatus, TaskPriority } from "@prisma/client";
import { AppError } from "../utils/errors";

const prisma = new PrismaClient();

interface CreateSubtaskInput {
  taskId: string;
  name: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string;
}

interface UpdateSubtaskInput {
  name?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigneeId?: string | null;
}

export const subtaskService = {
  /**
   * Create a new subtask
   */
  async createSubtask(data: CreateSubtaskInput) {
    const { taskId, name, status, priority, assigneeId } = data;

    if (!name || !name.trim()) {
      throw new AppError(400, "INVALID_INPUT", "Subtask name is required");
    }

    // Verify task exists
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new AppError(404, "NOT_FOUND", "Task not found");
    }

    // Verify assignee exists if provided
    if (assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: assigneeId },
      });

      if (!assignee) {
        throw new AppError(404, "NOT_FOUND", "Assignee not found");
      }
    }

    const subtask = await prisma.subtask.create({
      data: {
        taskId,
        name,
        status: status || TaskStatus.TODO,
        priority: priority || TaskPriority.MEDIUM,
        assigneeId,
      },
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
    });

    return subtask;
  },

  /**
   * Get all subtasks for a task
   */
  async getSubtasksByTaskId(taskId: string) {
    const subtasks = await prisma.subtask.findMany({
      where: { taskId },
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
    });

    return subtasks;
  },

  /**
   * Get a single subtask by id
   */
  async getSubtaskById(subtaskId: string) {
    const subtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            projectId: true,
          },
        },
      },
    });

    return subtask;
  },

  /**
   * Update a subtask
   */
  async updateSubtask(subtaskId: string, data: UpdateSubtaskInput) {
    // Verify subtask exists
    const existingSubtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
    });

    if (!existingSubtask) {
      throw new AppError(404, "NOT_FOUND", "Subtask not found");
    }

    // Verify assignee exists if provided
    if (data.assigneeId) {
      const assignee = await prisma.user.findUnique({
        where: { id: data.assigneeId },
      });

      if (!assignee) {
        throw new AppError(404, "NOT_FOUND", "Assignee not found");
      }
    }

    const updatedSubtask = await prisma.subtask.update({
      where: { id: subtaskId },
      data,
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
    });

    return updatedSubtask;
  },

  /**
   * Delete a subtask
   */
  async deleteSubtask(subtaskId: string) {
    // Verify subtask exists
    const existingSubtask = await prisma.subtask.findUnique({
      where: { id: subtaskId },
    });

    if (!existingSubtask) {
      throw new AppError(404, "NOT_FOUND", "Subtask not found");
    }

    await prisma.subtask.delete({
      where: { id: subtaskId },
    });

    return { success: true };
  },

  /**
   * Set all subtasks of a task to DONE
   */
  async setAllSubtasksToDone(taskId: string) {
    await prisma.subtask.updateMany({
      where: { taskId },
      data: { status: TaskStatus.DONE },
    });
  },
};

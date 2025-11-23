import { PrismaClient, TaskRelationship, TaskStatus } from "@prisma/client";
import { AppError } from "../utils/errors";

const prisma = new PrismaClient();

interface CreateTaskLinkInput {
  sourceTaskId: string;
  targetTaskId: string;
  relationship: TaskRelationship;
}

interface UpdateTaskLinkInput {
  relationship?: TaskRelationship;
}

export const taskLinkService = {
  /**
   * Create a new task link
   */
  async createTaskLink(data: CreateTaskLinkInput) {
    const { sourceTaskId, targetTaskId, relationship } = data;

    // Verify both tasks exist
    const [sourceTask, targetTask] = await Promise.all([
      prisma.task.findUnique({ where: { id: sourceTaskId } }),
      prisma.task.findUnique({ where: { id: targetTaskId } }),
    ]);

    if (!sourceTask) {
      throw new AppError(404, "NOT_FOUND", "Source task not found");
    }

    if (!targetTask) {
      throw new AppError(404, "NOT_FOUND", "Target task not found");
    }

    // Prevent self-linking
    if (sourceTaskId === targetTaskId) {
      throw new AppError(400, "INVALID_INPUT", "Cannot link a task to itself");
    }

    // Check if link already exists (in either direction)
    const existingLink = await prisma.taskLink.findFirst({
      where: {
        OR: [
          { sourceTaskId: sourceTaskId, targetTaskId: targetTaskId },
          { sourceTaskId: targetTaskId, targetTaskId: sourceTaskId },
        ],
      },
    });

    if (existingLink) {
      throw new AppError(400, "LINK_EXISTS", "Tasks are already linked");
    }

    const taskLink = await prisma.taskLink.create({
      data: {
        sourceTaskId,
        targetTaskId,
        relationship,
      },
      include: {
        sourceTask: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assigneeId: true,
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        targetTask: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assigneeId: true,
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return taskLink;
  },

  /**
   * Get all task links for a task (both as source and target)
   */
  async getTaskLinksByTaskId(taskId: string) {
    const [sourceLinks, targetLinks] = await Promise.all([
      prisma.taskLink.findMany({
        where: { sourceTaskId: taskId },
        include: {
          targetTask: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              assigneeId: true,
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.taskLink.findMany({
        where: { targetTaskId: taskId },
        include: {
          sourceTask: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true,
              assigneeId: true,
              assignee: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Transform the links to a unified format
    const formattedLinks = [
      ...sourceLinks.map(link => ({
        id: link.id,
        name: link.targetTask.title,
        priority: link.targetTask.priority,
        assigneeId: link.targetTask.assigneeId || "",
        assignee: link.targetTask.assignee || {
          id: "",
          name: "Unassigned",
          email: "",
          image: "",
        },
        status: link.targetTask.status,
        relationship: link.relationship,
        linkedTaskId: link.targetTask.id,
      })),
      ...targetLinks.map(link => ({
        id: link.id,
        name: link.sourceTask.title,
        priority: link.sourceTask.priority,
        assigneeId: link.sourceTask.assigneeId || "",
        assignee: link.sourceTask.assignee || {
          id: "",
          name: "Unassigned",
          email: "",
          image: "",
        },
        status: link.sourceTask.status,
        relationship:
          link.relationship === TaskRelationship.BLOCKS
            ? TaskRelationship.BLOCKED_BY
            : link.relationship === TaskRelationship.BLOCKED_BY
              ? TaskRelationship.BLOCKS
              : link.relationship,
        linkedTaskId: link.sourceTask.id,
      })),
    ];

    return formattedLinks;
  },

  /**
   * Get a single task link by id
   */
  async getTaskLinkById(linkId: string) {
    const taskLink = await prisma.taskLink.findUnique({
      where: { id: linkId },
      include: {
        sourceTask: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        targetTask: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
    });

    return taskLink;
  },

  /**
   * Update a task link
   */
  async updateTaskLink(linkId: string, data: UpdateTaskLinkInput) {
    // Verify task link exists
    const existingLink = await prisma.taskLink.findUnique({
      where: { id: linkId },
    });

    if (!existingLink) {
      throw new AppError(404, "NOT_FOUND", "Task link not found");
    }

    const updatedLink = await prisma.taskLink.update({
      where: { id: linkId },
      data,
      include: {
        sourceTask: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assigneeId: true,
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
        targetTask: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            assigneeId: true,
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return updatedLink;
  },

  /**
   * Delete a task link
   */
  async deleteTaskLink(linkId: string) {
    // Verify task link exists
    const existingLink = await prisma.taskLink.findUnique({
      where: { id: linkId },
    });

    if (!existingLink) {
      throw new AppError(404, "NOT_FOUND", "Task link not found");
    }

    await prisma.taskLink.delete({
      where: { id: linkId },
    });

    return { success: true };
  },

  /**
   * Check if a task can change status based on blocking relationships
   */
  async canTaskChangeStatus(
    taskId: string,
    newStatus: TaskStatus
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Only check blocking when moving to IN_PROGRESS or DONE
    if (newStatus === TaskStatus.TODO) {
      return { allowed: true };
    }

    // Get all BLOCKED_BY relationships where this task is the source
    const blockedByLinks = await prisma.taskLink.findMany({
      where: {
        sourceTaskId: taskId,
        relationship: TaskRelationship.BLOCKED_BY,
      },
      include: {
        targetTask: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    // Check if any blocking tasks are not DONE
    const blockingTasks = blockedByLinks.filter(
      link => link.targetTask.status !== TaskStatus.DONE
    );

    if (blockingTasks.length > 0) {
      const blockingTaskNames = blockingTasks
        .map(link => link.targetTask.title)
        .join(", ");
      return {
        allowed: false,
        reason: `This task is blocked by: ${blockingTaskNames}. Complete those tasks first.`,
      };
    }

    return { allowed: true };
  },
};

import { PrismaClient, TaskRelationship, TaskStatus } from "@prisma/client";
import { AppError } from "../utils/errors";
import { canCreateTaskLink } from "../utils/permissions";

const prisma = new PrismaClient();

interface CreateTaskLinkInput {
  sourceTaskId: string;
  targetTaskId: string;
  relationship: TaskRelationship;
  userId: string;
}

interface UpdateTaskLinkInput {
  relationship?: TaskRelationship;
}

export const taskLinkService = {
  /**
   * Create a new task link
   */
  async createTaskLink(data: CreateTaskLinkInput) {
    const { sourceTaskId, targetTaskId, relationship, userId } = data;

    if (!userId) {
      throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
    }

    const permissionCheck = await canCreateTaskLink(sourceTaskId, userId);
    if (!permissionCheck.allowed) {
      throw new AppError(
        403,
        "INSUFFICIENT_PERMISSIONS",
        permissionCheck.reason as string
      );
    }

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

    // Check if source task is completed
    if (sourceTask.status === TaskStatus.DONE) {
      throw new AppError(
        400,
        "TASK_COMPLETED",
        "Cannot add linked task to a completed task."
      );
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
      include: {
        sourceTask: true,
      },
    });

    if (!existingLink) {
      throw new AppError(404, "NOT_FOUND", "Task link not found");
    }

    // Check if source task is completed
    if (existingLink.sourceTask.status === TaskStatus.DONE) {
      throw new AppError(
        400,
        "TASK_COMPLETED",
        "Cannot modify linked task of a completed task."
      );
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
      include: {
        sourceTask: true,
      },
    });

    if (!existingLink) {
      throw new AppError(404, "NOT_FOUND", "Task link not found");
    }

    // Check if source task is completed
    if (existingLink.sourceTask.status === TaskStatus.DONE) {
      throw new AppError(
        400,
        "TASK_COMPLETED",
        "Cannot remove linked task from a completed task."
      );
    }

    await prisma.taskLink.delete({
      where: { id: linkId },
    });

    return { success: true };
  },

  /**
   * Recursively revert blocked tasks to TODO status
   */
  /**
   * Recursively revert blocked tasks to TODO status
   */
  async cascadeRevertTaskStatus(taskId: string, tx: any): Promise<any[]> {
    // Find all tasks that are blocked by this task (taskId)
    // 1. taskId is source and relationship is BLOCKS
    // 2. taskId is target and relationship is BLOCKED_BY
    const [blockingLinks, blockedByLinks] = await Promise.all([
      tx.taskLink.findMany({
        where: {
          sourceTaskId: taskId,
          relationship: TaskRelationship.BLOCKS,
        },
        include: { targetTask: true },
      }),
      tx.taskLink.findMany({
        where: {
          targetTaskId: taskId,
          relationship: TaskRelationship.BLOCKED_BY,
        },
        include: { sourceTask: true },
      }),
    ]);

    const blockedTasks = [
      ...blockingLinks.map((l: any) => l.targetTask),
      ...blockedByLinks.map((l: any) => l.sourceTask),
    ];

    let updatedTasks: any[] = [];

    for (const task of blockedTasks) {
      if (task.status !== TaskStatus.TODO) {
        // Revert to TODO
        const updated = await tx.task.update({
          where: { id: task.id },
          data: { status: TaskStatus.TODO },
          include: {
            creator: { select: { id: true, name: true, image: true } },
            assignee: { select: { id: true, name: true, image: true } },
            project: { select: { id: true, name: true } },
          },
        });
        updatedTasks.push(updated);

        // Recursively check tasks blocked by this task
        const recursiveUpdates = await this.cascadeRevertTaskStatus(
          task.id,
          tx
        );
        updatedTasks = [...updatedTasks, ...recursiveUpdates];
      }
    }

    return updatedTasks;
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

    // Check if task is blocked by others
    // 1. sourceTaskId = taskId AND relationship = BLOCKED_BY
    // 2. targetTaskId = taskId AND relationship = BLOCKS

    const [blockedByLinks, blocksLinks] = await Promise.all([
      prisma.taskLink.findMany({
        where: {
          sourceTaskId: taskId,
          relationship: TaskRelationship.BLOCKED_BY,
        },
        include: { targetTask: true },
      }),
      prisma.taskLink.findMany({
        where: {
          targetTaskId: taskId,
          relationship: TaskRelationship.BLOCKS,
        },
        include: { sourceTask: true },
      }),
    ]);

    const blockingTasks = [
      ...blockedByLinks.map(l => l.targetTask),
      ...blocksLinks.map(l => l.sourceTask),
    ].filter(task => task.status !== TaskStatus.DONE);

    if (blockingTasks.length > 0) {
      const blockingTaskNames = blockingTasks
        .map(task => task.title)
        .join(", ");
      return {
        allowed: false,
        reason: `This task is blocked by: ${blockingTaskNames}. Complete those tasks first.`,
      };
    }

    return { allowed: true };
  },
};

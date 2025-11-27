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

/**
 * Create a new task link
 */
export async function createTaskLink(data: CreateTaskLinkInput) {
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

  // Check if link already exists
  const existingLink = await prisma.taskLink.findFirst({
    where: {
      sourceTaskId,
      targetTaskId,
      relationship,
    },
  });

  if (existingLink) {
    throw new AppError(400, "LINK_EXISTS", "Task link already exists");
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
}

/**
 * Get all task links for a task (both as source and target)
 */
export async function getTaskLinksByTaskId(taskId: string) {
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
}

/**
 * Get a single task link by id
 */
export async function getTaskLinkById(linkId: string) {
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
}

/**
 * Update a task link
 */
export async function updateTaskLink(
  linkId: string,
  data: UpdateTaskLinkInput
) {
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
}

/**
 * Delete a task link
 */
export async function deleteTaskLink(linkId: string) {
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
}

/**
 * Check if a task can change status based on blocking relationships
 */
export async function canTaskChangeStatus(
  taskId: string,
  newStatus: TaskStatus
): Promise<{ allowed: boolean; reason?: string }> {
  // Only check blocking when moving to IN_PROGRESS or DONE
  if (newStatus === TaskStatus.TODO) {
    return { allowed: true };
  }

  // Get all BLOCKED_BY relationships where this task is the source
  // (This task says "I am blocked by Target")
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

  // Get all BLOCKS relationships where this task is the target
  // (Source says "I block This Task")
  const blocksLinks = await prisma.taskLink.findMany({
    where: {
      targetTaskId: taskId,
      relationship: TaskRelationship.BLOCKS,
    },
    include: {
      sourceTask: {
        select: {
          id: true,
          title: true,
          status: true,
        },
      },
    },
  });

  // Combine blockers from both types of links
  const blockers = [
    ...blockedByLinks.map(link => link.targetTask),
    ...blocksLinks.map(link => link.sourceTask),
  ];

  // Check if any blocking tasks are not DONE
  const incompleteBlockers = blockers.filter(
    task => task.status !== TaskStatus.DONE
  );

  if (incompleteBlockers.length > 0) {
    const blockingTaskNames = incompleteBlockers
      .map(task => task.title)
      .join(", ");
    return {
      allowed: false,
      reason: `This task is blocked by: ${blockingTaskNames}. Complete those tasks first.`,
    };
  }

  return { allowed: true };
}

/**
 * Reset dependent tasks to TODO when a blocking task is undone
 */
export async function resetDependentTasks(taskId: string) {
  const allAffectedTaskIds = new Set<string>();
  const queue = [taskId];
  const visited = new Set<string>([taskId]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    // Find tasks directly blocked by currentId
    // Case 1: Tasks that are BLOCKED_BY currentId (currentId is target)
    const blockedByLinks = await prisma.taskLink.findMany({
      where: {
        targetTaskId: currentId,
        relationship: TaskRelationship.BLOCKED_BY,
      },
      select: { sourceTaskId: true },
    });

    // Case 2: Tasks that currentId BLOCKS (currentId is source)
    const blocksLinks = await prisma.taskLink.findMany({
      where: {
        sourceTaskId: currentId,
        relationship: TaskRelationship.BLOCKS,
      },
      select: { targetTaskId: true },
    });

    const directDependents = [
      ...blockedByLinks.map(l => l.sourceTaskId),
      ...blocksLinks.map(l => l.targetTaskId),
    ];

    for (const dependentId of directDependents) {
      if (!visited.has(dependentId)) {
        visited.add(dependentId);
        allAffectedTaskIds.add(dependentId);
        queue.push(dependentId);
      }
    }
  }

  const taskIdsToReset = Array.from(allAffectedTaskIds);

  if (taskIdsToReset.length === 0) {
    return [];
  }

  // Update status to TODO
  await prisma.task.updateMany({
    where: {
      id: { in: taskIdsToReset },
      status: { not: TaskStatus.TODO }, // Only update if not already TODO
    },
    data: {
      status: TaskStatus.TODO,
    },
  });

  // Get project IDs of reset tasks
  const resetTasks = await prisma.task.findMany({
    where: { id: { in: taskIdsToReset } },
    select: { projectId: true },
    distinct: ["projectId"],
  });

  const projectIds = resetTasks.map(t => t.projectId);

  if (projectIds.length > 0) {
    await prisma.project.updateMany({
      where: {
        id: { in: projectIds },
        status: "COMPLETED",
      },
      data: {
        status: "IN_PROGRESS",
      },
    });
  }

  return taskIdsToReset;
}

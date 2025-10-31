import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

export async function getDashboardProjectsService(params: {
  userId: string;
  limit?: string | number;
}) {
  const { userId, limit } = params;

  const whereCondition: Prisma.ProjectWhereInput = {
    OR: [{ creatorId: userId }, { members: { some: { userId } } }],
  };

  const totalProjectCount = await prisma.project.count({ where: whereCondition });

  const takeValue =
    typeof limit === "string" && !isNaN(parseInt(limit))
      ? parseInt(limit)
      : typeof limit === "number"
      ? limit
      : undefined;

  const projects = await prisma.project.findMany({
    where: whereCondition,
    include: {
      creator: { select: { id: true, name: true, image: true } },
      members: {
        select: {
          userId: true,
          user: { select: { id: true, name: true, image: true, email: true } },
        },
      },
      _count: { select: { tasks: true } },
      tasks: { select: { status: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: takeValue,
  });

  const projectsWithStats = projects.map((project: any) => {
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t: any) => t.status === "DONE").length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const { tasks, ...projectWithoutTasks } = project;
    return {
      ...projectWithoutTasks,
      memberCount: project.members.length,
      taskCount: totalTasks,
      completedTaskCount: completedTasks,
      completionPercentage,
    };
  });

  return { total: totalProjectCount, projects: projectsWithStats };
}

export async function getDashboardActivityService(userId: string) {
  const userProjects = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });

  const createdProjects = await prisma.project.findMany({
    where: { creatorId: userId },
    select: { id: true },
  });

  const allProjectIds = [...userProjects.map((p) => p.projectId), ...createdProjects.map((p) => p.id)];
  const uniqueProjectIds = [...new Set(allProjectIds)];

  if (uniqueProjectIds.length === 0) return [] as any[];

  const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const projectCreations = await prisma.project.findMany({
    where: { id: { in: uniqueProjectIds }, createdAt: { gte: last30Days } },
    select: {
      id: true,
      name: true,
      creatorId: true,
      creator: { select: { id: true, name: true, image: true, email: true } },
      createdAt: true,
    },
  });

  const memberAdditions = await prisma.projectMember.findMany({
    where: { projectId: { in: uniqueProjectIds }, joinedAt: { gte: last30Days } },
    select: {
      projectId: true,
      userId: true,
      role: true,
      joinedAt: true,
      user: { select: { id: true, name: true, image: true, email: true } },
      project: {
        select: {
          id: true,
          name: true,
          creatorId: true,
          creator: { select: { id: true, name: true, image: true, email: true } },
        },
      },
    },
  });

  const taskCreations = await prisma.task.findMany({
    where: { projectId: { in: uniqueProjectIds }, createdAt: { gte: last30Days } },
    select: {
      id: true,
      title: true,
      projectId: true,
      creatorId: true,
      createdAt: true,
      project: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, image: true, email: true } },
    },
  });

  const completedTasks = await prisma.task.findMany({
    where: { projectId: { in: uniqueProjectIds }, status: "DONE", updatedAt: { gte: last30Days } },
    select: {
      id: true,
      title: true,
      projectId: true,
      assigneeId: true,
      status: true,
      updatedAt: true,
      assignee: { select: { id: true, name: true, image: true, email: true } },
      project: { select: { id: true, name: true } },
    },
  });

  const taskUpdates = await prisma.task.findMany({
    where: { projectId: { in: uniqueProjectIds }, updatedAt: { gte: last30Days } },
    select: {
      id: true,
      title: true,
      projectId: true,
      assigneeId: true,
      status: true,
      updatedAt: true,
      assignee: { select: { id: true, name: true, image: true, email: true } },
      project: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  const activities = [
    ...projectCreations
      .filter((p: any) => p.creatorId === userId)
      .map((project: any) => ({
        id: `project-created-${project.id}`,
        type: "PROJECT_CREATED",
        projectId: project.id,
        projectName: project.name,
        userId: project.creatorId,
        userName: project.creator.name,
        userImage: project.creator.image,
        userEmail: project.creator.email,
        createdAt: project.createdAt,
      })),
    ...memberAdditions
      .filter((m: any) => m.user.id === userId || m.project.creatorId === userId)
      .map((member: any) => ({
        id: `member-added-${member.projectId}-${member.userId}`,
        type: "MEMBER_ADDED",
        projectId: member.projectId,
        projectName: member.project.name,
        userId: member.project.creatorId,
        userName: member.project.creator.name,
        userImage: member.project.creator.image,
        userEmail: member.project.creator.email,
        createdAt: member.joinedAt,
        targetUser: member.user,
        details: { role: member.role },
      })),
    ...taskCreations
      .filter((t: any) => t.creatorId === userId)
      .map((task: any) => ({
        id: `task-created-${task.id}`,
        type: "TASK_CREATED",
        projectId: task.projectId,
        projectName: task.project.name,
        userId: task.creatorId,
        userName: task.creator.name,
        userImage: task.creator.image,
        userEmail: task.creator.email,
        createdAt: task.createdAt,
        entityId: task.id,
        entityTitle: task.title,
      })),
    ...completedTasks
      .filter((t: any) => t.assigneeId === userId)
      .map((task: any) => ({
        id: `task-completed-${task.id}`,
        type: "TASK_COMPLETED",
        projectId: task.projectId,
        projectName: task.project.name,
        userId: task.assigneeId || "",
        userName: task.assignee?.name || "Unknown",
        userImage: task.assignee?.image || null,
        userEmail: task.assignee?.email || "",
        createdAt: task.updatedAt,
        entityId: task.id,
        entityTitle: task.title,
      })),
    ...taskUpdates
      .filter((t: any) => t.assigneeId === userId)
      .map((task: any) => ({
        id: `task-updated-${task.id}-${task.updatedAt.getTime()}`,
        type: "TASK_UPDATED",
        projectId: task.projectId,
        projectName: task.project.name,
        userId: task.assigneeId || "",
        userName: task.assignee?.name || "Unknown",
        userImage: task.assignee?.image || null,
        userEmail: task.assignee?.email || "",
        createdAt: task.updatedAt,
        entityId: task.id,
        entityTitle: task.title,
        details: { newStatus: task.status },
      })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  return activities;
}

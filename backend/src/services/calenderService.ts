import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getCalendarEvents(
  userId: string,
  startDate?: string,
  endDate?: string
) {
  const dateFilter: any = {};
  if (startDate) dateFilter.gte = new Date(startDate as string);
  if (endDate) dateFilter.lte = new Date(endDate as string);

  // Get all projects where the user is a member
  const projects = await prisma.project.findMany({
    where: {
      OR: [{ creatorId: userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      dueDate: true,
      createdAt: true,
      tasks: {
        select: {
          id: true,
          title: true,
          description: true,
          status: true,
          dueDate: true,
          priority: true,
          assigneeId: true,
          assignee: {
            select: { id: true, name: true, image: true },
          },
        },
        where:
          dateFilter.gte || dateFilter.lte
            ? {
                dueDate: dateFilter,
              }
            : undefined,
      },
    },
  });

  // Get all tasks directly assigned to the user
  const assignedTasks = await prisma.task.findMany({
    where: {
      assigneeId: userId,
      ...(dateFilter.gte || dateFilter.lte ? { dueDate: dateFilter } : {}),
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, image: true } },
    },
  });

  // data format for gantt chart and calendar
  const projectEvents = projects.map((project: any) => ({
    id: `project-${project.id}`,
    title: project.name,
    type: "project",
    start: project.createdAt,
    end: project.dueDate || null,
    status: project.status,
    description: project.description,
    resourceId: "projects",
    tasks: project.tasks.map((task: any) => ({
      id: `task-${task.id}`,
      title: task.title,
      type: "task",
      start: project.createdAt,
      end: task.dueDate || null,
      parentId: `project-${project.id}`,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assigneeId,
      assignee: task.assignee,
      description: task.description,
      resourceId: task.assigneeId || "unassigned",
    })),
  }));

  const resources = [
    { id: "projects", title: "Projects", color: "#7c3aed" },
    { id: "unassigned", title: "Unassigned", color: "#6b7280" },
    ...projects.flatMap((project: any) =>
      project.tasks
        .filter((task: any) => task.assigneeId)
        .map((task: any) => ({
          id: task.assigneeId!,
          title: task.assignee?.name || "Unknown",
          imageUrl: task.assignee?.image || null,
        }))
    ),
  ].filter(
    (resource, index, self) =>
        // Remove duplicates by id
      index === self.findIndex((r) => r.id === resource.id)
  );

  const calendarEvents = [
    ...projects.map((project: any) => ({
      id: `project-start-${project.id}`,
      title: `${project.name} (Start)`,
      start: project.createdAt,
      allDay: true,
      type: "project-start",
      projectId: project.id,
      color: "#7c3aed",
    })),
    ...projects
      .filter((project: any) => project.dueDate)
      .map((project: any) => ({
        id: `project-due-${project.id}`,
        title: `${project.name} (Due)`,
        start: project.dueDate!,
        allDay: true,
        type: "project-due",
        projectId: project.id,
        color: "#dc2626",
      })),
    ...assignedTasks
      .filter((task: any) => task.dueDate)
      .map((task: any) => ({
        id: `task-due-${task.id}`,
        title: `Task Due: ${task.title}`,
        start: task.dueDate!,
        allDay: true,
        type: "task-due",
        taskId: task.id,
        projectId: task.project.id,
        color: task.status === "DONE" ? "#22c55e" : "#f59e0b",
      })),
  ];

  return {
    gantt: { projects: projectEvents, resources },
    calendar: calendarEvents,
  };
}

export async function getDeadlines(userId: string, daysAhead: number) {
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + daysAhead);

  const tasks = await prisma.task.findMany({
    where: {
      OR: [{ assigneeId: userId }, { creatorId: userId }],
      dueDate: { gte: today, lte: endDate },
      status: { not: "DONE" },
    },
    include: {
      project: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, image: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  // project deadlines
  const projects = await prisma.project.findMany({
    where: {
      OR: [{ creatorId: userId }, { members: { some: { userId } } }],
      dueDate: { gte: today, lte: endDate },
      status: { not: "COMPLETED" },
    },
    select: {
      id: true,
      name: true,
      description: true,
      dueDate: true,
      status: true,
      creator: { select: { id: true, name: true, image: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  // combine and sort deadlines
  const deadlines = [
    ...tasks.map((task: any) => ({
      id: `task-${task.id}`,
      title: task.title,
      dueDate: task.dueDate,
      type: "task",
      priority: task.priority,
      project: { id: task.project.id, name: task.project.name },
      assignee: task.assignee,
    })),
    ...projects.map((project: any) => ({
      id: `project-${project.id}`,
      title: project.name,
      dueDate: project.dueDate,
      type: "project",
      project: { id: project.id, name: project.name },
      description: project.description,
    })),
  ].sort(
    (a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
  );

  return deadlines;
}
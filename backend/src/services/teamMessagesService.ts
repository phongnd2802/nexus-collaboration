import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getUserTeamProjectsService(userId: string) {
  const projects = await prisma.project.findMany({
    where: { OR: [{ creatorId: userId }, { members: { some: { userId } } }] },
    include: {
      creator: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      chatMessages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { user: { select: { id: true, name: true, image: true } } },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return projects.map((project: any) => {
    const lastMessage = project.chatMessages[0];
    return {
      projectId: project.id,
      isTeamChat: true,
      name: project.name,
      description: project.description,
      creator: project.creator.name,
      image: null,
      memberCount: project.members.length,
      lastMessageAt: lastMessage ? lastMessage.createdAt : project.updatedAt,
      lastMessageContent: lastMessage ? lastMessage.content : "No messages yet",
      lastMessageSender: lastMessage ? lastMessage.user : null,
      unreadCount: 0,
    };
  });
}

export async function getProjectMessagesService(projectId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: { code: 404, message: "Project not found" } };

  const messages = await prisma.chatMessage.findMany({
    where: { projectId },
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });
  return messages;
}

export async function sendTeamMessageService(
  projectId: string,
  userId: string,
  content: string
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) return { error: { code: 404, message: "Project not found" } };

  const isCreator = project.creatorId === userId;
  const isMember = project.members.some((m: any) => m.userId === userId);
  if (!isCreator && !isMember) {
    return { error: { code: 403, message: "User is not a member of this project" } };
  }

  const message = await prisma.chatMessage.create({
    data: { content, projectId, userId },
    include: { user: { select: { id: true, name: true, image: true } } },
  });

  const memberIds = project.members.map((m: any) => m.userId);
  if (!memberIds.includes(project.creatorId)) memberIds.push(project.creatorId);

  return { message, memberIds };
}


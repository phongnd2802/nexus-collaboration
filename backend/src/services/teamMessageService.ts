import { PrismaClient } from "@prisma/client";
import { AppError } from "../utils/errors";

const prisma = new PrismaClient();

export async function getProjectsByUser(userId: string) {
  const projects = await prisma.project.findMany({
    where: {
      OR: [{ creatorId: userId }, { members: { some: { userId } } }],
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          },
        },
      },

      chatMessages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const teamConversations = projects.map((project: any) => {
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
      lastMessageContent: lastMessage ? lastMessage.content : "",
      lastMessageSender: lastMessage ? lastMessage.user : null,
      unreadCount: 0,
    };
  });

  return teamConversations;
}

export async function getMessagesByProject(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  // Get all messages for this project
  const messages = await prisma.chatMessage.findMany({
    where: {
      projectId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return messages;
}

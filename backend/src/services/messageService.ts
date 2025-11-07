import { AppError } from "./../utils/errors";
import { PrismaClient } from "@prisma/client";
import { validate, messageValidation } from "../middleware/validation";

const prisma = new PrismaClient();

export async function getAllConversations(userId: string) {
  const sentMessages = await prisma.directMessage.findMany({
    where: {
      senderId: userId,
    },
    select: {
      receiverId: true,
      content: true,
      createdAt: true,
      receiver: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const receivedMessages = await prisma.directMessage.findMany({
    where: {
      receiverId: userId,
    },
    select: {
      senderId: true,
      content: true,
      createdAt: true,
      read: true,
      sender: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const unreadCounts = await prisma.directMessage.groupBy({
    by: ["senderId"],
    where: {
      receiverId: userId,
      read: false,
    },
    _count: {
      id: true,
    },
  });

  const unreadCountMap = new Map();
  unreadCounts.forEach((count: any) => {
    unreadCountMap.set(count.senderId, count._count.id);
  });

  const userMap = new Map();
  const latestMessageMap = new Map();
  sentMessages.forEach((message: any) => {
    if (!userMap.has(message.receiverId)) {
      userMap.set(message.receiverId, message.receiver);
      latestMessageMap.set(message.receiverId, {
        content: message.content,
        createdAt: message.createdAt,
      });
    } else if (
      message.createdAt > latestMessageMap.get(message.receiverId).createdAt
    ) {
      latestMessageMap.set(message.receiverId, {
        content: message.content,
        createdAt: message.createdAt,
      });
    }
  });

  receivedMessages.forEach((message: any) => {
    if (!userMap.has(message.senderId)) {
      userMap.set(message.senderId, message.sender);
      latestMessageMap.set(message.senderId, {
        content: message.content,
        createdAt: message.createdAt,
      });
    } else if (
      message.createdAt > latestMessageMap.get(message.senderId).createdAt
    ) {
      latestMessageMap.set(message.senderId, {
        content: message.content,
        createdAt: message.createdAt,
      });
    }
  });

  const conversations = Array.from(userMap.entries()).map(([userId, user]) => {
    const latestMessage = latestMessageMap.get(userId);
    return {
      userId,
      user,
      lastMessageAt: latestMessage.createdAt,
      lastMessageContent: latestMessage.content,
      unreadCount: unreadCountMap.get(userId) || 0,
    };
  });
  conversations.sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  return conversations;
}

export async function getConversationsBetweenUsers(
  userId: string,
  otherUserId: string
) {
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    include: {
      sender: {
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

  await prisma.directMessage.updateMany({
    where: {
      senderId: otherUserId,
      receiverId: userId,
      read: false,
    },
    data: {
      read: true,
    },
  });

  return messages;
}

export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string
) {
  if (!senderId || !receiverId || !content) {
    throw new AppError(
      400,
      "MISSING_FIELDS",
      "Sender, receiver, and content are required"
    );
  }

  const [sender, receiver] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId } }),
    prisma.user.findUnique({ where: { id: receiverId } }),
  ]);

  if (!sender || !receiver) {
    throw new AppError(
      404,
      "SENDER_OR_RECEIVER_NOT_FOUND",
      "Sender or receiver not found"
    );
  }

  const message = await prisma.directMessage.create({
    data: {
      content,
      senderId,
      receiverId,
    },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  return message;
}

export async function getUnreadMessageCount(userId: string) {
  const unreadCount = await prisma.directMessage.count({
    where: {
      receiverId: userId,
      read: false,
    },
  });

  const unreadBySender = await prisma.directMessage.groupBy({
    by: ["senderId"],
    where: {
      receiverId: userId,
      read: false,
    },
    _count: {
      id: true,
    },
  });

  return {
    unreadCount,
    unreadBySender: unreadBySender.map((item: any) => ({
      senderId: item.senderId,
      count: item._count.id,
    })),
  };
}

export async function markMessagesAsRead(userId: string, otherUserId: string) {
  await prisma.directMessage.updateMany({
    where: {
      senderId: otherUserId,
      receiverId: userId,
      read: false,
    },
    data: {
      read: true,
    },
  });

  return { message: "Messages marked as read" };
}

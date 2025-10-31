import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getUserConversationsService(userId: string) {
  const sentMessages = await prisma.directMessage.findMany({
    where: { senderId: userId },
    select: {
      receiverId: true,
      content: true,
      createdAt: true,
      receiver: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const receivedMessages = await prisma.directMessage.findMany({
    where: { receiverId: userId },
    select: {
      senderId: true,
      content: true,
      createdAt: true,
      read: true,
      sender: { select: { id: true, name: true, email: true, image: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const unreadCounts = await prisma.directMessage.groupBy({
    by: ["senderId"],
    where: { receiverId: userId, read: false },
    _count: { id: true },
  });

  const unreadCountMap = new Map<string, number>();
  unreadCounts.forEach((c: any) => unreadCountMap.set(c.senderId, c._count.id));

  const userMap = new Map<string, any>();
  const latestMessageMap = new Map<string, { content: string; createdAt: Date }>();

  sentMessages.forEach((m: any) => {
    if (!userMap.has(m.receiverId)) {
      userMap.set(m.receiverId, m.receiver);
      latestMessageMap.set(m.receiverId, { content: m.content, createdAt: m.createdAt });
    } else if (m.createdAt > latestMessageMap.get(m.receiverId)!.createdAt) {
      latestMessageMap.set(m.receiverId, { content: m.content, createdAt: m.createdAt });
    }
  });

  receivedMessages.forEach((m: any) => {
    if (!userMap.has(m.senderId)) {
      userMap.set(m.senderId, m.sender);
      latestMessageMap.set(m.senderId, { content: m.content, createdAt: m.createdAt });
    } else if (m.createdAt > latestMessageMap.get(m.senderId)!.createdAt) {
      latestMessageMap.set(m.senderId, { content: m.content, createdAt: m.createdAt });
    }
  });

  const conversations = Array.from(userMap.entries()).map(([otherId, user]) => {
    const latest = latestMessageMap.get(otherId)!;
    return {
      userId: otherId,
      user,
      lastMessageAt: latest.createdAt,
      lastMessageContent: latest.content,
      unreadCount: unreadCountMap.get(otherId) || 0,
    };
  });

  conversations.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  return conversations;
}

export async function getDirectConversationService(userId: string, otherUserId: string) {
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    include: { sender: { select: { id: true, name: true, image: true } } },
    orderBy: { createdAt: "asc" },
  });

  await prisma.directMessage.updateMany({
    where: { senderId: otherUserId, receiverId: userId, read: false },
    data: { read: true },
  });

  return messages;
}

export async function sendMessageService(
  senderId: string,
  receiverId: string,
  content: string
) {
  const [sender, receiver] = await Promise.all([
    prisma.user.findUnique({ where: { id: senderId } }),
    prisma.user.findUnique({ where: { id: receiverId } }),
  ]);
  if (!sender || !receiver) {
    return { error: { code: 404, message: "Sender or receiver not found" } };
  }
  const message = await prisma.directMessage.create({
    data: { content, senderId, receiverId },
    include: { sender: { select: { id: true, name: true, image: true } } },
  });
  return message;
}

export async function getUnreadSummaryService(userId: string) {
  const unreadCount = await prisma.directMessage.count({
    where: { receiverId: userId, read: false },
  });

  const unreadBySender = await prisma.directMessage.groupBy({
    by: ["senderId"],
    where: { receiverId: userId, read: false },
    _count: { id: true },
  });

  return {
    unreadCount,
    unreadBySender: unreadBySender.map((item: any) => ({
      senderId: item.senderId,
      count: item._count.id,
    })),
  };
}

export async function markReadService(userId: string, otherUserId: string) {
  await prisma.directMessage.updateMany({
    where: { senderId: otherUserId, receiverId: userId, read: false },
    data: { read: true },
  });
}


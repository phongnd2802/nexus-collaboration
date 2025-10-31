import { Request, Response, RequestHandler } from "express";
import { validate, messageValidation } from "../middleware/validation";
import { debugError } from "../utils/debug";
import {
  getUserConversationsService,
  getDirectConversationService,
  sendMessageService,
  getUnreadSummaryService,
  markReadService,
} from "../services/messagesService";

export const getConversations: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const conversations = await getUserConversationsService(userId);
    res.status(200).json(conversations);
  } catch (error) {
    debugError("Error fetching conversations:", error);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

export const getDirect: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const otherUserId = req.headers["x-other-user-id"] as string;
    const messages = await getDirectConversationService(userId, otherUserId);

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${otherUserId}`).emit("messages_read", { userId });
    }
    res.status(200).json(messages);
  } catch (error) {
    debugError("Error fetching messages:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

export const sendMessage: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { senderId, receiverId, content } = req.body;
    if (!senderId || !receiverId || !content) {
      res
        .status(400)
        .json({ message: "Sender, receiver, and content are required" });
      return;
    }
    const result = await sendMessageService(senderId, receiverId, content);
    if ((result as any).error) {
      const { code, message } = (result as any).error;
      res.status(code).json({ message });
      return;
    }

    const message = result as any;
    const io = req.app.get("io");
    if (io) {
      io.to(`user:${senderId}`).to(`user:${receiverId}`).emit("new_message", message);
      io.to(`user:${receiverId}`).emit("conversation_update", {
        userId: senderId,
        lastMessageAt: message.createdAt,
        lastMessageContent: message.content,
        isUnread: true,
      });
      io.to(`user:${senderId}`).emit("conversation_update", {
        userId: receiverId,
        lastMessageAt: message.createdAt,
        lastMessageContent: message.content,
        isUnread: false,
      });
    }

    res.status(201).json(message);
  } catch (error) {
    debugError("Error sending message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};

export const getUnread: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const summary = await getUnreadSummaryService(userId);
    res.status(200).json(summary);
  } catch (error) {
    debugError("Error counting unread messages:", error);
    res.status(500).json({ message: "Failed to count unread messages" });
  }
};

export const markRead: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const otherUserId = req.headers["x-other-user-id"] as string;
    await markReadService(userId, otherUserId);

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${otherUserId}`).emit("messages_read", { userId });
    }

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    debugError("Error marking messages as read:", error);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
};


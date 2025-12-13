import { Request, Response } from "express";
import { sendError } from "../utils/errors";
import {
  getAllConversations,
  getConversationsBetweenUsers,
  sendMessage,
  getUnreadMessageCount,
  markMessagesAsRead,
} from "../services/messageService";

export const getAllConversationsController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const conversations = await getAllConversations(userId);
    res.status(200).json(conversations);
  } catch (err) {
    sendError(res, err);
  }
};

export const getConversationsBetweenUsersController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const otherUserId = req.params.otherUserId;
    const conversations = await getConversationsBetweenUsers(
      userId,
      otherUserId
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`user:${otherUserId}`).emit("messages_read", {
        userId: userId,
      });
    }

    res.status(200).json(conversations);
  } catch (err) {
    sendError(res, err);
  }
};

export async function sendMessageController(req: Request, res: Response) {
  try {
    const { senderId, receiverId, content } = req.body;

    const message = await sendMessage(senderId, receiverId, content);    // Socket.io to notify clients
    const io = req.app.get("io");
    if (io) {
      io.to(`user:${senderId}`)
        .to(`user:${receiverId}`)
        .emit("new_message", message);

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
    sendError(res, error);
  }
}

export const getUnreadMessageCountController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const count = await getUnreadMessageCount(userId);
    res.status(200).json(count);
  } catch (err) {
    sendError(res, err);
  }
};

export const markMessagesAsReadController = async (
  req: Request,
  res: Response
) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const otherUserId = req.params.otherUserId;
    await markMessagesAsRead(userId, otherUserId);

    // we notify the other user that their messages have been read via Socket.io
    const io = req.app.get("io");
    if (io) {
      io.to(`user:${otherUserId}`).emit("messages_read", {
        userId: userId,
      });
    }

    res.status(200).json({ message: "Messages marked as read" });
  } catch (err) {
    sendError(res, err);
  }
};

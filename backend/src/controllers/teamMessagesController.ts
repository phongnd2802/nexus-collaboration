import { Request, Response, RequestHandler } from "express";
import { debugError } from "../utils/debug";
import {
  getUserTeamProjectsService,
  getProjectMessagesService,
  sendTeamMessageService,
} from "../services/teamMessagesService";

export const listUserTeamConversations: RequestHandler = async (
  req: Request,
  res: Response
) => {
  const { userId } = req.params;
  try {
    const items = await getUserTeamProjectsService(userId);
    res.status(200).json(items);
  } catch (error) {
    debugError("Error fetching team conversations:", error);
    res.status(500).json({ message: "Failed to fetch team conversations" });
  }
};

export const getProjectMessages: RequestHandler = async (
  req: Request,
  res: Response
) => {
  const { projectId } = req.params;
  try {
    const result = await getProjectMessagesService(projectId);
    if ((result as any).error) {
      const { code, message } = (result as any).error;
      res.status(code).json({ message });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error fetching project messages:", error);
    res.status(500).json({ message: "Failed to fetch project messages" });
  }
};

export const sendTeamMessage: RequestHandler = async (
  req: Request,
  res: Response
) => {
  const { projectId, userId, content } = req.body;
  try {
    if (!projectId || !userId || !content) {
      res
        .status(400)
        .json({ message: "Project ID, user ID, and content are required" });
      return;
    }
    const result = await sendTeamMessageService(projectId, userId, content);
    if ((result as any).error) {
      const { code, message } = (result as any).error;
      res.status(code).json({ message });
      return;
    }
    const { message, memberIds } = result as any;
    const io = req.app.get("io");
    if (io) {
      memberIds.forEach((memberId: string) => {
        io.to(`user:${memberId}`).emit("new_team_message", { message, projectId });
        io.to(`user:${memberId}`).emit("team_conversation_update", {
          projectId,
          lastMessageAt: message.createdAt,
          lastMessageContent: message.content,
          lastMessageSender: message.user,
          isUnread: memberId !== userId,
        });
      });
    }
    res.status(201).json(message);
  } catch (error) {
    debugError("Error sending team message:", error);
    res.status(500).json({ message: "Failed to send message" });
  }
};


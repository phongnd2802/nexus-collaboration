import express, { Router, Request, Response } from "express";
import {
  getProjectsByUserController,
  getMessagesByProjectController,
} from "../controllers/teamMessageController";
import { PrismaClient } from "@prisma/client";
import { debugError } from "../utils/debug";

const prisma = new PrismaClient();
const teamMessagesRouter: Router = express.Router();

export default teamMessagesRouter;

// GET /api/team-messages/projects/:userId - Get all projects the user is a member of
teamMessagesRouter.get("/projects/:userId", getProjectsByUserController);

// GET /api/team-messages/project/:projectId - Get all messages for a project
teamMessagesRouter.get("/project/:projectId", getMessagesByProjectController);

// POST /api/team-messages/send - Send a message to a project team
teamMessagesRouter.post("/send", function (req: Request, res: Response) {
  const { projectId, userId, content } = req.body;

  (async () => {
    if (!projectId || !userId || !content) {
      return res
        .status(400)
        .json({ message: "Project ID, user ID, and content are required" });
    }

    try {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: true,
        },
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // membership check
      const isCreator = project.creatorId === userId;
      const isMember = project.members.some(
        (member: any) => member.userId === userId
      );

      if (!isCreator && !isMember) {
        return res
          .status(403)
          .json({ message: "User is not a member of this project" });
      }

      // new message creation
      const message = await prisma.chatMessage.create({
        data: {
          content,
          projectId,
          userId,
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
      });

      const io = req.app.get("io");
      if (io) {
        // Emit to all project members
        const memberIds = project.members.map((member: any) => member.userId);
        if (!memberIds.includes(project.creatorId)) {
          memberIds.push(project.creatorId);
        }

        memberIds.forEach((memberId: any) => {
          io.to(`user:${memberId}`).emit("new_team_message", {
            message,
            projectId,
          });

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
  })();
});

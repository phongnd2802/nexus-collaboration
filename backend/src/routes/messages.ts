import express, { Router } from "express";
import { validate, messageValidation } from "../middleware/validation";
import {
  getConversationsBetweenUsersController,
  getAllConversationsController,
  markMessagesAsReadController,
  sendMessageController,
  getUnreadMessageCountController,
} from "../controllers/messageController";

const messagesRouter: Router = express.Router();

export default messagesRouter;

// GET /api/messages/conversations - Get all conversations for a user
messagesRouter.get("/conversations", getAllConversationsController);

// GET /api/messages/direct - Get conversation between two users
messagesRouter.get("/direct", getConversationsBetweenUsersController);

// POST /api/messages/send - Send a message
messagesRouter.post(
  "/send",
  validate(messageValidation.send) as express.RequestHandler,
  sendMessageController
);

// GET /api/messages/unread - Get count of unread messages
messagesRouter.get("/unread", getUnreadMessageCountController);

// PATCH /api/messages/mark-read/:userId/:otherUserId - Mark messages as read
messagesRouter.patch("/mark-read", markMessagesAsReadController);

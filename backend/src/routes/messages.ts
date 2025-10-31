import express, { Router } from "express";
import { validate, messageValidation } from "../middleware/validation";
import {
  getConversations,
  getDirect,
  sendMessage,
  getUnread,
  markRead,
} from "../controllers/messagesController";

const messagesRouter: Router = express.Router();

export default messagesRouter;

// GET /api/messages/conversations - Get all conversations for a user
messagesRouter.get("/conversations", getConversations);

// GET /api/messages/direct - Get conversation between two users
messagesRouter.get("/direct", getDirect);

// POST /api/messages/send - Send a message
messagesRouter.post(
  "/send",
  validate(messageValidation.send) as express.RequestHandler,
  sendMessage
);

// GET /api/messages/unread - Get count of unread messages
messagesRouter.get("/unread", getUnread);

// PATCH /api/messages/mark-read - Mark messages as read
messagesRouter.patch("/mark-read", markRead);

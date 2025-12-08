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

messagesRouter.get("/conversations", getAllConversationsController);
messagesRouter.get("/direct", getConversationsBetweenUsersController);

messagesRouter.post(
  "/send",
  validate(messageValidation.send) as express.RequestHandler,
  sendMessageController
);
messagesRouter.get("/unread", getUnreadMessageCountController);
messagesRouter.patch("/mark-read", markMessagesAsReadController);

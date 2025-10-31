import express, { Router } from "express";
import {
  getProjectMessages,
  listUserTeamConversations,
  sendTeamMessage,
} from "../controllers/teamMessagesController";

const teamMessagesRouter: Router = express.Router();

export default teamMessagesRouter;

// GET /api/team-messages/projects/:userId - Get all projects the user is a member of
teamMessagesRouter.get("/projects/:userId", listUserTeamConversations);

// GET /api/team-messages/project/:projectId - Get all messages for a project
teamMessagesRouter.get("/project/:projectId", getProjectMessages);

// POST /api/team-messages/send - Send a message to a project team
teamMessagesRouter.post("/send", sendTeamMessage);

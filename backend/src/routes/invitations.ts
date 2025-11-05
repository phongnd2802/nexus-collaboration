import express, { Router } from "express";
import {
  getPendingInvitationsController,
  acceptInvitationController,
  declineInvitationController,
  getInvitationByTokenController,
} from "../controllers/invitationController.js";

const invitationsRouter: Router = express.Router();

export default invitationsRouter;

// GET /api/invitations/pending - Get all pending invitations for a user
invitationsRouter.get("/pending", getPendingInvitationsController);

// POST /api/invitations/accept - Accept an invitation
invitationsRouter.post("/accept", acceptInvitationController);

// POST /api/invitations/decline - Decline an invitation
invitationsRouter.post("/decline", declineInvitationController);

// GET /api/invitations/token/:token - Validate an invitation token
invitationsRouter.get("/token/:token", getInvitationByTokenController);

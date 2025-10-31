import express, { Router } from "express";
import {
  acceptInvitation,
  declineInvitation,
  getInvitationByToken,
  getPendingInvitations,
} from "../controllers/invitationsController";

const invitationsRouter: Router = express.Router();

export default invitationsRouter;

// GET /api/invitations/pending - Get all pending invitations for a user
invitationsRouter.get("/pending", getPendingInvitations);

// POST /api/invitations/accept - Accept an invitation
invitationsRouter.post("/accept", acceptInvitation);

// POST /api/invitations/decline - Decline an invitation
invitationsRouter.post("/decline", declineInvitation);

// GET /api/invitations/token/:token - Get invitation details by token
invitationsRouter.get("/token/:token", getInvitationByToken);


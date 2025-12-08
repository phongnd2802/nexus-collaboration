import express, { Router } from "express";
import {
  getPendingInvitationsController,
  acceptInvitationController,
  declineInvitationController,
  getInvitationByTokenController,
} from "../controllers/invitationController";

const invitationsRouter: Router = express.Router();

export default invitationsRouter;

invitationsRouter.get("/pending", getPendingInvitationsController);
invitationsRouter.post("/accept", acceptInvitationController);
invitationsRouter.post("/decline", declineInvitationController);
invitationsRouter.get("/token/:token", getInvitationByTokenController);

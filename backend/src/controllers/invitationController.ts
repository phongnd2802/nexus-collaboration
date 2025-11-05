import { Request, Response } from "express";
import {
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
  getInvitationByToken,
} from "../services/invitationService.js";

export async function getPendingInvitationsController(
  req: Request,
  res: Response
) {
  try {
    const email = req.query.email as string;
    const invitations = await getPendingInvitations(email);
    res.status(200).json(invitations);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch pending invitations" });
  }
}

export async function acceptInvitationController(req: Request, res: Response) {
  try {
    const { token, userId } = req.body;
    const result = await acceptInvitation(token, userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to accept invitation" });
  }
}

export async function declineInvitationController(req: Request, res: Response) {
  try {
    const { token, userId } = req.body;
    const result = await declineInvitation(token, userId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: "Failed to decline invitation" });
  }
}

export async function getInvitationByTokenController(
  req: Request,
  res: Response
) {
  try {
    const { token } = req.params;
    const invitation = await getInvitationByToken(token);
    res.status(200).json(invitation);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch invitation" });
  }
}

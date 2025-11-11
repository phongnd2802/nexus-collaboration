import { Request, Response } from "express";
import {
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
  getInvitationByToken,
} from "../services/invitationService";
import { sendError } from "../utils/errors";

export async function getPendingInvitationsController(
  req: Request,
  res: Response
) {
  try {
    const email = req.query.email as string;
    const invitations = await getPendingInvitations(email);
    res.status(200).json(invitations);
  } catch (error) {
    sendError(res, error);
  }
}

export async function acceptInvitationController(req: Request, res: Response) {
  try {
    const { invitationId, userId } = req.body;
    const result = await acceptInvitation(invitationId, userId);
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function declineInvitationController(req: Request, res: Response) {
  try {
    const { invitationId, userId } = req.body;
    const result = await declineInvitation(invitationId, userId);
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
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
    sendError(res, error);
  }
}

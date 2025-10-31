import { Request, Response, RequestHandler } from "express";
import { debugError } from "../utils/debug";
import {
  acceptInvitationService,
  declineInvitationService,
  getInvitationByTokenService,
  getPendingInvitationsService,
} from "../services/invitationsService";

export const getPendingInvitations: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const email = req.query.email as string;
    if (!email) {
      res.status(400).json({ message: "Email is required" });
      return;
    }
    const data = await getPendingInvitationsService(email);
    res.status(200).json(data);
  } catch (error) {
    debugError("Error fetching pending invitations:", error);
    res.status(500).json({ message: "Failed to fetch pending invitations" });
  }
};

export const acceptInvitation: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { invitationId, userId } = req.body;
    if (!invitationId) {
      res.status(400).json({ message: "Invitation ID is required" });
      return;
    }
    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    const result = await acceptInvitationService(invitationId, userId);
    if ((result as any).error) {
      const { code, message, meta } = (result as any).error;
      res.status(code).json({ message, ...(meta || {}) });
      return;
    }
    res.status(200).json({
      message: "Invitation accepted",
      projectId: (result as any).projectId,
    });
  } catch (error) {
    debugError("Error accepting invitation:", error);
    res.status(500).json({ message: "Failed to accept invitation" });
  }
};

export const declineInvitation: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { invitationId, userId } = req.body;
    if (!invitationId) {
      res.status(400).json({ message: "Invitation ID is required" });
      return;
    }
    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }
    const result = await declineInvitationService(invitationId, userId);
    if ((result as any).error) {
      const { code, message } = (result as any).error;
      res.status(code).json({ message });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error declining invitation:", error);
    res.status(500).json({ message: "Failed to decline invitation" });
  }
};

export const getInvitationByToken: RequestHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { token } = req.params;
    const result = await getInvitationByTokenService(token);
    if ((result as any).error) {
      const { code, message } = (result as any).error;
      res.status(code).json({ message });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error fetching invitation by token:", error);
    res.status(500).json({ message: "Failed to fetch invitation" });
  }
};


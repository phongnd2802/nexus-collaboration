import { Request, Response, RequestHandler } from "express";
import { debugError } from "../utils/debug";
import {
  getTeamCollaboratorsService,
  searchCollaboratorsService,
  getSharedProjectsService,
} from "../services/collaboratorsService";

export const getTeamCollaborators: RequestHandler = async (
  req: Request,
  res: Response
) => {
  const userId =
    (req.headers["x-user-id"] as string) || (req.query.userId as string);

  try {
    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }
    const result = await getTeamCollaboratorsService(userId);
    res.status(200).json(result);
  } catch (error) {
    debugError("Error fetching collaborators:", error);
    res.status(500).json({ message: "Failed to fetch collaborators" });
  }
};

export const searchCollaborators: RequestHandler = async (
  req: Request,
  res: Response
) => {
  const { search } = req.query;
  const userId =
    (req.headers["x-user-id"] as string) || (req.query.userId as string);

  try {
    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }
    const result = await searchCollaboratorsService(
      userId,
      typeof search === "string" ? search : undefined
    );
    res.status(200).json(result);
  } catch (error) {
    debugError("Error fetching collaborators:", error);
    res.status(500).json({ message: "Failed to fetch collaborators" });
  }
};

export const getSharedProjects: RequestHandler = async (
  req: Request,
  res: Response
) => {
  const userId =
    (req.headers["x-user-id"] as string) || (req.query.userId as string);
  const { targetUserId } = req.query;

  try {
    if (!userId) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }
    if (!targetUserId || typeof targetUserId !== "string") {
      res.status(400).json({ message: "Target User ID is required" });
      return;
    }
    const result = await getSharedProjectsService(userId, targetUserId);
    res.status(200).json(result);
  } catch (error) {
    debugError("Error fetching shared projects:", error);
    res.status(500).json({ message: "Failed to fetch shared projects" });
  }
};


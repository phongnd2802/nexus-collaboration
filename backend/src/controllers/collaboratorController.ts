import { Request, Response } from "express";
import {
  getTeamCollaboratorsService,
  searchCollaborators,
  getSharedProjects,
} from "../services/collaboratorService";

export async function getTeamCollaboratorsController(
  req: Request,
  res: Response
) {
  try {
    const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const { collaborators } = await getTeamCollaboratorsService(userId);

    res.status(200).json({ collaborators });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to fetch collaborators",
    });
  }
}

export async function searchCollaboratorsController(
  req: Request,
  res: Response
) {
    try {
    const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const query = req.query.q as string;
    const { collaborators } = await searchCollaborators(userId, query);

    res.status(200).json({ collaborators });
    } catch (error: any) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to search collaborators",
    });
  }
}

export async function getSharedProjectsController(
  req: Request,
  res: Response
) {
    try {
    const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const targetUserId = req.params.targetUserId;
    const { projects, count } = await getSharedProjects(userId, targetUserId);
    res.status(200).json({ projects, count });
    } catch (error: any) {
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to fetch shared projects",
    });
  }
}

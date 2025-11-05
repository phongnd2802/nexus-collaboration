import { Request, Response, RequestHandler, NextFunction } from "express";
import {
  getTeamCollaboratorsService,
  searchCollaborators,
  getSharedProjects,
} from "../services/collaboratorService";

export const getTeamCollaboratorsController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const { collaborators } = await getTeamCollaboratorsService(userId);

    res.status(200).json({ collaborators });
  } catch (error) {
    next(error);
  }
};

export const searchCollaboratorsController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const query = req.query.q as string;
    const { collaborators } = await searchCollaborators(userId, query);

    res.status(200).json({ collaborators });
  } catch (error) {
    next(error);
  }
};

export const getSharedProjectsController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const targetUserId = req.params.targetUserId;
    const { projects, count } = await getSharedProjects(userId, targetUserId);
    res.status(200).json({ projects, count });
  } catch (error) {
    next(error);
  }
};

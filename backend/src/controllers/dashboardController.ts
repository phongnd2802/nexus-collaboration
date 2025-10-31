import { Request, Response, RequestHandler } from "express";
import { debugError } from "../utils/debug";
import { getDashboardProjectsService, getDashboardActivityService } from "../services/dashboardService";

export const getProjects: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const { limit } = req.query as { limit?: string };
    const result = await getDashboardProjectsService({ userId, limit });
    res.status(200).json(result);
  } catch (error) {
    debugError("Error fetching projects:", error);
    res.status(500).json({ message: "Failed to fetch projects" });
  }
};

export const getActivity: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const activities = await getDashboardActivityService(userId);
    res.status(200).json(activities);
  } catch (error) {
    debugError("Error fetching activity feed:", error);
    res.status(500).json({ message: "Failed to fetch activity feed" });
  }
};


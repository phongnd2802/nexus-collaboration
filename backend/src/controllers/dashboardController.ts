import { Request, Response } from "express";
import {
  getDashboardProjects,
  getDashboardActivity,
} from "../services/dashboardService";

export async function getDashboardProjectsController(
  req: Request,
  res: Response
) {
  try {
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const limit = req.query.limit as string;
    const projects = await getDashboardProjects(userId, limit);
    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch projects" });
  }
}

export async function getDashboardActivityController(
  req: Request,
  res: Response
) {
  try {
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const activity = await getDashboardActivity(userId);
    res.status(200).json(activity);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
}

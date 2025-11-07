import { Request, Response } from "express";
import { sendError } from "../utils/errors";
import {
  getProjectsByUser,
  getMessagesByProject,
} from "../services/teamMessageService";

export async function getProjectsByUserController(req: Request, res: Response) {
  const userId = req.params.userId;
  try {
    const projects = await getProjectsByUser(userId);
    res.status(200).json(projects);
  } catch (error) {
    sendError(res, error);
  }
}

export async function getMessagesByProjectController(
  req: Request,
  res: Response
) {
  const projectId = req.params.projectId;
  try {
    const messages = await getMessagesByProject(projectId);
    res.status(200).json(messages);
  } catch (error) {
    sendError(res, error);
  }
}

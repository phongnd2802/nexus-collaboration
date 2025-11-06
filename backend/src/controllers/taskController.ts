import { RequestHandler, Request, Response } from "express";
import {
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  getTask,
  completeTask,
  getTaskFiles,
  deleteTaskFiles,
  getAllAssignedTask,
  getAllCreatedTasks,
  getAllTasksByProjectId,
} from "../services/taskService";
import { sendError } from "../utils/errors";

export const getAllTasksController: RequestHandler = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const { limit } = req.query as { limit?: string | number };
    const tasks = await getAllTasks(userId, limit);
    return res.status(200).json(tasks);
  } catch (err) {
    return sendError(res, err);
  }
};

export const getAllAssignedTasksController: RequestHandler = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const { limit } = req.query as { limit?: string | number };
    const tasks = await getAllAssignedTask(userId, limit);
    return res.status(200).json(tasks);
  } catch (err) {
    return sendError(res, err);
  }
};

export const getAllCreatedTasksController: RequestHandler = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const { limit } = req.query as { limit?: string | number };
    const tasks = await getAllCreatedTasks(userId, limit);
    return res.status(200).json(tasks);
  } catch (err) {
    return sendError(res, err);
  }
};

export const getAllTasksByProjectController: RequestHandler = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { projectId } = req.params as { projectId: string };
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const tasks = await getAllTasksByProjectId(userId, projectId);
    return res.status(200).json(tasks);
  } catch (err) {
    return sendError(res, err);
  }
};

export const createTaskController: RequestHandler = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { projectId } = req.params as { projectId: string };
    const task = await createTask(projectId, req.body);
    return res.status(201).json(task);
  } catch (err) {
    return sendError(res, err);
  }
};

export const updateTaskController: RequestHandler = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { taskId } = req.params as { taskId: string };
    const updated = await updateTask(taskId, req.body);
    return res.status(200).json(updated);
  } catch (err) {
    return sendError(res, err);
  }
};

export const deleteTaskController: RequestHandler = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { taskId } = req.params as { taskId: string };
    const { userId } = req.body as { userId: string };
    const result = await deleteTask(taskId, userId);
    return res.status(200).json(result);
  } catch (err) {
    return sendError(res, err);
  }
};

export const getTaskController: RequestHandler = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { taskId } = req.params as { taskId: string };
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const task = await getTask(taskId, userId);
    return res.status(200).json(task);
  } catch (err) {
    return sendError(res, err);
  }
};

export const completeTaskController: RequestHandler = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { taskId } = req.params as { taskId: string };
    const updated = await completeTask(taskId, req.body);
    return res.status(200).json(updated);
  } catch (err) {
    return sendError(res, err);
  }
};

export const getTaskFilesController: RequestHandler = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const { taskId } = req.params as { taskId: string };
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const files = await getTaskFiles(taskId, userId);
    return res.status(200).json(files);
  } catch (err) {
    return sendError(res, err);
  }
};

export const deleteTaskFilesController: RequestHandler = async (
  req: Request,
  res: Response
) : Promise<any> => {
  try {
    const { fileId } = req.params as { fileId: string };
    const { userId } = req.body as { userId: string };
    const result = await deleteTaskFiles(fileId, userId);
    return res.status(200).json(result);
  } catch (err) {
    return sendError(res, err);
  }
};

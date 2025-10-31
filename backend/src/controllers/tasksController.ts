import { Request, Response, RequestHandler } from "express";
import { debugError } from "../utils/debug";
import {
  listAllTasksService,
  listAssignedTasksService,
  listCreatedTasksService,
  listProjectTasksService,
  createTaskService,
  updateTaskService,
  deleteTaskService,
  getTaskByIdService,
  completeTaskService,
  deleteTaskFileService,
  listTaskFilesService,
} from "../services/tasksService";

function parseLimit(limit: any): number | undefined {
  return typeof limit === "string" && !isNaN(parseInt(limit))
    ? parseInt(limit)
    : undefined;
}

export const listAllTasks: RequestHandler = async (req: Request, res: Response) => {
  const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
  const { limit } = req.query;
  try {
    const tasks = await listAllTasksService(userId, parseLimit(limit));
    res.status(200).json(tasks);
  } catch (error) {
    debugError("Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

export const listAssignedTasks: RequestHandler = async (req: Request, res: Response) => {
  const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
  const { limit } = req.query;
  try {
    const tasks = await listAssignedTasksService(userId, parseLimit(limit));
    res.status(200).json(tasks);
  } catch (error) {
    debugError("Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

export const listCreatedTasks: RequestHandler = async (req: Request, res: Response) => {
  const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
  const { limit } = req.query;
  try {
    const tasks = await listCreatedTasksService(userId, parseLimit(limit));
    res.status(200).json(tasks);
  } catch (error) {
    debugError("Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

export const listProjectTasks: RequestHandler = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
  try {
    if (!userId) { res.status(400).json({ message: "User ID is required" }); return; }
    const result = await listProjectTasksService(projectId, userId);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error fetching tasks:", error);
    res.status(500).json({ message: "Failed to fetch tasks" });
  }
};

export const createTask: RequestHandler = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const { title, description, assigneeId, dueDate, priority, creatorId, files } = req.body;
    if (!title || title.length < 3 || title.length > 100) {
      res.status(400).json({ message: "Title must be between 3 and 100 characters" });
      return;
    }
    if (description && description.length > 2000) {
      res.status(400).json({ message: "Description must be less than 2000 characters" });
      return;
    }
    if (!creatorId) { res.status(400).json({ message: "Creator ID is required" }); return; }

    const result = await createTaskService(projectId, { title, description, assigneeId, dueDate, priority, creatorId, files });
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(201).json(result);
  } catch (error) {
    debugError("Error creating task:", error);
    res.status(500).json({ message: "Failed to create task" });
  }
};

export const updateTask: RequestHandler = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
  try {
    const result = await updateTaskService(taskId, userId, req.body);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error updating task:", error);
    res.status(500).json({ message: "Failed to update task" });
  }
};

export const deleteTask: RequestHandler = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
  try {
    const result = await deleteTaskService(taskId, userId);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error deleting task:", error);
    res.status(500).json({ message: "Failed to delete task" });
  }
};

export const getTaskById: RequestHandler = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
  try {
    const result = await getTaskByIdService(taskId, userId);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error fetching task:", error);
    res.status(500).json({ message: "Failed to fetch task" });
  }
};

export const completeTask: RequestHandler = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const { userId, completionNote, deliverables } = req.body;
  try {
    const result = await completeTaskService(taskId, userId, completionNote, deliverables);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error updating completion details:", error);
    res.status(500).json({ message: "Failed to update completion details" });
  }
};

export const deleteTaskFile: RequestHandler = async (req: Request, res: Response) => {
  const { fileId } = req.params;
  const { userId } = req.body;
  try {
    const result = await deleteTaskFileService(fileId, userId);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error deleting file:", error);
    res.status(500).json({ message: "Failed to delete file" });
  }
};

export const listTaskFiles: RequestHandler = async (req: Request, res: Response) => {
  const { taskId } = req.params;
  const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
  try {
    const result = await listTaskFilesService(taskId, userId);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error fetching task files:", error);
    res.status(500).json({ message: "Failed to fetch task files" });
  }
};


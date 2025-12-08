import { Request, Response, NextFunction } from "express";
import { subtaskService } from "../services/subtaskService";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { sendError } from "../utils/errors";

export async function createSubtask(req: Request, res: Response) {
  try {
    const { taskId } = req.params;
    const { name, status, priority, assigneeId } = req.body;
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);

    const subtask = await subtaskService.createSubtask({
      taskId,
      name: name.trim(),
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      assigneeId,
      userId,
    });

    res.status(201).json(subtask);
  } catch (error: any) {
    console.error("Error creating subtask:", error);
    sendError(res, error);
  }
}

export async function getSubtasks(req: Request, res: Response) {
  try {
    const { taskId } = req.params;

    const subtasks = await subtaskService.getSubtasksByTaskId(taskId);

    res.status(200).json(subtasks);
  } catch (error: any) {
    console.error("Error fetching subtasks:", error);
    sendError(res, error);
  }
}

export async function updateSubtask(req: Request, res: Response) {
  try {
    const { subtaskId } = req.params;
    const { name, status, priority, assigneeId } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId === "" ? null : assigneeId;
    }

    const updatedSubtask = await subtaskService.updateSubtask(
      subtaskId,
      updateData
    );

    res.status(200).json(updatedSubtask);
  } catch (error: any) {
    console.error("Error updating subtask:", error);
    sendError(res, error);
  }
}

export async function deleteSubtask(req: Request, res: Response) {
  try {
    const { subtaskId } = req.params;

    await subtaskService.deleteSubtask(subtaskId);

    res.status(200).json({ message: "Subtask deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting subtask:", error);
    sendError(res, error);
  }
}

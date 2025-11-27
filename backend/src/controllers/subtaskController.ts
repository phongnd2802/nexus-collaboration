import { Request, Response } from "express";
import { createSubtask, getSubtasksByTaskId, updateSubtask, deleteSubtask } from "../services/subtaskService";
import { TaskStatus, TaskPriority } from "@prisma/client";
import { sendError } from "../utils/errors";
/**
 * Create a new subtask
 * POST /api/tasks/:taskId/subtasks
 */
export async function createSubtaskController(req: Request, res: Response) {
  try {
    const { taskId } = req.params;
    const { name, status, priority, assigneeId } = req.body;

    const subtask = await createSubtask({
      taskId,
      name: name.trim(),
      status: status as TaskStatus,
      priority: priority as TaskPriority,
      assigneeId,
    });

    res.status(201).json(subtask);
  } catch (error: any) {
    console.error("Error creating subtask:", error);
    sendError(res, error);
  }
}

/**
 * Get all subtasks for a task
 * GET /api/tasks/:taskId/subtasks
 */
export async function getSubtasksController(req: Request, res: Response) {
  try {
    const { taskId } = req.params;

    const subtasks = await getSubtasksByTaskId(taskId);

    res.status(200).json(subtasks);
  } catch (error: any) {
    console.error("Error fetching subtasks:", error);
    sendError(res, error);
  }
}

/**
 * Update a subtask
 * PATCH /api/tasks/:taskId/subtasks/:subtaskId
 */
export async function updateSubtaskController(req: Request, res: Response) {
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

    const updatedSubtask = await updateSubtask(
      subtaskId,
      updateData
    );

    res.status(200).json(updatedSubtask);
  } catch (error: any) {
    console.error("Error updating subtask:", error);
    sendError(res, error);
  }
}

/**
 * Delete a subtask
 * DELETE /api/tasks/:taskId/subtasks/:subtaskId
 */
export async function deleteSubtaskController(req: Request, res: Response) {
  try {
    const { subtaskId } = req.params;

    await deleteSubtask(subtaskId);

    res.status(200).json({ message: "Subtask deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting subtask:", error);
    sendError(res, error);
  }
}

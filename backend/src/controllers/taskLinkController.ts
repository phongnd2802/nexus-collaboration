import { Request, Response, NextFunction } from "express";
import { taskLinkService } from "../services/taskLinkService";
import { TaskRelationship } from "@prisma/client";
import { sendError } from "../utils/errors";

/**
 * Create a new task link
 * POST /api/tasks/:taskId/links
 */
export async function createTaskLink(
  req: Request,
  res: Response
) {
  try {
    const { taskId } = req.params;
    const { linkedTaskId, relationship } = req.body;

    // For BLOCKS: current task blocks the linked task
    // For BLOCKED_BY: current task is blocked by the linked task
    const sourceTaskId = relationship === "BLOCKS" ? taskId : linkedTaskId;
    const targetTaskId = relationship === "BLOCKS" ? linkedTaskId : taskId;
    const linkRelationship =
      relationship === "BLOCKS"
        ? TaskRelationship.BLOCKS
        : TaskRelationship.BLOCKED_BY;

    const taskLink = await taskLinkService.createTaskLink({
      sourceTaskId,
      targetTaskId,
      relationship: linkRelationship,
    });

    res.status(201).json(taskLink);
  } catch (error: any) {
    console.error("Error creating task link:", error);
    sendError(res, error);
  }
}

/**
 * Get all task links for a task
 * GET /api/tasks/:taskId/links
 */
export async function getTaskLinks(
  req: Request,
  res: Response
) {
  try {
    const { taskId } = req.params;

    const taskLinks = await taskLinkService.getTaskLinksByTaskId(taskId);

    res.status(200).json(taskLinks);
  } catch (error: any) {
    console.error("Error fetching task links:", error);
    sendError(res, error);
  }
}

/**
 * Update a task link
 * PATCH /api/tasks/:taskId/links/:linkId
 */
export async function updateTaskLink(
  req: Request,
  res: Response
) {
  try {
    const { linkId, taskId } = req.params;
    const { relationship } = req.body;

    const updateData: any = {};
    if (relationship !== undefined) {
      // Get the existing link to check context
      const existingLink = await taskLinkService.getTaskLinkById(linkId);
      
      if (!existingLink) {
        return res.status(404).json({ message: "Task link not found" });
      }

      // If we are updating from the target task's perspective, we need to invert the relationship
      // because the DB stores it relative to sourceTask
      if (existingLink.targetTask.id === taskId) {
        updateData.relationship = 
          relationship === "BLOCKS" 
            ? TaskRelationship.BLOCKED_BY 
            : TaskRelationship.BLOCKS;
      } else {
        updateData.relationship = relationship;
      }
    }

    const updatedLink = await taskLinkService.updateTaskLink(
      linkId,
      updateData
    );

    res.status(200).json(updatedLink);
  } catch (error: any) {
    console.error("Error updating task link:", error);
    sendError(res, error);
  }
}

/**
 * Delete a task link
 * DELETE /api/tasks/:taskId/links/:linkId
 */
export async function deleteTaskLink(
  req: Request,
  res: Response
) {
  try {
    const { linkId } = req.params;

    await taskLinkService.deleteTaskLink(linkId);

    res.status(200).json({ message: "Task link deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting task link:", error);
    sendError(res, error);
  }
}

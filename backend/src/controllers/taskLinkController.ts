import { Request, Response, NextFunction } from "express";
import { taskLinkService } from "../services/taskLinkService";
import { TaskRelationship } from "@prisma/client";
import { sendError } from "../utils/errors";

export async function createTaskLink(req: Request, res: Response) {
  try {
    const { taskId } = req.params;
    const { linkedTaskId, relationship } = req.body;
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);

    const sourceTaskId = taskId;
    const targetTaskId = linkedTaskId;
    const linkRelationship =
      relationship === "BLOCKS"
        ? TaskRelationship.BLOCKS
        : TaskRelationship.BLOCKED_BY;

    const taskLink = await taskLinkService.createTaskLink({
      sourceTaskId,
      targetTaskId,
      relationship: linkRelationship,
      userId,
    });
    res.status(201).json(taskLink);
  } catch (error: any) {
    console.error("❌ Error creating task link:", error);
    sendError(res, error);
  }
}

export async function getTaskLinks(req: Request, res: Response) {
  try {
    const { taskId } = req.params;

    const taskLinks = await taskLinkService.getTaskLinksByTaskId(taskId);

    res.status(200).json(taskLinks);
  } catch (error: any) {
    console.error("Error fetching task links:", error);
    sendError(res, error);
  }
}

export async function updateTaskLink(req: Request, res: Response) {
  try {
    const { linkId } = req.params;
    const { relationship } = req.body;

    const updateData: any = {};
    if (relationship !== undefined) {
      updateData.relationship = relationship;
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

export async function deleteTaskLink(req: Request, res: Response) {
  try {
    const { linkId } = req.params;

    await taskLinkService.deleteTaskLink(linkId);

    res.status(200).json({ message: "Task link deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting task link:", error);
    sendError(res, error);
  }
}

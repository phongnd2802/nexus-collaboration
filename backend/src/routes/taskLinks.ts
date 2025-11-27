import { Router } from "express";
import {
  deleteTaskLinkController,
  getTaskLinksController,
  updateTaskLinkController,
  createTaskLinkController,
} from "../controllers/taskLinkController";

const router = Router({ mergeParams: true }); // mergeParams để access :taskId từ parent router

// Create task link
router.post("/", createTaskLinkController);

// Get all task links for a task
router.get("/", getTaskLinksController);

// Update task link
router.patch("/:linkId", updateTaskLinkController);

// Delete task link
router.delete("/:linkId", deleteTaskLinkController);

export default router;

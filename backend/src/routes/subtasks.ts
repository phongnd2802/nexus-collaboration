import express, { Router } from "express";
import {
  createSubtaskController,
  getSubtasksController,
  updateSubtaskController,
  deleteSubtaskController,
} from "../controllers/subtaskController";

const subTasksRouter: Router = express.Router({ mergeParams: true });

// Create subtask
// Route: /api/tasks/:taskId/subtasks
subTasksRouter.post("/", createSubtaskController);

// Get all subtasks for a task
// Route: /api/tasks/:taskId/subtasks
subTasksRouter.get("/", getSubtasksController);

// Update subtask
// Route: /api/tasks/:taskId/subtasks/:subtaskId
subTasksRouter.patch("/:subtaskId", updateSubtaskController);

// Delete subtask
// Route: /api/tasks/:taskId/subtasks/:subtaskId
subTasksRouter.delete("/:subtaskId", deleteSubtaskController);

export default subTasksRouter;

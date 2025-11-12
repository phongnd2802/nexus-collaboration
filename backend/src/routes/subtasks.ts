import express, { Router } from "express";
import * as subtaskController from "../controllers/subtaskController";

const subTasksRouter: Router = express.Router({ mergeParams: true });

// Debug logging for subtasks router
subTasksRouter.use((req, res, next) => {
  console.log(`📋 Subtasks Router - ${req.method} ${req.originalUrl}`);
  console.log(`   Path: ${req.path}`);
  console.log(`   Params:`, req.params);
  console.log(`   Base URL: ${req.baseUrl}`);
  next();
});

// Create subtask
// Route: /api/tasks/:taskId/subtasks
subTasksRouter.post("/", subtaskController.createSubtask);

// Get all subtasks for a task
// Route: /api/tasks/:taskId/subtasks
subTasksRouter.get("/", subtaskController.getSubtasks);

// Update subtask
// Route: /api/tasks/:taskId/subtasks/:subtaskId
subTasksRouter.patch("/:subtaskId", subtaskController.updateSubtask);

// Delete subtask
// Route: /api/tasks/:taskId/subtasks/:subtaskId
subTasksRouter.delete("/:subtaskId", subtaskController.deleteSubtask);

export default subTasksRouter;

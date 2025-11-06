import express, { Router } from "express";
import {
  getAllTasksController,
  getAllAssignedTasksController,
  getAllCreatedTasksController,
  getAllTasksByProjectController,
  createTaskController,
  updateTaskController,
  deleteTaskController,
  getTaskController,
  completeTaskController,
  getTaskFilesController,
  deleteTaskFilesController,
} from "../controllers/taskController";

const tasksRouter: Router = express.Router();

export default tasksRouter;

// GET /api/tasks/all - Get all tasks for a user
tasksRouter.get("/all", getAllTasksController);

// GET /api/tasks/assigned - Get all tasks assigned to a user
tasksRouter.get("/assigned", getAllAssignedTasksController);

// GET /api/tasks/created - Get all tasks created by a user
tasksRouter.get("/created", getAllCreatedTasksController);

// GET /api/tasks/project/:projectId - Get all tasks for a project
tasksRouter.get("/project/:projectId", getAllTasksByProjectController);

// POST /api/tasks/create/:projectId - Create a new task for a project
tasksRouter.post("/create/:projectId", createTaskController);

// PATCH /api/tasks/update/:taskId - Update a task
tasksRouter.patch("/update/:taskId", updateTaskController);

// DELETE /api/tasks/delete/:taskId - Delete a task
tasksRouter.delete("/delete/:taskId", deleteTaskController);

// GET /api/tasks/:taskId - Get a task by ID
tasksRouter.get("/:taskId", getTaskController);

// POST /api/tasks/complete/:taskId - Add completion note and deliverables to a completed task
tasksRouter.post("/complete/:taskId", completeTaskController);

// DELETE /api/tasks/files/:fileId - Delete a task file
tasksRouter.delete("/files/:fileId", deleteTaskFilesController);

// GET /api/tasks/:taskId/files - Get all files for a task
tasksRouter.get("/:taskId/files", getTaskFilesController);

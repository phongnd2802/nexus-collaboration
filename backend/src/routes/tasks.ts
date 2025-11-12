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
import subtasksRouter from "./subtasks";
import taskLinksRouter from "./taskLinks";

const tasksRouter: Router = express.Router();

// Debug logging
console.log("🔧 Tasks router initialized");
console.log("📍 Mounting subtasks router to /:taskId/subtasks");
console.log("📍 Mounting task links router to /:taskId/links");

// Log all requests to tasks router
tasksRouter.use((req, res, next) => {
  console.log(`📨 Tasks Router - ${req.method} ${req.originalUrl}`);
  console.log(`   Path: ${req.path}`);
  console.log(`   Params:`, req.params);
  next();
});

// Static routes first (no params)
// GET /api/tasks/all - Get all tasks for a user
tasksRouter.get("/all", getAllTasksController);

// GET /api/tasks/assigned - Get all tasks assigned to a user
tasksRouter.get("/assigned", getAllAssignedTasksController);

// GET /api/tasks/created - Get all tasks created by a user
tasksRouter.get("/created", getAllCreatedTasksController);

// Routes with specific path segments before params
// GET /api/tasks/project/:projectId - Get all tasks for a project
tasksRouter.get("/project/:projectId", getAllTasksByProjectController);

// POST /api/tasks/create/:projectId - Create a new task for a project
tasksRouter.post("/create/:projectId", createTaskController);

// PATCH /api/tasks/update/:taskId - Update a task
tasksRouter.patch("/update/:taskId", updateTaskController);

// DELETE /api/tasks/delete/:taskId - Delete a task
tasksRouter.delete("/delete/:taskId", deleteTaskController);

// POST /api/tasks/complete/:taskId - Add completion note and deliverables to a completed task
tasksRouter.post("/complete/:taskId", completeTaskController);

// DELETE /api/tasks/files/:fileId - Delete a task file
tasksRouter.delete("/files/:fileId", deleteTaskFilesController);

// Mount nested routers (these need to be before generic :taskId routes)
// /api/tasks/:taskId/subtasks/*
tasksRouter.use("/:taskId/subtasks", subtasksRouter);

// /api/tasks/:taskId/links/*
tasksRouter.use("/:taskId/links", taskLinksRouter);

// Generic param routes last
// GET /api/tasks/:taskId/files - Get all files for a task
tasksRouter.get("/:taskId/files", getTaskFilesController);

// GET /api/tasks/:taskId - Get a task by ID (MUST be last among :taskId routes)
tasksRouter.get("/:taskId", getTaskController);

export default tasksRouter;

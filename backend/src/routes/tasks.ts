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

tasksRouter.get("/all", getAllTasksController);
tasksRouter.get("/assigned", getAllAssignedTasksController);
tasksRouter.get("/created", getAllCreatedTasksController);
tasksRouter.get("/project/:projectId", getAllTasksByProjectController);

tasksRouter.post("/create/:projectId", createTaskController);
tasksRouter.patch("/update/:taskId", updateTaskController);
tasksRouter.delete("/delete/:taskId", deleteTaskController);
tasksRouter.post("/complete/:taskId", completeTaskController);
tasksRouter.delete("/files/:fileId", deleteTaskFilesController);
tasksRouter.use("/:taskId/subtasks", subtasksRouter);
tasksRouter.use("/:taskId/links", taskLinksRouter);
tasksRouter.get("/:taskId/files", getTaskFilesController);
tasksRouter.get("/:taskId", getTaskController);

export default tasksRouter;

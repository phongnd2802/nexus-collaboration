import express, { Router } from "express";
import {
  completeTask,
  createTask,
  deleteTask,
  deleteTaskFile,
  getTaskById,
  listAllTasks,
  listAssignedTasks,
  listCreatedTasks,
  listProjectTasks,
  listTaskFiles,
  updateTask,
} from "../controllers/tasksController";

const tasksRouter: Router = express.Router();

export default tasksRouter;

// Listing endpoints
tasksRouter.get("/all", listAllTasks);
tasksRouter.get("/assigned", listAssignedTasks);
tasksRouter.get("/created", listCreatedTasks);
tasksRouter.get("/project/:projectId", listProjectTasks);

// CRUD endpoints
tasksRouter.post("/create/:projectId", createTask);
tasksRouter.patch("/update/:taskId", updateTask);
tasksRouter.delete("/delete/:taskId", deleteTask);
tasksRouter.get("/:taskId", getTaskById);

// Completion + files
tasksRouter.post("/complete/:taskId", completeTask);
tasksRouter.delete("/files/:fileId", deleteTaskFile);
tasksRouter.get("/:taskId/files", listTaskFiles);


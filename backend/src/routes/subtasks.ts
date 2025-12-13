import express, { Router } from "express";
import * as subtaskController from "../controllers/subtaskController";

const subTasksRouter: Router = express.Router({ mergeParams: true });

subTasksRouter.use((req, res, next) => {
  next();
});

subTasksRouter.post("/", subtaskController.createSubtask);
subTasksRouter.get("/", subtaskController.getSubtasks);
subTasksRouter.patch("/:subtaskId", subtaskController.updateSubtask);
subTasksRouter.delete("/:subtaskId", subtaskController.deleteSubtask);

export default subTasksRouter;

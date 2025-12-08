import express, { Router } from "express";
import {
  getDashboardActivityController,
  getDashboardProjectsController,
} from "../controllers/dashboardController";

const dashboardRouter: Router = express.Router();

export default dashboardRouter;

dashboardRouter.get("/projects", getDashboardProjectsController);
dashboardRouter.get("/activity", getDashboardActivityController);

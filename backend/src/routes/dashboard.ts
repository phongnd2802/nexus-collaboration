import express, { Router } from "express";
import { getDashboardActivityController, getDashboardProjectsController } from "../controllers/dashboardController";

const dashboardRouter: Router = express.Router();

export default dashboardRouter;

// GET /api/dashboard/projects
dashboardRouter.get("/projects", getDashboardProjectsController);

// GET /api/dashboard/activity
dashboardRouter.get("/activity", getDashboardActivityController);

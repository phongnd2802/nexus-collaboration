import express, { Router } from "express";
import { getProjects, getActivity } from "../controllers/dashboardController";

const dashboardRouter: Router = express.Router();

export default dashboardRouter;

// GET /api/dashboard/projects
dashboardRouter.get("/projects", getProjects);

// GET /api/dashboard/activity
dashboardRouter.get("/activity", getActivity);


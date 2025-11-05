import express, { Router } from "express";
import {
  getTeamCollaboratorsController,
  searchCollaboratorsController,
  getSharedProjectsController,
} from "../controllers/collaboratorController";

const collaboratorsRouter: Router = express.Router();

export default collaboratorsRouter;

// GET /api/collaborators
collaboratorsRouter.get("/team", getTeamCollaboratorsController);

collaboratorsRouter.get("/", searchCollaboratorsController);

// GET /api/collaborators/shared-projects - Get projects shared between two users
collaboratorsRouter.get("/shared-projects", getSharedProjectsController);

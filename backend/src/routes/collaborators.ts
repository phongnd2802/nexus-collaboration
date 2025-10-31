import express, { Router } from "express";
import {
  getTeamCollaborators,
  searchCollaborators,
  getSharedProjects,
} from "../controllers/collaboratorsController";

const collaboratorsRouter: Router = express.Router();

export default collaboratorsRouter;

// GET /api/collaborators
collaboratorsRouter.get("/team", getTeamCollaborators);

collaboratorsRouter.get("/", searchCollaborators);

// GET /api/collaborators/shared-projects - Get projects shared between two users
collaboratorsRouter.get("/shared-projects", getSharedProjects);


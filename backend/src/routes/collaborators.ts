import express, { Router } from "express";
import {
  getTeamCollaboratorsController,
  searchCollaboratorsController,
  getSharedProjectsController,
} from "../controllers/collaboratorController";

const collaboratorsRouter: Router = express.Router();

export default collaboratorsRouter;

collaboratorsRouter.get("/team", getTeamCollaboratorsController);
collaboratorsRouter.get("/", searchCollaboratorsController);
collaboratorsRouter.get("/shared-projects", getSharedProjectsController);

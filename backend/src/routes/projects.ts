import express, { Router } from "express";
import {
  createProjectController,
  getProjectByIdController,
  updateProjectController,
  deleteProjectController,
  inviteUserController,
  getInvitationsController,
  cancelInvitationController,
  getProjectFilesController,
  addFilesController,
  deleteFileController,
  updateMemberRoleController,
  removeMemberController,
} from "../controllers/projectController";

const projectsRouter: Router = express.Router();

// Project CRUD
projectsRouter.post("/new", createProjectController);
projectsRouter.get("/:id", getProjectByIdController);
projectsRouter.patch("/:id", updateProjectController);
projectsRouter.delete("/:id", deleteProjectController);

// Invitations
projectsRouter.post("/:id/invite", inviteUserController);
projectsRouter.get("/:id/invitations", getInvitationsController);
projectsRouter.delete(
  "/:id/invitations/:invitationId",
  cancelInvitationController
);

// Files
projectsRouter.get("/:id/files", getProjectFilesController);
projectsRouter.post("/:id/files/add", addFilesController);
projectsRouter.delete("/:id/files/:fileId", deleteFileController);

// Members
projectsRouter.patch("/:projectId/members/role", updateMemberRoleController);
projectsRouter.delete("/:projectId/members/remove", removeMemberController);

export default projectsRouter;

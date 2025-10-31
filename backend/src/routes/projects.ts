import express, { Router } from "express";
import {
  addProjectFiles,
  cancelInvitation,
  createProject,
  deleteProject,
  deleteProjectFile,
  getProjectById,
  inviteMember,
  listInvitations,
  listProjectFiles,
  removeMember,
  updateMemberRole,
  updateProject,
} from "../controllers/projectsController";

const projectsRouter: Router = express.Router();

export default projectsRouter;

// POST /api/projects/new - Create a new project
projectsRouter.post("/new", createProject);

// GET /api/projects/:id - Get a project by ID
projectsRouter.get("/:id", getProjectById);

// PATCH /api/projects/:id - Update a project
projectsRouter.patch("/:id", updateProject);

// DELETE /api/projects/:id - Delete a project
projectsRouter.delete("/:id", deleteProject);

// POST /api/projects/:id/invite - Invite a user to a project
projectsRouter.post("/:id/invite", inviteMember);

// GET /api/projects/:id/invitations - Get all invitations for a project
projectsRouter.get("/:id/invitations", listInvitations);

// DELETE /api/projects/:id/invitations/:invitationId - Cancel an invitation
projectsRouter.delete("/:id/invitations/:invitationId", cancelInvitation);

// GET /api/projects/:id/files - Get all files for a project
projectsRouter.get("/:id/files", listProjectFiles);

projectsRouter.post("/:id/files/add", addProjectFiles);

// DELETE /api/projects/:id/files/:fileId - Delete a project file
projectsRouter.delete("/:id/files/:fileId", deleteProjectFile);

// PATCH /api/projects/:projectId/members/role - Update a member's role
projectsRouter.patch("/:projectId/members/role", updateMemberRole);

// DELETE /api/projects/:projectId/members/remove - Remove a member from a project
projectsRouter.delete("/:projectId/members/remove", removeMember);

import { Request, Response } from "express";
import * as projectService from "../services/projectService";
import { debugError, debugLog } from "../utils/debug";
import { sendError } from "../utils/errors";

export async function createProjectController(req: Request, res: Response) {
  try {
    const { name, creatorId, description, dueDate, files } = req.body;

    const project = await projectService.createProject(
      name,
      creatorId,
      description,
      dueDate,
      files
    );

    res.status(201).json(project);
  } catch (error) {
    debugError("Error creating project:", error);
    sendError(res, error);
  }
}

export async function getProjectByIdController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);

    const project = await projectService.getProjectById(id, userId);

    res.status(200).json(project);
  } catch (error) {
    debugError("Error fetching project:", error);
    sendError(res, error);
  }
}

export async function updateProjectController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description, status, dueDate } = req.body;
    const userId = (req.headers["x-user-id"] as string) || req.body.userId;

    const updatedProject = await projectService.updateProject(id, userId, {
      name,
      description,
      status,
      dueDate,
    });

    res.status(200).json(updatedProject);
  } catch (error) {
    debugError("Error updating project:", error);
    sendError(res, error);
  }
}

export async function deleteProjectController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req.headers["x-user-id"] as string) || req.body.userId;

    const deletedProject = await projectService.deleteProject(id, userId);

    res.status(200).json(deletedProject);
  } catch (error) {
    debugError("Error deleting project:", error);
    sendError(res, error);
  }
}

export async function inviteUserController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { email, role, userId } = req.body;

    debugLog(
      `Processing invite request for project ${id}, email: ${email}, role: ${role}`
    );

    const result = await projectService.inviteUserToProject(
      id,
      email,
      role,
      userId
    );

    res.status(result.autoAccepted ? 200 : 201).json(result);
  } catch (error) {
    debugError("Error sending project invitation:", error);
    sendError(res, error);
  }
}

export async function getInvitationsController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.body.userId;

    const invitations = await projectService.getProjectInvitations(id, userId);

    res.status(200).json(invitations);
  } catch (error) {
    debugError("Error fetching project invitations:", error);
    sendError(res, error);
  }
}

export async function cancelInvitationController(req: Request, res: Response) {
  try {
    const { id, invitationId } = req.params;
    const userId = req.body.userId;

    const result = await projectService.cancelInvitation(
      id,
      invitationId,
      userId
    );

    res.status(200).json(result);
  } catch (error) {
    debugError("Error cancelling invitation:", error);
    sendError(res, error);
  }
}

export async function getProjectFilesController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);

    const projectFiles = await projectService.getProjectFiles(id, userId);

    res.status(200).json({ projectFiles });
  } catch (error) {
    debugError("Error fetching project files:", error);
    sendError(res, error);
  }
}

export async function addFilesController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { files, userId } = req.body;

    const result = await projectService.addFilesToProject(id, files, userId);

    res.status(201).json(result);
  } catch (error) {
    debugError("Error adding files to project:", error);
    sendError(res, error);
  }
}

export async function deleteFileController(req: Request, res: Response) {
  try {
    const { id: projectId, fileId } = req.params;
    const { userId } = req.body;

    const result = await projectService.deleteProjectFile(
      projectId,
      fileId,
      userId
    );

    res.status(200).json(result);
  } catch (error) {
    debugError("Error deleting project file:", error);
    sendError(res, error);
  }
}

export async function updateMemberRoleController(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { role } = req.body;
    const userId = (req.headers["x-user-id"] as string) || req.body.userId;
    const memberId =
      (req.headers["x-member-id"] as string) || req.body.memberId;

    const result = await projectService.updateMemberRole(
      projectId,
      memberId,
      role,
      userId
    );

    res.status(200).json(result);
  } catch (error) {
    debugError("Error updating member role:", error);
    sendError(res, error);
  }
}

export async function removeMemberController(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const userId = (req.headers["x-user-id"] as string) || req.body.userId;
    const memberId =
      (req.headers["x-member-id"] as string) || req.body.memberId;

    const result = await projectService.removeMember(
      projectId,
      memberId,
      userId
    );

    res.status(200).json(result);
  } catch (error) {
    debugError("Error removing project member:", error);
    sendError(res, error);
  }
}

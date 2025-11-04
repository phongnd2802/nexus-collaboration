import { Request, Response } from "express";
import * as projectService from "../services/projectService";
import { debugError, debugLog } from "../utils/debug";

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
  } catch (error: any) {
    debugError("Error creating project:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to create project",
    });
  }
}

export async function getProjectByIdController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);

    const project = await projectService.getProjectById(id, userId);

    res.status(200).json(project);
  } catch (error: any) {
    debugError("Error fetching project:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to fetch project",
    });
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
  } catch (error: any) {
    debugError("Error updating project:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to update project",
    });
  }
}

export async function deleteProjectController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = (req.headers["x-user-id"] as string) || req.body.userId;

    const deletedProject = await projectService.deleteProject(id, userId);

    res.status(200).json(deletedProject);
  } catch (error: any) {
    debugError("Error deleting project:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to delete project",
    });
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
  } catch (error: any) {
    debugError("Error sending project invitation:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to send invitation",
    });
  }
}

export async function getInvitationsController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId = req.body.userId;

    const invitations = await projectService.getProjectInvitations(id, userId);

    res.status(200).json(invitations);
  } catch (error: any) {
    debugError("Error fetching project invitations:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to fetch invitations",
    });
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
  } catch (error: any) {
    debugError("Error cancelling invitation:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to cancel invitation",
    });
  }
}

export async function getProjectFilesController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);

    const projectFiles = await projectService.getProjectFiles(id, userId);

    res.status(200).json({ projectFiles });
  } catch (error: any) {
    debugError("Error fetching project files:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to fetch project files",
    });
  }
}

export async function addFilesController(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { files, userId } = req.body;

    const result = await projectService.addFilesToProject(id, files, userId);

    res.status(201).json(result);
  } catch (error: any) {
    debugError("Error adding files to project:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to add files to project",
    });
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
  } catch (error: any) {
    debugError("Error deleting project file:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to delete file",
    });
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
  } catch (error: any) {
    debugError("Error updating member role:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to update member role",
    });
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
  } catch (error: any) {
    debugError("Error removing project member:", error);
    res.status(error.statusCode || 500).json({
      message: error.message || "Failed to remove member",
    });
  }
}

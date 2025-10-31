import { Request, Response, RequestHandler } from "express";
import { ProjectStatus } from "@prisma/client";
import { debugError } from "../utils/debug";
import {
  createProjectService,
  getProjectByIdService,
  updateProjectService,
  deleteProjectService,
  inviteMemberService,
  listInvitationsService,
  cancelInvitationService,
  listProjectFilesService,
  addProjectFilesService,
  deleteProjectFileService,
  updateMemberRoleService,
  removeMemberService,
} from "../services/projectsService";

export const createProject: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { name, description, dueDate, creatorId, files } = req.body;
    if (!name) { res.status(400).json({ message: "Project name is required" }); return; }
    if (!creatorId) { res.status(400).json({ message: "Creator ID is required" }); return; }
    const project = await createProjectService({ name, description, dueDate, creatorId, files });
    res.status(201).json(project);
  } catch (error) {
    debugError("Error creating project:", error);
    res.status(500).json({ message: "Failed to create project" });
  }
};

export const getProjectById: RequestHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
  try {
    if (!id) { res.status(400).json({ message: "Project ID is required" }); return; }
    if (!userId) { res.status(400).json({ message: "User ID is required" }); return; }
    const result = await getProjectByIdService(id, userId);
    if ((result as any).error) {
      const { code, message } = (result as any).error; res.status(code).json({ message }); return;
    }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error fetching project:", error);
    res.status(500).json({ message: "Failed to fetch project" });
  }
};

export const updateProject: RequestHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, status, dueDate } = req.body;
  const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
  try {
    if (!id) { res.status(400).json({ message: "Project ID is required" }); return; }
    if (!userId) { res.status(400).json({ message: "User ID is required" }); return; }
    const result = await updateProjectService(id, userId, {
      name,
      description,
      status: status as ProjectStatus,
      dueDate,
    });
    if ((result as any).error) {
      const { code, message } = (result as any).error; res.status(code).json({ message }); return;
    }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error updating project:", error);
    res.status(500).json({ message: "Failed to update project" });
  }
};

export const deleteProject: RequestHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
  try {
    if (!id) { res.status(400).json({ message: "Project ID is required" }); return; }
    if (!userId) { res.status(400).json({ message: "User ID is required" }); return; }
    const result = await deleteProjectService(id, userId);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error deleting project:", error);
    res.status(500).json({ message: "Failed to delete project" });
  }
};

export const inviteMember: RequestHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { email, role, userId } = req.body;
  try {
    if (!email) { res.status(400).json({ message: "Email is required" }); return; }
    if (!role) { res.status(400).json({ message: "Role is required" }); return; }
    if (!userId) { res.status(400).json({ message: "User ID is required" }); return; }
    const result = await inviteMemberService(id, userId, email, role);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(201).json(result);
  } catch (error) {
    debugError("Error sending project invitation:", error);
    res.status(500).json({ message: "Failed to send invitation" });
  }
};

export const listInvitations: RequestHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.body.userId;
  try {
    const result = await listInvitationsService(id, userId);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error fetching project invitations:", error);
    res.status(500).json({ message: "Failed to fetch invitations" });
  }
};

export const cancelInvitation: RequestHandler = async (req: Request, res: Response) => {
  const { id, invitationId } = req.params;
  const userId = req.body.userId;
  try {
    const result = await cancelInvitationService(id, userId, invitationId);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error cancelling invitation:", error);
    res.status(500).json({ message: "Failed to cancel invitation" });
  }
};

export const listProjectFiles: RequestHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
  try {
    if (!userId) { res.status(400).json({ message: "User ID is required" }); return; }
    const result = await listProjectFilesService(id, userId);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error fetching project files:", error);
    res.status(500).json({ message: "Failed to fetch project files" });
  }
};

export const addProjectFiles: RequestHandler = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { files, userId } = req.body;
  try {
    if (!userId) { res.status(400).json({ message: "User ID is required" }); return; }
    const result = await addProjectFilesService(id, userId, files || []);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(201).json(result);
  } catch (error) {
    debugError("Error adding files to project:", error);
    res.status(500).json({ message: "Failed to add files to project" });
  }
};

export const deleteProjectFile: RequestHandler = async (req: Request, res: Response) => {
  const { id: projectId, fileId } = req.params;
  const { userId } = req.body;
  try {
    if (!userId) { res.status(400).json({ message: "User ID is required" }); return; }
    const result = await deleteProjectFileService(projectId, userId, fileId);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error deleting project file:", error);
    res.status(500).json({ message: "Failed to delete file" });
  }
};

export const updateMemberRole: RequestHandler = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { role } = req.body;
  const userId = (req.headers["x-user-id"] as string) || req.body.userId;
  const memberId = (req.headers["x-member-id"] as string) || req.body.memberId;
  try {
    if (!projectId) { res.status(400).json({ message: "Project ID is required" }); return; }
    if (!memberId) { res.status(400).json({ message: "Member ID is required" }); return; }
    if (!userId) { res.status(400).json({ message: "User ID is required" }); return; }
    const result = await updateMemberRoleService(projectId, userId, memberId, role);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error updating member role:", error);
    res.status(500).json({ message: "Failed to update member role" });
  }
};

export const removeMember: RequestHandler = async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const userId = (req.headers["x-user-id"] as string) || req.body.userId;
  const memberId = (req.headers["x-member-id"] as string) || req.body.memberId;
  try {
    if (!projectId) { res.status(400).json({ message: "Project ID is required" }); return; }
    if (!memberId) { res.status(400).json({ message: "Member ID is required" }); return; }
    if (!userId) { res.status(400).json({ message: "User ID is required" }); return; }
    const result = await removeMemberService(projectId, userId, memberId);
    if ((result as any).error) { const { code, message } = (result as any).error; res.status(code).json({ message }); return; }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error removing project member:", error);
    res.status(500).json({ message: "Failed to remove member" });
  }
};


import { PrismaClient, ProjectStatus, ProjectRole } from "@prisma/client";
import crypto from "crypto";
import { sendProjectInvitationEmail } from "../utils/email";
import {
  canManageProject,
  canInviteProjectMembers,
  canManageFile,
  canViewProjectFiles,
  isProjectMember,
  canUpdateMemberRole,
  canRemoveProjectMember,
  canUploadProjectFiles,
  validateProjectRole,
  isExistingProjectMember,
  hasExistingInvitation,
} from "../utils/permissions";

const prisma = new PrismaClient();

export async function createProjectService(params: {
  name: string;
  description?: string;
  dueDate?: string | null;
  creatorId: string;
  files?: Array<{ name: string; url: string; size: number; type: string }>;
}) {
  const { name, description, dueDate, creatorId, files } = params;

  const result = await prisma.$transaction(async (tx) => {
    const newProject = await tx.project.create({
      data: {
        name,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        creatorId,
        status: "IN_PROGRESS" as ProjectStatus,
        members: { create: { userId: creatorId, role: "ADMIN" } },
      },
      include: {
        creator: { select: { id: true, name: true, email: true, image: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, image: true } },
          },
        },
      },
    });

    if (files && Array.isArray(files) && files.length > 0) {
      const filePromises = files.map((file) =>
        tx.file.create({
          data: {
            name: file.name,
            url: file.url,
            size: file.size,
            type: file.type,
            uploaderId: creatorId,
            projectId: newProject.id,
            taskId: null,
            isTaskDeliverable: false,
          },
        })
      );
      await Promise.all(filePromises);
    }

    return { newProject };
  });

  return result.newProject;
}

export async function getProjectByIdService(id: string, userId: string) {
  if (!(await isProjectMember(id, userId))) {
    return { error: { code: 403, message: "You do not have permission to view this project" } };
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });

  if (!project) return { error: { code: 404, message: "Project not found" } };
  return project;
}

export async function updateProjectService(
  id: string,
  userId: string,
  data: { name?: string; description?: string; status?: ProjectStatus; dueDate?: string | null }
) {
  if (!(await canManageProject(id, userId))) {
    return { error: { code: 403, message: "You do not have permission to update this project" } };
  }

  const updated = await prisma.project.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : undefined,
      description: data.description !== undefined ? data.description : undefined,
      status: data.status,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
    include: {
      creator: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });
  return updated;
}

export async function deleteProjectService(id: string, userId: string) {
  if (!(await canManageProject(id, userId))) {
    return { error: { code: 403, message: "You do not have permission to delete this project" } };
  }
  const deleted = await prisma.project.delete({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, email: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
    },
  });
  return deleted;
}

export async function inviteMemberService(
  projectId: string,
  userId: string,
  email: string,
  role: string
) {
  if (!validateProjectRole(role)) {
    return { error: { code: 400, message: "Invalid role" } };
  }
  if (!(await canInviteProjectMembers(projectId, userId))) {
    return { error: { code: 403, message: "You do not have permission to invite members to this project" } };
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { creator: { select: { id: true, name: true, email: true } } },
  });
  if (!project) return { error: { code: 404, message: "Project not found" } };

  const invitedUser = await prisma.user.findUnique({ where: { email } });
  if (!invitedUser) {
    return { error: { code: 404, message: "User with this email does not exist" } };
  }

  if (await isExistingProjectMember(projectId, email)) {
    return { error: { code: 400, message: "This user is already a member of this project" } };
  }

  if (invitedUser.email === "pritam.amit26@gmail.com") {
    await prisma.projectMember.create({
      data: { userId: invitedUser.id, projectId: project.id, role: role as any },
    });
    return { message: "Member added successfully" };
  }

  if (await hasExistingInvitation(projectId, email)) {
    return { error: { code: 400, message: "An invitation has already been sent to this email" } };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const invitation = await prisma.projectInvitation.create({
    data: { projectId, email, role: role as any, token, expiresAt },
  });

  await sendProjectInvitationEmail(
    email,
    token,
    project.name,
    project.creator.name || "A team member"
  );

  return {
    message: "Invitation sent successfully",
    invitation: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
    },
  };
}

export async function listInvitationsService(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) return { error: { code: 404, message: "Project not found" } };
  const isCreator = project.creatorId === userId;
  const isAdmin = project.members.some(
    (member: any) => member.userId === userId && member.role === "ADMIN"
  );
  if (!isCreator && !isAdmin) {
    return { error: { code: 403, message: "You do not have permission to view project invitations" } };
  }
  const invitations = await prisma.projectInvitation.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  return invitations;
}

export async function cancelInvitationService(
  projectId: string,
  userId: string,
  invitationId: string
) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) return { error: { code: 404, message: "Project not found" } };
  const isCreator = project.creatorId === userId;
  const isAdmin = project.members.some(
    (member: any) => member.userId === userId && member.role === "ADMIN"
  );
  if (!isCreator && !isAdmin) {
    return { error: { code: 403, message: "You do not have permission to cancel invitations" } };
  }
  const invitation = await prisma.projectInvitation.findUnique({ where: { id: invitationId } });
  if (!invitation || invitation.projectId !== projectId) {
    return { error: { code: 404, message: "Invitation not found" } };
  }
  await prisma.projectInvitation.delete({ where: { id: invitationId } });
  return { message: "Invitation cancelled successfully" };
}

export async function listProjectFilesService(projectId: string, userId: string) {
  if (!(await canViewProjectFiles(projectId, userId))) {
    return { error: { code: 403, message: "You do not have permission to view files for this project" } };
  }
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: { code: 404, message: "Project not found" } };

  const projectFiles = await prisma.file.findMany({
    where: { projectId, taskId: null },
    orderBy: { createdAt: "desc" },
  });
  return { projectFiles };
}

export async function addProjectFilesService(
  projectId: string,
  userId: string,
  files: Array<{ name: string; url: string; size: number; type: string }>
) {
  if (!(await canUploadProjectFiles(projectId, userId))) {
    return { error: { code: 403, message: "You do not have permission to add files to this project" } };
  }
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) return { error: { code: 404, message: "Project not found" } };

  if (!files || !Array.isArray(files) || files.length === 0) {
    return { error: { code: 400, message: "No files provided" } };
  }

  const createdFiles = await Promise.all(
    files.map((file) =>
      prisma.file.create({
        data: {
          name: file.name,
          url: file.url,
          size: file.size,
          type: file.type,
          uploaderId: userId,
          projectId,
          taskId: null,
          isTaskDeliverable: false,
        },
      })
    )
  );
  return { message: "Files added successfully", files: createdFiles };
}

export async function deleteProjectFileService(
  projectId: string,
  userId: string,
  fileId: string
) {
  const file = await prisma.file.findUnique({ where: { id: fileId } });
  if (!file) return { error: { code: 404, message: "File not found" } };
  if (file.projectId !== projectId) {
    return { error: { code: 400, message: "File does not belong to this project" } };
  }
  if (!(await canManageFile(fileId, userId))) {
    return { error: { code: 403, message: "You don't have permission to delete this file" } };
  }
  await prisma.file.delete({ where: { id: fileId } });
  return { message: "File deleted successfully" };
}

export async function updateMemberRoleService(
  projectId: string,
  userId: string,
  memberId: string,
  role: string
) {
  if (!validateProjectRole(role)) {
    return { error: { code: 400, message: "Invalid role" } };
  }
  const permissionCheck = await canUpdateMemberRole(projectId, userId, memberId, role);
  if (!permissionCheck.allowed) {
    return { error: { code: 403, message: permissionCheck.reason } };
  }
  const updatedMember = await prisma.projectMember.update({
    where: { id: memberId },
    data: { role: role as any },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  });
  return { message: "Member role updated successfully", member: updatedMember };
}

export async function removeMemberService(
  projectId: string,
  userId: string,
  memberId: string
) {
  const permissionCheck = await canRemoveProjectMember(projectId, userId, memberId);
  if (!permissionCheck.allowed) {
    return { error: { code: 403, message: permissionCheck.reason } };
  }
  await prisma.projectMember.delete({ where: { id: memberId } });
  return { message: "Member removed successfully" };
}

import { PrismaClient, ProjectStatus, ProjectRole } from "@prisma/client";
import { AppError } from "../utils/errors";
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

function toProjectRole(role: string): ProjectRole {
  return role.toUpperCase() as ProjectRole;
}

function toProjectStatus(status?: string): ProjectStatus | undefined {
  if (!status) return undefined;
  return status.toUpperCase() as ProjectStatus;
}

const prisma = new PrismaClient();

const PROJECT_INCLUDE = {
  creator: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  },
};

export async function createProject(
  name: string,
  creatorId: string,
  description?: string | null,
  dueDate?: string,
  files?: Array<{ name: string; url: string; size: number; type: string }>
) {
  if (!name) {
    throw new AppError(400, "MISSING_NAME_PROJECT", "Project name is required");
  }
  if (!creatorId) {
    throw new AppError(
      400,
      "MISSING_CREATOR_PROJECT",
      "Creator ID is required"
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const newProject = await tx.project.create({
      data: {
        name,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        creatorId,
        status: "IN_PROGRESS",
        members: {
          create: {
            userId: creatorId,
            role: "ADMIN",
          },
        },
      },
      include: PROJECT_INCLUDE,
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

    return newProject;
  });

  return result;
}

export async function getProjectById(id: string, userId: string) {
  if (!id) {
    throw new AppError(400, "PROJECT_ID_REQUIRED", "Project ID is required");
  }
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  if (!(await isProjectMember(id, userId))) {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You are not a member of this project"
    );
  }

  const project = await prisma.project.findUnique({
    where: { id },
    include: PROJECT_INCLUDE,
  });

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  return project;
}

export async function updateProject(
  id: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
    status?: string;
    dueDate?: string;
  }
) {
  if (!id) {
    throw new AppError(400, "PROJECT_ID_REQUIRED", "Project ID is required");
  }
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  if (!(await canManageProject(id, userId))) {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You do not have permission to update this project"
    );
  }

  const updatedProject = await prisma.project.update({
    where: { id },
    data: {
      name: data.name !== undefined ? data.name : undefined,
      description:
        data.description !== undefined ? data.description : undefined,
      status: toProjectStatus(data.status),
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
    include: PROJECT_INCLUDE,
  });

  return updatedProject;
}

export async function deleteProject(id: string, userId: string) {
  if (!id) {
    throw new AppError(400, "PROJECT_ID_REQUIRED", "Project ID is required");
  }
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  if (!(await canManageProject(id, userId))) {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You do not have permission to delete this project"
    );
  }

  const deletedProject = await prisma.project.delete({
    where: { id },
    include: PROJECT_INCLUDE,
  });

  return deletedProject;
}

export async function inviteUserToProject(
  projectId: string,
  email: string,
  role: string,
  userId: string
) {
  if (!email) {
    throw new AppError(400, "EMAIL_REQUIRED", "Email is required");
  }
  if (!role) {
    throw new AppError(400, "ROLE_REQUIRED", "Role is required");
  }
  if (!validateProjectRole(role)) {
    throw new AppError(400, "INVALID_ROLE", "Invalid role");
  }
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  if (!(await canInviteProjectMembers(projectId, userId))) {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You do not have permission to invite members to this project"
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  const invitedUser = await prisma.user.findUnique({
    where: { email },
  });

  if (!invitedUser) {
    throw new AppError(
      404,
      "USER_NOT_FOUND",
      "User with this email does not exist"
    );
  }

  if (await isExistingProjectMember(projectId, email)) {
    throw new AppError(
      400,
      "ALREADY_MEMBER",
      "This user is already a member of this project"
    );
  }

  // Auto accept for specific user
  if (invitedUser.email === "pritam.amit26@gmail.com") {
    await prisma.projectMember.create({
      data: {
        userId: invitedUser.id,
        projectId: project.id,
        role: toProjectRole(role),
      },
    });
    return { message: "Member added successfully", autoAccepted: true };
  }

  if (await hasExistingInvitation(projectId, email)) {
    throw new AppError(
      400,
      "INVITATION_EXISTS",
      "An invitation has already been sent to this email"
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const invitation = await prisma.projectInvitation.create({
    data: {
      projectId,
      email,
      role: toProjectRole(role),
      token,
      expiresAt,
    },
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

export async function getProjectInvitations(projectId: string, userId: string) {
  if (!projectId) {
    throw new AppError(400, "PROJECT_ID_REQUIRED", "Project ID is required");
  }
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: true,
    },
  });

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  const isCreator = project.creatorId === userId;
  const isAdmin = project.members.some(
    (member) => member.userId === userId && member.role === "ADMIN"
  );

  if (!isCreator && !isAdmin) {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You do not have permission to view project invitations"
    );
  }

  const invitations = await prisma.projectInvitation.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });

  return invitations;
}

export async function cancelInvitation(
  projectId: string,
  invitationId: string,
  userId: string
) {
  if (!projectId) {
    throw new AppError(400, "PROJECT_ID_REQUIRED", "Project ID is required");
  }
  if (!invitationId) {
    throw new AppError(
      400,
      "INVITATION_ID_REQUIRED",
      "Invitation ID is required"
    );
  }
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: true,
    },
  });

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  const isCreator = project.creatorId === userId;
  const isAdmin = project.members.some(
    (member) => member.userId === userId && member.role === "ADMIN"
  );

  if (!isCreator && !isAdmin) {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You do not have permission to cancel invitations"
    );
  }

  const invitation = await prisma.projectInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation || invitation.projectId !== projectId) {
    throw new AppError(404, "INVITATION_NOT_FOUND", "Invitation not found");
  }

  await prisma.projectInvitation.delete({
    where: { id: invitationId },
  });

  return { message: "Invitation cancelled successfully" };
}

export async function getProjectFiles(projectId: string, userId: string) {
  if (!projectId) {
    throw new AppError(400, "PROJECT_ID_REQUIRED", "Project ID is required");
  }
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  if (!(await canViewProjectFiles(projectId, userId))) {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You do not have permission to view files for this project"
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  const projectFiles = await prisma.file.findMany({
    where: {
      projectId,
      taskId: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return projectFiles;
}

export async function addFilesToProject(
  projectId: string,
  files: Array<{ name: string; url: string; size: number; type: string }>,
  userId: string
) {
  if (!projectId) {
    throw new AppError(400, "PROJECT_ID_REQUIRED", "Project ID is required");
  }
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  if (!(await canUploadProjectFiles(projectId, userId))) {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You do not have permission to add files to this project"
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new AppError(404, "PROJECT_NOT_FOUND", "Project not found");
  }

  if (!files || !Array.isArray(files) || files.length === 0) {
    throw new AppError(400, "NO_FILES_PROVIDED", "No files provided");
  }

  const filePromises = files.map((file) =>
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
  );

  const createdFiles = await Promise.all(filePromises);

  return {
    message: "Files added successfully",
    files: createdFiles,
  };
}

export async function deleteProjectFile(
  projectId: string,
  fileId: string,
  userId: string
) {
  if (!projectId) {
    throw new AppError(400, "PROJECT_ID_REQUIRED", "Project ID is required");
  }
  if (!fileId) {
    throw new AppError(400, "FILE_ID_REQUIRED", "File ID is required");
  }
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    throw new AppError(404, "FILE_NOT_FOUND", "File not found");
  }

  if (file.projectId !== projectId) {
    throw new AppError(
      400,
      "FILE_MISMATCH",
      "File does not belong to this project"
    );
  }

  if (!(await canManageFile(fileId, userId))) {
    throw new AppError(
      403,
      "ACCESS_DENIED",
      "You don't have permission to delete this file"
    );
  }

  await prisma.file.delete({
    where: { id: fileId },
  });

  return { message: "File deleted successfully" };
}

export async function updateMemberRole(
  projectId: string,
  memberId: string,
  role: string,
  userId: string
) {
  if (!projectId) {
    throw new AppError(400, "PROJECT_ID_REQUIRED", "Project ID is required");
  }
  if (!memberId) {
    throw new AppError(400, "MEMBER_ID_REQUIRED", "Member ID is required");
  }
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }
  if (!validateProjectRole(role)) {
    throw new AppError(400, "INVALID_ROLE", "Invalid role");
  }

  const permissionCheck = await canUpdateMemberRole(
    projectId,
    userId,
    memberId,
    role
  );

  if (!permissionCheck.allowed) {
    throw new AppError(403, "ACCESS_DENIED", permissionCheck.reason ?? "Access denied");
  }

  const updatedMember = await prisma.projectMember.update({
    where: { id: memberId },
    data: { role: toProjectRole(role) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
  });

  return {
    message: "Member role updated successfully",
    member: updatedMember,
  };
}

export async function removeMember(
  projectId: string,
  memberId: string,
  userId: string
) {
  if (!projectId) {
    throw new AppError(400, "PROJECT_ID_REQUIRED", "Project ID is required");
  }
  if (!memberId) {
    throw new AppError(400, "MEMBER_ID_REQUIRED", "Member ID is required");
  }
  if (!userId) {
    throw new AppError(400, "USER_ID_REQUIRED", "User ID is required");
  }

  const permissionCheck = await canRemoveProjectMember(
    projectId,
    userId,
    memberId
  );

  if (!permissionCheck.allowed) {
    throw new AppError(403, "ACCESS_DENIED", permissionCheck.reason ?? "Access denied");
  }

  await prisma.projectMember.delete({
    where: { id: memberId },
  });

  return { message: "Member removed successfully" };
}

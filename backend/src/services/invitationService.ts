import { PrismaClient } from "@prisma/client";
import { AppError } from "../utils/errors";
import { isTokenExpired } from "../utils/token";

const prisma = new PrismaClient();

export async function getPendingInvitations(email: string) {
  if (!email) {
    throw new AppError(400, "EMAIL_REQUIRED", "Email is required");
  }

  const pendingInvitations = await prisma.projectInvitation.findMany({
    where: {
      email,
      expiresAt: {
        gt: new Date(),
      },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const formattedInvitations = pendingInvitations.map((invitation: any) => ({
    id: invitation.id,
    projectId: invitation.projectId,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    projectName: invitation.project.name,
    inviterName: invitation.project.creator.name || "A team member",
  }));

  return formattedInvitations;
}

export async function acceptInvitation(invitationId: string, userId: string) {
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

  const invitation = await prisma.projectInvitation.findUnique({
    where: { id: invitationId },
    include: {
      project: true,
    },
  });

  if (!invitation) {
    throw new AppError(404, "INVITATION_NOT_FOUND", "Invitation not found");
  }

  // invitation expiration check
  if (isTokenExpired(invitation.expiresAt)) {
    throw new AppError(400, "INVITATION_EXPIRED", "Invitation has expired");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  if (user.email !== invitation.email) {
    throw new AppError(
      403,
      "INVITATION_MISMATCH",
      "This invitation was not sent to your email address"
    );
  }

  const existingMember = await prisma.projectMember.findFirst({
    where: {
      projectId: invitation.projectId,
      userId,
    },
  });

  if (existingMember) {
    await prisma.projectInvitation.delete({
      where: { id: invitationId },
    });

    throw new AppError(
      400,
      "ALREADY_MEMBER",
      "You are already a member of this project",
      { projectId: invitation.projectId }
    );
  }

  const result = await prisma.$transaction(async (prisma) => {
    const projectMember = await prisma.projectMember.create({
      data: {
        projectId: invitation.projectId,
        userId,
        role: invitation.role,
      },
    });

    await prisma.projectInvitation.delete({
      where: { id: invitationId },
    });

    return { projectMember };
  });

  return {
    message: "Successfully joined the project",
    projectId: invitation.projectId,
    projectName: invitation.project.name,
    role: invitation.role,
  };
}

export async function declineInvitation(invitationId: string, userId: string) {
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

  const invitation = await prisma.projectInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new AppError(404, "INVITATION_NOT_FOUND", "Invitation not found");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  if (user.email !== invitation.email) {
    throw new AppError(
      403,
      "INVITATION_MISMATCH",
      "This invitation was not sent to your email address"
    );
  }

  await prisma.projectInvitation.delete({
    where: { id: invitationId },
  });

  return { message: "Invitation declined successfully" };
}

export async function getInvitationByToken(token: string) {
  if (!token) {
    throw new AppError(400, "TOKEN_REQUIRED", "Invitation token is required");
  }

  const invitation = await prisma.projectInvitation.findFirst({
    where: { token },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          creator: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  if (!invitation) {
    throw new AppError(404, "INVITATION_NOT_FOUND", "Invitation not found");
  }

  if (isTokenExpired(invitation.expiresAt)) {
    throw new AppError(400, "TOKEN_EXPIRED", "Invitation token has expired");
  }

  return {
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    projectId: invitation.projectId,
    projectName: invitation.project.name,
    inviterName: invitation.project.creator.name || "A team member",
    expiresAt: invitation.expiresAt,
  };
}

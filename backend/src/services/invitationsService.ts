import { PrismaClient } from "@prisma/client";
import { isTokenExpired } from "../utils/token";

const prisma = new PrismaClient();

export async function getPendingInvitationsService(email: string) {
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

  return pendingInvitations.map((invitation: any) => ({
    id: invitation.id,
    projectId: invitation.projectId,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    projectName: invitation.project.name,
    inviterName: invitation.project.creator.name || "A team member",
  }));
}

export async function acceptInvitationService(invitationId: string, userId: string) {
  const invitation = await prisma.projectInvitation.findUnique({
    where: { id: invitationId },
    include: {
      project: true,
    },
  });

  if (!invitation) {
    return { error: { code: 404, message: "Invitation not found" } };
  }

  if (isTokenExpired(invitation.expiresAt)) {
    return { error: { code: 400, message: "Invitation has expired" } };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    return { error: { code: 404, message: "User not found" } };
  }

  if (user.email !== invitation.email) {
    return {
      error: {
        code: 403,
        message: "This invitation was not sent to your email address",
      },
    };
  }

  const existingMember = await prisma.projectMember.findFirst({
    where: {
      projectId: invitation.projectId,
      userId,
    },
  });

  if (existingMember) {
    await prisma.projectInvitation.delete({ where: { id: invitationId } });
    return {
      error: {
        code: 400,
        message: "You are already a member of this project",
        meta: { projectId: invitation.projectId },
      },
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectMember.create({
      data: {
        projectId: invitation.projectId,
        userId,
        role: invitation.role,
      },
    });

    await tx.projectInvitation.delete({ where: { id: invitationId } });
  });

  return { projectId: invitation.projectId };
}

export async function declineInvitationService(invitationId: string, userId: string) {
  const invitation = await prisma.projectInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    return { error: { code: 404, message: "Invitation not found" } };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    return { error: { code: 404, message: "User not found" } };
  }

  if (user.email !== invitation.email) {
    return {
      error: {
        code: 403,
        message: "This invitation was not sent to your email address",
      },
    };
  }

  await prisma.projectInvitation.delete({ where: { id: invitationId } });
  return { message: "Invitation declined and removed" };
}

export async function getInvitationByTokenService(token: string) {
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
              email: true,
            },
          },
        },
      },
    },
  });

  if (!invitation) {
    return { error: { code: 404, message: "Invalid or expired invitation" } };
  }

  if (isTokenExpired(invitation.expiresAt)) {
    return { error: { code: 400, message: "Invitation has expired" } };
  }

  return {
    id: invitation.id,
    projectId: invitation.projectId,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    projectName: invitation.project.name,
    inviterName: invitation.project.creator.name || "A team member",
  };
}


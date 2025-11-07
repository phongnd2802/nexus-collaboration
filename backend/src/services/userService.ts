import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../utils/hash";
import { sendDeleteVerificationEmail, sendSubsEmail } from "../utils/email";
import { canDeleteAccount, canUpdatePassword } from "../utils/permissions";
import { AppError } from "../utils/errors";

const prisma = new PrismaClient();

export async function getUserProfile(userId: string) {
  // user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      password: true,
      createdAt: true,
      accounts: {
        select: {
          provider: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  // user profile info
  const userInfo = await prisma.userInfo.findUnique({
    where: { userId },
  });

  // Count projects user is part of (both created and member of)
  const [createdProjectsCount, memberProjectsCount] = await Promise.all([
    prisma.project.count({
      where: { creatorId: userId },
    }),
    prisma.projectMember.count({
      where: { userId },
    }),
  ]);

  // authentication
  const hasPasswordAuth = user.password !== null;
  const oauthProviders = user.accounts.map((account) => account.provider) || [];

  // Removal of sensitive data before sending response
  const { password, ...safeUser } = user;

  return {
    ...safeUser,
    profile: userInfo || {},
    createdProjectsCount: createdProjectsCount,
    memberProjectsCount: memberProjectsCount,
    authType: {
      hasPasswordAuth,
      oauthProviders,
    },
  };
}

export async function updateUserProfile(
  userId: string,
  body: {
    name: string;
    bio: string;
    jobTitle: string;
    department: string;
    skills: string;
  }
) {
  const { name, bio, jobTitle, department, skills } = body;
  // Update user's name
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  // Upsert user info
  const updatedUserInfo = await prisma.userInfo.upsert({
    where: { userId },
    update: {
      bio,
      jobTitle,
      department,
      skills,
    },
    create: {
      userId,
      bio,
      jobTitle,
      department,
      skills,
    },
  });

  return {
    ...updatedUser,
    profile: updatedUserInfo,
  };
}

export async function updateUserSubscribe(email: string) {
  if (!email) {
    throw new AppError(
      400,
      "INVALID_EMAIL",
      "Email is required for subscription"
    );
  }
  sendSubsEmail(email);
  return { message: "Subscription successful" };
}

export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  const passwordCheck = await canUpdatePassword(userId, currentPassword);
  if (!passwordCheck.allowed) {
    throw new AppError(403, "FORBIDDEN", passwordCheck.reason as string);
  }

  // hash new password
  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return { message: "Password updated successfully" };
}

export async function updateUserProfileImage(userId: string, imageUrl: string) {
  // Update user's image
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { image: imageUrl },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  });

  return updatedUser;
}

export async function getUserByEmail(email: string) {
  if (!email) {
    throw new AppError(400, "INVALID_EMAIL", "Email is required");
  }
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function sendDeleteVerification(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  // 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // existing verification code cleanup
  await prisma.deleteAccountToken.deleteMany({
    where: { email: user.email },
  });

  // new verification code
  await prisma.deleteAccountToken.create({
    data: {
      email: user.email,
      code,
      expiresAt,
    },
  });

  // verification email
  try {
    await sendDeleteVerificationEmail(user.email, code);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new AppError(
      500,
      "EMAIL_SENDING_FAILED",
      "Failed to send verification email"
    );
  }

  return {
    message: "Verification code sent to your email",
    expiresAt,
  };
}

export async function verifyDeleteCode(userId: string, code: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  const verificationToken = await prisma.deleteAccountToken.findFirst({
    where: {
      email: user.email,
      code,
    },
  });

  if (!verificationToken) {
    throw new AppError(400, "INVALID_CODE", "Invalid verification code");
  }

  // code expiration check
  if (verificationToken.expiresAt < new Date()) {
    throw new AppError(400, "CODE_EXPIRED", "Verification code has expired");
  }

  return {
    message: "Verification code is valid",
    verified: true,
  };
}

export async function deleteUser(
  userId: string,
  verificationCode: string,
  password: string
) {
  const authCheck = await canDeleteAccount(userId, password, verificationCode);
  if (!authCheck.authorized) {
    throw new AppError(403, "FORBIDDEN", authCheck.reason as string);
  }

  await prisma.$transaction(async (tx) => {
    // STEP 1: User's files
    await tx.file.deleteMany({
      where: { uploaderId: userId },
    });

    // STEP 2: User's projects
    const userProjects = await tx.project.findMany({
      where: { creatorId: userId },
      include: { members: true },
    });

    for (const project of userProjects) {
      const otherAdmins = project.members.filter(
        (member: any) => member.userId !== userId && member.role === "ADMIN"
      );

      // If there are other admins, transfer ownership to the first one
      if (otherAdmins.length > 0) {
        await tx.project.update({
          where: { id: project.id },
          data: { creatorId: otherAdmins[0].userId },
        });
      }
      // If there are other members but no admins, promote one member to admin and transfer
      else if (
        project.members.some((member: any) => member.userId !== userId)
      ) {
        const newOwner = project.members.find(
          (member: any) => member.userId !== userId
        );
        if (newOwner) {
          // Update the member's role to ADMIN
          await tx.projectMember.update({
            where: {
              projectId_userId: {
                projectId: project.id,
                userId: newOwner.userId,
              },
            },
            data: { role: "ADMIN" },
          });

          // Update the project creator
          await tx.project.update({
            where: { id: project.id },
            data: { creatorId: newOwner.userId },
          });
        }
      }
      // If there are no other members, delete the project and all related records
      else {
        await tx.file.deleteMany({
          where: { projectId: project.id },
        });

        await tx.task.deleteMany({
          where: { projectId: project.id },
        });

        await tx.chatMessage.deleteMany({
          where: { projectId: project.id },
        });

        await tx.projectInvitation.deleteMany({
          where: { projectId: project.id },
        });

        await tx.projectMember.deleteMany({
          where: { projectId: project.id },
        });

        // delete the project
        await tx.project.delete({
          where: { id: project.id },
        });
      }
    }

    // STEP 3: User's tasks
    // For tasks where user is creator but not assigned
    await tx.task.updateMany({
      where: {
        creatorId: userId,
        NOT: { assigneeId: userId },
      },
      data: {
        creatorId: undefined,
      },
    });

    const createdTasks = await tx.task.findMany({
      where: { creatorId: userId },
      include: { project: true },
    });

    for (const task of createdTasks) {
      if (task.assigneeId && task.assigneeId !== userId) {
        // If task has another assignee, transfer creation to them
        await tx.task.update({
          where: { id: task.id },
          data: { creatorId: task.assigneeId },
        });
      } else {
        // Otherwise, try to transfer to project creator if not the user
        if (task.project.creatorId !== userId) {
          await tx.task.update({
            where: { id: task.id },
            data: { creatorId: task.project.creatorId },
          });
        } else {
          await tx.task.delete({
            where: { id: task.id },
          });
        }
      }
    }

    // Clear user as assignee from tasks
    await tx.task.updateMany({
      where: { assigneeId: userId },
      data: { assigneeId: null },
    });

    // STEP 4: Chat messages
    await tx.chatMessage.deleteMany({
      where: { userId: userId },
    });

    // STEP 5: Direct messages
    await tx.directMessage.deleteMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
    });

    // STEP 6: Project memberships
    await tx.projectMember.deleteMany({
      where: { userId: userId },
    });

    // STEP 7: User settings and info
    await tx.userSettings.deleteMany({
      where: { userId: userId },
    });

    await tx.userInfo.deleteMany({
      where: { userId: userId },
    });

    // STEP 8: Accounts
    await tx.account.deleteMany({
      where: { userId: userId },
    });

    // Clean up verification codes
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (user) {
      await tx.deleteAccountToken.deleteMany({
        where: { email: user.email },
      });
    }

    // Delete the user
    await tx.user.delete({
      where: { id: userId },
    });
  });

  return { message: "Account deleted successfully" };
}

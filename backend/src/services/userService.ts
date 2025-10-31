import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../utils/hash";
import { sendDeleteVerificationEmail, sendSubsEmail } from "../utils/email";
import { canDeleteAccount, canUpdatePassword } from "../utils/permissions";

const prisma = new PrismaClient();

export async function getUserProfileService(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      password: true,
      createdAt: true,
      accounts: { select: { provider: true } },
    },
  });
  if (!user) return null;

  const userInfo = await prisma.userInfo.findUnique({ where: { userId } });
  const [createdProjectsCount, memberProjectsCount] = await Promise.all([
    prisma.project.count({ where: { creatorId: userId } }),
    prisma.projectMember.count({ where: { userId } }),
  ]);

  const hasPasswordAuth = user.password !== null;
  const oauthProviders = user.accounts.map((a) => a.provider) || [];
  const { password, ...safeUser } = user as any;

  return {
    ...safeUser,
    profile: userInfo || {},
    createdProjectsCount,
    memberProjectsCount,
    authType: { hasPasswordAuth, oauthProviders },
  };
}

export async function updateUserProfileService(
  userId: string,
  data: { name?: any; bio?: any; jobTitle?: any; department?: any; skills?: any }
) {
  const { name, bio, jobTitle, department, skills } = data;
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { name },
    select: { id: true, name: true, email: true, image: true },
  });

  const updatedUserInfo = await prisma.userInfo.upsert({
    where: { userId },
    update: { bio, jobTitle, department, skills },
    create: { userId, bio, jobTitle, department, skills },
  });

  return { ...updatedUser, profile: updatedUserInfo };
}

export async function subscribeUserService(email: string) {
  if (!email) throw new Error("Email is required");
  await sendSubsEmail(email);
  return { message: "Subscription successful" };
}

export async function updatePasswordService(params: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) {
  const { userId, currentPassword, newPassword } = params;
  const passwordCheck = await canUpdatePassword(userId, currentPassword);
  if (!passwordCheck.allowed) {
    throw new Error(passwordCheck.reason || "Cannot update password");
  }
  const hashedPassword = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { password: hashedPassword } });
  return { message: "Password updated successfully" };
}

export async function updateProfileImageService(userId: string, imageUrl: string) {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { image: imageUrl },
    select: { id: true, name: true, email: true, image: true },
  });
  return updatedUser;
}

export async function getUserByEmailService(email: string) {
  if (!email) throw new Error("Email parameter is required");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  const { password: _pw, ...userWithoutPassword } = user as any;
  return userWithoutPassword;
}

export async function sendDeleteVerificationService(params: { userId: string }) {
  const { userId } = params;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.deleteAccountToken.deleteMany({ where: { email: user.email } });
  await prisma.deleteAccountToken.create({ data: { email: user.email, code, expiresAt } });
  await sendDeleteVerificationEmail(user.email, code);
  return { message: "Verification code sent to your email", expiresAt };
}

export async function verifyDeleteCodeService(params: { userId: string; code: string }) {
  const { userId, code } = params;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) throw new Error("User not found");
  const verificationToken = await prisma.deleteAccountToken.findFirst({
    where: { email: user.email, code },
  });
  if (!verificationToken) throw new Error("Invalid verification code");
  if (verificationToken.expiresAt < new Date()) throw new Error("Verification code has expired");
  return { message: "Verification code is valid", verified: true };
}

export async function deleteAccountService(params: {
  userId: string;
  password?: string;
  verificationCode?: string;
}) {
  const { userId, password, verificationCode } = params;
  const authCheck = await canDeleteAccount(userId, password, verificationCode);
  if (!authCheck.authorized) {
    const reason = authCheck.reason || "Unauthorized";
    const err = new Error(reason) as Error & { status?: number };
    err.status = 401;
    throw err;
  }

  await prisma.$transaction(async (tx) => {
    await tx.file.deleteMany({ where: { uploaderId: userId } });

    const userProjects = await tx.project.findMany({
      where: { creatorId: userId },
      include: { members: true },
    });

    for (const project of userProjects) {
      const otherAdmins = project.members.filter(
        (m: any) => m.userId !== userId && m.role === "ADMIN"
      );

      if (otherAdmins.length > 0) {
        await tx.project.update({ where: { id: project.id }, data: { creatorId: otherAdmins[0].userId } });
      } else if (project.members.some((m: any) => m.userId !== userId)) {
        const newOwner = project.members.find((m: any) => m.userId !== userId);
        if (newOwner) {
          await tx.projectMember.update({
            where: { projectId_userId: { projectId: project.id, userId: newOwner.userId } },
            data: { role: "ADMIN" },
          });
          await tx.project.update({ where: { id: project.id }, data: { creatorId: newOwner.userId } });
        }
      } else {
        await tx.file.deleteMany({ where: { projectId: project.id } });
        await tx.task.deleteMany({ where: { projectId: project.id } });
        await tx.chatMessage.deleteMany({ where: { projectId: project.id } });
        await tx.projectInvitation.deleteMany({ where: { projectId: project.id } });
        await tx.projectMember.deleteMany({ where: { projectId: project.id } });
        await tx.project.delete({ where: { id: project.id } });
      }
    }

    await tx.task.updateMany({
      where: { creatorId: userId, NOT: { assigneeId: userId } },
      data: { creatorId: undefined },
    });

    const createdTasks = await tx.task.findMany({ where: { creatorId: userId }, include: { project: true } });
    for (const task of createdTasks) {
      if (task.assigneeId && task.assigneeId !== userId) {
        await tx.task.update({ where: { id: task.id }, data: { creatorId: task.assigneeId } });
      } else if (task.project.creatorId !== userId) {
        await tx.task.update({ where: { id: task.id }, data: { creatorId: task.project.creatorId } });
      } else {
        await tx.task.delete({ where: { id: task.id } });
      }
    }

    await tx.task.updateMany({ where: { assigneeId: userId }, data: { assigneeId: null } });
    await tx.chatMessage.deleteMany({ where: { userId } });
    await tx.directMessage.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } });
    await tx.projectMember.deleteMany({ where: { userId } });
    await tx.userSettings.deleteMany({ where: { userId } });
    await tx.userInfo.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });

    const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user) {
      await tx.deleteAccountToken.deleteMany({ where: { email: user.email } });
    }

    await tx.user.delete({ where: { id: userId } });
  });

  return { message: "Account deleted successfully" };
}

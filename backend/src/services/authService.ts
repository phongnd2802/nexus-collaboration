import crypto from "crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { hashPassword, verifyPassword } from "../utils/hash";
import { generateToken, isTokenExpired } from "../utils/token";
import { sendPasswordResetEmail, sendEmailVerificationEmail } from "../utils/email";
import { checkPassword } from "../utils/pass";

export class HttpError extends Error {
  status: number;
  meta?: Record<string, any>;
  constructor(status: number, message: string, meta?: Record<string, any>) {
    super(message);
    this.status = status;
    this.meta = meta;
  }
}

const prisma = new PrismaClient();

export async function registerService({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name?: string;
}) {
  
  // Check for existing user
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingAccount = await prisma.account.findFirst({
      where: { userId: existingUser.id },
    });
    if (existingAccount && existingAccount.provider) {
      throw new HttpError(
        400,
        `User already exists with ${existingAccount.provider} account`
      );
    }
    throw new HttpError(400, "User already exists");
  }

  // Password validation
  if (!checkPassword(password)) {
    throw new HttpError(
      400,
      "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
    );
  }

  // Create user
  const hashedPassword = await hashPassword(password);
  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  // Create verification token
  const verificationCode = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  await prisma.verificationToken.create({
    data: {
      id: crypto.randomUUID(),
      email,
      code: verificationCode,
      expiresAt,
    },
  });

  // Send verification email
  await sendEmailVerificationEmail(email, verificationCode);

  const { password: _pw, ...userWithoutPassword } = newUser as any;
  return {
    ...userWithoutPassword,
    message:
      "Sign Up successful. Please check your email to activate your account.",
  };
}

export async function loginService({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new HttpError(401, "Invalid credentials");
  }
  if (!user.password) {
    throw new HttpError(500, "User password not set.");
  }
  const isValid = await verifyPassword(password, user.password!);
  if (!isValid) {
    throw new HttpError(401, "Invalid credentials");
  }

  const hasOAuthAccount = await prisma.account.findFirst({
    where: { userId: user.id },
  });
  if (!hasOAuthAccount && !user.emailVerified) {
    throw new HttpError(403, "Email not verified. Please check your inbox for verification link.", {
      emailVerified: false,
      email: user.email,
    });
  }

  const { password: _pw, ...userWithoutPassword } = user as any;
  return userWithoutPassword;
}

export async function oauthService(body: {
  email?: string;
  name?: string;
  image?: string;
  provider: string;
  providerAccountId: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: number | null;
  token_type?: string | null;
  scope?: string | null;
  id_token?: string | null;
  email_verified?: boolean;
}) {
  const {
    email,
    name,
    image,
    provider,
    providerAccountId,
    access_token,
    refresh_token,
    expires_at,
    token_type,
    scope,
    id_token,
    email_verified,
  } = body;

  if (!email) {
    throw new HttpError(400, "Email is required");
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name,
        image,
        emailVerified: new Date(),
      },
    });
  } else {
    const existingOAuthAccount = await prisma.account.findFirst({
      where: { userId: user.id },
    });
    if (!existingOAuthAccount && !user.emailVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    }
  }

  await prisma.account.upsert({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId,
      },
    },
    create: {
      userId: user.id,
      type: "oauth",
      provider,
      providerAccountId,
      access_token,
      refresh_token,
      expires_at,
      token_type,
      scope,
      id_token,
    },
    update: {
      userId: user.id,
      access_token,
      refresh_token,
      expires_at,
      token_type,
      scope,
      id_token,
    },
  });

  if (email_verified !== undefined && !user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: email_verified ? new Date() : null },
    });
  }

  const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
  const { password: _pw2, ...userWithoutPassword } = updatedUser as any;
  return userWithoutPassword;
}

export async function forgotPasswordService(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  const genericMessage =
    "If your email is in our system, you will receive a password reset link shortly";
  if (!user) {
    return { message: genericMessage };
  }

  if (!user.password) {
    const existingAccount = await prisma.account.findFirst({
      where: { userId: user.id },
    });
    if (existingAccount) {
      const provider = existingAccount.provider;
      throw new HttpError(
        400,
        `cannot reset password. Please Sign in with your ${provider} account`
      );
    }
  }

  const resetToken = generateToken();
  const expiresAt = new Date(Date.now() + 3600000);

  await prisma.passwordResetToken.deleteMany({ where: { email } });
  await prisma.passwordResetToken.create({
    data: { email, token: resetToken, expiresAt },
  });

  try {
    await sendPasswordResetEmail(email, resetToken);
  } catch (e) {
    console.error("Password reset email failed to send; ignoring:", e);
  }
  return { message: genericMessage };
}

export async function resetPasswordService({
  token,
  password,
}: {
  token: string;
  password: string;
}) {
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || isTokenExpired(resetToken.expiresAt)) {
    throw new HttpError(400, "Invalid or expired reset token");
  }

  const user = await prisma.user.findUnique({ where: { email: resetToken.email } });
  if (!user) {
    throw new HttpError(400, "User not found");
  }

  if (!checkPassword(password)) {
    throw new HttpError(
      400,
      "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
    );
  }

  const hashedPassword = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });
  await prisma.passwordResetToken.delete({ where: { id: resetToken.id } });
  return { message: "Password has been reset successfully" };
}

export async function validateResetTokenService(token: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || isTokenExpired(resetToken.expiresAt)) {
    throw new HttpError(400, "Invalid or expired reset token");
  }
  return { valid: true };
}

export async function verifyEmailService({
  code,
  email,
}: {
  code: string;
  email: string;
}) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  if (user.emailVerified) {
    throw new HttpError(400, "Email already verified");
  }
  const foundToken = await prisma.verificationToken.findFirst({
    where: { code, email },
  });
  if (!foundToken) {
    throw new HttpError(400, "Invalid verification code");
  }
  if (isTokenExpired(foundToken.expiresAt)) {
    throw new HttpError(400, "Verification code has expired");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });
  await prisma.verificationToken.deleteMany({
    where: { id: foundToken.id, code: foundToken.code },
  });
  return { message: "Email verified successfully" };
}

export async function resendVerificationService(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new HttpError(404, "User not found");
  }
  if (user.emailVerified) {
    throw new HttpError(400, "Email already verified");
  }
  await prisma.verificationToken.deleteMany({ where: { email } });
  const verificationCode = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await prisma.verificationToken.create({
    data: {
      id: crypto.randomUUID(),
      email,
      code: verificationCode,
      expiresAt,
    },
  });
  await sendEmailVerificationEmail(email, verificationCode);
  return { message: "Verification email sent successfully" };
}

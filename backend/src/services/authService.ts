import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "../utils/hash";
import { generateToken, isTokenExpired } from "../utils/token";
import { sendPasswordResetEmail } from "../utils/email";
import { sendEmailVerificationEmail } from "../utils/email";
import { checkPassword } from "../utils/pass";
import { AppError } from "../utils/errors";

const prisma = new PrismaClient();

export async function register(email: string, name: string, password: string) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });
  if (existingUser) {
    const existingAccount = await prisma.account.findFirst({
      where: { userId: existingUser.id },
    });
    if (existingAccount && existingAccount.provider) {
      throw new AppError(
        409,
        "OAUTH_EXISTS",
        `User already exists with ${existingAccount.provider} account`
      );
    }
    throw new AppError(409, "EMAIL_TAKEN", "User already exists");
  }

  // Validate password strength
  if (!checkPassword(password)) {
    throw new AppError(
      400,
      "WEAK_PASSWORD",
      "Password must be at least 8 characters long and include a mix of letters, numbers, and special characters."
    );
  }

  //Create user
  const hashedPassword = await hashPassword(password); // Hash password
  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  });

  // Create verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
  await prisma.verificationToken.create({
    data: {
      id: crypto.randomUUID(),
      email,
      code: verificationToken,
      expiresAt,
    },
  });

  // Send verification email
  await sendEmailVerificationEmail(email, verificationToken);

  const { password: _pw, ...userWithoutPassword } = newUser;
  return {
    ...userWithoutPassword,
    message:
      "Sign Up successful. Please check your email to activate your account.",
  };
}

export async function login(email: string, password: string) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });
  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password!);
  if (!isValid) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
  }

  // Check if email is verified
  const hasOAuthAccount = await prisma.account.findFirst({
    where: { userId: user.id },
  });
  if (!hasOAuthAccount && !user.emailVerified) {
    throw new AppError(
      403,
      "EMAIL_NOT_VERIFIED",
      `Email not verified. Please check your inbox for verification link.`
    );
  }

  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function oauth(body: {
  email: string;
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

  // Ensure email is provided
  if (!email) {
    throw new AppError(400, "EMAIL_REQUIRED", "Email is required from OAuth provider");
  }

  // Check if user exists or create new user
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

  // Create or update OAuth account
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

  // Update email verification status if needed
  if (email_verified !== undefined && !user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: email_verified ? new Date() : null },
    });
  }

  const updatedUser = await prisma.user.findUnique({ where: { id: user.id } });
  const { password: _pw2, ...userWithoutPassword } = updatedUser!;
  return userWithoutPassword;
}

export async function forgotPassword(email: string) {
  // Find user by email
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(400, "USER_NOT_FOUND", "Invalid or expired reset token");
  }

  // Check if user has a password set
  if (!user.password) {
    const existingAccount = await prisma.account.findFirst({
      where: { userId: user.id },
    });
    if (existingAccount) {
      const provider = existingAccount.provider;
      throw new AppError(
        400,
        "OAUTH_ONLY",
        `cannot reset password. Please Sign in with your ${provider} account`
      );
    }
  }

  // Generate reset token and save to database
  const resetToken = generateToken();
  const expiresAt = new Date(Date.now() + 3600000);

  // Delete existing tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } });
  // Create new token
  await prisma.passwordResetToken.create({
    data: { email, token: resetToken, expiresAt },
  });

  await sendPasswordResetEmail(email, resetToken);

  return {
    message:
      "If your email is in our system, you will receive a password reset link shortly",
  };
}

export async function resetPassword(token: string, password: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  // Token validation
  if (!resetToken || isTokenExpired(resetToken.expiresAt)) {
    throw new AppError(400, "TOKEN_INVALID", "Invalid or expired reset token");
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email: resetToken.email },
  });

  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }

  // Validate password strength
  if (!checkPassword(password)) {
    throw new AppError(
      400,
      "WEAK_PASSWORD",
      "Password must be at least 8 characters long and include a mix of letters, numbers, and special characters."
    );
  }

  // Update password
  const hashedPassword = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword },
  });

  // Delete used reset token
  await prisma.passwordResetToken.delete({
    where: { id: resetToken.id },
  });

  return { message: "Password has been reset successfully" };
}

export async function validateResetToken(token: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });
  if (!resetToken || isTokenExpired(resetToken.expiresAt)) {
    throw new AppError(400, "TOKEN_INVALID", "Invalid or expired reset token");
  }
  return { valid: true };
}

export async function verifyEmail(code: string, email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }
  if (user.emailVerified) {
    throw new AppError(400, "ALREADY_VERIFIED", "Email already verified");
  }
  const foundToken = await prisma.verificationToken.findFirst({
    where: { code, email },
  });
  if (!foundToken) {
    throw new AppError(400, "INVALID_CODE", "Invalid verification code");
  }
  if (isTokenExpired(foundToken.expiresAt)) {
    throw new AppError(400, "CODE_EXPIRED", "Verification code has expired");
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

export async function resendVerification(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError(404, "USER_NOT_FOUND", "User not found");
  }
  if (user.emailVerified) {
    throw new AppError(400, "ALREADY_VERIFIED", "Email already verified");
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

import { Request, Response, RequestHandler } from "express";
import { debugError } from "../utils/debug";
import {
  getUserProfileService,
  updateUserProfileService,
  subscribeUserService,
  updatePasswordService,
  updateProfileImageService,
  getUserByEmailService,
  sendDeleteVerificationService,
  verifyDeleteCodeService,
  deleteAccountService,
} from "../services/userService";

export const getProfile: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const profile = await getUserProfileService(userId);
    if (!profile) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(profile);
  } catch (error) {
    debugError("Error fetching user profile:", error);
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
};

export const updateProfile: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params as { userId: string };
    const { name, bio, jobTitle, department, skills } = req.body;
    const updated = await updateUserProfileService(userId, {
      name,
      bio,
      jobTitle,
      department,
      skills,
    });
    res.status(200).json(updated);
  } catch (error) {
    debugError("Error updating user profile:", error);
    res.status(500).json({ message: "Failed to update user profile" });
  }
};

export const subscribe: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };
    const result = await subscribeUserService(email);
    res.status(200).json(result);
  } catch (error: any) {
    debugError("Error subscribing user:", error);
    res.status(400).json({ message: error?.message || "Failed to subscribe user" });
  }
};

export const updatePassword: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { userId, currentPassword, newPassword } = req.body as {
      userId: string;
      currentPassword: string;
      newPassword: string;
    };
    const result = await updatePasswordService({ userId, currentPassword, newPassword });
    res.status(200).json(result);
  } catch (error: any) {
    debugError("Password update error:", error);
    res.status(400).json({ message: error?.message || "Failed to update password" });
  }
};

export const updateProfileImage: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { imageUrl } = req.body as { imageUrl: string };
    const updated = await updateProfileImageService(userId, imageUrl);
    res.status(200).json(updated);
  } catch (error) {
    debugError("Error updating profile image:", error);
    res.status(500).json({ message: "Failed to update profile image" });
  }
};

export const getByEmail: RequestHandler = async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    const user = await getUserByEmailService(email);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(user);
  } catch (error: any) {
    debugError("Error fetching user:", error);
    res.status(400).json({ message: error?.message || "Failed to fetch user data" });
  }
};

export const sendDeleteVerification: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body as { userId: string };
    const result = await sendDeleteVerificationService({ userId });
    res.status(200).json(result);
  } catch (error: any) {
    debugError("Error sending verification code:", error);
    res.status(400).json({ message: error?.message || "Failed to send verification code" });
  }
};

export const verifyDeleteCode: RequestHandler = async (req: Request, res: Response) => {
  try {
    const { userId, code } = req.body as { userId: string; code: string };
    const result = await verifyDeleteCodeService({ userId, code });
    res.status(200).json(result);
  } catch (error: any) {
    debugError("Error verifying code:", error);
    res.status(400).json({ message: error?.message || "Failed to verify code" });
  }
};

export const deleteAccount: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { password, verificationCode } = req.body as { password?: string; verificationCode?: string };
    const result = await deleteAccountService({ userId, password, verificationCode });
    res.status(200).json(result);
  } catch (error: any) {
    debugError("Account deletion error:", error);
    const status = error?.status || 500;
    res.status(status).json({ message: error?.message || "Failed to delete account" });
  }
};


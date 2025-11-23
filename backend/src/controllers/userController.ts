import { Request, Response } from "express";
import * as userService from "../services/userService";
import { sendError } from "../utils/errors";

export async function getUserProfileController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const profile = await userService.getUserProfile(userId);
    res.status(200).json(profile);
  } catch (error) {
    sendError(res, error);
  }
}

export async function deleteUserController(req: Request, res: Response) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { password, verificationCode, code } = req.body;
    const finalCode = (verificationCode || code || "").trim();
    const finalPassword = (password || "").trim();

    const result = await userService.deleteUser(
      userId,
      finalCode,
      finalPassword
    );
    res.status(200).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateUserProfileController(req: Request, res: Response) {
  try {
    const userId = req.params.userId;
    const profileData = req.body;
    const updatedProfile = await userService.updateUserProfile(
      userId,
      profileData
    );
    res.status(200).json(updatedProfile);
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateUserPasswordController(
  req: Request,
  res: Response
) {
  try {
    const { userId, currentPassword, newPassword } = req.body;
    const data = await userService.updateUserPassword(
      userId,
      currentPassword,
      newPassword
    );
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateUserProfileImageController(
  req: Request,
  res: Response
) {
  try {
    const userId = req.headers["x-user-id"] as string;
    const { imageUrl } = req.body;
    const updatedUser = await userService.updateUserProfileImage(
      userId,
      imageUrl
    );
    res.status(200).json(updatedUser);
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateUserSubscribeController(
  req: Request,
  res: Response
) {
  try {
    const email = req.params.email;
    const updatedUser = await userService.updateUserSubscribe(email);
    res.status(200).json(updatedUser);
  } catch (error) {
    sendError(res, error);
  }
}

export async function getUserByEmailController(req: Request, res: Response) {
  try {
    const email = req.query.email as string;
    const user = await userService.getUserByEmail(email);
    res.status(200).json(user);
  } catch (error) {
    sendError(res, error);
  }
}

export async function sendDeleteVerificationController(
  req: Request,
  res: Response
) {
  try {
    const userId = req.body.userId;
    const data = await userService.sendDeleteVerification(userId);
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
}

export async function verifyDeleteCodeController(req: Request, res: Response) {
  try {
    const { userId, code } = req.body;
    const data = await userService.verifyDeleteCode(userId, code);
    res.status(200).json(data);
  } catch (error) {
    sendError(res, error);
  }
}

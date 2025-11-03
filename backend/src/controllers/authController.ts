import { Request, Response, RequestHandler, NextFunction } from "express";
import {
  register,
  login,
  oauth,
  forgotPassword,
  resetPassword,
  validateResetToken,
  verifyEmail,
  resendVerification,
} from "../services/authService";

export const registerController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    const result = await register(email, name, password);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const loginController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await login(email, password);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
};

export const oauthController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await oauth(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const forgotPasswordController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await forgotPassword(email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const resetPasswordController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body;
    const result = await resetPassword(token, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const validateResetTokenController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.body;
    const result = await validateResetToken(token);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const verifyEmailController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { code, email } = req.body;
    const result = await verifyEmail(code, email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const resendVerificationController: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await resendVerification(email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

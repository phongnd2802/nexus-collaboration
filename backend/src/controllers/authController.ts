import { Request, Response, RequestHandler } from "express";
import {
  registerService,
  loginService,
  oauthService,
  forgotPasswordService,
  resetPasswordService,
  validateResetTokenService,
  verifyEmailService,
  resendVerificationService,
  HttpError,
} from "../services/authService";
import { debugError } from "../utils/debug";

export const register: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    const result = await registerService({ email, password, name });
    res.status(201).json(result);
  } catch (err: any) {
    if (err instanceof HttpError) {
      res
        .status(err.status)
        .json({ message: err.message, ...(err.meta || {}) });
      return;
    }
    debugError(err);
    res.status(500).json({ message: "Registration failed" });
  }
};

export const login: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await loginService({ email, password });
    res.status(200).json(user);
  } catch (err: any) {
    if (err instanceof HttpError) {
      res
        .status(err.status)
        .json({ message: err.message, ...(err.meta || {}) });
      return;
    }
    debugError(err);
    res.status(500).json({ message: "Login failed" });
  }
};

export const oauth: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const result = await oauthService(req.body);
    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof HttpError) {
      res
        .status(err.status)
        .json({ message: err.message, ...(err.meta || {}) });
      return;
    }
    debugError(err);
    res.status(500).json({ message: "OAuth sync failed" });
  }
};

export const forgotPassword: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await forgotPasswordService(email);
    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    debugError("Password reset request error:", err);
    res
      .status(500)
      .json({ message: "Failed to process password reset request" });
  }
};

export const resetPassword: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token, password } = req.body;
    const result = await resetPasswordService({ token, password });
    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    debugError("Password reset error:", err);
    res.status(500).json({ message: "Failed to reset password" });
  }
};

export const validateResetToken: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { token } = req.body;
    const result = await validateResetTokenService(token);
    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ valid: false });
      return;
    }
    debugError("Token validation error:", err);
    res.status(500).json({ valid: false });
  }
};

export const verifyEmail: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { code, email } = req.body;
    const result = await verifyEmailService({ code, email });
    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    debugError("Email verification error:", err);
    res.status(500).json({ message: "Failed to verify email" });
  }
};

export const resendVerification: RequestHandler = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await resendVerificationService(email);
    res.status(200).json(result);
  } catch (err: any) {
    if (err instanceof HttpError) {
      res.status(err.status).json({ message: err.message });
      return;
    }
    debugError("Error resending verification email:", err);
    res.status(500).json({ message: "Failed to resend verification email" });
  }
};

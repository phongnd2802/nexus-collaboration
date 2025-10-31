import express, { Router } from "express";
import { validate, authValidation } from "../middleware/validation";
import {
  register,
  login,
  oauth,
  forgotPassword,
  resetPassword,
  validateResetToken,
  verifyEmail,
  resendVerification,
} from "../controllers/authController";
const authRouter: Router = express.Router();

export default authRouter;

// POST /api/auth/register
authRouter.post(
  "/register",
  validate(authValidation.register) as express.RequestHandler,
  register
);

// POST /api/auth/login
authRouter.post(
  "/login",
  validate(authValidation.login) as express.RequestHandler,
  login
);

// POST /api/auth/oauth
authRouter.post("/oauth", oauth);

// POST /api/auth/forgot-password
authRouter.post("/forgot-password", forgotPassword);

// POST /api/auth/reset-password
authRouter.post(
  "/reset-password",
  validate(authValidation.resetPassword) as express.RequestHandler,
  resetPassword
);

// POST /api/auth/validate-reset-token
authRouter.post(
  "/validate-reset-token",
  validate(authValidation.validateResetToken) as express.RequestHandler,
  validateResetToken
);

// POST /api/auth/verify-email
authRouter.post("/verify-email", verifyEmail);

// POST /api/auth/resend-verification
authRouter.post("/resend-verification", resendVerification);

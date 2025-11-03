import express, { Router } from "express";
import { validate, authValidation } from "../middleware/validation";
import {
  registerController,
  loginController,
  oauthController,
  forgotPasswordController,
  resetPasswordController,
  validateResetTokenController,
  verifyEmailController,
  resendVerificationController,
} from "../controllers/authController";
const authRouter: Router = express.Router();

export default authRouter;

// POST /api/auth/register
authRouter.post(
  "/register",
  validate(authValidation.register) as express.RequestHandler,
  registerController
);

// POST /api/auth/login
authRouter.post(
  "/login",
  validate(authValidation.login) as express.RequestHandler,
  loginController
);

// POST /api/auth/oauth
authRouter.post("/oauth", oauthController);

// POST /api/auth/forgot-password
authRouter.post("/forgot-password", forgotPasswordController);

// POST /api/auth/reset-password
authRouter.post(
  "/reset-password",
  validate(authValidation.resetPassword) as express.RequestHandler,
  resetPasswordController
);

// POST /api/auth/validate-reset-token
authRouter.post(
  "/validate-reset-token",
  validate(authValidation.validateResetToken) as express.RequestHandler,
  validateResetTokenController
);

// POST /api/auth/verify-email
authRouter.post("/verify-email", verifyEmailController);

// POST /api/auth/resend-verification
authRouter.post("/resend-verification", resendVerificationController);

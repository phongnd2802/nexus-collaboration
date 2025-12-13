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

authRouter.post("/oauth", oauthController);
authRouter.post("/forgot-password", forgotPasswordController);
authRouter.post(
  "/reset-password",
  validate(authValidation.resetPassword) as express.RequestHandler,
  resetPasswordController
);
authRouter.post(
  "/validate-reset-token",
  validate(authValidation.validateResetToken) as express.RequestHandler,
  validateResetTokenController
);
authRouter.post("/verify-email", verifyEmailController);
authRouter.post("/resend-verification", resendVerificationController);

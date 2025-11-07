import express, { Router } from "express";
import * as userController from "../controllers/userController";
const userRouter: Router = express.Router();

export default userRouter;

// GET /api/user/profile
userRouter.get("/profile", userController.getUserProfileController);

// PUT /api/user/profile/:userId
userRouter.put("/profile/:userId", userController.updateUserProfileController);

// POST /api/user/subscribe
userRouter.post("/subscribe", userController.updateUserSubscribeController);

// POST /api/user/update-password
userRouter.post(
  "/update-password",
  userController.updateUserPasswordController
);

// PATCH /api/user/profile-image
userRouter.patch(
  "/profile-image",
  userController.updateUserProfileImageController
);

// GET /api/users/byEmail?email=user@example.com
userRouter.get("/byEmail", userController.getUserByEmailController);

// POST /api/user/send-delete-verification
userRouter.post(
  "/send-delete-verification",
  userController.sendDeleteVerificationController
);

// POST /api/user/verify-delete-code
userRouter.post(
  "/verify-delete-code",
  userController.verifyDeleteCodeController
);

// DELETE /api/user/delete - delete the user account and all associated data
userRouter.delete("/delete", userController.deleteUserController);

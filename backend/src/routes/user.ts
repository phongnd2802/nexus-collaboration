import express, { Router } from "express";
import * as userController from "../controllers/userController";
const userRouter: Router = express.Router();

export default userRouter;

userRouter.get("/profile", userController.getUserProfileController);
userRouter.put("/profile/:userId", userController.updateUserProfileController);
userRouter.post("/subscribe", userController.updateUserSubscribeController);
userRouter.post(
  "/update-password",
  userController.updateUserPasswordController
);
userRouter.patch(
  "/profile-image",
  userController.updateUserProfileImageController
);
userRouter.get("/byEmail", userController.getUserByEmailController);
userRouter.post(
  "/send-delete-verification",
  userController.sendDeleteVerificationController
);
userRouter.post(
  "/verify-delete-code",
  userController.verifyDeleteCodeController
);
userRouter.delete("/delete", userController.deleteUserController);

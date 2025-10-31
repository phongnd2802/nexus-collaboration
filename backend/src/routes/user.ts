import express, { Router } from "express";
import {
  getProfile,
  updateProfile,
  subscribe,
  updatePassword,
  updateProfileImage,
  getByEmail,
  sendDeleteVerification,
  verifyDeleteCode,
  deleteAccount,
} from "../controllers/userController";

const userRouter: Router = express.Router();

export default userRouter;

// GET /api/user/profile
userRouter.get("/profile", getProfile);

// PUT /api/user/profile/:userId
userRouter.put("/profile/:userId", updateProfile);

// POST /api/user/subscribe
userRouter.post("/subscribe", subscribe);

// POST /api/user/update-password
userRouter.post("/update-password", updatePassword);

// PATCH /api/user/profile-image
userRouter.patch("/profile-image", updateProfileImage);

// GET /api/users/byEmail?email=user@example.com
userRouter.get("/byEmail", getByEmail);

// POST /api/user/send-delete-verification
userRouter.post("/send-delete-verification", sendDeleteVerification);

// POST /api/user/verify-delete-code
userRouter.post("/verify-delete-code", verifyDeleteCode);

// DELETE /api/user/delete - delete the user account and all associated data
userRouter.delete("/delete", deleteAccount);

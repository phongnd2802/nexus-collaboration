import express, { Router } from "express";
import {
  updateUserSettingController,
  getUserSettingController,
} from "../controllers/settingController";

const settingsRouter: Router = express.Router();

// GET /api/settings/:userId
settingsRouter.get("/:userId", getUserSettingController);

// PUT /api/settings/:userId
settingsRouter.put("/:userId", updateUserSettingController);

export default settingsRouter;

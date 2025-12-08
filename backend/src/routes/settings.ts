import express, { Router } from "express";
import {
  updateUserSettingController,
  getUserSettingController,
} from "../controllers/settingController";

const settingsRouter: Router = express.Router();

settingsRouter.get("/:userId", getUserSettingController);
settingsRouter.put("/:userId", updateUserSettingController);

export default settingsRouter;

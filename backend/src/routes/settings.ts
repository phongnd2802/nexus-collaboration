import express, { Router } from "express";
import { getUserSettings, updateUserSettings } from "../controllers/settingsController";

const settingsRouter: Router = express.Router();

// GET /api/settings/:userId
settingsRouter.get("/:userId", getUserSettings);

// PUT /api/settings/:userId
settingsRouter.put("/:userId", updateUserSettings);

export default settingsRouter;

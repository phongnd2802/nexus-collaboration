import { Request, Response, RequestHandler } from "express";
import { debugError } from "../utils/debug";
import {
  getUserSettingsService,
  upsertUserSettingsService,
} from "../services/settingsService";

export const getUserSettings: RequestHandler = async (
  req: Request,
  res: Response
) => {
  const { userId } = req.params;
  try {
    const result = await getUserSettingsService(userId);
    if ((result as any).error) {
      const { code, message } = (result as any).error;
      res.status(code).json({ message });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error fetching user settings:", error);
    res.status(500).json({ message: "Failed to fetch user settings" });
  }
};

export const updateUserSettings: RequestHandler = async (
  req: Request,
  res: Response
) => {
  const { userId } = req.params;
  const settingsData = req.body;
  try {
    const result = await upsertUserSettingsService(userId, settingsData);
    if ((result as any).error) {
      const { code, message } = (result as any).error;
      res.status(code).json({ message });
      return;
    }
    res.status(200).json(result);
  } catch (error) {
    debugError("Error updating user settings:", error);
    res.status(500).json({ message: "Failed to update user settings" });
  }
};


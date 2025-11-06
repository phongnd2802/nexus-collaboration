import { Request, Response } from "express";
import { getUserSetting, updateUserSetting} from "../services/settingService";
import { sendError } from "../utils/errors";

export async function getUserSettingController(req: Request, res: Response) {
    const { userId } = req.params;
    try {
        const settings = await getUserSetting(userId);
        res.status(200).json(settings);
    } catch (error) {
        sendError(res, error);
    }
}

export async function updateUserSettingController(req: Request, res: Response) {
    const { userId } = req.params;
    const settingsData = req.body;
    try {
        const settings = await updateUserSetting(userId, settingsData);
        res.status(200).json(settings);
    } catch (error) {
        sendError(res, error);
    }
}


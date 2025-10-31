import { Request, Response, RequestHandler } from "express";
import { debugError } from "../utils/debug";
import { getCalendarDataService, getDeadlinesService } from "../services/calendarService";

export const getCalendarData: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

    const data = await getCalendarDataService({ userId, startDate, endDate });
    res.status(200).json(data);
  } catch (error) {
    debugError("Error fetching calendar data:", error);
    res.status(500).json({ message: "Failed to fetch calendar data" });
  }
};

export const getDeadlines: RequestHandler = async (req: Request, res: Response) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const { days = "7" } = req.query as { days?: string };
    const daysAhead = parseInt(days as string, 10);

    const data = await getDeadlinesService({ userId, daysAhead });
    res.status(200).json(data);
  } catch (error) {
    debugError("Error fetching deadlines:", error);
    res.status(500).json({ message: "Failed to fetch deadlines" });
  }
};


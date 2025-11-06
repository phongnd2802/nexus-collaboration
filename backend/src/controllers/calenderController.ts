import { Request, Response, RequestHandler } from "express";
import { getCalendarEvents, getDeadlines } from "../services/calenderService";
import { sendError } from "../utils/errors";

export const getCalendarEventsController: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const { startDate, endDate } = req.query as {
      startDate?: string;
      endDate?: string;
    };
    const data = await getCalendarEvents(userId, startDate, endDate);
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
};

export const getDeadlinesController: RequestHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId =
      (req.headers["x-user-id"] as string) || (req.query.userId as string);
    const { days = "7" } = req.query;
    const daysAhead = parseInt(days as string);

    const data = await getDeadlines(userId, daysAhead);
    res.status(200).json(data);
  } catch (err) {
    sendError(res, err);
  }
};

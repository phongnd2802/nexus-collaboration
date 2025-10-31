import express, { Router } from "express";
import { getCalendarData, getDeadlines } from "../controllers/calendarController";
const calendarRouter: Router = express.Router();

export default calendarRouter;

// GET /api/calendar/events/all - Get all calendar events for a user
calendarRouter.get("/events/all", getCalendarData);

// GET /api/calendar/deadlines - Get upcoming deadlines for a user
calendarRouter.get("/deadlines", getDeadlines);

import express, { Router } from "express";
import { getCalendarEventsController, getDeadlinesController } from "../controllers/calenderController";

const calendarRouter: Router = express.Router();

export default calendarRouter;

// GET /api/calendar/events/all - Get all calendar events for a user
calendarRouter.get("/events/all", getCalendarEventsController);

// GET /api/calendar/deadlines - Get upcoming deadlines for a user
calendarRouter.get("/deadlines", getDeadlinesController);

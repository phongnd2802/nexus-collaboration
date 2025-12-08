import express, { Router } from "express";
import { getCalendarEventsController, getDeadlinesController } from "../controllers/calenderController";

const calendarRouter: Router = express.Router();

export default calendarRouter;

calendarRouter.get("/events/all", getCalendarEventsController);
calendarRouter.get("/deadlines", getDeadlinesController);

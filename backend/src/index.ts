import dotenv from "dotenv";
dotenv.config();
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import http from "http";
import { PrismaClient } from "@prisma/client";

// routes
import authRouter from "./routes/auth";
import userRouter from "./routes/user";
import settingsRouter from "./routes/settings";
import dashboardRouter from "./routes/dashboard";
import projectsRouter from "./routes/projects";
import tasksRouter from "./routes/tasks";
import invitationsRouter from "./routes/invitations";
import calendarRouter from "./routes/calendar";
import collaboratorsRouter from "./routes/collaborators";
import messagesRouter from "./routes/messages";
import teamMessagesRouter from "./routes/teamMessages";
import exportRouter from "./routes/export";
import { debugError } from "./utils/debug";

// middleware
import {
  globalRateLimit,
  authRateLimit,
  securityHeaders,
  messageRateLimit,
} from "./middleware/security";
import { sanitizeHtml } from "./middleware/validation";

// Socket.io configuration and handlers
import { createSocketServer } from "./socket/socketConfig";
import { setupSocketHandlers } from "./socket/socketHandler";

// Reminder system với BullMQ
import { reminderWorker } from "./workers/reminderWorker";
import {
  startBackfillCron,
  stopBackfillCron,
} from "./services/reminderBackfill";
import { redisConnection } from "./config/redis";

// debug utilities
import { debugLog } from "./utils/debug";
import { isAppError } from "./utils/errors";

const app = express();
const server = http.createServer(app);
export const prisma = new PrismaClient();

// Socket.io server
const io = createSocketServer(server);
setupSocketHandlers(io);

app.set("io", io);

// security middleware
app.use(securityHeaders);
app.use(globalRateLimit);

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production" ? process.env.FRONTEND_URL : true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user-id"],
  })
);

// Stripe webhook route (must be before JSON parsing middleware)
app.post(
  "/api/subscriptions/webhook",
  express.raw({ type: "application/json" }),
  function (req: any, res: any) {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    (async () => {
      if (!webhookSecret) {
        console.error("Missing Stripe webhook secret");
        res.status(500).json({ message: "Webhook secret not configured" });
        return;
      }
    })();
  }
);

// Body parsing with limits
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Input sanitization
app.use(sanitizeHtml);

// test route
app.get("/", (_, res) => {
  res.send("API is running");
});

// API Routes
app.use("/api/auth", authRateLimit, authRouter);
app.use("/api/user", userRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/invitations", invitationsRouter);
app.use("/api/calendar", calendarRouter);
app.use("/api/collaborators", collaboratorsRouter);
app.use("/api/messages", messageRateLimit, messagesRouter);
app.use("/api/team-messages", messageRateLimit, teamMessagesRouter);
app.use("/api/export", exportRouter);

// Centralized error handler
const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (isAppError(err)) {
    res.status(err.status).json({ code: err.code, message: err.message });
    return;
  }
  debugError("Unhandled error:", err);
  res
    .status(500)
    .json({ code: "INTERNAL_ERROR", message: "Internal server error" });
};

app.use(errorHandler);

// Start server
const PORT = parseInt(process.env.PORT || "4000", 10);

server.listen(PORT, "0.0.0.0", async () => {
  debugLog(`Server running on port ${PORT}`);
  debugLog(`Socket.io server configured and ready`);

  // Khởi động reminder worker và backfill cron
  debugLog("✅ Reminder worker started");
  await startBackfillCron();
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  debugLog("SIGTERM received, shutting down gracefully...");
  stopBackfillCron();
  await reminderWorker.close();
  await redisConnection.quit();
  server.close(() => {
    debugLog("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  debugLog("SIGINT received, shutting down gracefully...");
  stopBackfillCron();
  await reminderWorker.close();
  await redisConnection.quit();
  server.close(() => {
    debugLog("Server closed");
    process.exit(0);
  });
});

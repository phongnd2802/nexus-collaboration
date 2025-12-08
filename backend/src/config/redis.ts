import Redis from "ioredis";

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  maxRetriesPerRequest: null, // Required cho BullMQ
});

redisConnection.on("connect", () => {
  console.log("Redis connected successfully");
});

redisConnection.on("error", (err) => {
  console.error("Redis connection error:", err);
});

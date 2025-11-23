import { S3Client } from "@aws-sdk/client-s3";

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "localhost";
const MINIO_PORT = parseInt(process.env.MINIO_PORT || "9000");
const MINIO_USE_SSL = process.env.MINIO_USE_SSL === "true";
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY;
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY;
const MINIO_BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "nexus-collaboration";

// We don't throw here to allow build time execution without env vars, 
// but we should check this before using the client.
if (!MINIO_ACCESS_KEY || !MINIO_SECRET_KEY) {
  console.warn("MinIO credentials are not configured in environment variables.");
}

export const s3Client = new S3Client({
  endpoint: `http${MINIO_USE_SSL ? "s" : ""}://${MINIO_ENDPOINT}:${MINIO_PORT}`,
  region: "us-east-1", // MinIO requires a region, but it can be anything
  credentials: {
    accessKeyId: MINIO_ACCESS_KEY || "minioadmin",
    secretAccessKey: MINIO_SECRET_KEY || "minioadmin",
  },
  forcePathStyle: true, // Required for MinIO
});

export const BUCKET_NAME = MINIO_BUCKET_NAME;

import { NextResponse } from "next/server";
import { s3Client, BUCKET_NAME } from "@/lib/s3";
import { ListObjectsV2Command, ListBucketsCommand } from "@aws-sdk/client-s3";

export async function GET() {
  try {
    // List Buckets
    const buckets = await s3Client.send(new ListBucketsCommand({}));
    
    // List Objects in the configured bucket
    const objects = await s3Client.send(
      new ListObjectsV2Command({ Bucket: BUCKET_NAME })
    );

    return NextResponse.json({
      config: {
        bucketName: BUCKET_NAME,
        // endpoint: s3Client.config.endpoint, // Endpoint might be a function or object, hard to serialize
      },
      buckets: buckets.Buckets,
      objects: objects.Contents,
    });
  } catch (error) {
    console.error("MinIO Debug Error:", error);
    return NextResponse.json(
      { error: "Failed to query MinIO", details: String(error) },
      { status: 500 }
    );
  }
}

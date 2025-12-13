import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { GetObjectCommand } from "@aws-sdk/client-s3";

import { s3Client, BUCKET_NAME } from "@/lib/s3";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    // Public access allowed for file retrieval
    // const session = await getServerSession(authOptions);
    // if (!session || !session.user) {
    //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    // }

    const resolvedParams = await params;
    const key = resolvedParams.key.join("/");
    console.log("File retrieval request for key:", key);


    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    try {
      const response = await s3Client.send(command);
      const stream = response.Body as ReadableStream;

      return new NextResponse(stream, {
        headers: {
          "Content-Type": response.ContentType || "application/octet-stream",
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    } catch (s3Error: any) {
      if (s3Error.name === "NoSuchKey" || s3Error.Code === "NoSuchKey") {
        console.warn(`File not found in S3: ${key}`);
      } else {
        console.error("S3 GetObject error:", s3Error);
      }
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("Error fetching file:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

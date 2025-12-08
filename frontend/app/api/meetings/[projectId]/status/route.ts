import { NextRequest, NextResponse } from "next/server";
import { RoomServiceClient } from "livekit-server-sdk";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { projectId } = await context.params;

    if (!LIVEKIT_URL || !API_KEY || !API_SECRET) {
      return new NextResponse("LiveKit configuration missing", { status: 500 });
    }

    const roomService = new RoomServiceClient(
      LIVEKIT_URL,
      API_KEY,
      API_SECRET
    );

    // List rooms to find if one exists with the projectId (which maps to roomName)
    const rooms = await roomService.listRooms([projectId]);
    const room = rooms.find((r) => r.name === projectId);

    if (room && room.numParticipants > 0) {
      return NextResponse.json({
        active: true,
        numParticipants: room.numParticipants,
      });
    }

    return NextResponse.json({
      active: false,
      numParticipants: 0,
    });
  } catch (error) {
    console.error("Error checking meeting status:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

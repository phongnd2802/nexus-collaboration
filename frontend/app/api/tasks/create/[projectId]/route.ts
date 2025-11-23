import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";
import { FileAttachment } from "@/types/index";

interface CreateTaskBody {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assigneeId?: string;
  files?: FileAttachment[];
}

// POST /api/tasks/create/[projectId] - Create a new task in a project
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const projectId = params.projectId;
    const body: CreateTaskBody = await request.json();

    const { files, ...taskData } = body;

    // Request to the backend service
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/tasks/create/${projectId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...taskData,
          creatorId: session.user.id,
          projectId,
          files,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to create task" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Task creation error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/auth-options";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params.id;

    // Request to the backend service
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${id}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to fetch project" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Project fetch error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params.id;
    const body = await request.json();

    // Request to the backend service
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session.user.id,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { message: data.message || "Failed to update project" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Project update error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// Delete project
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const id = params.id;

    // Request to the backend service
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/projects/${id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": session.user.id,
        },
      }
    );

    if (!response.ok) {
      // Try to parse error message if available
      let errorMessage = "Failed to delete project";
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        // Ignore JSON parse error
      }

      return NextResponse.json(
        { message: errorMessage },
        { status: response.status }
      );
    }

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("Project delete error:", error);
    return NextResponse.json(
      { message: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

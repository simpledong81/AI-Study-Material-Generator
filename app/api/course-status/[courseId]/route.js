import { getGenerationStatus } from "@/configs/generationStore";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { courseId } = params;

    if (!courseId) {
      return NextResponse.json(
        { error: "Course ID is required" },
        { status: 400 }
      );
    }

    const status = getGenerationStatus(courseId);

    return NextResponse.json({
      courseId,
      status: status.status,
      data: status.data,
      error: status.error,
      timestamp: status.timestamp,
    });
  } catch (error) {
    console.error("Error checking course status:", error);
    return NextResponse.json(
      { error: "Failed to check status", details: error.message },
      { status: 500 }
    );
  }
}

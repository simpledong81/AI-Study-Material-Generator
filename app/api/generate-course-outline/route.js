import { courseOutlineAIModel } from "@/configs/AiModel";
import { db } from "@/configs/db";
import { STUDY_MATERIAL_TABLE } from "@/configs/schema";
import { inngest } from "@/inngest/client";
import { setGenerationStatus } from "@/configs/generationStore";
import { NextResponse } from "next/server";
// export async function POST(req) {
//   try {
//     const { courseId, topic, courseType, difficultyLevel, createdBy } =
//       await req.json();
//     const PROMPT = `
//         generate a study material for '${topic}' for '${courseType}'
//         and level of Difficulty will be '${difficultyLevel}'
//         with course title, summary of course, List of chapters along with the summary and Emoji icon for each chapter,
//         Topic list in each chapter in JSON format
//       `;
//     // Generate course layout using AI
//     const aiResp = await courseOutlineAIModel.sendMessage(PROMPT);
//     const aiResult = JSON.parse(aiResp.response.text());
//     // Save result along with user input
//     const dbResult = await db
//       .insert(STUDY_MATERIAL_TABLE)
//       .values({
//         courseId: courseId,
//         courseType: courseType,
//         difficultyLevel: difficultyLevel,
//         topic: topic,
//         createdBy: createdBy,
//         courseLayout: aiResult,
//       })
//       .returning({ resp: STUDY_MATERIAL_TABLE });

//     //Trriger Inngest function to generate chapter notes
//     const result = await inngest.send({
//       name: "notes.generate",
//       data: {
//         course: dbResult[0].resp,
//       },
//     });
//     console.log(result);

//     return NextResponse.json({ result: dbResult[0] });
//   } catch (error) {
//     console.error(error);
//     return NextResponse.json(
//       { error: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

export async function POST(req) {
  try {
    const { courseId, topic, courseType, difficultyLevel, createdBy } =
      await req.json();

    if (!courseId || !topic || !courseType || !difficultyLevel || !createdBy) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Set initial status
    setGenerationStatus(courseId, "generating", null, null);

    // Start async generation (don't await - fire and forget)
    generateCourseAsync(
      courseId,
      topic,
      courseType,
      difficultyLevel,
      createdBy
    );

    // Return immediately
    return NextResponse.json({
      success: true,
      courseId: courseId,
      status: "generating",
      message: "Course generation started. This will take 3-4 minutes.",
      estimatedTime: "3-4 minutes",
    });
  } catch (error) {
    console.error("Error starting course generation:", error);
    setGenerationStatus(courseId, "error", null, error.message);
    return NextResponse.json(
      { error: "Failed to start course generation", details: error.message },
      { status: 500 }
    );
  }
}

// Async function - runs in background
async function generateCourseAsync(
  courseId,
  topic,
  courseType,
  difficultyLevel,
  createdBy
) {
  try {
    console.log(`Starting AI generation for course ${courseId}...`);

    const PROMPT = `
        generate a study material for '${topic}' for '${courseType}'
        and level of Difficulty will be '${difficultyLevel}'
        with course title, summary of course, List of chapters along with the summary and Emoji icon for each chapter,
        Topic list in each chapter in JSON format
      `;

    // Update status to indicate AI processing
    setGenerationStatus(courseId, "ai-processing", null, null);

    // Generate course layout using AI
    const aiResp = await courseOutlineAIModel.sendMessage(PROMPT);
    const aiResult = JSON.parse(aiResp.response.text());

    console.log(`AI generation completed for course ${courseId}`);

    // Update status to indicate saving to database
    setGenerationStatus(courseId, "saving", null, null);

    // Save result along with user input
    const dbResult = await db
      .insert(STUDY_MATERIAL_TABLE)
      .values({
        courseId: courseId,
        courseType: courseType,
        difficultyLevel: difficultyLevel,
        topic: topic,
        createdBy: createdBy,
        courseLayout: aiResult,
      })
      .returning({ resp: STUDY_MATERIAL_TABLE });

    console.log(`Course ${courseId} saved successfully`);

    // Update status to indicate triggering Inngest
    setGenerationStatus(courseId, "triggering-inngest", null, null);

    // Trigger Inngest function to generate chapter notes
    const inngestResult = await inngest.send({
      name: "notes.generate",
      data: {
        course: dbResult[0].resp,
      },
    });

    console.log(
      `Inngest function triggered for course ${courseId}:`,
      inngestResult
    );

    // Set completion status with data
    setGenerationStatus(courseId, "completed", dbResult[0], null);
  } catch (error) {
    console.error(`Error generating course ${courseId}:`, error);
    setGenerationStatus(courseId, "error", null, error.message);
  }
}

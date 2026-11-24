import { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { MultiAgentResearchService } from "@/lib/deep-research/multi-agent-research";
import { FileService } from "@/lib/deep-research/file-service";
import { db } from "@/server/db";

export const maxDuration = 300; // 5 minutes
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { topic, topK = 5, nSections = 5 } = await req.json();

  if (!topic || typeof topic !== "string") {
    return new Response("Topic is required", { status: 400 });
  }

  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    return new Response("CEREBRAS_API_KEY not configured", { status: 500 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const service = new MultiAgentResearchService(apiKey);

        // Send initial message
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "start",
              message: "Starting multi-agent research...",
              progress: 0,
            })}\n\n`
          )
        );

        const report = await service.generateReport({
          topic,
          topK,
          nSections,
          onProgress: (message, progress) => {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "progress",
                  message,
                  progress,
                })}\n\n`
              )
            );
          },
        });

        // Format as markdown
        const markdown = MultiAgentResearchService.formatAsMarkdown(report);

        // Save to Supabase Storage and database
        try {
          console.log("💾 Starting save process...");
          console.log("User ID:", session.user.id);
          console.log("Topic:", topic);
          console.log("Markdown length:", markdown.length);
          
          const fileService = new FileService();
          console.log("📁 Saving to Supabase Storage...");
          const filePath = await fileService.saveMarkdownFile(
            session.user.id,
            topic,
            markdown
          );
          console.log("✅ File saved to Supabase Storage:", filePath);

          // Save to database
          console.log("💾 Saving to database...");
          const dbResult = await db.deepResearchReport.create({
            data: {
              userId: session.user.id,
              topic,
              markdown,
              filePath,
              status: "completed",
              pmidsUsed: report.references?.map((ref: any) => ref.pmid).filter(Boolean) || [],
              wordCount: markdown.split(/\s+/).length,
              referenceCount: report.references?.length || 0,
            },
          });
          console.log("✅ Saved to database with ID:", dbResult.id);

          console.log(`✅ Research report fully saved - DB ID: ${dbResult.id}, File: ${filePath}`);
        } catch (saveError) {
          console.error("❌ Failed to save research report:");
          console.error("Error details:", saveError);
          console.error("Error message:", saveError instanceof Error ? saveError.message : String(saveError));
          console.error("Error stack:", saveError instanceof Error ? saveError.stack : "No stack trace");
          // Don't fail the request, just log the error
        }

        // Send complete message with report
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
              report: {
                ...report,
                markdown,
              },
            })}\n\n`
          )
        );

        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              message:
                error instanceof Error ? error.message : "Unknown error",
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

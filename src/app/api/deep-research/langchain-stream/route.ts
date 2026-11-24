import { NextRequest } from "next/server";
import { auth } from "@/server/auth";
import { LangChainResearchService } from "@/lib/deep-research/langchain-research";

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
        const service = new LangChainResearchService(apiKey);

        // Send initial message
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "start",
              message: "🔗 Starting LangChain-powered research...",
              progress: 0,
            })}\n\n`
          )
        );

        const report = await service.generateResearch({
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
        const markdown = LangChainResearchService.formatAsMarkdown(report);

        // Send metadata first (small)
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "metadata",
              metadata: report.metadata,
            })}\n\n`
          )
        );

        // Send markdown in chunks (avoid SSE size limit)
        const chunkSize = 50000; // 50KB chunks
        for (let i = 0; i < markdown.length; i += chunkSize) {
          const chunk = markdown.slice(i, i + chunkSize);
          const isLast = i + chunkSize >= markdown.length;
          
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "markdown_chunk",
                chunk,
                isLast,
              })}\n\n`
            )
          );
        }

        // Send complete signal
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
              report: {
                title: report.title,
                sections: report.sections.map(s => ({
                  heading: s.heading,
                  papers: s.papers.map(p => ({
                    PMID: p.PMID,
                    Title: p.Title,
                    citationNum: p.citationNum,
                  }))
                })),
                metadata: report.metadata,
              },
            })}\n\n`
          )
        );

        controller.close();
      } catch (error) {
        console.error("LangChain research error:", error);
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

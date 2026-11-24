import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { auth } from "@/server/auth";
import { NextResponse } from "next/server";
import { env } from "@/env";

interface OutlineRequest {
  prompt: string;
  numberOfCards: number;
  language: string;
  modelProvider?: string;
  modelId?: string;
}

/**
 * Presentation Outline Generation using Cerebras Direct SDK
 * Based on the working deep-research multi-agent architecture
 */
export async function POST(req: Request) {
  try {
    console.log("\n========== CEREBRAS OUTLINE API CALLED ==========");
    const session = await auth();
    if (!session?.user?.id) {
      console.error("❌ Unauthorized: No session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("✅ User authenticated:", session.user.id);

    const {
      prompt,
      numberOfCards,
      language,
      modelProvider = "cerebras",
      modelId: requestedModelId = "llama3.1-70b",
    } = (await req.json()) as OutlineRequest;

    // Map model IDs to Cerebras format (they use dashes, not dots)
    const modelMap: Record<string, string> = {
      "llama3.1-70b": "llama-3.3-70b",
      "llama3.1-8b": "llama3.1-8b",
    };
    const modelId = modelMap[requestedModelId] || "llama-3.3-70b";

    console.log("📋 Request Parameters:");
    console.log("  - Prompt:", prompt);
    console.log("  - Number of Cards:", numberOfCards);
    console.log("  - Language:", language);
    console.log("  - Model:", modelId);

    if (!prompt || !numberOfCards || !language) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const languageMap: Record<string, string> = {
      "en-US": "English (US)",
      pt: "Portuguese",
      es: "Spanish",
      fr: "French",
      de: "German",
      it: "Italian",
      ja: "Japanese",
      ko: "Korean",
      zh: "Chinese",
      ru: "Russian",
      hi: "Hindi",
      ar: "Arabic",
    };

    const actualLanguage = languageMap[language] ?? language;
    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Create Cerebras client
    console.log("🤖 Creating Cerebras client...");
    const cerebras = new Cerebras({ apiKey: env.CEREBRAS_API_KEY });

    const outlinePrompt = `You are an expert presentation outline generator. Create a structured outline for a presentation.

Current Date: ${currentDate}
Topic: ${prompt}
Language: ${actualLanguage}
Number of slides needed: ${numberOfCards}

First, generate an appropriate title for the presentation, then create exactly ${numberOfCards} main topics that would make for an engaging and well-structured presentation.

Format the response starting with the title in XML tags, followed by markdown content with each topic as a heading and 2-3 bullet points.

Example format:
<TITLE>Your Generated Presentation Title Here</TITLE>

# First Main Topic
- Key point about this topic
- Another important aspect
- Brief conclusion or impact

# Second Main Topic
- Main insight for this section
- Supporting detail or example
- Practical application or takeaway

Make sure the topics:
1. Flow logically from one to another
2. Cover the key aspects of the main topic
3. Are clear and concise
4. Are engaging for the audience
5. ALWAYS use bullet points (not paragraphs)
6. Keep each bullet point brief - just one sentence per point
7. Include exactly 2-3 bullet points per topic`;

    console.log("🚀 Calling Cerebras API with streaming...");

    // Use Cerebras SDK directly (like deep-research does)
    const stream = await cerebras.chat.completions.create({
      model: modelId,
      messages: [
        {
          role: "system",
          content: "You are an expert presentation outline generator.",
        },
        {
          role: "user",
          content: outlinePrompt,
        },
      ],
      stream: true,
      max_completion_tokens: 2000,
      temperature: 0.7,
    });

    console.log("✅ Stream created, starting to stream response...");

    // Create a ReadableStream in AI SDK format for useChat
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = "";
          let chunkCount = 0;
          
          console.log("📡 Starting to stream outline chunks in AI SDK format...");
          
          for await (const chunk of stream) {
            const content = (chunk as any).choices?.[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              chunkCount++;
              
              // Send chunk in AI SDK data stream format
              // Format: "0:" followed by JSON-encoded text chunk
              const dataChunk = `0:${JSON.stringify(content)}\n`;
              controller.enqueue(encoder.encode(dataChunk));
              
              // Log progress every 20 chunks
              if (chunkCount % 20 === 0) {
                console.log(`📦 Outline: Streamed ${chunkCount} chunks, ${fullContent.length} chars...`);
              }
            }
          }

          console.log("✅ Outline stream completed!");
          console.log("  - Total chunks:", chunkCount);
          console.log("  - Total length:", fullContent.length);
          
          // Send completion marker with proper finishReason
          controller.enqueue(encoder.encode('e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n'));
          controller.close();
        } catch (error) {
          console.error("❌ Outline stream error:", error);
          // Send error in AI SDK format
          const errorMsg = error instanceof Error ? error.message : String(error);
          controller.enqueue(encoder.encode(`3:${JSON.stringify(errorMsg)}\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Vercel-AI-Data-Stream": "v1",
      },
    });
  } catch (error) {
    console.error("\n❌ ERROR in Cerebras outline generation:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to generate outline" },
      { status: 500 },
    );
  }
}

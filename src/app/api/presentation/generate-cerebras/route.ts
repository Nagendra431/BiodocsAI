import Cerebras from "@cerebras/cerebras_cloud_sdk";
import { auth } from "@/server/auth";
import { NextResponse } from "next/server";
import { env } from "@/env";
import { CreditService } from "@/lib/credits/credit-service";

interface SlidesRequest {
  title: string;
  prompt: string;
  outline: string[];
  language: string;
  tone: string;
  modelProvider?: string;
  modelId?: string;
  searchResults?: Array<{ query: string; results: unknown[] }>;
}

// Import the same template from the original route
const slidesTemplate = `Create a presentation in XML format with DETAILED, COMPREHENSIVE content. Follow this EXACT structure:

<PRESENTATION>
<SECTION layout="vertical">
<BULLETS>
<DIV><H3>Main Point 1</H3><P>Detailed explanation with 2-3 sentences providing comprehensive information, context, and supporting details.</P></DIV>
<DIV><H3>Main Point 2</H3><P>Another detailed explanation with multiple sentences covering key aspects, benefits, and relevant information.</P></DIV>
<DIV><H3>Main Point 3</H3><P>Third detailed point with thorough explanation including examples, statistics, or specific details.</P></DIV>
<DIV><H3>Main Point 4</H3><P>Fourth comprehensive point with extensive details and supporting information.</P></DIV>
<DIV><H3>Main Point 5</H3><P>Fifth detailed point providing additional context and thorough coverage of the topic.</P></DIV>
</BULLETS>
<IMG query="small icon or illustration" />
</SECTION>

<SECTION layout="vertical">
<COLUMNS>
<DIV><H3>Section A Title</H3><P>Comprehensive paragraph with 3-4 sentences explaining this section in detail with examples and context.</P></DIV>
<DIV><H3>Section B Title</H3><P>Another detailed paragraph covering multiple aspects with thorough explanations and supporting information.</P></DIV>
<DIV><H3>Section C Title</H3><P>Third detailed section with extensive information and comprehensive coverage of key points.</P></DIV>
</COLUMNS>
<IMG query="small decorative icon" />
</SECTION>
</PRESENTATION>

CRITICAL CONTENT RULES:
1. ONLY use these tags: PRESENTATION, SECTION, DIV, H3, P, IMG
2. ONLY use these layouts: BULLETS, COLUMNS, ICONS, CYCLE, ARROWS, TIMELINE, PYRAMID, STAIRCASE
3. Each SECTION must have layout="vertical" (for text-heavy slides)
4. Each layout must contain 4-6 DIV tags (NOT just 2-3)
5. Each P tag must contain 2-4 FULL SENTENCES (minimum 20-40 words per paragraph)
6. Each H3 must be a clear, descriptive subtitle (5-8 words)
7. IMG tags should have simple queries for small icons/illustrations
8. Focus on DETAILED, INFORMATIVE content - be comprehensive and thorough

CONTENT GUIDELINES:
- Write detailed paragraphs, not brief phrases
- Include specific examples, statistics, or data when relevant
- Provide context and explanations for each point
- Use professional, informative language
- Each slide should have substantial text content (200-300 words)
- Images are secondary - they should be small decorative elements

REFERENCES SLIDE (MANDATORY):
- The LAST slide MUST be a "References" or "Citations" slide
- List all sources, research papers, articles, or data sources used
- Use BULLETS layout for the references slide
- Format: Author/Source, Title, Year, URL (if available)
- Include 5-10 references from the research data provided
- Example format:
  <SECTION layout="vertical">
  <BULLETS>
  <DIV><H3>Reference 1</H3><P>Author Name et al. (2024). Article Title. Journal Name. Available at: URL</P></DIV>
  <DIV><H3>Reference 2</H3><P>Source Name (2023). Research Title. Publication. DOI or URL</P></DIV>
  </BULLETS>
  <IMG query="books icon" />
  </SECTION>

PRESENTATION DETAILS:
Title: {TITLE}
Request: {PROMPT}
Outline: {OUTLINE_FORMATTED}
Language: {LANGUAGE}
Tone: {TONE}
Total Slides: {TOTAL_SLIDES}

RESEARCH:
{SEARCH_RESULTS}

Create {TOTAL_SLIDES} slides now. Each slide must be TEXT-HEAVY with comprehensive, detailed content. Use different layouts but always prioritize text over images. IMPORTANT: The LAST slide must be a References/Citations slide listing all sources used.`;

export async function POST(req: Request) {
  try {
    console.log("\n========== CEREBRAS PRESENTATION GENERATION API CALLED ==========");
    
    // Authentication check
    const session = await auth();
    if (!session?.user?.id) {
      console.error("❌ Unauthorized: No session or user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("✅ User authenticated:", session.user.id);

    // Check credits
    const hasCredits = await CreditService.hasEnoughCredits(
      session.user.id,
      "presentation_generate"
    );

    if (!hasCredits) {
      console.warn("⚠️ User has insufficient credits");
      return NextResponse.json(
        { error: "Insufficient credits. Please upgrade your plan." },
        { status: 403 }
      );
    }
    console.log("✅ User has sufficient credits");

    const {
      title,
      prompt: userPrompt,
      outline,
      language,
      tone,
      modelProvider = "cerebras",
      modelId: requestedModelId = "llama3.1-70b",
      searchResults,
    } = (await req.json()) as SlidesRequest;

    // Map model IDs
    const modelMap: Record<string, string> = {
      "llama3.1-70b": "llama-3.3-70b",
      "llama3.1-8b": "llama3.1-8b",
    };
    const modelId = modelMap[requestedModelId] || "llama-3.3-70b";

    console.log("📋 Request Parameters:");
    console.log("  - Title:", title);
    console.log("  - User Prompt:", userPrompt);
    console.log("  - Outline Length:", outline?.length);
    console.log("  - Language:", language);
    console.log("  - Tone:", tone);
    console.log("  - Model:", modelId);

    if (!title || !outline || !Array.isArray(outline) || !language) {
      console.error("❌ Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Format search results
    let searchResultsText = "No research data available.";
    if (searchResults && searchResults.length > 0) {
      const searchData = searchResults
        .map((sr, idx) => {
          const results = Array.isArray(sr.results) ? sr.results : [];
          const formattedResults = results
            .slice(0, 3)
            .map((r: any) => `- ${r.title || r.name || "Result"}: ${r.description || r.content || ""}`)
            .join("\n");
          return `Query ${idx + 1}: "${sr.query}"\n${formattedResults}`;
        })
        .join("\n\n");
      searchResultsText = `Research data from web search:\n${searchData}`;
    }

    const currentDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const formattedPrompt = slidesTemplate
      .replace(/{TITLE}/g, title)
      .replace(/{PROMPT}/g, userPrompt || "No specific prompt provided")
      .replace(/{CURRENT_DATE}/g, currentDate)
      .replace(/{LANGUAGE}/g, language)
      .replace(/{TONE}/g, tone)
      .replace(/{OUTLINE_FORMATTED}/g, outline.join("\n\n"))
      .replace(/{TOTAL_SLIDES}/g, outline.length.toString())
      .replace(/{SEARCH_RESULTS}/g, searchResultsText);

    console.log("\n🎯 Expected slides to generate:", outline.length);
    console.log("🚀 Starting Cerebras AI stream generation...");

    // Create Cerebras client
    const cerebras = new Cerebras({ apiKey: env.CEREBRAS_API_KEY });

    const stream = await cerebras.chat.completions.create({
      model: modelId,
      messages: [
        {
          role: "system",
          content: "You are an expert presentation designer.",
        },
        {
          role: "user",
          content: formattedPrompt,
        },
      ],
      stream: true,
      max_completion_tokens: 8000,
      temperature: 0.7,
    });

    console.log("✅ Stream created, starting to stream response...");

    // Deduct credits after successful generation start
    await CreditService.deductCredits(
      session.user.id, 
      "presentation_generate",
      `Generated presentation: ${title}`
    );

    // Create a ReadableStream in AI SDK format for useCompletion
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let fullContent = "";
          let chunkCount = 0;
          
          console.log("📡 Starting to stream chunks in AI SDK format...");
          
          for await (const chunk of stream) {
            const content = (chunk as any).choices?.[0]?.delta?.content || "";
            if (content) {
              fullContent += content;
              chunkCount++;
              
              // Send chunk in AI SDK data stream format
              // Format: "0:" followed by JSON-encoded text chunk
              const dataChunk = `0:${JSON.stringify(content)}\n`;
              controller.enqueue(encoder.encode(dataChunk));
              
              // Log progress every 10 chunks
              if (chunkCount % 10 === 0) {
                console.log(`📦 Streamed ${chunkCount} chunks, ${fullContent.length} chars so far...`);
              }
            }
          }

          console.log("✅ Stream completed!");
          console.log("  - Total chunks:", chunkCount);
          console.log("  - Total length:", fullContent.length);
          console.log("  - First 200 chars:", fullContent.substring(0, 200));
          console.log("  - Last 200 chars:", fullContent.substring(Math.max(0, fullContent.length - 200)));
          
          // Send completion marker with proper finishReason
          controller.enqueue(encoder.encode('e:{"finishReason":"stop","usage":{"promptTokens":0,"completionTokens":0}}\n'));
          controller.close();
        } catch (error) {
          console.error("❌ Stream error:", error);
          console.error("Error details:", error instanceof Error ? error.message : String(error));
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
    console.error("\n❌ ERROR in Cerebras presentation generation:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to generate presentation slides" },
      { status: 500 },
    );
  }
}

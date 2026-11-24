import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { streamText } from "ai";
import { MultiSourceService } from "@/lib/deep-research/multi-source-service";
import { modelPicker } from "@/lib/model-picker";

interface OutlineRequest {
  prompt: string;
  numSlides: number;
  language: string;
  modelProvider?: string;
  modelId?: string;
  sources: {
    web: boolean;
    pubmed: boolean;
    arxiv: boolean;
  };
}

const outlinePrompt = `You are an expert presentation designer. Your task is to create a structured outline for a presentation.

## Your Process:
1. **Analyze the topic** - Understand what the user wants to present
2. **Use research data** - Leverage the provided research from multiple sources to enhance the outline
3. **Generate outline** - Create a structured outline with the requested number of topics

## Research Data Guidelines:
- Use research data to find current statistics, recent developments, or expert insights
- Incorporate findings from academic papers, medical literature, and web sources
- Cite relevant information that will make the presentation more credible and engaging
- Focus on information that directly relates to the presentation topic

## Outline Requirements:
- Create exactly {NUM_SLIDES} topics (no more, no less)
- Each topic should be a clear, concise title (5-10 words max)
- Topics should flow logically from introduction to conclusion
- Include diverse perspectives and current information from research
- Make each topic specific and actionable

## Topic Structure Guidelines:
Each topic title should:
- Start with an action verb or clear concept
- Be specific enough to guide content creation
- Avoid generic phrases like "Introduction" or "Conclusion" (be more specific)
- Include key terms that will help with image generation

## Example Good Topics:
- "AI-Powered Diagnostics Transform Healthcare"
- "Reducing Hospital Readmissions Through Remote Monitoring"
- "Cost-Benefit Analysis of Telemedicine Implementation"
- "Patient Privacy in Digital Health Records"
- "Future Trends: Personalized Medicine and Genomics"

## Example Bad Topics:
- "Introduction" (too generic)
- "Overview" (not specific)
- "Conclusion" (be more specific about what you're concluding)
- "Background Information" (what background specifically?)

## Output Format:
Return ONLY the topic titles, one per line, numbered 1-{NUM_SLIDES}.
Do not include any explanations, bullet points, or additional text.

Example output:
1. AI-Powered Diagnostics Transform Healthcare
2. Reducing Hospital Readmissions Through Remote Monitoring
3. Cost-Benefit Analysis of Telemedicine Implementation
4. Patient Privacy in Digital Health Records
5. Future Trends: Personalized Medicine and Genomics

Remember: Use the research data provided to make informed, current, and credible topic suggestions.`;

export async function POST(req: NextRequest) {
  try {
    console.log("\n========== MULTI-SOURCE OUTLINE API CALLED ==========");
    const session = await auth();
    if (!session) {
      console.error("❌ Unauthorized: No session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      prompt,
      numSlides,
      language,
      modelProvider = "openai",
      modelId,
      sources,
    } = (await req.json()) as OutlineRequest;

    console.log("📋 Request Parameters:");
    console.log("  - Prompt:", prompt);
    console.log("  - Num Slides:", numSlides);
    console.log("  - Language:", language);
    console.log("  - Model Provider:", modelProvider);
    console.log("  - Model ID:", modelId);
    console.log("  - Sources:", sources);

    if (!prompt || !numSlides) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if at least one source is enabled
    if (!sources.web && !sources.pubmed && !sources.arxiv) {
      console.warn("⚠️ No sources enabled, falling back to web only");
      sources.web = true;
    }

    // Perform multi-source research
    console.log("🔍 Starting multi-source research...");
    const multiSourceService = new MultiSourceService();
    const researchData = await multiSourceService.searchAll(
      prompt,
      {
        web: sources.web,
        pubmed: sources.pubmed,
        arxiv: sources.arxiv,
      },
      10 // maxPerSource
    );

    const enabledSources: string[] = [];
    if (sources.web) enabledSources.push('Web');
    if (sources.pubmed) enabledSources.push('PubMed');
    if (sources.arxiv) enabledSources.push('arXiv');
    
    console.log(`✅ Research completed: ${researchData.results.length} total results`);
    console.log(`   PubMed: ${researchData.sourceStats.pubmed}, arXiv: ${researchData.sourceStats.arxiv}, Web: ${researchData.sourceStats.web}`);

    // Format research data for the prompt
    let researchContext = "No research data available.";
    if (researchData.results.length > 0) {
      const formattedResults = researchData.results
        .slice(0, 15) // Limit to top 15 results
        .map((result, index) => {
          return `${index + 1}. [${result.source}] ${result.title}\n   ${result.snippet || result.abstract || "No description available"}\n   Relevance: ${result.relevanceScore.toFixed(2)}`;
        })
        .join("\n\n");

      researchContext = `Research from ${enabledSources.join(", ")}:\n\n${formattedResults}`;
    }

    // Format the prompt
    const formattedPrompt = outlinePrompt
      .replace(/{NUM_SLIDES}/g, numSlides.toString())
      .replace(/{LANGUAGE}/g, language)
      + `\n\n## Topic:\n${prompt}\n\n## Research Data:\n${researchContext}\n\nNow generate ${numSlides} topic titles:`;

    console.log("✅ Prompt formatted successfully");
    console.log("🚀 Starting AI generation...");

    // Get the model
    const model = modelPicker(modelProvider, modelId);
    console.log("✅ Model created successfully");

    // Stream the response
    const result = streamText({
      model,
      prompt: formattedPrompt,
      temperature: 0.7,
      maxTokens: 1000,
    });

    console.log("✅ Stream created successfully");
    return result.toDataStreamResponse();
  } catch (error) {
    console.error("❌ Error in outline-multi-source API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

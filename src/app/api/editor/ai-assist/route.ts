import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";
const CEREBRAS_API_URL = "https://api.cerebras.ai/v1/chat/completions";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query, context } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Call your AI service for assistance
    const { response, suggestedContent } = await getAiAssistance(query, context);

    return NextResponse.json({
      success: true,
      response,
      suggestedContent,
    });
  } catch (error) {
    console.error("Error getting AI assistance:", error);
    return NextResponse.json(
      { error: "Failed to get AI assistance" },
      { status: 500 }
    );
  }
}

async function getAiAssistance(
  query: string,
  context: string
): Promise<{ response: string; suggestedContent?: string }> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  
  if (!openaiKey && !cerebrasKey) {
    return {
      response: "AI service is not configured. Please add OPENAI_API_KEY or CEREBRAS_API_KEY to your .env file.",
    };
  }

  const useOpenAI = !!openaiKey;
  let apiKey = useOpenAI ? openaiKey : cerebrasKey;
  let apiUrl = useOpenAI ? OPENAI_API_URL : CEREBRAS_API_URL;
  let model = useOpenAI ? "gpt-4o-mini" : "llama-3.3-70b";

  try {
    // Determine request type
    const lowerQuery = query.toLowerCase();
    
    const isEditRequest = 
      lowerQuery.includes("change") ||
      lowerQuery.includes("edit") ||
      lowerQuery.includes("modify") ||
      lowerQuery.includes("update") ||
      lowerQuery.includes("replace") ||
      lowerQuery.includes("rewrite") ||
      lowerQuery.includes("improve");
    
    const isAddRequest = 
      lowerQuery.includes("add") ||
      lowerQuery.includes("continue") ||
      lowerQuery.includes("write") ||
      lowerQuery.includes("generate") ||
      lowerQuery.includes("create") ||
      lowerQuery.includes("insert");

    const isCitationRequest = 
      lowerQuery.includes("citation") ||
      lowerQuery.includes("reference") ||
      lowerQuery.includes("cite");

    const isIntroRequest = 
      lowerQuery.includes("intro") ||
      lowerQuery.includes("introduction");
    
    // Create appropriate prompt
    let systemPrompt = "You are an expert medical AI assistant specialized in academic and clinical writing. You help with research papers, case studies, and medical documents. Always use proper markdown formatting with headers (##), bold (**), italic (*), and lists.";
    let userPrompt = "";
    
    if (isEditRequest && context) {
      // For edit requests, provide the full context and ask for modified version
      systemPrompt = "You are an expert medical AI assistant. When the user asks to change/edit content, return the COMPLETE MODIFIED document with the changes applied. Preserve all existing sections that aren't being modified. Use proper markdown formatting.";
      userPrompt = `Current document:\n\n${context}\n\n---\n\nUser request: ${query}\n\nReturn the COMPLETE modified document with the requested changes applied. Keep all sections that aren't being modified exactly as they are:`;
    } else if (isCitationRequest && context) {
      // For citation requests
      systemPrompt = "You are a medical AI assistant. Add proper academic citations in the format: Author et al. (Year). Use realistic medical journal references with PMIDs where appropriate.";
      const contextPreview = context.substring(Math.max(0, context.length - 1000));
      userPrompt = `Document excerpt:\n${contextPreview}\n\nRequest: ${query}\n\nAdd 3-5 relevant medical citations to support the content. Format them properly with author names, years, and journal information. Include them in a References section at the end:`;
    } else if (isIntroRequest && context) {
      // For introduction editing
      systemPrompt = "You are a medical AI assistant. When asked to edit an introduction, provide a well-structured, engaging introduction for a medical document.";
      userPrompt = `Current document:\n${context}\n\nRequest: ${query}\n\nProvide an improved introduction section. Include background, significance, and objectives. Use markdown formatting with ## Introduction header:`;
    } else if (isAddRequest && context) {
      // For add/continue requests
      const contextPreview = context.substring(Math.max(0, context.length - 800));
      systemPrompt = "You are a medical AI assistant. Generate high-quality medical content that continues or adds to the existing document. Use proper markdown formatting.";
      userPrompt = `Current document excerpt:\n${contextPreview}\n\nRequest: ${query}\n\nGenerate the requested content in markdown format:`;
    } else if (isAddRequest && !context) {
      // Generate from scratch
      systemPrompt = "You are a medical AI assistant. Generate high-quality medical content based on the request. Use proper markdown formatting with headers, lists, and emphasis.";
      userPrompt = `Request: ${query}\n\nGenerate the requested medical content in markdown format:`;
    } else {
      // General query
      userPrompt = query;
    }

    // Retry logic for rate limits
    let res;
    let retries = 3;
    let delay = 1000; // Start with 1 second
    let triedFallback = false;

    for (let i = 0; i < retries; i++) {
      res = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 2000, // Increased for better content generation
        }),
      });

      // If success, break
      if (res.ok) break;

      // If rate limited and we have a fallback option
      if (res.status === 429 && !triedFallback && cerebrasKey && useOpenAI) {
        console.log("OpenAI rate limited, trying Cerebras...");
        apiUrl = CEREBRAS_API_URL;
        apiKey = cerebrasKey;
        model = "llama-3.3-70b";
        triedFallback = true;
        continue;
      }

      // If rate limited and not last retry, wait and retry
      if (res.status === 429 && i < retries - 1) {
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
        continue;
      }

      // If not rate limit or last retry, break
      break;
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("OpenAI API error:", {
        status: res.status,
        statusText: res.statusText,
        error: errText
      });
      
      if (res.status === 429) {
        return {
          response: "The AI service is currently busy. Please wait a moment and try again.",
        };
      }
      
      return {
        response: `I'm having trouble connecting to the AI service (Error ${res.status}). Please try again.`,
      };
    }

    const data = (await res.json()) as any;
    const aiResponse = data?.choices?.[0]?.message?.content || "I can help you with your medical document. What would you like me to do?";

    // Determine if we should suggest content changes
    const shouldSuggestContent = isEditRequest || isAddRequest || isCitationRequest || isIntroRequest;

    if (shouldSuggestContent) {
      return {
        response: "I've prepared the changes for you. Please review them in the diff viewer and accept or reject the modifications.",
        suggestedContent: aiResponse,
      };
    }

    // For general queries, just return the response
    return {
      response: aiResponse,
    };
  } catch (error) {
    console.error("Error calling AI service:", error);
    return {
      response: "I encountered an error. Please try again.",
    };
  }
}

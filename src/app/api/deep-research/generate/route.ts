import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { MultiAgentResearchService } from "@/lib/deep-research/multi-agent-research";
import { FileService } from "@/lib/deep-research/file-service";
import { db } from "@/server/db";
import { env } from "@/env";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Reduced defaults to avoid rate limiting (3 papers × 5 sections = 15 papers)
    const { query, topK = 3, nSections = 5 } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log(`🔬 Starting multi-agent deep research for: ${query}`);
    console.log(`📊 Config: ${topK} papers per section, ${nSections} sections`);

    // Initialize services
    const service = new MultiAgentResearchService(env.CEREBRAS_API_KEY || "");
    const fileService = new FileService();

    // Generate research report with multi-agent system
    const report = await service.generateReport({
      topic: query,
      topK,
      nSections,
      onProgress: (message, progress) => {
        console.log(`[${progress}%] ${message}`);
      },
    });

    // Format as markdown
    const markdown = MultiAgentResearchService.formatAsMarkdown(report);
    
    const result = {
      markdown,
      cleanedTopic: query,
      wordCount: report.metadata.wordCount,
      paperCount: report.metadata.paperCount,
    };

    // Use cleaned topic for file name and database
    const cleanedTopic = result.cleanedTopic || query;
    
    // Save markdown file
    const filePath = await fileService.saveMarkdownFile(
      session.user.id,
      cleanedTopic,
      result.markdown
    );

    // Convert to plain text for display
    const plainText = fileService.markdownToPlainText(result.markdown);

    // Extract PMIDs from report
    const pmids = report.sections.flatMap(s => s.papers.map(p => p.pmid)).filter(Boolean);

    // Save to database
    const dbReport = await db.deepResearchReport.create({
      data: {
        userId: session.user.id,
        topic: cleanedTopic,
        status: "completed",
        filePath,
        markdown: result.markdown,
        pmidsUsed: pmids,
        wordCount: result.wordCount,
        referenceCount: pmids.length,
      },
    });

    console.log(`✅ Research completed: ${dbReport.id}`);
    console.log(`✅ ${result.wordCount} words, ${result.paperCount} papers cited`);

    // Format sources for frontend
    const sources = report.sections.flatMap(s => 
      s.papers.map(p => ({
        title: p.title,
        url: `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`,
        snippet: p.abstract.slice(0, 200) + "...",
      }))
    );

    return NextResponse.json({
      success: true,
      reportId: dbReport.id,
      report: result.markdown,
      fullReport: result.markdown,
      sources,
      wordCount: result.wordCount,
      pmidCount: result.paperCount,
      filePath: filePath,
      downloadUrl: `/api/deep-research/download/${dbReport.id}`,
      metadata: report.metadata,
    });
  } catch (error) {
    console.error("Error conducting deep research:", error);
    return NextResponse.json(
      { 
        error: "Failed to conduct deep research",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

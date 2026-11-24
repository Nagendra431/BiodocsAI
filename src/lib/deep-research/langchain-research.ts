/**
 * LangChain Multi-Agent Deep Research System (TypeScript)
 * Port of the Python implementation using:
 * - LangChain PubMed tools
 * - Cerebras LLM
 * - Multi-agent architecture
 */

import Cerebras from "@cerebras/cerebras_cloud_sdk";

// ============================================================================
// Types
// ============================================================================

export interface ResearchConfig {
  topic: string;
  topK?: number; // Papers per section (default: 5)
  nSections?: number; // Number of sections (default: 5)
  onProgress?: (message: string, progress: number) => void;
}

export interface PaperItem {
  PMID: string;
  Title: string;
  Text: string;
  citationNum: number;
}

export interface SectionResult {
  heading: string;
  content: string;
  papers: PaperItem[];
  dataTable?: string; // Optional data table
}

export interface ExtractedData {
  sampleSize: string | null;
  keyFindings: Array<{
    metric: string;
    value: string;
    context: string;
  }>;
  statisticalSignificance: Array<{
    comparison: string;
    pValue: string;
    effectSize: string;
  }>;
}

export interface ResearchReport {
  title: string;
  abstract: string;
  introduction: string;
  sections: SectionResult[];
  discussion: string;
  conclusion: string;
  references: string[];
  metadata: {
    wordCount: number;
    paperCount: number;
    generatedAt: string;
  };
}

// ============================================================================
// LangChain-Style Cerebras LLM Wrapper
// ============================================================================

class CerebrasLLM {
  private client: Cerebras;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(
    apiKey: string,
    model = "llama-3.3-70b",
    temperature = 0.7,
    maxTokens = 8192
  ) {
    this.client = new Cerebras({ apiKey });
    this.model = model;
    this.temperature = temperature;
    this.maxTokens = maxTokens;
  }

  async invoke(prompt: string): Promise<string> {
    try {
      // Truncate if too long
      const maxChars = (this.maxTokens - 1000) * 4;
      if (prompt.length > maxChars) {
        prompt = prompt.slice(0, maxChars) + "\n[Content truncated]";
      }

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You are a medical research assistant." },
          { role: "user", content: prompt },
        ],
        max_tokens: this.maxTokens,
        temperature: this.temperature,
      });

      const content = (response.choices as any)?.[0]?.message?.content;
      return typeof content === "string" ? content.trim() : "";
    } catch (error) {
      console.error("Cerebras API error:", error);
      throw error;
    }
  }
}

// ============================================================================
// PubMed Wrapper (LangChain-style)
// ============================================================================

class PubMedWrapper {
  private topK: number;

  constructor(topK = 5) {
    this.topK = topK;
  }

  async load(query: string): Promise<PaperItem[]> {
    try {
      console.log(`🔍 PubMed query: "${query}"`);

      // Step 1: Search for PMIDs
      const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(
        query
      )}&retmax=${this.topK}&retmode=json`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      const pmids = searchData.esearchresult?.idlist || [];

      if (pmids.length === 0) {
        console.warn(`⚠️  No papers found for query: "${query}"`);
        return [];
      }

      // Step 2: Fetch details
      const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pmids.join(
        ","
      )}&retmode=xml`;
      const fetchRes = await fetch(fetchUrl);
      const xmlText = await fetchRes.text();

      // Parse XML
      const docs: PaperItem[] = [];
      const articleMatches = xmlText.matchAll(
        /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g
      );

      let idx = 0;
      for (const match of articleMatches) {
        const article = match[1] || "";

        const pmidMatch = article.match(/<PMID[^>]*>(\d+)<\/PMID>/);
        const pmid = pmidMatch?.[1] || pmids[idx] || "";

        const titleMatch = article.match(
          /<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/
        );
        const title =
          titleMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || "Untitled";

        const abstractMatch = article.match(/<Abstract>([\s\S]*?)<\/Abstract>/);
        let abstract = "";
        if (abstractMatch) {
          const abstractTexts = abstractMatch[1].matchAll(
            /<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g
          );
          abstract = Array.from(abstractTexts)
            .map((m) => m[1]?.replace(/<[^>]+>/g, "") || "")
            .join(" ");
        }

        docs.push({
          PMID: pmid,
          Title: title,
          Text: abstract,
          citationNum: 0, // Will be set later
        });
        idx++;
      }

      console.log(`✅ Retrieved ${docs.length} papers`);
      return docs;
    } catch (error) {
      console.error("PubMed fetch error:", error);
      return [];
    }
  }
}

// ============================================================================
// Main LangChain Research Service
// ============================================================================

export class LangChainResearchService {
  private llm: CerebrasLLM;
  private pubmed: PubMedWrapper;
  private onProgress?: (message: string, progress: number) => void;

  constructor(apiKey: string) {
    this.llm = new CerebrasLLM(apiKey);
    this.pubmed = new PubMedWrapper();
  }

  /**
   * Main entry point for research generation
   */
  async generateResearch(config: ResearchConfig): Promise<ResearchReport> {
    const { topic, topK = 5, nSections = 5, onProgress } = config;
    this.onProgress = onProgress;
    this.pubmed = new PubMedWrapper(topK);

    this.reportProgress("🎯 Starting LangChain-powered research...", 0);

    // Step 1: Generate section headings
    this.reportProgress("📋 Generating section headings...", 5);
    const headings = await this.generateHeadings(topic, nSections);

    // Step 2: Process each section (sub-agents)
    this.reportProgress(
      `📚 Processing ${headings.length} sections (sub-agents)...`,
      15
    );
    const sections: SectionResult[] = [];
    let citationCounter = 1;

    for (let i = 0; i < headings.length; i++) {
      const progress = 15 + ((i + 1) / headings.length) * 70;
      this.reportProgress(
        `📖 Section ${i + 1}/${headings.length}: ${headings[i]}`,
        progress
      );

      const section = await this.processSection(
        topic,
        headings[i],
        citationCounter
      );
      sections.push(section);
      citationCounter += section.papers.length;
    }

    // Step 3: Assemble final report
    this.reportProgress("✍️ Assembling final research article...", 90);
    const report = await this.assembleReport(topic, sections);

    this.reportProgress("✅ Research complete!", 100);
    return report;
  }

  /**
   * Step 1: Generate section headings
   */
  private async generateHeadings(topic: string, n: number): Promise<string[]> {
    const prompt = `You are a medical research expert. Generate ONLY the section headings, one per line, with no explanations or numbering.

Topic: ${topic}

Generate ${n} major research section headings for a comprehensive literature review on this topic.
Each heading should represent a distinct aspect (e.g., Pathophysiology, Clinical Manifestations, Treatment Approaches, Risk Factors, etc.).

Output ONLY the headings, one per line:`;

    const response = await this.llm.invoke(prompt);
    const lines = response.split("\n");

    // Clean headings
    const headings: string[] = [];
    for (let line of lines) {
      line = line.trim();
      line = line.replace(/^\d+\.\s*/, ""); // Remove numbering
      line = line.replace(/^[\*\-]\s*/, ""); // Remove bullets
      line = line.replace(/^\*\*(.+?)\*\*:?/, "$1"); // Remove bold

      if (line && line.length > 5) {
        headings.push(line);
      }
    }

    const finalHeadings = headings.slice(0, n);
    console.log(`✓ Generated headings:`, finalHeadings);
    return finalHeadings.length > 0
      ? finalHeadings
      : [
          "Overview",
          "Clinical Features",
          "Treatment",
          "Research Findings",
          "Future Directions",
        ];
  }

  /**
   * Step 2: Process a single section (sub-agent)
   */
  private async processSection(
    topic: string,
    heading: string,
    startCitationNum: number
  ): Promise<SectionResult> {
    // Generate focused query for this section
    const query = await this.generateSectionQuery(topic, heading);

    // Retrieve papers using PubMed
    const papers = await this.pubmed.load(query);

    // Assign citation numbers
    papers.forEach((paper, idx) => {
      paper.citationNum = startCitationNum + idx;
    });

    // Analyze each paper
    const digests: string[] = [];
    const dataExtracts: string[] = []; // NEW: Store numerical data extracts
    
    for (const paper of papers) {
      // Existing: narrative summary
      const digest = await this.analyzePaper(paper, heading);
      digests.push(`[${paper.citationNum}] ${paper.Title}\n${digest.trim()}`);
      
      // NEW: extract numerical data
      try {
        const dataExtract = await this.extractNumericalData(paper);
        if (dataExtract && dataExtract.length > 50 && !dataExtract.includes('"sample_size": null') || dataExtract.includes('"key_findings": [')) {
          dataExtracts.push(`[${paper.citationNum}] ${paper.Title}\n${dataExtract.trim()}`);
        }
      } catch (error) {
        // Silently continue if data extraction fails
        console.error(`  ⚠️  Data extraction failed for paper ${paper.citationNum}`);
      }
    }

    // NEW: Generate summary table from extracted data
    let tableContent = "";
    if (dataExtracts.length > 0) {
      console.log(`  📊 Generating data table from ${dataExtracts.length} papers with numerical data...`);
      try {
        tableContent = await this.generateDataTable(heading, dataExtracts);
        if (!tableContent) {
          console.log(`  ℹ️  No meaningful table generated - insufficient numerical data`);
        }
      } catch (error) {
        console.error(`  ⚠️  Table generation failed`);
      }
    } else {
      console.log(`  ℹ️  No numerical data found in papers for this section`);
    }

    // Synthesize section content (now with optional table)
    const content =
      digests.length > 0
        ? await this.synthesizeSection(heading, topic, digests, tableContent)
        : "No relevant research found for this section.";

    return { heading, content, papers, dataTable: tableContent || undefined };
  }

  /**
   * Generate PubMed query for a section
   */
  private async generateSectionQuery(
    topic: string,
    heading: string
  ): Promise<string> {
    // Clean and extract main disease/condition from topic
    const cleanTopic = topic
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\b(comprehensive|review|study|research|analysis|overview)\b/gi, '')
      .trim();
    
    // Extract main keywords from heading (focus on medical terms)
    const headingKeywords = heading
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 4 && !['with', 'from', 'that', 'this', 'have', 'and', 'the'].includes(w))
      .slice(0, 2);
    
    // Build specific query: exact topic phrase + heading keywords
    const headingPart = headingKeywords.join(" ");
    
    // Use quoted topic for exact match + heading keywords
    const query = headingPart 
      ? `"${cleanTopic}" AND ${headingPart}`
      : `"${cleanTopic}"`;
    
    console.log(`  Query for "${heading}": ${query}`);
    return query;
  }

  /**
   * Analyze a single paper
   */
  private async analyzePaper(
    paper: PaperItem,
    heading: string
  ): Promise<string> {
    const prompt = `You are a medical research analyst. Provide detailed, comprehensive summaries.

Paper metadata:
PMID: ${paper.PMID}
Title: ${paper.Title}

Snippet:
${paper.Text.slice(0, 4000)}

Provide a DETAILED summary (200-300 words) covering:
- Study design and methodology
- Population/sample characteristics
- Key findings and results (with specific data/statistics if available)
- Clinical implications
- Limitations and future directions
- Conclusion`;

    return await this.llm.invoke(prompt);
  }

  /**
   * Extract numerical data and statistics from a paper
   */
  private async extractNumericalData(paper: PaperItem): Promise<string> {
    const prompt = `Extract ALL numerical data and statistics from this paper. Look for quantitative findings only.

Paper: ${paper.Title}
Text: ${paper.Text.substring(0, 3000)}

Extract:
- Sample sizes (n=X)
- Percentages and rates
- P-values, odds ratios, hazard ratios, confidence intervals
- Mean, median, standard deviation
- Treatment outcomes (response rates, survival rates)
- Prevalence/incidence rates

Format as JSON:
{
  "sample_size": "value or null",
  "key_findings": [
    {"metric": "description", "value": "number with unit", "context": "brief context"}
  ],
  "statistical_significance": [
    {"comparison": "what vs what", "p_value": "value", "effect_size": "value"}
  ]
}

If no numerical data found, return: {"sample_size": null, "key_findings": [], "statistical_significance": []}`;

    return await this.llm.invoke(prompt);
  }

  /**
   * Generate a Markdown table from extracted numerical data
   */
  private async generateDataTable(
    heading: string,
    dataExtracts: string[]
  ): Promise<string> {
    if (dataExtracts.length === 0) {
      return "";
    }

    const prompt = `Create a Markdown table summarizing key numerical findings from research papers. Only create a table if there is valid numerical data.

Section: ${heading}

Extracted numerical data from papers:
${dataExtracts.join('\n\n')}

Create a table with columns:
- Study [n]
- Sample Size (if available)
- Key Metrics/Outcomes with values
- Statistical Significance (p-values, confidence intervals, etc.)

Format as a proper Markdown table with headers and alignment.
If there is insufficient or no valid numerical data, return an empty string.
Do NOT create a table with empty cells or dashes - only create a table if you have actual numbers to report.`;

    const result = await this.llm.invoke(prompt);
    
    // Validate table was generated
    if (!result || result.length < 20 || !result.includes('|')) {
      return "";
    }
    
    return result.trim();
  }

  /**
   * Synthesize section content from paper digests
   */
  private async synthesizeSection(
    heading: string,
    topic: string,
    digests: string[],
    tableContent: string = "" // NEW: Optional table parameter
  ): Promise<string> {
    const prompt = `You are a medical researcher writing a detailed section for a literature review.

Main Topic: ${topic}
Section Heading: ${heading}

Paper summaries with citations [n]:
${digests.join("\n\n")}

Summary table of numerical data:
${tableContent || "No numerical data table available."}

Write a COMPREHENSIVE section (600-800 words) for this heading:
- Start with an overview paragraph introducing this aspect
- ${tableContent ? "Include the data table above with a brief introduction, then discuss the quantitative findings" : "Focus on qualitative findings and synthesize the narrative evidence from the papers"}
- Discuss findings from the papers with citations [n]
- When relevant, mention if papers contain important visual evidence (e.g., 'Study [n] presented microscopy images showing...'). Encourage readers to view the full-text version for figures and images
- Compare and contrast different studies
- Synthesize key insights
- Include 2-3 relevant subsections if appropriate (use ### for subsection headings)
- Write in academic style with depth and detail

${tableContent ? "" : "IMPORTANT: If the table says 'No numerical data table available', do NOT mention or reference any table. Simply write a comprehensive qualitative analysis."}

CRITICAL CITATION RULES:
- ONLY use citations that appear in the summaries above
- DO NOT invent or fabricate any citations
- DO NOT use author names or years (like "Smith et al., 2020")
- ONLY use [number] format for citations
- Every citation MUST match a paper in the summaries

Output the section content in Markdown format:`;

    return await this.llm.invoke(prompt);
  }

  /**
   * Step 3: Assemble final report
   */
  private async assembleReport(
    topic: string,
    sections: SectionResult[]
  ): Promise<ResearchReport> {
    // Deduplicate papers by PMID and create citation mapping
    const allPapersWithDuplicates = sections.flatMap((s) => s.papers);
    const uniquePapersMap = new Map<string, PaperItem>();
    const citationMapping = new Map<number, number>(); // old citation -> new citation
    
    let newCitationNum = 1;
    allPapersWithDuplicates.forEach(paper => {
      if (!uniquePapersMap.has(paper.PMID)) {
        uniquePapersMap.set(paper.PMID, { ...paper, citationNum: newCitationNum });
        citationMapping.set(paper.citationNum, newCitationNum);
        newCitationNum++;
      } else {
        // Map old citation to existing new citation
        const existingPaper = uniquePapersMap.get(paper.PMID)!;
        citationMapping.set(paper.citationNum, existingPaper.citationNum);
      }
    });
    const allPapers = Array.from(uniquePapersMap.values());
    
    console.log(`📚 Total papers (with duplicates): ${allPapersWithDuplicates.length}`);
    console.log(`📚 Unique papers: ${allPapers.length}`);
    
    // Renumber citations in section content
    let sectionsText = sections
      .map((s) => `## ${s.heading}\n\n${s.content}`)
      .join("\n\n");
    
    // Replace old citation numbers with new ones
    citationMapping.forEach((newNum, oldNum) => {
      if (newNum !== oldNum) {
        const regex = new RegExp(`\\[${oldNum}\\]`, 'g');
        sectionsText = sectionsText.replace(regex, `[${newNum}]`);
      }
    });

    const prompt = `You are a senior medical researcher assembling a comprehensive literature review. PRESERVE all section content - do not summarize or shorten the provided sections.

Topic: ${topic}

Below are detailed sections that have already been written:

${sectionsText}

Create a complete research article by adding:

1. A compelling title
2. An abstract (300-400 words) summarizing all sections
3. An introduction (400-500 words) providing context
4. ALL the provided sections (KEEP THEM INTACT - do not summarize)
5. A discussion section (400-500 words) synthesizing findings
6. A conclusion (300-400 words)

Format:
# [Title]

## Abstract
[Your abstract here]

## Introduction
[Your introduction here]

[INSERT ALL PROVIDED SECTIONS HERE EXACTLY AS GIVEN]

## Discussion and Synthesis
[Your discussion here]

## Conclusion
[Your conclusion here]

CRITICAL RULES:
1. Include ALL provided section content verbatim. Do not shorten or summarize the sections.
2. DO NOT add any new citations in the abstract, introduction, discussion, or conclusion
3. DO NOT use author-year format (like "Smith et al., 2020")
4. ONLY use [number] citations that already exist in the provided sections
5. DO NOT fabricate or invent any references`;

    const assembled = await this.llm.invoke(prompt);

    // Validate citations before parsing
    const validatedAssembly = this.validateCitations(assembled, allPapers);

    // Parse assembled content (use validated version)
    const titleMatch = validatedAssembly.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1] ?? `Research Review: ${topic}`;

    const abstractMatch = validatedAssembly.match(
      /##\s+Abstract\s+([\s\S]+?)(?=##|$)/i
    );
    const abstract = abstractMatch?.[1]?.trim() ?? "";

    const introMatch = validatedAssembly.match(
      /##\s+Introduction\s+([\s\S]+?)(?=##|$)/i
    );
    const introduction = introMatch?.[1]?.trim() ?? "";

    const discussionMatch = validatedAssembly.match(
      /##\s+Discussion(?:\s+and\s+Synthesis)?\s+([\s\S]+?)(?=##|$)/i
    );
    const discussion = discussionMatch?.[1]?.trim() ?? "";

    const conclusionMatch = validatedAssembly.match(
      /##\s+Conclusion\s+([\s\S]+?)$/i
    );
    const conclusion = conclusionMatch?.[1]?.trim() ?? "";

    // Build references
    const references = allPapers.map(
      (p, i) =>
        `${i + 1}. ${p.Title}. PMID: ${p.PMID}. https://pubmed.ncbi.nlm.nih.gov/${p.PMID}/`
    );

    // Calculate word count
    const fullText = `${abstract} ${introduction} ${sectionsText} ${discussion} ${conclusion}`;
    const wordCount = fullText.split(/\s+/).length;

    console.log(`✔ Deep research article complete`);
    console.log(`  📊 Word count: ${wordCount.toLocaleString()} words`);
    console.log(`  📚 References: ${allPapers.length} papers`);

    return {
      title,
      abstract,
      introduction,
      sections,
      discussion,
      conclusion,
      references,
      metadata: {
        wordCount,
        paperCount: allPapers.length,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Validate citations - remove any citations not in our paper list
   */
  private validateCitations(text: string, papers: PaperItem[]): string {
    const validCitationNums = papers.map((p) => p.citationNum);
    const maxCitation = Math.max(...validCitationNums);

    console.log(
      `🔍 Validating citations. Valid range: [1-${maxCitation}]`
    );

    // Find all [number] citations in text
    const citationPattern = /\[(\d+)\]/g;
    const foundCitations = new Set<number>();
    let match;

    while ((match = citationPattern.exec(text)) !== null) {
      foundCitations.add(parseInt(match[1]));
    }

    // Check for invalid citations
    const invalidCitations = Array.from(foundCitations).filter(
      (num) => num > maxCitation || num < 1
    );

    if (invalidCitations.length > 0) {
      console.warn(
        `⚠️  Found ${invalidCitations.length} invalid citations:`,
        invalidCitations.sort((a, b) => a - b)
      );

      // Remove invalid citations
      let cleaned = text;
      invalidCitations.forEach((num) => {
        const regex = new RegExp(`\\[${num}\\]`, "g");
        cleaned = cleaned.replace(regex, "");
      });

      console.log(`✓ Removed invalid citations`);
      return cleaned;
    }

    console.log(`✓ All citations valid`);
    return text;
  }

  /**
   * Report progress
   */
  private reportProgress(message: string, progress: number) {
    console.log(`[${progress}%] ${message}`);
    this.onProgress?.(message, progress);
  }

  /**
   * Format report as markdown
   */
  static formatAsMarkdown(report: ResearchReport): string {
    const sections = report.sections
      .map((s) => `## ${s.heading}\n\n${s.content}`)
      .join("\n\n");

    const references = report.references.map((ref) => `${ref}`).join("\n");

    return `# ${report.title}

## Abstract

${report.abstract}

## Introduction

${report.introduction}

${sections}

## Discussion and Synthesis

${report.discussion}

## Conclusion

${report.conclusion}

## References

${references}

---

*Generated on ${new Date(report.metadata.generatedAt).toLocaleString()}*  
*Word count: ${report.metadata.wordCount.toLocaleString()} | References: ${report.metadata.paperCount}*  
*Powered by LangChain + Cerebras*
`;
  }
}

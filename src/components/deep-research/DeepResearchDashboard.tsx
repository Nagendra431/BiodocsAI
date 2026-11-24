"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Send, Loader2, Download, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressTracker } from "./ProgressTracker";
import { ReportViewer } from "./ReportViewer";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
}

interface Task {
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
}

export function DeepResearchDashboard() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isResearching, setIsResearching] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [reportId, setReportId] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [pmidCount, setPmidCount] = useState(0);
  
  // Source selection
  const [selectedSources, setSelectedSources] = useState({
    pubmed: true,
    arxiv: false,
    web: false
  });
  
  // Progress tracking
  const [showProgress, setShowProgress] = useState(false);
  const [currentTopic, setCurrentTopic] = useState("");
  const [overallProgress, setOverallProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState("");
  const [tasks, setTasks] = useState<Task[]>([
    { name: 'Topic Analysis', description: 'Analyzing topic and planning search strategy', status: 'pending', progress: 0 },
    { name: 'Literature Search', description: 'Searching multiple sources for articles', status: 'pending', progress: 0 },
    { name: 'Content Generation', description: 'Generating comprehensive 8000+ word report', status: 'pending', progress: 0 },
    { name: 'Processing & Formatting', description: 'Structuring and formatting final report', status: 'pending', progress: 0 },
  ]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasAutoStarted = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-fill and start research from localStorage
  useEffect(() => {
    const storedQuery = localStorage.getItem('deepResearchQuery');
    if (storedQuery && !hasAutoStarted.current) {
      setQuery(storedQuery);
      localStorage.removeItem('deepResearchQuery');
      hasAutoStarted.current = true;
      // Auto-trigger research after a short delay
      setTimeout(() => {
        if (storedQuery.trim()) {
          setQuery("");
          setMessages([{ role: "user", content: storedQuery }]);
          startResearch(storedQuery);
        }
      }, 500);
    }
  }, []);

  const startResearch = async (userMessage: string) => {
    setIsResearching(true);
    setShowProgress(true);
    setCurrentTopic(userMessage);
    setGeneratedReport(null);
    
    // Reset progress
    setOverallProgress(0);
    setCurrentPhase("Initializing research...");
    setTasks([
      { name: 'Topic Analysis', description: 'Analyzing topic and planning search strategy', status: 'pending', progress: 0 },
      { name: 'Literature Search', description: 'Searching PubMed for 20+ articles', status: 'pending', progress: 0 },
      { name: 'Content Generation', description: 'Generating comprehensive 8000+ word report', status: 'pending', progress: 0 },
      { name: 'Processing & Formatting', description: 'Structuring and formatting final report', status: 'pending', progress: 0 },
    ]);

    try {
      // Always use LangChain multi-agent system
      const response = await fetch("/api/deep-research/langchain-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topic: userMessage,
          topK: 3,  // Reduced from 5 to save tokens
          nSections: 3  // Reduced from 5 to save tokens
        }),
      });

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let data: any = null;
      let markdownChunks: string[] = [];
      let metadata: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData = JSON.parse(line.slice(6));

              if (eventData.type === "start") {
                setCurrentPhase(eventData.message);
                setOverallProgress(eventData.progress);
                setTasks(prev => prev.map((t, i) => i === 0 ? { ...t, status: 'in-progress', progress: 50 } : t));
              } else if (eventData.type === "progress") {
                setCurrentPhase(eventData.message);
                setOverallProgress(eventData.progress);
                
                // Update tasks based on progress
                if (eventData.progress < 15) {
                  setTasks(prev => prev.map((t, i) => 
                    i === 0 ? { ...t, status: 'in-progress', progress: eventData.progress * 6 } : t
                  ));
                } else if (eventData.progress < 85) {
                  setTasks(prev => prev.map((t, i) => 
                    i === 0 ? { ...t, status: 'completed', progress: 100 } :
                    i === 1 ? { ...t, status: 'in-progress', progress: (eventData.progress - 15) * 1.4 } : t
                  ));
                } else {
                  setTasks(prev => prev.map((t, i) => 
                    i === 0 || i === 1 ? { ...t, status: 'completed', progress: 100 } :
                    i === 2 ? { ...t, status: 'in-progress', progress: (eventData.progress - 85) * 6 } : t
                  ));
                }
              } else if (eventData.type === "metadata") {
                metadata = eventData.metadata;
              } else if (eventData.type === "markdown_chunk") {
                markdownChunks.push(eventData.chunk);
              } else if (eventData.type === "complete") {
                data = eventData.report;
                setTasks(prev => prev.map(t => ({ ...t, status: 'completed', progress: 100 })));
                setCurrentPhase("Research complete!");
                setOverallProgress(100);
              } else if (eventData.type === "error") {
                throw new Error(eventData.message);
              }
            } catch (e) {
              console.error("Error parsing SSE:", e);
            }
          }
        }
      }

      // Combine markdown chunks
      const fullReport = markdownChunks.join("");
      
      if (!fullReport) {
        throw new Error("No markdown content received from stream");
      }
      
      setGeneratedReport(fullReport);
      setWordCount(metadata?.wordCount || 0);
      setPmidCount(metadata?.paperCount || 0);
      
      // Build sources from sections if available
      const allSources: ResearchSource[] = [];
      if (data && data.sections) {
        data.sections.forEach((section: any) => {
          section.papers.forEach((paper: any) => {
            allSources.push({
              title: paper.Title || paper.title || "Untitled",
              url: `https://pubmed.ncbi.nlm.nih.gov/${paper.PMID || paper.pmid}/`,
              snippet: "Research article from PubMed",
            });
          });
        });
        setSources(allSources);
      }
      
      // Auto-save to files
      try {
        await fetch("/api/files/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "deep-research",
            content: fullReport,
            sources: allSources,
            title: userMessage || "Untitled Research",
          }),
        });
        console.log("✅ Report auto-saved to files");
      } catch (error) {
        console.error("Error auto-saving report:", error);
      }
      
      // Hide progress after 2 seconds
      setTimeout(() => {
        setShowProgress(false);
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I'm having trouble conducting the research. Please try again."
      }]);
    } finally {
      setIsResearching(false);
    }
  };

  const handleResearch = async () => {
    if (!query.trim() || isResearching) return;

    const userMessage = query.trim();
    setQuery("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    await startResearch(userMessage);
  };

  const handleDownloadWord = async () => {
    if (!generatedReport) return;

    const reportId = localStorage.getItem('lastReportId');
    if (reportId) {
      // Download from API
      window.open(`/api/deep-research/download/${reportId}`, '_blank');
    } else {
      // Fallback: download directly
      const blob = new Blob([generatedReport], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `deep-research-${Date.now()}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  const saveToFiles = async () => {
    try {
      await fetch("/api/files/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "deep-research",
          content: generatedReport,
          sources: sources,
          title: messages.find(m => m.role === "user")?.content || "Untitled Research",
        }),
      });
    } catch (error) {
      console.error("Error saving to files:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleResearch();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="px-8 py-6 border-b border-border bg-background"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-sm">
            <Search className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Deep Research
            </h1>
            <p className="text-sm text-muted-foreground">
              Comprehensive medical research with multiple sources and citations
            </p>
          </div>
        </div>
      </motion.header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Progress Tracker */}
          {showProgress && (
            <ProgressTracker
              topic={currentTopic}
              overallProgress={overallProgress}
              currentPhase={currentPhase}
              tasks={tasks}
            />
          )}
          
          {/* Report Viewer */}
          {generatedReport && !showProgress && (
            <ReportViewer
              markdown={generatedReport}
              topic={currentTopic || "Research"}
              wordCount={wordCount}
              pmidCount={pmidCount}
              reportId={reportId || undefined}
              sources={sources}
            />
          )}
          {/* Chat Messages */}
          <AnimatePresence>
            {messages.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-8 space-y-4"
              >
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center flex-shrink-0">
                        <Search className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-2xl rounded-xl px-5 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </motion.div>
                ))}
                {isResearching && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center flex-shrink-0">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    </div>
                    <div className="bg-card border border-border rounded-xl px-5 py-3">
                      <p className="text-sm text-muted-foreground">Conducting deep research across multiple sources...</p>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Empty State */}
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="text-center py-16"
            >
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold mb-3">Start Deep Research</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Enter your research query and we'll conduct comprehensive research across multiple medical sources
              </p>
            </motion.div>
          )}

          {/* Source Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
            className="bg-card rounded-xl p-4 border border-border shadow-sm mb-4"
          >
            <p className="text-sm font-medium mb-3">Select Research Sources:</p>
            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSources.pubmed}
                  onChange={(e) => setSelectedSources(prev => ({ ...prev, pubmed: e.target.checked }))}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  disabled={isResearching}
                />
                <span className="text-sm">PubMed (Medical)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSources.arxiv}
                  onChange={(e) => setSelectedSources(prev => ({ ...prev, arxiv: e.target.checked }))}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  disabled={isResearching}
                />
                <span className="text-sm">arXiv (STEM)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedSources.web}
                  onChange={(e) => setSelectedSources(prev => ({ ...prev, web: e.target.checked }))}
                  className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  disabled={isResearching}
                />
                <span className="text-sm">Web Search</span>
              </label>
            </div>
          </motion.div>

          {/* Input Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
            className="bg-card rounded-xl p-5 border border-border shadow-sm"
          >
            <div className="relative">
              <input
                type="text"
                placeholder="Enter your research query (e.g., 'Latest treatments for diabetes')"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-5 py-4 pr-14 bg-transparent border-none focus:outline-none text-sm"
                disabled={isResearching}
              />
              <button 
                onClick={handleResearch}
                disabled={isResearching || !query.trim()}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground p-3 rounded-lg hover:scale-105 hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isResearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </motion.div>

          {/* Download Button */}
          {generatedReport && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 flex justify-center"
            >
              <Button
                onClick={handleDownloadWord}
                className="gap-2"
                size="lg"
              >
                <Download className="w-5 h-5" />
                Download Research Report
              </Button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Source {
  title: string;
  url: string;
  snippet: string;
  pmid?: string;
}

interface ReportViewerProps {
  markdown: string;
  topic: string;
  wordCount: number;
  pmidCount: number;
  reportId?: string;
  sources?: Source[];
}

export function ReportViewer({
  markdown,
  topic,
  wordCount,
  pmidCount,
  reportId,
  sources = []
}: ReportViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };


  const handleOpenInEditor = async () => {
    try {
      // Save to files first
      const response = await fetch("/api/files/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: markdown,
          title: topic,
          type: "deep-research"
        }),
      });
      const data = await response.json();
      if (data.success && data.fileId) {
        window.location.href = `/editor?fileId=${data.fileId}`;
      } else {
        throw new Error(data.error || "Failed to save");
      }
    } catch (error) {
      console.error("Error opening in editor:", error);
      alert("Failed to open in editor. Please try again.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-6 border-b border-border">
        <h2 className="text-2xl font-bold mb-2">Research Report: {topic}</h2>
        <div className="flex items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{wordCount.toLocaleString()}</span>
            <span>words</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{pmidCount}</span>
            <span>references</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            <span>Saved to Files</span>
          </div>
        </div>
      </div>

      {/* Content Area - Word-like Document View */}
      <div className="bg-white dark:bg-gray-900 p-8 md:p-12 max-h-[700px] overflow-y-auto">
        <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8 md:p-12">
          <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:text-base prose-p:leading-relaxed prose-a:text-blue-600 prose-strong:font-semibold">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {markdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-background p-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-green-500" />
            <p className="text-sm text-muted-foreground">
              Saved to Files
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={handleOpenInEditor}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ExternalLink className="w-4 h-4" />
            Open in Editor
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

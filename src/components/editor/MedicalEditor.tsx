"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Save, 
  Download, 
  Share2, 
  Sparkles,
  FileText,
  Lightbulb,
  Plus,
  Search as SearchIcon,
  Send,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  MoreHorizontal,
  Eye,
  Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { DiffViewer } from "./DiffViewer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  action: string;
}

export function MedicalEditor() {
  const searchParams = useSearchParams();
  const fileId = searchParams?.get("fileId");
  
  const [documentId, setDocumentId] = useState<string | null>(fileId);
  const [content, setContent] = useState("");
  const [htmlContent, setHtmlContent] = useState("");
  const [title, setTitle] = useState("Untitled Document");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [aiQuery, setAiQuery] = useState("");
  const [aiMessages, setAiMessages] = useState<Array<{role: string, content: string}>>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(true); // Enable edit mode by default
  const editorRef = useRef<HTMLDivElement>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>("Normal");
  const aiMessagesEndRef = useRef<HTMLDivElement>(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  
  // Diff viewer state
  const [showDiffViewer, setShowDiffViewer] = useState(false);
  const [originalContent, setOriginalContent] = useState("");
  const [suggestedContent, setSuggestedContent] = useState("");
  const [contentHistory, setContentHistory] = useState<string[]>([]);

  const quickActions: QuickAction[] = [
    { icon: <FileText className="w-4 h-4" />, label: "Generate Paper", action: "generate_paper" },
    { icon: <Sparkles className="w-4 h-4" />, label: "Generate Case Study", action: "generate_case_study" },
    { icon: <Lightbulb className="w-4 h-4" />, label: "Continue Writing", action: "continue_writing" },
    { icon: <Lightbulb className="w-4 h-4" />, label: "Improve Section", action: "improve_section" },
    { icon: <SearchIcon className="w-4 h-4" />, label: "Add Citations", action: "add_citations" },
    { icon: <Plus className="w-4 h-4" />, label: "Add Section", action: "add_section" },
  ];

  useEffect(() => {
    if (fileId) {
      loadFile(fileId);
    }
  }, [fileId]);

  useEffect(() => {
    if (aiMessagesEndRef.current) {
      aiMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [aiMessages]);

  useEffect(() => {
    if (editorRef.current && content && editorRef.current.innerHTML !== content) {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      const startOffset = range?.startOffset;
      
      editorRef.current.innerHTML = content;
      
      // Restore cursor position if possible
      if (range && startOffset !== undefined) {
        try {
          range.setStart(range.startContainer, startOffset);
          range.collapse(true);
          selection?.removeAllRanges();
          selection?.addRange(range);
        } catch (e) {
          // Cursor position restoration failed, ignore
        }
      }
    }
  }, [content]);

  const loadFile = async (id: string) => {
    try {
      const response = await fetch(`/api/files/get/${id}`);
      const data = await response.json();
      setContent(data.content || "");
      setTitle(data.title || "Untitled Document");
    } catch (error) {
      console.error("Error loading file:", error);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log("💾 Saving document...", { documentId, title });
      const response = await fetch("/api/editor/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: documentId,
          title,
          content,
          htmlContent,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store document ID for future updates
        if (!documentId && data.documentId) {
          setDocumentId(data.documentId);
        }
        setLastSaved(new Date());
        console.log("✅ Document saved successfully:", data.documentId);
      } else {
        console.error("❌ Failed to save:", data.error);
        alert("Failed to save document. Please try again.");
      }
    } catch (error) {
      console.error("❌ Error saving:", error);
      alert("Error saving document. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadDOCX = async () => {
    try {
      // Create properly formatted HTML for DOCX conversion
      const formattedHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${title}</title>
            <style>
              body {
                font-family: 'Calibri', 'Arial', sans-serif;
                font-size: 11pt;
                line-height: 1.5;
                margin: 1in;
                color: #000000;
              }
              h1 {
                font-size: 24pt;
                font-weight: bold;
                text-align: center;
                margin-bottom: 24pt;
                color: #000000;
              }
              h2 {
                font-size: 18pt;
                font-weight: bold;
                margin-top: 18pt;
                margin-bottom: 12pt;
                color: #000000;
              }
              h3 {
                font-size: 14pt;
                font-weight: bold;
                margin-top: 12pt;
                margin-bottom: 6pt;
                color: #000000;
              }
              p {
                text-align: justify;
                margin-bottom: 12pt;
                text-indent: 0;
              }
              ul, ol {
                margin-left: 0.5in;
                margin-bottom: 12pt;
              }
              li {
                margin-bottom: 6pt;
              }
              strong, b {
                font-weight: bold;
              }
              em, i {
                font-style: italic;
              }
              blockquote {
                margin-left: 0.5in;
                margin-right: 0.5in;
                font-style: italic;
                border-left: 3px solid #ccc;
                padding-left: 12pt;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                margin-bottom: 12pt;
              }
              th, td {
                border: 1px solid #000;
                padding: 6pt;
                text-align: left;
              }
              th {
                background-color: #f0f0f0;
                font-weight: bold;
              }
            </style>
          </head>
          <body>
            <h1>${title}</h1>
            ${content}
          </body>
        </html>
      `;

      // Create blob with proper MIME type for Word
      const blob = new Blob([formattedHTML], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${title.replace(/\s+/g, '-')}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);
    } catch (error) {
      console.error('Error downloading DOCX:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // Import jsPDF dynamically
      const { default: jsPDF } = await import('jspdf');
      
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      // Get plain text from HTML content
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = content;
      const plainText = tempDiv.textContent || tempDiv.innerText || '';

      // PDF settings
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 72; // 1 inch margins
      const maxWidth = pageWidth - (margin * 2);
      let yPosition = margin;

      // Add title
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(title, maxWidth);
      doc.text(titleLines, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += titleLines.length * 30 + 20;

      // Add content
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      const contentLines = doc.splitTextToSize(plainText, maxWidth);
      
      for (let i = 0; i < contentLines.length; i++) {
        if (yPosition > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(contentLines[i], margin, yPosition);
        yPosition += 16; // Line height
      }

      // Save PDF
      doc.save(`${title.replace(/\s+/g, '-')}.pdf`);
      setShowDownloadMenu(false);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Failed to download PDF. Please try again.');
    }
  };

  const handleAiQuery = async () => {
    if (!aiQuery.trim() || isAiLoading) return;

    const userMessage = aiQuery.trim();
    setAiQuery("");
    setAiMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsAiLoading(true);

    try {
      const response = await fetch("/api/editor/ai-assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          query: userMessage,
          context: content,
        }),
      });

      const data = await response.json();
      
      setAiMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.response || "I can help you with your medical document. What would you like to do?"
      }]);

      // If AI suggests content, show diff viewer
      if (data.suggestedContent) {
        setOriginalContent(content);
        // For edit requests, replace content; for add requests, append
        const newContent = data.suggestedContent.includes("#") || data.suggestedContent.includes("##")
          ? data.suggestedContent // If it has markdown headers, it's likely a full replacement
          : content + "\n\n" + data.suggestedContent; // Otherwise append
        setSuggestedContent(newContent);
        setShowDiffViewer(true);
      }
    } catch (error) {
      console.error("Error:", error);
      setAiMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I'm having trouble processing your request. Please try again."
      }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleQuickAction = async (action: string) => {
    setIsAiLoading(true);
    setAiMessages(prev => [...prev, { role: "user", content: `Action: ${action}` }]);

    try {
      const response = await fetch("/api/editor/quick-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action,
          context: content,
        }),
      });

      const data = await response.json();
      
      setAiMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.response || "Action completed."
      }]);

      if (data.suggestedContent) {
        setOriginalContent(content);
        setSuggestedContent(content + "\n\n" + data.suggestedContent);
        setShowDiffViewer(true);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAcceptChanges = () => {
    setContentHistory(prev => [...prev, content]);
    setContent(suggestedContent);
    if (editorRef.current) {
      editorRef.current.innerHTML = suggestedContent;
    }
    setShowDiffViewer(false);
  };

  const handleRejectChanges = () => {
    setShowDiffViewer(false);
  };

  const handleUndoChange = () => {
    if (contentHistory.length > 0) {
      const previousContent = contentHistory[contentHistory.length - 1];
      if (previousContent !== undefined) {
        setContent(previousContent);
        if (editorRef.current) {
          editorRef.current.innerHTML = previousContent;
        }
        setContentHistory(prev => prev.slice(0, -1));
      }
    }
  };

  // Formatting functions
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleFormatChange = (format: string) => {
    setSelectedFormat(format);
    switch(format) {
      case "Heading 1":
        execCommand("formatBlock", "<h1>");
        break;
      case "Heading 2":
        execCommand("formatBlock", "<h2>");
        break;
      case "Heading 3":
        execCommand("formatBlock", "<h3>");
        break;
      case "Normal":
        execCommand("formatBlock", "<p>");
        break;
    }
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Toolbar */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-b border-border bg-background px-4 py-3 flex items-center justify-between"
        >
          <div className="flex items-center gap-4 flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none focus:outline-none max-w-md"
              placeholder="Untitled Document"
            />
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={isEditMode ? "default" : "ghost"} 
              size="sm" 
              className="gap-2"
              onClick={() => setIsEditMode(true)}
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </Button>
            <Button 
              variant={!isEditMode ? "default" : "ghost"} 
              size="sm" 
              className="gap-2"
              onClick={() => setIsEditMode(false)}
            >
              <Eye className="w-4 h-4" />
              Preview
            </Button>
            <div className="h-6 w-px bg-border mx-1" />
            <Button variant="ghost" size="sm" className="gap-2">
              <FileText className="w-4 h-4" />
              Templates
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSave}
              disabled={isSaving}
              className="gap-2 text-green-600 hover:text-green-700"
            >
              <Save className="w-4 h-4" />
              {isSaving ? "Saving..." : "Save"}
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <Download className="w-4 h-4" />
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleDownloadDOCX}>
                  <FileText className="w-4 h-4 mr-2" />
                  Download as DOCX
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  Download as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>

        {/* Formatting Toolbar */}
        <div className="border-b border-border bg-background px-4 py-2 flex items-center gap-2 overflow-x-auto">
          {/* Format Dropdown */}
          <select 
            value={selectedFormat}
            onChange={(e) => handleFormatChange(e.target.value)}
            className="px-3 py-1.5 border border-border rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option>Normal</option>
            <option>Heading 1</option>
            <option>Heading 2</option>
            <option>Heading 3</option>
          </select>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Text Formatting */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("bold")}>
            <Bold className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("italic")}>
            <Italic className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("underline")}>
            <Underline className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("strikeThrough")}>
            <Strikethrough className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Alignment */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("justifyLeft")}>
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("justifyCenter")}>
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("justifyRight")}>
            <AlignRight className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Lists */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("insertUnorderedList")}>
            <List className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("insertOrderedList")}>
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-border mx-1" />

          {/* Other */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("formatBlock", "<blockquote>")}>
            <Quote className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("formatBlock", "<pre>")}>
            <Code className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("createLink", prompt("Enter URL:") || "")}>
            <Link className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => execCommand("insertImage", prompt("Enter image URL:") || "")}>
            <Image className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-muted/30">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="max-w-4xl mx-auto bg-card shadow-lg rounded-lg overflow-hidden border border-border"
          >
            {/* Document Info Bar */}
            <div className="bg-background border-b border-border px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Document Editor</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {content.replace(/<[^>]*>/g, '').length} characters
              </span>
            </div>

            {/* Content Area - Editable or Preview */}
            <div className="flex-1 overflow-y-auto p-6">
              {isEditMode ? (
                /* Editable Mode */
                <div
                  ref={editorRef}
                  contentEditable={true}
                  suppressContentEditableWarning
                  onInput={(e) => setContent(e.currentTarget.innerHTML)}
                  className="prose prose-sm dark:prose-invert max-w-none min-h-[500px] focus:outline-none"
                  dangerouslySetInnerHTML={{ __html: content || '<p>Start typing your medical document...</p>' }}
                />
              ) : (
                /* Preview Mode - Rendered Markdown */
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {content}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-muted-foreground">Start typing your medical document...</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* AI Medical Assistant Sidebar */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="w-96 border-l border-border bg-card flex flex-col"
      >
        {/* AI Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-semibold">AI Medical Assistant</h2>
          </div>
        </div>

        {/* AI Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <AnimatePresence>
            {aiMessages.length === 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  💡 <strong>Quick Tips:</strong><br/>
                  • Ask me to "edit the introduction" or "add citations"<br/>
                  • Say "change the tone to more formal" to modify text<br/>
                  • I'll show you a diff viewer to review all changes before applying them!
                </p>
              </motion.div>
            )}
            {aiMessages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-lg ${
                  message.role === "user" 
                    ? "bg-primary text-primary-foreground ml-4" 
                    : "bg-accent mr-4"
                }`}
              >
                {message.role === "assistant" ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm">{message.content}</p>
                )}
              </motion.div>
            ))}
            {isAiLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 rounded-lg bg-accent mr-4"
              >
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={aiMessagesEndRef} />
        </div>

        {/* AI Input */}
        <div className="p-4 border-t border-border">
          <div className="relative">
            <input
              type="text"
              placeholder="Ask me anything about your medical document..."
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleAiQuery()}
              className="w-full px-4 py-3 pr-12 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
              disabled={isAiLoading}
            />
            <button
              onClick={handleAiQuery}
              disabled={isAiLoading || !aiQuery.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </motion.div>

      {/* Diff Viewer Modal */}
      {showDiffViewer && (
        <DiffViewer
          originalText={originalContent}
          suggestedText={suggestedContent}
          onAccept={handleAcceptChanges}
          onReject={handleRejectChanges}
          onClose={() => setShowDiffViewer(false)}
        />
      )}
    </div>
  );
}

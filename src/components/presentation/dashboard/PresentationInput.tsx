"use client";

import { Button } from "@/components/ui/button";
import { usePresentationState } from "@/states/presentation-state";
import { Sparkles } from "lucide-react";
import { ResearchSourceSelector } from "./ResearchSourceSelector";

export function PresentationInput({
  handleGenerate,
}: {
  handleGenerate: () => void;
}) {
  const { presentationInput, setPresentationInput, setShowTemplates } =
    usePresentationState();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-medium text-gray-900 tracking-tight">
          What would you like to present about?
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowTemplates(true)}
          className="gap-2 shrink-0 border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Templates
        </Button>
      </div>

      <div className="relative group">
        <textarea
          value={presentationInput}
          onChange={(e) => setPresentationInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && e.ctrlKey) {
              e.preventDefault();
              handleGenerate();
            }
          }}
          placeholder="Describe your topic or paste your content here. Our AI will structure it into a compelling presentation."
          className="h-40 w-full resize-none rounded-xl border border-gray-200 bg-white px-5 py-4 pb-14 text-sm text-gray-700 placeholder:text-gray-400 font-light transition-all focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent shadow-sm"
        />

        <div className="absolute flex justify-between items-center bottom-3 inset-x-3 z-10">
          <p className="text-xs text-gray-500 font-light">
            Press{" "}
            <kbd className="px-2 py-1 rounded bg-gray-100 text-gray-600 font-mono text-[10px] border border-gray-200">
              Ctrl
            </kbd>{" "}
            +{" "}
            <kbd className="px-2 py-1 rounded bg-gray-100 text-gray-600 font-mono text-[10px] border border-gray-200">
              Enter
            </kbd>{" "}
            to generate
          </p>
          <ResearchSourceSelector />
        </div>
      </div>
    </div>
  );
}

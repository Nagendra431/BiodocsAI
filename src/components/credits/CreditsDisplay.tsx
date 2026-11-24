"use client";

import { useEffect, useState } from "react";
import { Coins, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function CreditsDisplay() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const response = await fetch("/api/credits/balance");
      const data = await response.json();
      setCredits(data.credits);
    } catch (error) {
      console.error("Error fetching credits:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 animate-pulse">
        <Coins className="w-4 h-4" />
        <span className="text-sm">...</span>
      </div>
    );
  }

  const isLowCredits = credits !== null && credits < 20;
  const hasNoCredits = credits === 0;

  return (
    <div className="space-y-2">
      <Link href="/pricing" className="block">
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all hover:scale-105 ${
            hasNoCredits
              ? "bg-destructive/10 text-destructive border border-destructive/20"
              : isLowCredits
              ? "bg-yellow-500/10 text-yellow-600 border border-yellow-500/20"
              : "bg-primary/10 text-primary border border-primary/20"
          }`}
        >
          <Coins className="w-4 h-4" />
          <div className="flex-1">
            <div className="text-sm font-semibold">{credits || 0} Credits</div>
            {hasNoCredits && (
              <div className="text-xs opacity-75">Click to buy credits</div>
            )}
          </div>
          {(isLowCredits || hasNoCredits) && (
            <TrendingUp className="w-3 h-3" />
          )}
        </div>
      </Link>
      
      {hasNoCredits && (
        <div className="text-xs text-muted-foreground px-1">
          💡 Get 100 free credits on first purchase!
        </div>
      )}
    </div>
  );
}

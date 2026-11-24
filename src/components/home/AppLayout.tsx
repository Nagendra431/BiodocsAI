"use client";

import { FileText, BookOpen, History, Home, LogOut, Menu, Search, CreditCard } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPresentations } from "@/app/_actions/presentation/fetchPresentations";
import { useSession, signOut } from "next-auth/react";
import { ThemeToggle } from "@/provider/theme-provider";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { CreditsDisplay } from "@/components/credits/CreditsDisplay";

interface AppLayoutProps {
  children: ReactNode;
}

function RecentSessionsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["recent-presentations", 1],
    queryFn: async () => fetchPresentations(0),
  });

  const items = data?.items ?? [];

  return (
    <div className="p-2">
      {isLoading && (
        <div className="text-xs text-muted-foreground p-2">Loading…</div>
      )}
      {!isLoading && items.length === 0 && (
        <div className="text-xs text-muted-foreground p-2">No recent presentations</div>
      )}
      <div className="flex flex-col">
        {items.slice(0, 10).map((doc) => (
          <Link
            key={doc.id}
            href={`/presentation/${doc.id}`}
            className="px-2 py-2 text-sm text-foreground hover:bg-accent flex items-center gap-2"
          >
            <History className="w-3.5 h-3.5" />
            <span className="truncate">{doc.title ?? "Untitled Presentation"}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}



export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  // isSidebarOpen acts as a pin. When false, the rail is collapsed but can expand on hover.
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const { data: session } = useSession();
  
  const userEmail = session?.user?.email || "user@example.com";
  const userName = session?.user?.name || session?.user?.email?.split('@')[0] || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname?.startsWith(path)) return true;
    return false;
  };

  const isExpanded = isSidebarOpen || isHovering;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className={`${
          isExpanded ? "w-64" : "w-16"
        } bg-card border-r border-border flex flex-col transition-all duration-300`}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Top area: hamburger on left, brand text with logo */}
        <div className="p-3 border-b border-border flex items-center gap-2">
          <button
            aria-label="Toggle sidebar"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent text-foreground transition-colors"
            onClick={() => setIsSidebarOpen((v) => !v)}
          >
            <Menu className="w-4 h-4" />
          </button>
          <Link href="/" className="flex items-center gap-2 flex-1 min-w-0">
            {/* Logo Icon - Always visible */}
            <div className="flex-shrink-0">
              <img
                src="/logocel.jpg"
                alt="Logo"
                className="h-8 w-8 rounded-md object-contain"
              />
            </div>
            {/* Text - Only when expanded */}
            <div className={`${isExpanded ? "flex" : "hidden"} flex-col min-w-0`}>
              <h1 className="font-bold text-base bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                BioDocsAI
              </h1>
              <span className="text-[9px] text-muted-foreground -mt-0.5">
                Medical Intelligence
              </span>
            </div>
          </Link>
        </div>

        {/* New Chat + Theme toggle */}
        <div className="p-3 space-y-3">
          <Link href="/" className="block">
            <button className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 px-3 flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-sm hover:shadow-md">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className={`${isExpanded ? "block" : "hidden"} font-medium`}>New Chat</span>
            </button>
          </Link>
          
          {/* Credits Display */}
          {isExpanded && (
            <div className="pt-2">
              <CreditsDisplay />
            </div>
          )}
          
          <div className={`${isExpanded ? "block" : "hidden"}`}>
            <ThemeToggle />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-1 overflow-y-auto">
          <h3 className={cn(
            "text-[10px] font-semibold uppercase mb-2 text-muted-foreground",
            isExpanded ? "px-1" : "sr-only"
          )}>
            Navigation
          </h3>

          <Link
            href="/"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${
              pathname === "/" ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
            }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              pathname === "/" ? "bg-primary/20" : "bg-accent"
            }`}>
              <Home className={`w-4 h-4 ${pathname === "/" ? "text-primary" : "text-foreground"}`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">Home</p>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
          </Link>

          <Link
            href="/presentation"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${
              isActive("/presentation") ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
            }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              isActive("/presentation") ? "bg-primary/20" : "bg-accent"
            }`}>
              <FileText className={`w-4 h-4 ${isActive("/presentation") ? "text-primary" : "text-foreground"}`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">Presentations</p>
              <p className="text-xs text-muted-foreground">AI-powered presentations</p>
            </div>
          </Link>

          <Link
            href="/editor"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${
              isActive("/editor") ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
            }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              isActive("/editor") ? "bg-primary/20" : "bg-accent"
            }`}>
              <FileText className={`w-4 h-4 ${isActive("/editor") ? "text-primary" : "text-foreground"}`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">Editor</p>
              <p className="text-xs text-muted-foreground">AI document editor</p>
            </div>
          </Link>

          <Link
            href="/files"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${
              isActive("/files") ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
            }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              isActive("/files") ? "bg-primary/20" : "bg-accent"
            }`}>
              <FileText className={`w-4 h-4 ${isActive("/files") ? "text-primary" : "text-foreground"}`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">Files</p>
              <p className="text-xs text-muted-foreground">Manage your documents</p>
            </div>
          </Link>

          <Link
            href="/research-paper"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${
              isActive("/research-paper") ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
            }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              isActive("/research-paper") ? "bg-primary/20" : "bg-accent"
            }`}>
              <FileText className={`w-4 h-4 ${isActive("/research-paper") ? "text-primary" : "text-foreground"}`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">Research Paper</p>
              <p className="text-xs text-muted-foreground">Generate academic papers</p>
            </div>
          </Link>

          <Link
            href="/deep-research"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${
              isActive("/deep-research") ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
            }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              isActive("/deep-research") ? "bg-primary/20" : "bg-accent"
            }`}>
              <Search className={`w-4 h-4 ${isActive("/deep-research") ? "text-primary" : "text-foreground"}`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">Deep Research</p>
              <p className="text-xs text-muted-foreground">Comprehensive research</p>
            </div>
          </Link>

          <Link
            href="/pricing"
            className={`flex items-center gap-3 px-2 py-2 rounded-md transition-all ${
              isActive("/pricing") ? "bg-primary/10 text-primary" : "hover:bg-accent text-foreground"
            }`}
          >
            <div className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              isActive("/pricing") ? "bg-primary/20" : "bg-accent"
            }`}>
              <CreditCard className={`w-4 h-4 ${isActive("/pricing") ? "text-primary" : "text-foreground"}`} />
            </div>
            <div className={`${isExpanded ? "block" : "hidden"}`}>
              <p className="text-sm font-medium">Pricing & Credits</p>
              <p className="text-xs text-muted-foreground">Upgrade your plan</p>
            </div>
          </Link>
        </nav>

        {/* User Profile */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-foreground">{userInitial}</span>
            </div>
            <div className={`${isExpanded ? "block" : "hidden"} flex-1`}
            >
              <p className="text-sm font-medium text-foreground">{userName}</p>
              {/* email intentionally removed from header; keep hidden here as well */}
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/auth/signin' })}
            className={`w-full mt-2 text-sm flex items-center gap-2 justify-center transition-colors text-foreground hover:text-muted-foreground ${isExpanded ? "block" : "hidden"}`}
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Top bar for small screens */}
        <div className="h-12 border-b border-border flex items-center px-3 gap-2 md:hidden">
          <button
            aria-label="Toggle sidebar"
            className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"
            onClick={() => setIsSidebarOpen((v) => !v)}
          >
            <Menu className="w-4 h-4" />
          </button>
          <img
            src="/logocel.jpg"
            alt="Logo"
            className="h-8 w-auto object-contain"
          />
        </div>

        {/* Floating History button (top-right) */}
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Recent sessions"
          className="inline-flex items-center justify-center h-10 w-10 rounded-full border border-border bg-card hover:bg-accent transition absolute top-3 right-3 z-30"
          onClick={() => setIsHistoryOpen((v) => !v)}
        >
          <History className="w-5 h-5" />
        </motion.button>

        {/* Right-top history panel */}
        <AnimatePresence>
          {isHistoryOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-14 right-3 z-40 w-80 max-h-[70vh] overflow-y-auto bg-card border border-border rounded-md shadow-lg"
            >
              <div className="p-3 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Recent Sessions</span>
                <button
                  className="h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent transition"
                  onClick={() => setIsHistoryOpen(false)}
                  aria-label="Close history"
                >
                  ×
                </button>
              </div>
              <RecentSessionsPanel />
            </motion.div>
          )}
        </AnimatePresence>
        {children}
      </main>
    </div>
  );
}



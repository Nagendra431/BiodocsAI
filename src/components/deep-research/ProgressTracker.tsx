"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface Task {
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  progress: number;
}

interface ProgressTrackerProps {
  topic: string;
  overallProgress: number;
  currentPhase: string;
  tasks: Task[];
  timeRemaining?: string;
}

export function ProgressTracker({
  topic,
  overallProgress,
  currentPhase,
  tasks,
  timeRemaining = "3 minutes"
}: ProgressTrackerProps) {
  
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'pending': return '⏳';
      case 'in-progress': return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'completed': return '✓';
      case 'failed': return '✗';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'pending': return 'border-border bg-transparent';
      case 'in-progress': return 'bg-gradient-to-r from-primary to-primary/80';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'border-border bg-transparent';
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1">
          <h2 className="text-xl font-semibold mb-1">Deep Research: {topic}</h2>
          <p className="text-sm text-muted-foreground">
            {timeRemaining} left to gather sources and create your report
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-muted-foreground">Enabled</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80 relative overflow-hidden"
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </motion.div>
        </div>
      </div>

      {/* Current Phase */}
      <div className="bg-background border-l-4 border-primary p-4 rounded-lg mb-6">
        <p className="text-sm text-muted-foreground mb-1">Currently working on</p>
        <p className="text-base font-medium">{currentPhase}</p>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.map((task, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-4 p-3 bg-background rounded-lg border border-border"
          >
            {/* Status Icon */}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${getStatusColor(task.status)} ${task.status === 'pending' ? 'border-2' : ''}`}>
              {getStatusIcon(task.status)}
            </div>

            {/* Task Info */}
            <div className="flex-1">
              <p className="font-medium text-sm">{task.name}</p>
              <p className="text-xs text-muted-foreground">{task.description}</p>
            </div>

            {/* Progress */}
            <div className="flex items-center gap-2 min-w-[120px]">
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${task.progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className="text-xs text-muted-foreground min-w-[35px] text-right">
                {task.progress}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

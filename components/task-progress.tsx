'use client';

import { Check, Loader2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed';

export interface TaskStep {
  id: string;
  label: string;
  status: TaskStatus;
  timestamp?: string;
}

interface TaskProgressProps {
  tasks: TaskStep[];
  className?: string;
  title?: string;
}

export function TaskProgress({ tasks, className, title = "Agent Progress" }: TaskProgressProps) {
  return (
    <div className={cn("glass-card rounded-3xl p-6 border border-border/50 bg-card/50", className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Clock size={16} />
        </div>
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {title}
        </h3>
      </div>

      <div className="space-y-4 relative">
        {/* Vertical Line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border/50 z-0" />

        {tasks.map((task, index) => {
          const isLast = index === tasks.length - 1;
          
          return (
            <div key={task.id} className="relative z-10 flex items-start gap-4 group">
              <div className={cn(
                "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all duration-300 bg-background",
                task.status === 'done' ? "border-green-500 text-green-500" :
                task.status === 'running' ? "border-primary text-primary" :
                task.status === 'failed' ? "border-destructive text-destructive" :
                "border-muted-foreground/30 text-muted-foreground/30"
              )}>
                {task.status === 'done' && <Check size={12} strokeWidth={3} />}
                {task.status === 'running' && <Loader2 size={12} className="animate-spin" />}
                {task.status === 'pending' && <Circle size={8} fill="currentColor" className="opacity-0" />}
                {task.status === 'failed' && <div className="w-1.5 h-1.5 bg-destructive rounded-full" />}
              </div>
              
              <div className="pt-0.5 space-y-1">
                <p className={cn(
                  "text-sm font-medium transition-colors duration-300",
                  task.status === 'done' ? "text-muted-foreground" :
                  task.status === 'running' ? "text-foreground font-semibold" :
                  "text-muted-foreground/50"
                )}>
                  {task.label}
                </p>
                {task.status === 'running' && (
                  <p className="text-[10px] text-primary animate-pulse font-mono uppercase tracking-wider">
                    Processing...
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

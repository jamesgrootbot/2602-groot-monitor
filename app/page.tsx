'use client';

import { useEffect, useState } from 'react';
import { Terminal, Cpu, Zap, Activity, Box, Sparkles } from 'lucide-react';

interface Thought {
  text: string;
  timestamp: number;
  type: string;
}

interface Trail {
  sessionKey: string;
  isSubagent: boolean;
  updatedAt: number;
  thoughts: Thought[];
  model: string;
  isCompleted: boolean;
}

interface Status {
  status: string;
  brain: string;
  last_tool: string;
  trails: Trail[];
}

export default function Home() {
  const [data, setData] = useState<Status | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error('Pulse failed', e);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!mounted || !data) return (
    <div className="min-h-screen bg-background flex items-center justify-center font-mono text-muted-foreground text-xs uppercase tracking-[0.3em]">
      Initializing Pulse...
    </div>
  );

  const isWorking = data.status === 'working';

  return (
    <main className="min-h-screen bg-background text-foreground p-6 lg:p-12 font-mono transition-colors duration-300">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-8 rounded-3xl space-y-8 border border-border bg-card/40 backdrop-blur-xl">
            <div>
              <h1 className="text-3xl font-bold tracking-tighter">GROOT <span className="text-primary">MONITOR</span></h1>
              <p className="text-[10px] text-muted-foreground tracking-[0.4em] uppercase mt-2">Status Terminal v2.0</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-2xl border border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity size={16} className={isWorking ? 'text-primary' : 'text-green-500'} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Core State</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isWorking ? 'bg-primary animate-pulse' : 'bg-green-500'}`} />
                  <span className="text-[10px] font-black uppercase">{data.status || 'OFFLINE'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Cpu size={12} />
                    <span className="text-[9px] uppercase font-bold tracking-widest">Model</span>
                  </div>
                  <p className="text-[10px] font-black text-foreground truncate">{data.brain || 'UNKNOWN'}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Zap size={12} />
                    <span className="text-[9px] uppercase font-bold tracking-widest">Active</span>
                  </div>
                  <p className="text-sm font-black text-foreground">Live</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Box size={14} />
                <span className="text-[10px] uppercase font-bold tracking-widest">Last Command</span>
              </div>
              <div className="bg-muted rounded-xl p-4 border border-border">
                <code className="text-[11px] text-primary break-all">{data.last_tool || 'none'}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="lg:col-span-8">
          <div className="glass-card rounded-3xl border border-border bg-card/40 backdrop-blur-xl flex flex-col min-h-[600px]">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Terminal size={18} className="text-muted-foreground" />
                <h2 className="text-xs font-bold uppercase tracking-[0.5em] text-muted-foreground">Thinking Trail</h2>
              </div>
            </div>

            <div className="p-8 space-y-12 flex-1 overflow-y-auto max-h-[800px]">
              {(data.trails || []).map((trail, trailIdx) => (
                <div 
                  key={trail.sessionKey} 
                  className={`relative ${trail.isSubagent ? 'ml-12 border-l-2 border-primary/20 pl-8' : ''} ${trail.isCompleted ? 'opacity-50 grayscale-[0.5]' : ''}`}
                >
                  <div className="absolute -left-3 top-0 flex items-center gap-2 bg-background px-2 py-1 rounded-full border border-border">
                    <Sparkles size={10} className={trail.isSubagent ? 'text-primary' : 'text-amber-500'} />
                    <span className="text-[8px] font-bold uppercase tracking-tighter">
                      {trail.isSubagent ? 'Sub-Agent' : 'Main Agent'} • {trail.model.split('/').pop()}
                    </span>
                  </div>

                  <div className="space-y-6 pt-8">
                    {[...trail.thoughts].reverse().map((thought, i) => (
                      <div key={i} className="flex gap-4 group">
                        <div className="flex flex-col items-center">
                          <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${i === 0 && !trail.isCompleted ? 'bg-primary ring-4 ring-primary/20' : 'bg-muted-foreground/30'}`} />
                        </div>
                        <div>
                          <p className={`text-xs leading-relaxed ${i === 0 && !trail.isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                            {thought.text}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

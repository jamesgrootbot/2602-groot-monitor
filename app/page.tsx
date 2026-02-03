'use client';

import { useEffect, useState } from 'react';
import { Terminal, Cpu, Zap, Activity, Box, Sparkles, RefreshCcw, ChevronRight, ChevronDown, User, Bot, HelpCircle } from 'lucide-react';
import { TaskProgress, TaskStep } from '@/components/task-progress';
import { useGateway } from '@/hooks/use-gateway';

interface Thought {
  text: string;
  ts: string | number;
}

interface Trail {
  id: string;
  agentId: string;
  model: string;
  updatedAt: number;
  isSubagent: boolean;
  isCompleted: boolean;
  thoughts: Thought[];
}

interface Status {
  status: string;
  brain: string;
  last_tool: string;
  triggerPrompt?: string;
  trails: Trail[];
  plan?: TaskStep[];
  error?: string;
}

export default function Home() {
  const [data, setData] = useState<Status | null>(null);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [mainTask, setMainTask] = useState<string>('Initializing...');
  
  const { status: gatewayStatus, lastEvent } = useGateway('ws://localhost:18789', 'd1db9d8d6f657ae519c868028e0d39936d2d32c2fa5421b1');

  // Handle Real-time Gateway Events (Zero Effort listening)
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.event === 'agent.thought' || lastEvent.event === 'agent.call') {
      const payload = lastEvent.payload;
      
      // Update Main Task based on most recent thought
      if (payload.agentId === 'main' && payload.content) {
        const lines = payload.content.split('\n');
        const firstLine = lines.find((l: string) => l.trim().startsWith('**')) || payload.content.slice(0, 50);
        setMainTask(firstLine.replace(/\*\*/g, ''));
      }

      setData(prev => {
        if (!prev) return prev;
        
        const trails = [...prev.trails];
        let trail = trails.find(t => t.id === payload.sessionId);
        
        if (!trail) {
          trail = {
            id: payload.sessionId,
            agentId: payload.agentId || 'unknown',
            model: 'dynamic',
            updatedAt: Date.now(),
            isSubagent: payload.agentId !== 'main',
            isCompleted: false,
            thoughts: []
          };
          trails.push(trail);
        }

        const thoughtText = payload.content || payload.tool || 'working...';
        trail.thoughts = [{ text: thoughtText, ts: Date.now() }, ...trail.thoughts].slice(0, 15);
        trail.updatedAt = Date.now();
        trail.isCompleted = false;

        return { ...prev, trails, status: 'working', last_tool: payload.tool || prev.last_tool };
      });
    }

    if (lastEvent.event === 'agent.response') {
      setData(prev => {
        if (!prev) return prev;
        const trails = prev.trails.map(t => t.id === lastEvent.payload.sessionId ? { ...t, isCompleted: true } : t);
        return { ...prev, trails, status: trails.some(t => !t.isCompleted) ? 'working' : 'idle' };
      });
    }
  }, [lastEvent]);

  useEffect(() => {
    setMounted(true);
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const json = await res.json();
        setData(json);
        setError(null);
      } catch (e: any) {
        console.error('Pulse failed', e);
        setError(e.message);
      }
    };

    fetchStatus();
    // Background sync every 10s instead of 1s (passive)
    const interval = setInterval(fetchStatus, 10000); 
    return () => clearInterval(interval);
  }, []);

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!mounted) return null;

  const isWorking = data?.status === 'working' || gatewayStatus === 'connecting';

  return (
    <main className="min-h-screen bg-background text-foreground p-4 lg:p-10 font-mono transition-colors duration-300">
      
      {/* Real-time Gateway Badge */}
      <div className={`fixed top-4 right-4 z-50 px-3 py-1 rounded-full text-[8px] font-bold uppercase flex items-center gap-2 backdrop-blur-md border ${
        gatewayStatus === 'connected' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${gatewayStatus === 'connected' ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
        Live Node: {gatewayStatus === 'connected' ? 'Groot' : 'Reconnecting...'}
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Stats */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-8 rounded-3xl space-y-8">
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-primary">GROOT <span className="text-foreground">MONITOR</span></h1>
              <p className="text-[9px] text-muted-foreground tracking-[0.5em] uppercase mt-2">Telemetry Engine v3.0 (Live)</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 bg-muted/30 rounded-2xl border border-border/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Activity size={14} className={isWorking ? 'text-primary' : 'text-green-500'} />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">State</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${isWorking ? 'bg-primary animate-pulse' : 'bg-green-500'}`} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Cpu size={10} />
                    <span className="text-[8px] uppercase font-bold tracking-tighter">Brain</span>
                  </div>
                  <p className="text-[10px] font-black truncate uppercase">{data?.brain.split('/').pop() || 'OFFLINE'}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-2xl border border-border/50">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Zap size={10} />
                    <span className="text-[8px] uppercase font-bold tracking-tighter">Activity</span>
                  </div>
                  <p className="text-[10px] font-black uppercase">{data?.status || 'IDLE'}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border/50">
              <div className="flex items-center gap-2 text-muted-foreground mb-3">
                <Box size={12} />
                <span className="text-[9px] uppercase font-bold tracking-widest">Last Tool</span>
              </div>
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                <code className="text-[10px] text-primary font-bold break-all">{data?.last_tool || 'none'}</code>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Tree Hierarchy */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Level 0: Trigger Prompt */}
          {data?.triggerPrompt && (
            <div className="bg-primary text-primary-foreground p-6 rounded-3xl shadow-xl shadow-primary/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <User size={48} />
              </div>
              <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[0.3em] mb-2 opacity-70">
                <HelpCircle size={10} />
                Level 0: User Request
              </div>
              <p className="text-sm font-medium leading-relaxed italic">
                "{data.triggerPrompt}"
              </p>
            </div>
          )}

          {/* Active Agent Plan */}
          <div className="space-y-4">
            <div className="glass-card p-6 rounded-3xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles size={14} className="text-primary animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Main Agent Task</span>
              </div>
              <p className="text-lg font-bold tracking-tight text-foreground">{mainTask}</p>
            </div>
            <TaskProgress tasks={data?.plan || []} title="Project Plan" />
          </div>

          <div className="glass-card rounded-3xl min-h-[600px] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/10">
              <div className="flex items-center gap-3">
                <Terminal size={16} className="text-muted-foreground" />
                <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-muted-foreground">Execution Hierarchy</h2>
              </div>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto max-h-[800px]">
              {!data && (
                <div className="flex items-center justify-center h-full text-muted-foreground text-[10px] uppercase tracking-widest animate-pulse">
                  Listening to Gateway...
                </div>
              )}
              
              {data?.trails.map((trail) => {
                const isCollapsed = collapsed[trail.id] || (trail.isCompleted && trail.isSubagent);
                const latestThought = trail.thoughts[trail.thoughts.length - 1];

                return (
                  <div 
                    key={trail.id} 
                    className={`rounded-2xl border transition-all duration-300 ${trail.isSubagent ? 'ml-8 bg-muted/20' : 'bg-card shadow-sm'} ${trail.isCompleted ? 'border-border/30 opacity-60' : 'border-primary/20 ring-1 ring-primary/5'}`}
                  >
                    {/* Agent Header */}
                    <div 
                      className="p-4 flex items-center justify-between cursor-pointer group"
                      onClick={() => toggleCollapse(trail.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${trail.isSubagent ? 'bg-primary/10 text-primary' : 'bg-amber-500/10 text-amber-600'}`}>
                          {trail.isSubagent ? <Sparkles size={14} /> : <Bot size={14} />}
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-tight flex items-center gap-2">
                            {trail.isSubagent ? `Sub-Agent: ${trail.agentId}` : 'Orchestrator: Groot'}
                            <span className={`px-1.5 py-0.5 rounded text-[7px] border ${trail.model.includes('pro') ? 'border-amber-500/30 bg-amber-500/5 text-amber-600' : 'border-primary/20 bg-primary/5 text-primary'}`}>
                              {trail.model.includes('pro') ? 'LARGE' : 'MEDIUM'}
                            </span>
                          </div>
                          {!isCollapsed && (
                            <div className="text-[8px] text-muted-foreground font-bold uppercase mt-0.5">
                              {trail.isCompleted ? 'DONE' : 'DOING...'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isCollapsed && latestThought && (
                          <div className="text-[9px] text-muted-foreground italic truncate max-w-[200px] hidden sm:block">
                            {latestThought.text.slice(0, 40)}...
                          </div>
                        )}
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </div>
                    </div>

                    {/* Thoughts List */}
                    {!isCollapsed && (
                      <div className="px-4 pb-4 space-y-3 border-t border-border/20 pt-4">
                        {trail.thoughts.map((thought, i) => (
                          <div key={i} className="flex gap-3">
                            <div className={`w-1 h-1 rounded-full mt-1.5 shrink-0 ${i === 0 && !trail.isCompleted ? 'bg-primary animate-ping' : 'bg-muted-foreground/30'}`} />
                            <p className={`text-[11px] leading-relaxed ${i === 0 && !trail.isCompleted ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                              {thought.text}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

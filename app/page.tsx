'use client';

import { useEffect, useState } from 'react';

interface Status {
  status: string;
  brain: string;
  last_tool: string;
  thinking_trail: string[];
}

export default function Home() {
  const [data, setData] = useState<Status | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/status');
        const json = await res.json();
        setData(json);
      } catch (e) {
        console.error(e);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!data) return <div className="p-8 font-mono bg-zinc-950 text-zinc-500">Initializing Groot Pulse...</div>;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-mono selection:bg-blue-500/30">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tighter text-blue-500">GROOT MONITOR v1.1</h1>
            <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em]">Next.js Boilerplate Build</p>
          </div>
          <div className="flex items-center gap-3 bg-zinc-900/50 px-3 py-1.5 border border-zinc-800 rounded-full">
            <div className={`w-2 h-2 rounded-full ${data.status === 'working' ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">{data.status}</span>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900/40 p-4 border border-zinc-800/50 backdrop-blur-sm">
            <h2 className="text-[10px] text-zinc-500 mb-1 uppercase tracking-widest font-bold">Brain Core</h2>
            <p className="text-lg font-bold text-zinc-200">{data.brain}</p>
          </div>
          <div className="bg-zinc-900/40 p-4 border border-zinc-800/50 backdrop-blur-sm">
            <h2 className="text-[10px] text-zinc-500 mb-1 uppercase tracking-widest font-bold">Active Tool</h2>
            <p className="text-lg font-bold text-zinc-200">{data.last_tool}</p>
          </div>
        </section>

        <section className="bg-zinc-900/20 border border-zinc-800/50 p-6 rounded-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20" />
          <h2 className="text-[10px] text-zinc-500 mb-6 uppercase tracking-[0.3em] font-bold">Thinking Trail</h2>
          <div className="space-y-4">
            {data.thinking_trail.map((step, i) => (
              <div key={i} className="flex gap-4 items-start group">
                <span className="text-zinc-800 text-[10px] mt-1 font-bold group-hover:text-zinc-600 transition-colors">
                  {i.toString().padStart(2, '0')}
                </span>
                <p className={`text-sm leading-relaxed ${i === data.thinking_trail.length - 1 ? 'text-blue-400 font-medium' : 'text-zinc-400'}`}>
                  {step}
                  {i === data.thinking_trail.length - 1 && (
                    <span className="inline-block w-1.5 h-3.5 bg-blue-500 ml-2 animate-[pulse_1s_infinite]" />
                  )}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

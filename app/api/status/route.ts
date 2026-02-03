import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs'; 
export const dynamic = 'force-dynamic';

// Helper: Exec with Timeout
const execWithTimeout = (command: string, timeoutMs: number): Promise<{ stdout: string, stderr: string }> => {
  return new Promise((resolve, reject) => {
    const child = exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
    setTimeout(() => {
      child.kill();
      reject(new Error('Command timed out'));
    }, timeoutMs);
  });
};

// Helper: Tail Read (Buffer-based)
async function readTail(filePath: string, maxBytes: number = 10240): Promise<string> {
  let fd: fs.promises.FileHandle | null = null;
  try {
    fd = await fs.promises.open(filePath, 'r');
    const stat = await fd.stat();
    const size = stat.size;
    const start = Math.max(0, size - maxBytes);
    const length = size - start;
    
    if (length <= 0) return '';

    const buffer = Buffer.alloc(length);
    await fd.read(buffer, 0, length, start);
    return buffer.toString('utf8');
  } catch (error) {
    console.error(`Failed to read tail of ${filePath}:`, error);
    return '';
  } finally {
    if (fd) await fd.close();
  }
}

// Helper: Read Full (for trigger extraction)
async function readFull(filePath: string): Promise<string> {
  try {
    return await fs.promises.readFile(filePath, 'utf8');
  } catch (error) {
    return '';
  }
}

export async function GET() {
  try {
    // 1. Get OpenClaw Telemetry with Timeout (5s)
    let statusOutput = '';
    try {
      const result = await execWithTimeout('openclaw status --json', 5000);
      statusOutput = result.stdout;
    } catch (e) {
      console.error("OpenClaw Status Timeout/Error:", e);
      throw e; 
    }

    const statusData = JSON.parse(statusOutput);

    // 2. Map Agent IDs to their session directories
    const agentMap: Record<string, string> = {};
    if (statusData.agents?.agents) {
      statusData.agents.agents.forEach((agent: any) => {
        if (agent.sessionsPath) {
          agentMap[agent.id] = path.dirname(agent.sessionsPath);
        }
      });
    }

    const recentSessions = statusData.sessions?.recent || [];
    const trails: any[] = [];
    let lastTool = 'none';
    let activeModel = 'unknown';
    let triggerPrompt = '';

    const now = Date.now();
    const threshold = 30 * 60 * 1000; // 30 minutes for history visibility

    for (const session of recentSessions) {
      const updatedAt = session.updatedAt || 0;
      if (now - updatedAt > threshold) continue;

      const sessionsDir = agentMap[session.agentId];
      if (!sessionsDir) continue;

      const logPath = path.join(sessionsDir, `${session.sessionId}.jsonl`);
      if (!fs.existsSync(logPath)) continue;

      // Extract Level 0 (Trigger Prompt) from the Main Agent's session
      const isMainSession = !session.key.includes(':subagent:');
      if (isMainSession && !triggerPrompt) {
        try {
          const logContent = await readTail(logPath, 500000); // Read last 500KB for prompt
          const lines = logContent.split('\n');
          for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            if (line.includes('"role":"user"')) {
              try {
                const parsed = JSON.parse(line);
                if (parsed?.message?.role === 'user' && parsed.message.content?.[0]?.text) {
                  triggerPrompt = parsed.message.content[0].text;
                  break;
                }
              } catch (e) {}
            }
          }
        } catch (e) {
          console.error("Trigger Prompt Extraction Failed:", e);
        }
      }

      // Update active model
      if (activeModel === 'unknown' || updatedAt > (trails[0]?.updatedAt || 0)) {
        activeModel = session.model;
      }

      // Read tail (20KB for thinking trail context)
      const logContentTrail = await readTail(logPath, 20480);
      const lines = logContentTrail.trim().split('\n');
      const logs = lines.map(line => {
        try { return JSON.parse(line); } catch(e) { return null; }
      }).filter(Boolean);

      // Extract last tool
      if (lastTool === 'none') {
        for (let i = logs.length - 1; i >= 0; i--) {
          const l = logs[i];
          if (l.type === 'call' && l.tool) { lastTool = l.tool; break; }
          if (l.message?.role === 'assistant' && l.message.content) {
            const call = l.message.content.find((p: any) => p.type === 'toolCall');
            if (call) { lastTool = call.name; break; }
          }
        }
      }

      // Extract thoughts
      const thoughts = logs.map(l => {
        let text = null;
        if (l.type === 'thought') text = l.content;
        else if (l.message && Array.isArray(l.message.content)) {
          const thinkingPart = l.message.content.find((p: any) => p.type === 'thinking');
          text = thinkingPart ? thinkingPart.thinking : null;
        }
        if (!text) return null;
        return { text, ts: l.ts || l.timestamp || Date.now() };
      }).filter(Boolean);

      if (thoughts.length > 0) {
        trails.push({
          id: session.sessionId,
          key: session.key,
          agentId: session.agentId,
          model: session.model,
          updatedAt: updatedAt,
          isSubagent: session.key.includes(':subagent:'),
          isCompleted: (now - updatedAt) > 60000, 
          thoughts: thoughts.slice(-15) 
        });
      }
    }

    // 4. Sort trails: Level 1 (Main Agent) always first, then sub-agents
    trails.sort((a, b) => {
      if (!a.isSubagent && b.isSubagent) return -1;
      if (a.isSubagent && !b.isSubagent) return 1;
      return b.updatedAt - a.updatedAt;
    });

    const isWorking = trails.some(t => !t.isCompleted);

    return NextResponse.json({
      status: isWorking ? 'working' : 'idle',
      brain: activeModel,
      last_tool: lastTool,
      triggerPrompt: triggerPrompt,
      trails: trails
    });
    
  } catch (error: any) {
    console.error("Status API Error:", error);
    return NextResponse.json({
      status: 'error',
      brain: 'offline',
      last_tool: 'error',
      trails: [],
      error: error.message || 'Unknown error'
    }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);
const readFilePromise = util.promisify(fs.readFile);
const writeFilePromise = util.promisify(fs.writeFile);

export const runtime = 'nodejs'; 
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Get OpenClaw Telemetry
    const { stdout: statusOutput } = await execPromise('openclaw status --json');
    const statusData = JSON.parse(statusOutput);

    // 2. Get Logs for the latest active session
    let logs: any[] = [];
    
    const mainAgent = statusData.agents?.agents?.find((a: any) => a.id === 'main');
    const sessionsPath = mainAgent?.sessionsPath;

    if (sessionsPath) {
        const sessionsDir = path.dirname(sessionsPath);
        const recentSessions = statusData.sessions?.recent || [];
        
        if (recentSessions.length > 0) {
            recentSessions.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));
            const latestSession = recentSessions[0];
            const logPath = path.join(sessionsDir, `${latestSession.sessionId}.jsonl`);
            
            if (fs.existsSync(logPath)) {
                 const logContent = await readFilePromise(logPath, 'utf8');
                 const lines = logContent.trim().split('\n');
                 const lastLines = lines.slice(-100);
                 logs = lastLines.map(line => {
                     try { return JSON.parse(line); } catch(e) { return null; }
                 }).filter(Boolean);
            }
        }
    }

    // 3. Derive Frontend Data
    const isWorking = (mainAgent?.lastActiveAgeMs || 9999999) < 10000; // < 10s = working
    const status = isWorking ? 'working' : 'idle';
    
    const recentSession = statusData.sessions?.recent?.[0];
    const brain = recentSession?.model || 'unknown';

    // Find last tool
    let last_tool = 'none';
    for (let i = logs.length - 1; i >= 0; i--) {
        const log = logs[i];
        // Check for standard tool call formats
        if (log.type === 'call' && log.tool) {
            last_tool = log.tool;
            break;
        }
        if (log.tool && typeof log.tool === 'string') {
             last_tool = log.tool;
             break;
        }
    }

    // Extract thoughts with nesting
    const trails: any[] = [];
    
    // Sort sessions by updatedAt descending
    const sortedSessions = [...(statusData.sessions?.recent || [])].sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));
    
    const sessionsDir = path.dirname(mainAgent?.sessionsPath);

    for (const session of sortedSessions) {
        // Only include "live" sessions (e.g., active in last 10 mins)
        if (session.age > 600000) continue; 

        const logPath = path.join(sessionsDir, `${session.sessionId}.jsonl`);
        if (!fs.existsSync(logPath)) continue;

        const logContent = await readFilePromise(logPath, 'utf8');
        const lines = logContent.trim().split('\n');
        const lastLines = lines.slice(-20);
        const sessionLogs = lastLines.map(line => {
            try { return JSON.parse(line); } catch(e) { return null; }
        }).filter(Boolean);

        const sessionThoughts = sessionLogs
            .map(l => {
                let text = null;
                if (l.type === 'thought') text = l.content;
                else if (l.message && Array.isArray(l.message.content)) {
                    const thinkingPart = l.message.content.find((p: any) => p.type === 'thinking');
                    text = thinkingPart ? thinkingPart.thinking : null;
                }
                if (!text) return null;
                return {
                    text,
                    timestamp: l.ts || Date.now(),
                    type: l.type
                };
            })
            .filter(Boolean);

        if (sessionThoughts.length > 0) {
            trails.push({
                sessionKey: session.key,
                isSubagent: session.key.includes(':subagent:'),
                updatedAt: session.updatedAt,
                thoughts: sessionThoughts,
                model: session.model,
                // A session is "completed" if it hasn't been updated in 10 seconds
                // OR if it's not the latest session and is a subagent
                isCompleted: session.age > 10000
            });
        }
    }

    // Sort trails so completed ones move to the bottom
    trails.sort((a, b) => {
        if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
        return b.updatedAt - a.updatedAt;
    });

    // 4. Construct Response
    const responseData = {
        status,
        brain,
        last_tool,
        trails
    };

    // Optional: Write backup to status.json (for debugging)
    // const workspaceRoot = path.resolve(process.cwd(), '../../');
    // await writeFilePromise(path.join(workspaceRoot, 'status.json'), JSON.stringify({ ...responseData, raw: statusData }, null, 2));

    return NextResponse.json(responseData);
    
  } catch (error: any) {
    console.error("Status Error:", error);
    // Return a safe fallback so the UI doesn't crash even on 500
    return NextResponse.json({
        status: 'error',
        brain: 'unknown',
        last_tool: 'error',
        thinking_trail: [`Error: ${error.message}`]
    });
  }
}

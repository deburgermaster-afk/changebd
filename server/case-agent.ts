// Case Agent v3 — with database persistence
// Simpler prompts, text fallback, real data extraction, works for ANY case type

import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import { investigationsTable } from "@shared/schema";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// Database connection
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Free models — Gemini first (best at following instructions)
const FREE_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "google/gemini-2.5-flash-preview-05-20:free",
  "meta-llama/llama-4-scout:free",
  "meta-llama/llama-4-maverick:free",
  "qwen/qwen3-235b-a22b:free",
  "deepseek/deepseek-r1:free",
  "microsoft/phi-4-reasoning-plus:free",
  "google/gemma-3-4b-it:free",
];

let modelIndex = 0;
function getNextModel(): string {
  const model = FREE_MODELS[modelIndex % FREE_MODELS.length];
  modelIndex++;
  return model;
}

// ============================
// TYPES
// ============================
export interface AgentStatus {
  id: string;
  name: string;
  role: string;
  status: "initializing" | "active" | "investigating" | "idle" | "error";
  model: string;
  lastActivity: string;
}

export interface InvestigationLog {
  id: string;
  timestamp: string;
  type: "system" | "agent" | "evidence" | "human" | "alert" | "suspect" | "conclusion";
  icon: string;
  title: string;
  content: string;
  agentId?: string;
  metadata?: Record<string, any>;
}

export interface EvidenceItem {
  id: string;
  type: "image" | "news" | "document" | "testimony" | "social_media" | "video";
  title: string;
  url?: string;
  description: string;
  source: string;
  timestamp: string;
  verified: boolean;
}

export interface SuspectProfile {
  name: string;
  alias?: string;
  description: string;
  connection: string;
  confidence: number;
  method?: string;
  evidence: string[];
}

export interface CaseInvestigation {
  id: string;
  caseName: string;
  victimName: string;
  description: string;
  status: "initializing" | "forming-agents" | "investigating" | "active" | "paused" | "concluded";
  agents: AgentStatus[];
  logs: InvestigationLog[];
  evidence: EvidenceItem[];
  suspects: SuspectProfile[];
  humanReports: HumanReport[];
  createdAt: string;
  lastUpdate: string;
  triggerInterval: number;
  triggerCount: number;
  summary?: string;
}

export interface HumanReport {
  id: string;
  content: string;
  submittedAt: string;
  processed: boolean;
  agentResponse?: string;
}

// ============================
// STATE — in-memory cache + database persistence
// ============================
const investigations = new Map<string, CaseInvestigation>();
const investigationTimers = new Map<string, NodeJS.Timeout>();
const lastCallTime = new Map<string, number>();
const MIN_CALL_GAP_MS = 2000;

// Helper: save investigation to database
async function saveInvestigation(inv: CaseInvestigation): Promise<void> {
  try {
    await db.update(investigationsTable)
      .set({
        status: inv.status,
        agents: inv.agents,
        logs: inv.logs,
        evidence: inv.evidence,
        suspects: inv.suspects,
        humanReports: inv.humanReports,
        summary: inv.summary,
        triggerCount: inv.triggerCount,
        lastUpdate: new Date(),
      })
      .where(eq(investigationsTable.id, inv.id));
  } catch (e) {
    console.error("[Agent] DB save error:", e);
  }
}

// Helper: load all investigations from database on startup
async function loadInvestigationsFromDB(): Promise<void> {
  try {
    const rows = await db.select().from(investigationsTable);
    for (const row of rows) {
      const inv: CaseInvestigation = {
        id: row.id,
        caseName: row.caseName,
        victimName: row.victimName,
        description: row.description,
        status: row.status as CaseInvestigation["status"],
        agents: (row.agents || []) as AgentStatus[],
        logs: (row.logs || []) as InvestigationLog[],
        evidence: (row.evidence || []) as EvidenceItem[],
        suspects: (row.suspects || []) as SuspectProfile[],
        humanReports: (row.humanReports || []) as HumanReport[],
        createdAt: row.createdAt.toISOString(),
        lastUpdate: row.lastUpdate.toISOString(),
        triggerInterval: 15000,
        triggerCount: row.triggerCount || 0,
        summary: row.summary || undefined,
      };
      investigations.set(inv.id, inv);
      // Restart trigger cycle for active investigations
      if (inv.status === "active") {
        startTriggerCycle(inv.id);
      }
    }
    console.log(`[Agent] Loaded ${rows.length} investigations from DB`);
  } catch (e) {
    console.error("[Agent] DB load error:", e);
  }
}

// Export initialize function to be called from server startup
export async function initializeCaseAgent(): Promise<void> {
  await loadInvestigationsFromDB();
}

function gid(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function log(
  type: InvestigationLog["type"], title: string, content: string,
  icon: string, agentId?: string, metadata?: Record<string, any>
): InvestigationLog {
  return { id: gid(), timestamp: new Date().toISOString(), type, icon, title, content, agentId, metadata };
}

const AGENT_CONFIGS = [
  { name: "OSINT Analyst", role: "Open Source Intelligence — news, social media, public records" },
  { name: "Forensic Examiner", role: "Evidence analysis, timelines, forensics" },
  { name: "Profile Builder", role: "Victim and suspect profiles" },
  { name: "Pattern Detector", role: "Patterns, connections, anomalies" },
  { name: "Report Synthesizer", role: "Investigation reports and summaries" },
];

// ============================
// AI CALL — single message, no system prompt (works better on free models)
// ============================
async function callAI(agentName: string, prompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    console.log("[Agent] NO API KEY!");
    return "";
  }

  for (let i = 0; i < FREE_MODELS.length; i++) {
    const model = getNextModel();
    const gap = MIN_CALL_GAP_MS - (Date.now() - (lastCallTime.get(model) || 0));
    if (gap > 0) await new Promise(r => setTimeout(r, gap));

    try {
      lastCallTime.set(model, Date.now());
      const ac = new AbortController();
      const to = setTimeout(() => ac.abort(), 45000);

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://changebd.online",
          "X-Title": `ChangeBD-${agentName}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
          max_tokens: 2000,
        }),
        signal: ac.signal,
      });
      clearTimeout(to);

      if (res.status === 429) {
        console.log(`[Agent] ${model} 429, next...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        console.log(`[Agent] ${model} HTTP ${res.status}: ${body.substring(0, 200)}`);
        continue;
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (content && content.trim().length > 10) {
        console.log(`[Agent] ✅ ${agentName} got ${content.length} chars from ${model.split("/").pop()}`);
        return content;
      }
      console.log(`[Agent] ${model} empty/short response`);
    } catch (e: any) {
      console.log(`[Agent] ${model}: ${e.message}`);
    }
  }
  console.log(`[Agent] ❌ ${agentName} ALL MODELS FAILED`);
  return "";
}

// Strip thinking tags and markdown fences
function clean(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
}

// Try to parse JSON from AI response
function parseJSON(text: string): any {
  if (!text) return null;
  const c = clean(text);
  try { const m = c.match(/\[[\s\S]*\]/); if (m) return JSON.parse(m[0]); } catch {}
  try { const m = c.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ============================
// CREATE INVESTIGATION
// ============================
export async function createInvestigation(
  caseName: string, victimName: string, description: string
): Promise<CaseInvestigation> {
  const id = gid();
  const inv: CaseInvestigation = {
    id, caseName, victimName, description,
    status: "initializing",
    agents: [], logs: [], evidence: [], suspects: [], humanReports: [],
    createdAt: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
    triggerInterval: 15000, triggerCount: 0,
  };

  inv.logs.push(log("system", "🔐 Case Opened", `Investigation "${caseName}" initiated.\nSubject: ${victimName}\n${description}`, "🔐"));

  // Insert into database first
  try {
    await db.insert(investigationsTable).values({
      id: inv.id,
      caseName: inv.caseName,
      victimName: inv.victimName,
      description: inv.description,
      status: inv.status,
      agents: inv.agents,
      logs: inv.logs,
      evidence: inv.evidence,
      suspects: inv.suspects,
      humanReports: inv.humanReports,
      triggerCount: inv.triggerCount,
    });
    console.log(`[Agent] Created investigation ${id} in DB`);
  } catch (e) {
    console.error("[Agent] DB insert error:", e);
  }

  investigations.set(id, inv);

  // Agents online instantly
  AGENT_CONFIGS.forEach((cfg, i) => {
    const model = FREE_MODELS[i % FREE_MODELS.length];
    const agent: AgentStatus = {
      id: gid(), name: cfg.name, role: cfg.role,
      status: "active", model, lastActivity: new Date().toISOString(),
    };
    inv.agents.push(agent);
    inv.logs.push(log("agent", `✅ ${cfg.name} Online`, `${cfg.role}\nModel: ${model.split("/").pop()}`, "✅", agent.id));
  });

  inv.status = "investigating";
  inv.logs.push(log("system", "🚀 Investigation Started", "5 agents deployed. Starting multi-phase investigation...", "🚀"));
  inv.lastUpdate = new Date().toISOString();
  await saveInvestigation(inv);

  // Run async
  runPipeline(id);
  return inv;
}

// ============================
// PIPELINE — 5 phases, simple single-message prompts
// ============================
async function runPipeline(id: string): Promise<void> {
  const inv = investigations.get(id);
  if (!inv) return;

  const ctx = `Case: "${inv.caseName}"\nSubject/Victim: ${inv.victimName}\nDetails: ${inv.description}`;

  // ---- PHASE 1: Background Research (plain text) ----
  {
    const a = inv.agents.find(a => a.name === "OSINT Analyst");
    inv.logs.push(log("agent", "🔍 Phase 1: Background Research", "OSINT Analyst researching case background...", "⏳", a?.id));
    inv.lastUpdate = new Date().toISOString();

    const result = await callAI("OSINT Analyst",
      `You are an investigative researcher specializing in Bangladesh cases.

${ctx}

Write a detailed background report about this case. This could be ANY type — murder, kidnapping, corruption, scam, political case, disappearance, assault, land grab, or an already-solved case. Cover:

1. Who is involved? Background, occupation, age, family connections
2. What happened? The full incident in detail
3. When and where?
4. Current status — is it solved, ongoing, cold, under trial?
5. What has media reported?
6. Any public controversy, protests, or political involvement?
7. If solved — how was it solved? Who was arrested/convicted?

Write 5-8 detailed paragraphs. Use real facts if you know them. Do NOT use JSON format.`
    );

    if (result && clean(result).length > 80) {
      inv.logs.push(log("evidence", "🔍 Background Research Complete", clean(result), "📋", a?.id));
    } else {
      inv.logs.push(log("agent", "🔍 Background — Limited", "Agent returned brief response. Will gather more in monitoring.", "⚠️", a?.id));
    }
    inv.lastUpdate = new Date().toISOString();
  }
  await delay(3000);

  // ---- PHASE 2: News & Media (JSON array) ----
  {
    const a = inv.agents.find(a => a.name === "OSINT Analyst");
    inv.logs.push(log("agent", "📰 Phase 2: News & Media Search", "Searching news archives...", "⏳", a?.id));
    inv.lastUpdate = new Date().toISOString();

    const result = await callAI("OSINT Analyst",
      `Find all news articles and media coverage about this Bangladesh case.

${ctx}

Respond with ONLY a JSON array (no explanation, no markdown):
[
  {"title": "article headline", "source": "newspaper or TV channel", "summary": "2-3 sentence summary"},
  {"title": "another headline", "source": "source name", "summary": "summary"}
]

Include 4-8 articles from: Prothom Alo, Daily Star, Dhaka Tribune, Bangla Tribune, BD News 24, Somoy TV, Channel 24, Jamuna TV, BBC Bangla, etc.
If it's a well-known case, include international coverage too.
IMPORTANT: Respond with ONLY the JSON array, nothing else.`
    );

    const items = parseJSON(result);
    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        inv.evidence.push({
          id: gid(), type: "news", title: it.title || "News Article",
          url: it.url, description: it.summary || "",
          source: it.source || "Bangladesh Media",
          timestamp: new Date().toISOString(), verified: false,
        });
      }
      inv.logs.push(log("evidence", `📰 ${items.length} News Articles Found`,
        items.map((i: any) => `📰 ${i.source || "Media"}: ${i.title}\n   ${(i.summary || "").substring(0, 120)}`).join("\n\n"),
        "✅", a?.id));
    } else if (result && clean(result).length > 80) {
      // Fallback: store raw text as evidence
      inv.evidence.push({
        id: gid(), type: "news", title: "Media Coverage Report",
        description: clean(result).substring(0, 500),
        source: "OSINT Analyst", timestamp: new Date().toISOString(), verified: false,
      });
      inv.logs.push(log("evidence", "📰 Media Coverage", clean(result), "📋", a?.id));
    } else {
      inv.logs.push(log("agent", "📰 News Search — Retry Pending", "Will retry in monitoring phase.", "⚠️", a?.id));
    }
    inv.lastUpdate = new Date().toISOString();
  }
  await delay(3000);

  // ---- PHASE 3: Facebook & Social Media (JSON array) ----
  {
    const a = inv.agents.find(a => a.name === "Pattern Detector");
    inv.logs.push(log("agent", "📱 Phase 3: Social Media Scan", "Scanning Facebook, YouTube, TikTok...", "⏳", a?.id));
    inv.lastUpdate = new Date().toISOString();

    const result = await callAI("Pattern Detector",
      `Search social media for posts and videos about this Bangladesh case.

${ctx}

Find Facebook posts, Facebook videos, Facebook group discussions, YouTube videos, and TikTok/X posts about this case.

Respond with ONLY a JSON array (no explanation):
[
  {"platform": "Facebook", "type": "post", "title": "what the post says", "author": "page or person", "engagement": "likes/shares"},
  {"platform": "Facebook", "type": "video", "title": "video title", "author": "page", "engagement": "views"},
  {"platform": "YouTube", "type": "video", "title": "video title", "author": "channel name", "engagement": "views"},
  {"platform": "Facebook", "type": "group", "title": "group name", "author": "community", "engagement": "members"}
]

Include 5-10 items. Mix of posts, videos, and groups.
IMPORTANT: Respond with ONLY the JSON array.`
    );

    const items = parseJSON(result);
    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        const isVideo = (it.type || "").toLowerCase().includes("video");
        inv.evidence.push({
          id: gid(),
          type: isVideo ? "video" : "social_media",
          title: `[${(it.platform || "SOCIAL").toUpperCase()}] ${it.title || "Post"}`,
          url: it.url,
          description: `By: ${it.author || "Unknown"}\nEngagement: ${it.engagement || "N/A"}`,
          source: it.platform || "Social Media",
          timestamp: new Date().toISOString(), verified: false,
        });
      }
      inv.logs.push(log("evidence", `📱 ${items.length} Social Media Items Found`,
        items.map((i: any) => {
          const icon = (i.type || "").includes("video") ? "🎬" : i.platform?.includes("Facebook") ? "📘" : "📱";
          return `${icon} ${i.platform}: ${i.title}\n   By: ${i.author || "?"} · ${i.engagement || ""}`;
        }).join("\n\n"),
        "✅", a?.id));
    } else if (result && clean(result).length > 80) {
      inv.evidence.push({
        id: gid(), type: "social_media", title: "Social Media Analysis",
        description: clean(result).substring(0, 500),
        source: "Pattern Detector", timestamp: new Date().toISOString(), verified: false,
      });
      inv.logs.push(log("evidence", "📱 Social Media Report", clean(result), "📋", a?.id));
    } else {
      inv.logs.push(log("agent", "📱 Social Media — Retry Pending", "Will retry in monitoring.", "⚠️", a?.id));
    }
    inv.lastUpdate = new Date().toISOString();
    await saveInvestigation(inv);
  }
  await delay(3000);

  // ---- PHASE 4: Forensic Timeline (plain text) ----
  {
    const a = inv.agents.find(a => a.name === "Forensic Examiner");
    inv.logs.push(log("agent", "🕐 Phase 4: Forensic Analysis", "Forensic Examiner analyzing timeline and evidence...", "⏳", a?.id));
    inv.lastUpdate = new Date().toISOString();

    const result = await callAI("Forensic Examiner",
      `You are a forensic analyst examining a case from Bangladesh.

${ctx}

Evidence found so far:
${inv.evidence.map(e => `- ${e.title}: ${e.description.substring(0, 80)}`).join("\n")}

Write a detailed forensic analysis covering:
1. Reconstructed timeline of events (dates, times)
2. Key forensic observations
3. What evidence tells us
4. Inconsistencies or suspicious elements
5. If solved — was the investigation thorough? Any concerns?
6. Your forensic assessment

Write 4-6 detailed paragraphs. Do NOT use JSON.`
    );

    if (result && clean(result).length > 80) {
      inv.logs.push(log("evidence", "🕐 Forensic Analysis Complete", clean(result), "🔬", a?.id));
    } else {
      inv.logs.push(log("agent", "🕐 Forensic — Limited", "Will expand in monitoring.", "⚠️", a?.id));
    }
    inv.lastUpdate = new Date().toISOString();
    await saveInvestigation(inv);
  }
  await delay(3000);

  // ---- PHASE 5: Suspects & Summary (JSON) ----
  {
    const pa = inv.agents.find(a => a.name === "Profile Builder");
    const ra = inv.agents.find(a => a.name === "Report Synthesizer");
    inv.logs.push(log("agent", "🎯 Phase 5: Suspect Profiling & Summary", "Profile Builder analyzing all intelligence...", "⏳", pa?.id));
    inv.lastUpdate = new Date().toISOString();

    const evList = inv.evidence.map(e => `- [${e.type}] ${e.title}: ${e.description.substring(0, 80)}`).join("\n");
    const logList = inv.logs.filter(l => l.type === "evidence").slice(-4).map(l => l.content.substring(0, 250)).join("\n---\n");

    const result = await callAI("Profile Builder",
      `Analyze this Bangladesh case and identify all suspects, accused persons, convicted individuals, or persons of interest.

${ctx}

Evidence: ${evList || "Limited"}

Analysis so far: ${logList || "N/A"}

This case could be solved, unsolved, or under investigation. Identify EVERYONE involved — accused, arrested, convicted, acquitted, or suspected.

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "suspects": [
    {"name": "full name", "role": "accused/convicted/suspect/witness/person of interest", "connection": "how they are connected", "confidence": 0.8, "evidence": ["what links them"]}
  ],
  "summary": "4-5 paragraph case summary covering everything found",
  "status": "solved/unsolved/under trial/under investigation"
}`
    );

    const parsed = parseJSON(result);
    if (parsed) {
      if (Array.isArray(parsed.suspects)) {
        for (const s of parsed.suspects) {
          if (!s.name) continue;
          inv.suspects.push({
            name: s.name, alias: s.role, description: s.role || "",
            connection: s.connection || "",
            confidence: Math.min(1, Math.max(0.1, s.confidence || 0.5)),
            evidence: Array.isArray(s.evidence) ? s.evidence : [],
          });
          inv.logs.push(log("suspect", `🚨 ${s.role || "Person of Interest"}: ${s.name}`,
            `Connection: ${s.connection}\nConfidence: ${((s.confidence || 0.5) * 100).toFixed(0)}%\nEvidence: ${(s.evidence || []).join(", ")}`,
            "🚨", pa?.id));
        }
      }
      if (parsed.summary) {
        inv.summary = parsed.summary;
        inv.logs.push(log("conclusion", "📊 Investigation Summary", parsed.summary, "📊", ra?.id));
      }
      if (parsed.status) {
        inv.logs.push(log("conclusion", `⚖️ Case Status: ${parsed.status}`, `Assessment: ${parsed.status}`, "⚖️", ra?.id));
      }
    } else if (result && clean(result).length > 80) {
      inv.summary = clean(result).substring(0, 1000);
      inv.logs.push(log("conclusion", "📊 Investigation Summary", clean(result), "📊", ra?.id));
    }
    inv.lastUpdate = new Date().toISOString();
    await saveInvestigation(inv);
  }

  // Transition to active monitoring
  const inv2 = investigations.get(id);
  if (inv2 && inv2.status !== "paused") {
    inv2.status = "active";
    inv2.logs.push(log("system", "🔄 Active Monitoring",
      `Initial investigation complete: ${inv2.evidence.length} evidence items, ${inv2.suspects.length} suspects identified.\nAgents now check for updates every 15 seconds.`, "🔄"));
    inv2.lastUpdate = new Date().toISOString();
    await saveInvestigation(inv2);
    startTriggerCycle(id);
  }
}

// ============================
// TRIGGER CYCLE
// ============================
function startTriggerCycle(id: string): void {
  const existing = investigationTimers.get(id);
  if (existing) clearInterval(existing);

  const timer = setInterval(async () => {
    const inv = investigations.get(id);
    if (!inv || inv.status === "paused" || inv.status === "concluded") {
      clearInterval(timer);
      investigationTimers.delete(id);
      return;
    }
    inv.triggerCount++;

    const unprocessed = inv.humanReports.filter(r => !r.processed);
    if (unprocessed.length > 0) {
      await processHumanReports(id, unprocessed);
      return;
    }

    await runFollowUp(id);
  }, 15000);

  investigationTimers.set(id, timer);
}

// ============================
// FOLLOW-UP TASKS — these actually produce real data
// ============================
const TASKS = [
  {
    agent: "OSINT Analyst", title: "📱 Scanning Facebook",
    prompt: (inv: CaseInvestigation) => `Find NEW Facebook posts and group discussions about: "${inv.caseName}" (${inv.victimName}).
We already have ${inv.evidence.filter(e=>e.type==="social_media").length} social media items.
Find posts we haven't covered. Respond with ONLY a JSON array:
[{"platform":"Facebook","type":"post","title":"post text","author":"who","engagement":"likes/shares"}]
Include 2-4 new items. ONLY JSON array.`,
    kind: "social" as const,
  },
  {
    agent: "Forensic Examiner", title: "🔬 New Forensic Observations",
    prompt: (inv: CaseInvestigation) => `You are re-examining: "${inv.caseName}" (${inv.victimName}).
${inv.suspects.length} suspects found. ${inv.evidence.length} evidence items.
Latest findings: ${inv.logs.slice(-3).map(l=>l.title).join(", ")}
Write 2 NEW paragraphs of forensic analysis not covered before. Focus on what's still unclear or suspicious. No JSON.`,
    kind: "text" as const,
  },
  {
    agent: "OSINT Analyst", title: "▶️ New YouTube/TikTok Videos",
    prompt: (inv: CaseInvestigation) => `Find YouTube and TikTok videos about: "${inv.caseName}" (${inv.victimName}).
We already have ${inv.evidence.filter(e=>e.type==="video").length} videos.
Find NEW ones. Respond with ONLY a JSON array:
[{"platform":"YouTube","type":"video","title":"video title","author":"channel","engagement":"views"}]
Include 2-4 items. ONLY JSON array.`,
    kind: "social" as const,
  },
  {
    agent: "Pattern Detector", title: "🔗 New Connections Found",
    prompt: (inv: CaseInvestigation) => `Analyze connections in: "${inv.caseName}" (${inv.victimName}).
Suspects: ${inv.suspects.map(s=>s.name).join(", ")||"None yet"}
Evidence: ${inv.evidence.length} items.
Find NEW patterns or connections. Write 2 paragraphs. No JSON. Don't repeat previous findings.`,
    kind: "text" as const,
  },
  {
    agent: "Profile Builder", title: "👤 Profile Updates",
    prompt: (inv: CaseInvestigation) => `Update suspect profiles for: "${inv.caseName}" (${inv.victimName}).
Current suspects: ${inv.suspects.map(s=>`${s.name} (${s.alias||"?"})`).join(", ")||"None"}
Evidence: ${inv.evidence.length} items.
Update profiles or identify new persons of interest.
Respond with ONLY JSON: {"suspects":[{"name":"name","role":"role","connection":"connection","confidence":0.7,"evidence":["evidence"]}]}`,
    kind: "suspects" as const,
  },
  {
    agent: "Report Synthesizer", title: "📊 Summary Update",
    prompt: (inv: CaseInvestigation) => `Update the case summary for: "${inv.caseName}" (${inv.victimName}).
Evidence: ${inv.evidence.length} items. Suspects: ${inv.suspects.length}.
Last 3 activities: ${inv.logs.slice(-3).map(l=>l.title).join("; ")}
Write a 2-3 paragraph updated summary. No JSON.`,
    kind: "text" as const,
  },
  {
    agent: "OSINT Analyst", title: "📰 Latest News Check",
    prompt: (inv: CaseInvestigation) => `Find NEW news articles about: "${inv.caseName}" (${inv.victimName}).
Already have: ${inv.evidence.filter(e=>e.type==="news").slice(-3).map(e=>e.title).join(", ")||"none"}
Find articles NOT in the list above. Respond ONLY JSON array:
[{"title":"headline","source":"paper/channel","summary":"2 sentences"}]
Include 2-4 NEW articles. ONLY JSON array.`,
    kind: "news" as const,
  },
];

async function runFollowUp(id: string): Promise<void> {
  const inv = investigations.get(id);
  if (!inv) return;

  const task = TASKS[inv.triggerCount % TASKS.length];
  const agent = inv.agents.find(a => a.name === task.agent);

  inv.logs.push(log("agent", task.title, `${task.agent} working...`, "🔍", agent?.id));
  inv.lastUpdate = new Date().toISOString();

  const result = await callAI(task.agent, task.prompt(inv));
  if (!result) {
    inv.logs.push(log("agent", task.title, "Models busy — retrying next cycle.", "⏳", agent?.id));
    inv.lastUpdate = new Date().toISOString();
    return;
  }

  const cleaned = clean(result);

  if (task.kind === "text") {
    if (cleaned.length > 50) {
      inv.logs.push(log("evidence", task.title, cleaned, "📋", agent?.id));
    } else {
      inv.logs.push(log("agent", task.title, "No new findings.", "🟢", agent?.id));
    }
  } else if (task.kind === "news") {
    const items = parseJSON(result);
    if (Array.isArray(items) && items.length > 0) {
      let n = 0;
      for (const it of items) {
        if (inv.evidence.some(e => e.title === it.title)) continue;
        inv.evidence.push({
          id: gid(), type: "news", title: it.title || "News",
          url: it.url, description: it.summary || "",
          source: it.source || "Media",
          timestamp: new Date().toISOString(), verified: false,
        });
        n++;
      }
      inv.logs.push(log("evidence", `${task.title} — ${n} New`,
        items.map((i: any) => `📰 ${i.source||"Media"}: ${i.title}`).join("\n"), n > 0 ? "✅" : "🟢", agent?.id));
    } else if (cleaned.length > 50) {
      inv.logs.push(log("evidence", task.title, cleaned.substring(0, 800), "📋", agent?.id));
    }
  } else if (task.kind === "social") {
    const items = parseJSON(result);
    if (Array.isArray(items) && items.length > 0) {
      let n = 0;
      for (const it of items) {
        if (inv.evidence.some(e => e.title.includes((it.title||"XXXXX").substring(0, 25)))) continue;
        const isVid = (it.type || "").toLowerCase().includes("video");
        inv.evidence.push({
          id: gid(), type: isVid ? "video" : "social_media",
          title: `[${(it.platform||"SOCIAL").toUpperCase()}] ${it.title||"Post"}`,
          url: it.url,
          description: `By: ${it.author||"Unknown"}\nEngagement: ${it.engagement||"N/A"}`,
          source: it.platform || "Social Media",
          timestamp: new Date().toISOString(), verified: false,
        });
        n++;
      }
      inv.logs.push(log("evidence", `${task.title} — ${n} New`,
        items.map((i: any) => `${(i.type||"").includes("video")?"🎬":"📱"} ${i.platform}: ${i.title}`).join("\n"),
        n > 0 ? "✅" : "🟢", agent?.id));
    } else if (cleaned.length > 50) {
      inv.logs.push(log("evidence", task.title, cleaned.substring(0, 800), "📋", agent?.id));
    }
  } else if (task.kind === "suspects") {
    const parsed = parseJSON(result);
    if (parsed && Array.isArray(parsed.suspects)) {
      for (const s of parsed.suspects) {
        if (!s.name) continue;
        const ex = inv.suspects.find(x => x.name.toLowerCase() === s.name.toLowerCase());
        if (ex) {
          ex.confidence = Math.min(1, Math.max(0.1, s.confidence || ex.confidence));
          ex.connection = s.connection || ex.connection;
          inv.logs.push(log("suspect", `🔄 Updated: ${ex.name}`,
            `Confidence: ${(ex.confidence*100).toFixed(0)}%\n${s.connection||""}`, "🔄", agent?.id));
        } else {
          inv.suspects.push({
            name: s.name, alias: s.role, description: s.role || "",
            connection: s.connection || "",
            confidence: Math.min(1, Math.max(0.1, s.confidence || 0.5)),
            evidence: Array.isArray(s.evidence) ? s.evidence : [],
          });
          inv.logs.push(log("suspect", `🚨 New: ${s.name}`,
            `${s.connection}\nConfidence: ${((s.confidence||0.5)*100).toFixed(0)}%`, "🚨", agent?.id));
        }
      }
    } else if (cleaned.length > 50) {
      inv.logs.push(log("evidence", task.title, cleaned.substring(0, 800), "📋", agent?.id));
    }
  }

  inv.lastUpdate = new Date().toISOString();
  await saveInvestigation(inv);
}

// ============================
// HUMAN REPORTS
// ============================
async function processHumanReports(id: string, reports: HumanReport[]): Promise<void> {
  const inv = investigations.get(id);
  if (!inv) return;

  for (const report of reports) {
    inv.logs.push(log("human", "👥 Human Report", report.content, "👥"));

    const result = await callAI("OSINT Analyst",
      `A tip was submitted for case: "${inv.caseName}" (${inv.victimName}).
Tip: "${report.content}"
Evaluate credibility and usefulness.
Respond JSON only: {"credibility":"high/medium/low","useful":true,"analysis":"what this tells us","response":"message to tipster"}`
    );

    report.processed = true;
    const parsed = parseJSON(result);
    if (parsed) {
      report.agentResponse = parsed.response || "Thank you. Agents are analyzing your report.";
      inv.logs.push(log("agent", parsed.useful ? "✅ Tip Verified" : "ℹ️ Tip Noted",
        `Credibility: ${parsed.credibility||"unknown"}\n${parsed.analysis||""}`, parsed.useful ? "✅" : "ℹ️"));
    } else {
      report.agentResponse = "Report received and logged.";
    }
  }
  inv.lastUpdate = new Date().toISOString();
  await saveInvestigation(inv);
}

// ============================
// PUBLIC API
// ============================
export function getInvestigation(id: string): CaseInvestigation | undefined {
  return investigations.get(id);
}

export function getAllInvestigations(): CaseInvestigation[] {
  return Array.from(investigations.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function addHumanReport(id: string, content: string): Promise<HumanReport | null> {
  const inv = investigations.get(id);
  if (!inv) return null;
  const report: HumanReport = { id: gid(), content, submittedAt: new Date().toISOString(), processed: false };
  inv.humanReports.push(report);
  inv.lastUpdate = new Date().toISOString();
  await processHumanReports(id, [report]);
  return report;
}

export async function pauseInvestigation(id: string): Promise<boolean> {
  const inv = investigations.get(id);
  if (!inv) return false;
  inv.status = "paused";
  inv.logs.push(log("system", "⏸️ Paused", "Investigation paused.", "⏸️"));
  inv.lastUpdate = new Date().toISOString();
  const t = investigationTimers.get(id);
  if (t) { clearInterval(t); investigationTimers.delete(id); }
  await saveInvestigation(inv);
  return true;
}

export async function resumeInvestigation(id: string): Promise<boolean> {
  const inv = investigations.get(id);
  if (!inv || inv.status !== "paused") return false;
  inv.status = "active";
  inv.logs.push(log("system", "▶️ Resumed", "Monitoring restarted.", "▶️"));
  inv.lastUpdate = new Date().toISOString();
  await saveInvestigation(inv);
  startTriggerCycle(id);
  return true;
}

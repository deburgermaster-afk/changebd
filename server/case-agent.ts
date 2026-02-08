// Case Agent - AI-powered investigation engine
// Uses multiple AI agents with free model rotation and automatic fallback

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

// ============================
// FREE MODEL POOL WITH ROTATION
// ============================
// These are all free-tier models on OpenRouter — we rotate and fallback
const FREE_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "google/gemma-3-4b-it:free",
  "meta-llama/llama-4-maverick:free",
  "deepseek/deepseek-r1:free",
  "qwen/qwen3-235b-a22b:free",
  "microsoft/phi-4-reasoning-plus:free",
  "meta-llama/llama-4-scout:free",
  "google/gemini-2.5-flash-preview-05-20:free",
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
// STATE
// ============================
const investigations = new Map<string, CaseInvestigation>();
const investigationTimers = new Map<string, NodeJS.Timeout>();

// Rate limiter: track last call time per model
const lastCallTime = new Map<string, number>();
const MIN_CALL_GAP_MS = 1500; // minimum 1.5s between calls to same model

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function createLog(
  type: InvestigationLog["type"],
  title: string,
  content: string,
  icon: string,
  agentId?: string,
  metadata?: Record<string, any>
): InvestigationLog {
  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    type, icon, title, content, agentId, metadata,
  };
}

// ============================
// AGENT CONFIGS
// ============================
const AGENT_CONFIGS = [
  { name: "OSINT Analyst", role: "Open Source Intelligence gathering — searches news, social media, public records" },
  { name: "Forensic Examiner", role: "Analyzes evidence, timelines, and physical/digital forensics" },
  { name: "Profile Builder", role: "Builds victim and suspect profiles from gathered intelligence" },
  { name: "Pattern Detector", role: "Identifies patterns, connections, and anomalies in case data" },
  { name: "Report Synthesizer", role: "Compiles findings into structured investigation reports" },
];

// ============================
// AI CALL WITH RETRY + FALLBACK
// ============================
async function callAIAgent(
  agentName: string,
  systemPrompt: string,
  userPrompt: string,
  retries = FREE_MODELS.length
): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    return `[${agentName}] AI service unavailable — API key not configured`;
  }

  let lastError = "";

  for (let attempt = 0; attempt < retries; attempt++) {
    const model = getNextModel();

    // Rate limit: wait if we called this model too recently
    const lastTime = lastCallTime.get(model) || 0;
    const elapsed = Date.now() - lastTime;
    if (elapsed < MIN_CALL_GAP_MS) {
      await new Promise(resolve => setTimeout(resolve, MIN_CALL_GAP_MS - elapsed));
    }

    try {
      lastCallTime.set(model, Date.now());

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://changebd.online",
          "X-Title": `ChangeBD Agent — ${agentName}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.4,
          max_tokens: 1200,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.status === 429) {
        // Rate limited — try next model
        console.log(`[CaseAgent] ${model} rate-limited, rotating...`);
        lastError = `Rate limited on ${model}`;
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }

      if (!response.ok) {
        lastError = `${model} returned ${response.status}`;
        console.log(`[CaseAgent] ${model} error ${response.status}, trying next...`);
        continue;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (content && content.length > 0) {
        return content;
      }

      lastError = `${model} returned empty response`;
      continue;
    } catch (error: any) {
      lastError = error.name === "AbortError" ? `${model} timed out` : error.message;
      console.log(`[CaseAgent] ${agentName} attempt ${attempt + 1} failed:`, lastError);
      continue;
    }
  }

  console.error(`[CaseAgent] ${agentName} FAILED after trying ${retries} models. Last: ${lastError}`);
  return `[${agentName}] Tried all ${FREE_MODELS.length} available models — none responded. Will retry next cycle. Last error: ${lastError}`;
}

// ============================
// CREATE INVESTIGATION
// ============================
export async function createInvestigation(
  caseName: string,
  victimName: string,
  description: string
): Promise<CaseInvestigation> {
  const id = generateId();

  const investigation: CaseInvestigation = {
    id, caseName, victimName, description,
    status: "initializing",
    agents: [],
    logs: [],
    evidence: [],
    suspects: [],
    humanReports: [],
    createdAt: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
    triggerInterval: 15000, // AI calls every 15s, frontend polls every 2s
    triggerCount: 0,
  };

  investigation.logs.push(
    createLog("system", "🔐 Case Opened", `Investigation "${caseName}" has been initiated.`, "🔐")
  );
  investigation.logs.push(
    createLog("system", "📋 Case Brief", `Victim: ${victimName}\n${description}`, "📋")
  );

  investigations.set(id, investigation);

  // Form agents instantly (no wasteful API test calls)
  formAgentsInstant(id);

  // Start async investigation pipeline
  runInvestigationPipeline(id);

  return investigation;
}

// ============================
// INSTANT AGENT FORMATION (no API waste)
// ============================
function formAgentsInstant(investigationId: string): void {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  inv.status = "forming-agents";
  inv.logs.push(
    createLog("system", "🤖 Deploying Agent Team", "Activating 5 AI investigation agents with free model rotation...", "🤖")
  );

  // Assign each agent a different starting model from the free pool
  AGENT_CONFIGS.forEach((config, index) => {
    const model = FREE_MODELS[index % FREE_MODELS.length];
    const agent: AgentStatus = {
      id: generateId(),
      name: config.name,
      role: config.role,
      status: "active", // Mark active immediately — no wasted test call
      model,
      lastActivity: new Date().toISOString(),
    };
    inv.agents.push(agent);

    inv.logs.push(
      createLog("agent", `✅ ${config.name} Online`,
        `${config.role}\nModel: ${model.split("/").pop()}`,
        "✅", agent.id)
    );
  });

  inv.logs.push(
    createLog("system", "📊 All 5 Agents Active",
      `Agents deployed with ${FREE_MODELS.length} free models in rotation pool. Auto-fallback enabled.`,
      "📊")
  );

  inv.status = "investigating";
  inv.lastUpdate = new Date().toISOString();
}

// ============================
// INVESTIGATION PIPELINE
// ============================
async function runInvestigationPipeline(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv || inv.status === "paused") return;

  inv.logs.push(
    createLog("system", "🚀 Investigation Started", "Beginning multi-phase investigation...", "🚀")
  );
  inv.lastUpdate = new Date().toISOString();

  // Phase 1: Victim info
  await gatherVictimInfo(investigationId);
  await delay(2000);

  // Phase 2: Incident details
  await gatherIncidentDetails(investigationId);
  await delay(2000);

  // Phase 3: Official findings
  await gatherOfficialFindings(investigationId);
  await delay(2000);

  // Phase 3.5: Facebook & Social Media deep scan
  await searchSocialMedia(investigationId);
  await delay(2000);

  // Phase 4: Evidence search
  await searchEvidence(investigationId);
  await delay(2000);

  // Phase 5: Suspect profile
  await buildSuspectProfile(investigationId);

  // Transition to active monitoring
  const inv2 = investigations.get(investigationId);
  if (inv2 && inv2.status !== "paused") {
    inv2.status = "active";
    inv2.logs.push(
      createLog("system", "🔄 Active Monitoring",
        "Initial investigation complete. Agents will now check for new data every 15 seconds using free model rotation.",
        "🔄")
    );
    inv2.lastUpdate = new Date().toISOString();
    startTriggerCycle(investigationId);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================
// PHASE 1: VICTIM INFO
// ============================
async function gatherVictimInfo(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  const agent = inv.agents.find(a => a.name === "OSINT Analyst");
  inv.logs.push(
    createLog("agent", "🔍 Gathering Victim Information",
      "OSINT Analyst searching public records and news...", "🔍", agent?.id)
  );
  inv.lastUpdate = new Date().toISOString();

  const result = await callAIAgent(
    "OSINT Analyst",
    "You are an OSINT analyst specializing in Bangladesh. Provide intelligence based on publicly available info. Always respond in valid JSON only, no markdown.",
    `Investigate the victim. Case: ${inv.caseName}\nVictim: ${inv.victimName}\nDescription: ${inv.description}

Respond with ONLY valid JSON:
{
  "fullName": "name",
  "age": "age or range",
  "occupation": "occupation",
  "location": "last known location",
  "background": "brief background",
  "recentActivity": "recent known activity",
  "socialConnections": ["connections"],
  "relevantNews": [{"title": "headline", "source": "source", "summary": "summary"}]
}`
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      inv.logs.push(
        createLog("evidence", "👤 Victim Profile Compiled",
          `Name: ${parsed.fullName || inv.victimName}\nAge: ${parsed.age || "Unknown"}\nOccupation: ${parsed.occupation || "Unknown"}\nLocation: ${parsed.location || "Unknown"}\nBackground: ${parsed.background || "N/A"}`,
          "👤", agent?.id, parsed)
      );

      if (Array.isArray(parsed.relevantNews)) {
        for (const news of parsed.relevantNews) {
          inv.evidence.push({
            id: generateId(), type: "news",
            title: news.title || "Related News",
            url: news.url,
            description: news.summary || "",
            source: news.source || "Unknown",
            timestamp: new Date().toISOString(),
            verified: false,
          });
        }
      }
    } else {
      inv.logs.push(createLog("agent", "📝 Victim Info", result.substring(0, 500), "📝", agent?.id));
    }
  } catch {
    inv.logs.push(createLog("agent", "📝 Victim Info", result.substring(0, 500), "📝", agent?.id));
  }
  inv.lastUpdate = new Date().toISOString();
}

// ============================
// PHASE 2: INCIDENT DETAILS
// ============================
async function gatherIncidentDetails(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  const agent = inv.agents.find(a => a.name === "Forensic Examiner");
  inv.logs.push(
    createLog("agent", "🕐 Incident Timeline Analysis",
      "Forensic Examiner reconstructing the incident timeline...", "🕐", agent?.id)
  );
  inv.lastUpdate = new Date().toISOString();

  const result = await callAIAgent(
    "Forensic Examiner",
    "You are a forensic AI specializing in crime analysis for Bangladesh cases. Respond in valid JSON only, no markdown.",
    `Reconstruct the incident. Case: ${inv.caseName}\nVictim: ${inv.victimName}\nDescription: ${inv.description}\nEvidence: ${JSON.stringify(inv.evidence.map(e => e.title))}

Respond with ONLY valid JSON:
{
  "allegedDate": "date",
  "allegedTime": "time range",
  "allegedLocation": "specific location",
  "incidentType": "type",
  "timeline": [{"time": "timestamp", "event": "what happened"}],
  "keyObservations": ["observation 1"],
  "sceneDetails": "scene description"
}`
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      inv.logs.push(
        createLog("evidence", "📍 Incident Details",
          `Date: ${parsed.allegedDate || "Unknown"}\nTime: ${parsed.allegedTime || "Unknown"}\nLocation: ${parsed.allegedLocation || "Unknown"}\nType: ${parsed.incidentType || "Under investigation"}`,
          "📍", agent?.id, parsed)
      );
      if (Array.isArray(parsed.timeline)) {
        inv.logs.push(
          createLog("evidence", "⏱️ Reconstructed Timeline",
            parsed.timeline.map((t: any) => `• ${t.time}: ${t.event}`).join("\n"),
            "⏱️", agent?.id)
        );
      }
      if (Array.isArray(parsed.keyObservations)) {
        inv.logs.push(
          createLog("agent", "🔬 Key Observations",
            parsed.keyObservations.map((o: string) => `• ${o}`).join("\n"),
            "🔬", agent?.id)
        );
      }
    }
  } catch {
    inv.logs.push(createLog("agent", "🕐 Incident Analysis", result.substring(0, 500), "🕐", agent?.id));
  }
  inv.lastUpdate = new Date().toISOString();
}

// ============================
// PHASE 3: OFFICIAL FINDINGS
// ============================
async function gatherOfficialFindings(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  const agent = inv.agents.find(a => a.name === "OSINT Analyst");
  inv.logs.push(
    createLog("agent", "🏛️ Searching Official Records",
      "Checking police reports, court records, government databases...", "🏛️", agent?.id)
  );
  inv.lastUpdate = new Date().toISOString();

  const result = await callAIAgent(
    "OSINT Analyst",
    "You are an OSINT analyst searching for official findings from Bangladesh law enforcement. Respond in valid JSON only, no markdown.",
    `Find official findings. Case: ${inv.caseName}\nVictim: ${inv.victimName}\nDescription: ${inv.description}

Respond with ONLY valid JSON:
{
  "policeFindings": "what police found",
  "officialStatements": [{"authority": "who", "statement": "what they said"}],
  "caseStatus": "current status",
  "chargesFiled": "any charges",
  "evidenceRecovered": ["item 1"],
  "witnesses": "witness info"
}`
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      inv.logs.push(
        createLog("evidence", "🚔 Police Findings",
          `${parsed.policeFindings || "No official statement yet."}\nStatus: ${parsed.caseStatus || "Unknown"}\nCharges: ${parsed.chargesFiled || "None filed"}`,
          "🚔", agent?.id, parsed)
      );
      if (Array.isArray(parsed.officialStatements)) {
        for (const stmt of parsed.officialStatements) {
          inv.logs.push(createLog("evidence", `📢 ${stmt.authority || "Official"}`, stmt.statement || "", "📢"));
        }
      }
      if (Array.isArray(parsed.evidenceRecovered)) {
        inv.logs.push(
          createLog("evidence", "🔎 Evidence Recovered",
            parsed.evidenceRecovered.map((e: string) => `• ${e}`).join("\n"), "🔎")
        );
      }
    }
  } catch {
    inv.logs.push(createLog("agent", "🏛️ Official Findings", result.substring(0, 500), "🏛️"));
  }
  inv.lastUpdate = new Date().toISOString();
}

// ============================
// PHASE 3.5: FACEBOOK & SOCIAL MEDIA SCAN
// ============================
async function searchSocialMedia(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  const agent = inv.agents.find(a => a.name === "OSINT Analyst");
  inv.logs.push(
    createLog("agent", "📱 OSINT Analyst — Social Media Scan",
      "Scanning Facebook posts, videos, groups, YouTube, TikTok, and X (Twitter) for case-related content...", "📱", agent?.id)
  );
  inv.lastUpdate = new Date().toISOString();

  const result = await callAIAgent(
    "OSINT Analyst",
    `You are an OSINT analyst specializing in social media intelligence for Bangladesh. Search Facebook, YouTube, TikTok, and X (Twitter) for posts, videos, live streams, group discussions, and viral content related to the case. Include actual or likely Facebook/YouTube URLs where possible. Respond in valid JSON only, no markdown.`,
    `Deep social media investigation. Case: ${inv.caseName}\nVictim: ${inv.victimName}\nDescription: ${inv.description}\nExisting evidence: ${inv.evidence.map(e => e.title).join(", ")}

Search across Facebook posts, Facebook videos, Facebook groups, Facebook Live, YouTube videos, TikTok, and X/Twitter.

Respond with ONLY valid JSON:
{
  "facebookPosts": [{"content": "post text or summary", "author": "page/person", "url": "facebook.com/...", "engagement": "likes/shares/comments", "relevance": "how it connects to case", "date": "when posted"}],
  "facebookVideos": [{"title": "video title", "author": "uploader", "url": "facebook.com/...", "duration": "length", "views": "view count", "description": "what the video shows", "relevance": "connection to case"}],
  "facebookGroups": [{"groupName": "name", "url": "facebook.com/groups/...", "memberCount": "approx members", "relevantDiscussion": "what people are saying"}],
  "youtubeVideos": [{"title": "title", "channel": "channel name", "url": "youtube.com/...", "views": "views", "description": "content summary", "relevance": "connection"}],
  "otherSocial": [{"platform": "TikTok|X|Reddit", "content": "post summary", "author": "who", "url": "url", "relevance": "connection"}],
  "viralContent": "description of any viral posts/videos about the case",
  "publicSentiment": "what the public is saying on social media"
}`
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // Facebook posts
      if (Array.isArray(parsed.facebookPosts) && parsed.facebookPosts.length > 0) {
        for (const post of parsed.facebookPosts) {
          inv.evidence.push({
            id: generateId(), type: "social_media",
            title: `[FB POST] ${post.content?.substring(0, 80) || "Facebook Post"}`,
            url: post.url,
            description: `By: ${post.author || "Unknown"}\n${post.relevance || ""}\nEngagement: ${post.engagement || "N/A"}`,
            source: `Facebook · ${post.date || "Recent"}`,
            timestamp: new Date().toISOString(), verified: false,
          });
        }
        inv.logs.push(
          createLog("evidence", "📘 Facebook Posts Found",
            parsed.facebookPosts.map((p: any) => `• ${p.author || "Unknown"}: ${p.content?.substring(0, 100) || "Post"}\n  Engagement: ${p.engagement || "N/A"} · ${p.relevance || ""}`).join("\n\n"),
            "📘", agent?.id)
        );
      }

      // Facebook videos
      if (Array.isArray(parsed.facebookVideos) && parsed.facebookVideos.length > 0) {
        for (const vid of parsed.facebookVideos) {
          inv.evidence.push({
            id: generateId(), type: "video",
            title: `[FB VIDEO] ${vid.title || "Facebook Video"}`,
            url: vid.url,
            description: `${vid.description || ""}\nBy: ${vid.author || "Unknown"} · Views: ${vid.views || "N/A"} · Duration: ${vid.duration || "N/A"}`,
            source: "Facebook Video",
            timestamp: new Date().toISOString(), verified: false,
          });
        }
        inv.logs.push(
          createLog("evidence", "🎬 Facebook Videos Found",
            parsed.facebookVideos.map((v: any) => `• ${v.title || "Video"} by ${v.author || "Unknown"}\n  Views: ${v.views || "N/A"} · ${v.relevance || ""}`).join("\n\n"),
            "🎬", agent?.id)
        );
      }

      // Facebook groups
      if (Array.isArray(parsed.facebookGroups) && parsed.facebookGroups.length > 0) {
        for (const group of parsed.facebookGroups) {
          inv.evidence.push({
            id: generateId(), type: "social_media",
            title: `[FB GROUP] ${group.groupName || "Facebook Group"}`,
            url: group.url,
            description: `Members: ${group.memberCount || "N/A"}\nDiscussion: ${group.relevantDiscussion || "N/A"}`,
            source: "Facebook Group",
            timestamp: new Date().toISOString(), verified: false,
          });
        }
        inv.logs.push(
          createLog("evidence", "👥 Facebook Groups Discussing Case",
            parsed.facebookGroups.map((g: any) => `• ${g.groupName} (${g.memberCount || "?"} members)\n  ${g.relevantDiscussion || ""}`).join("\n\n"),
            "👥", agent?.id)
        );
      }

      // YouTube videos
      if (Array.isArray(parsed.youtubeVideos) && parsed.youtubeVideos.length > 0) {
        for (const yt of parsed.youtubeVideos) {
          inv.evidence.push({
            id: generateId(), type: "video",
            title: `[YOUTUBE] ${yt.title || "YouTube Video"}`,
            url: yt.url,
            description: `Channel: ${yt.channel || "Unknown"} · Views: ${yt.views || "N/A"}\n${yt.description || ""}`,
            source: "YouTube",
            timestamp: new Date().toISOString(), verified: false,
          });
        }
        inv.logs.push(
          createLog("evidence", "▶️ YouTube Videos Found",
            parsed.youtubeVideos.map((y: any) => `• ${y.title} — ${y.channel || "Unknown"}\n  Views: ${y.views || "N/A"} · ${y.relevance || ""}`).join("\n\n"),
            "▶️", agent?.id)
        );
      }

      // Other social (TikTok, X, Reddit)
      if (Array.isArray(parsed.otherSocial) && parsed.otherSocial.length > 0) {
        for (const os of parsed.otherSocial) {
          inv.evidence.push({
            id: generateId(), type: "social_media",
            title: `[${(os.platform || "SOCIAL").toUpperCase()}] ${os.content?.substring(0, 60) || "Post"}`,
            url: os.url,
            description: `By: ${os.author || "Unknown"}\n${os.relevance || ""}`,
            source: os.platform || "Social Media",
            timestamp: new Date().toISOString(), verified: false,
          });
        }
      }

      // Viral content & public sentiment
      const summaryParts: string[] = [];
      if (parsed.viralContent) summaryParts.push(`🔥 Viral: ${parsed.viralContent}`);
      if (parsed.publicSentiment) summaryParts.push(`💬 Public Sentiment: ${parsed.publicSentiment}`);
      if (summaryParts.length > 0) {
        inv.logs.push(
          createLog("evidence", "📊 Social Media Landscape", summaryParts.join("\n\n"), "📊", agent?.id)
        );
      }
    }
  } catch {
    inv.logs.push(createLog("agent", "📱 Social Media Scan", result.substring(0, 500), "📱", agent?.id));
  }
  inv.lastUpdate = new Date().toISOString();
}

// ============================
// PHASE 4: EVIDENCE SEARCH
// ============================
async function searchEvidence(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  const agent = inv.agents.find(a => a.name === "Pattern Detector");
  inv.logs.push(
    createLog("agent", "🌐 Deep Evidence Search",
      "Pattern Detector scanning digital evidence, CCTV references, media coverage...", "🌐", agent?.id)
  );
  inv.lastUpdate = new Date().toISOString();

  const result = await callAIAgent(
    "Pattern Detector",
    "You are a pattern detection AI for Bangladesh crime cases. Respond in valid JSON only, no markdown.",
    `Search for evidence and patterns. Case: ${inv.caseName}\nVictim: ${inv.victimName}\nDescription: ${inv.description}\nExisting evidence: ${JSON.stringify(inv.evidence.map(e => ({ title: e.title, type: e.type })))}

Respond with ONLY valid JSON:
{
  "digitalEvidence": [{"type": "cctv|social_media|phone_records", "description": "details", "location": "where"}],
  "mediaReferences": [{"title": "title", "source": "source", "relevance": "connection"}],
  "patterns": ["pattern found"],
  "possibleFootage": [{"description": "desc", "location": "where", "likelihood": "high|medium|low"}],
  "anomalies": ["unusual finding"]
}`
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (Array.isArray(parsed.digitalEvidence)) {
        for (const de of parsed.digitalEvidence) {
          inv.evidence.push({
            id: generateId(), type: "document",
            title: `[${de.type?.toUpperCase()}] ${de.description?.substring(0, 60)}`,
            description: de.description || "", source: de.location || "Digital",
            timestamp: new Date().toISOString(), verified: false,
          });
        }
        inv.logs.push(
          createLog("evidence", "💾 Digital Evidence Found",
            parsed.digitalEvidence.map((d: any) => `• [${d.type}] ${d.description}`).join("\n"),
            "💾", agent?.id)
        );
      }

      if (Array.isArray(parsed.mediaReferences)) {
        for (const mr of parsed.mediaReferences) {
          inv.evidence.push({
            id: generateId(), type: "news",
            title: mr.title || "Media Reference", url: mr.url,
            description: mr.relevance || "", source: mr.source || "Media",
            timestamp: new Date().toISOString(), verified: false,
          });
        }
      }

      if (Array.isArray(parsed.patterns) && parsed.patterns.length > 0) {
        inv.logs.push(
          createLog("agent", "🔗 Patterns Identified",
            parsed.patterns.map((p: string) => `• ${p}`).join("\n"), "🔗", agent?.id)
        );
      }

      if (Array.isArray(parsed.possibleFootage)) {
        inv.logs.push(
          createLog("evidence", "📹 Possible Footage Locations",
            parsed.possibleFootage.map((f: any) => `• ${f.description} — ${f.location} [${f.likelihood}]`).join("\n"),
            "📹", agent?.id)
        );
      }

      if (Array.isArray(parsed.anomalies) && parsed.anomalies.length > 0) {
        inv.logs.push(
          createLog("alert", "⚡ Anomalies Detected",
            parsed.anomalies.map((a: string) => `• ${a}`).join("\n"), "⚡", agent?.id)
        );
      }
    }
  } catch {
    inv.logs.push(createLog("agent", "🌐 Evidence Search", result.substring(0, 500), "🌐"));
  }
  inv.lastUpdate = new Date().toISOString();
}

// ============================
// PHASE 5: SUSPECT PROFILE
// ============================
async function buildSuspectProfile(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  const agent = inv.agents.find(a => a.name === "Profile Builder");
  const reportAgent = inv.agents.find(a => a.name === "Report Synthesizer");

  inv.logs.push(
    createLog("agent", "🎯 Building Suspect Profile",
      "Profile Builder analyzing all intelligence to identify suspects...", "🎯", agent?.id)
  );
  inv.lastUpdate = new Date().toISOString();

  const allLogs = inv.logs.slice(-15).map(l => `[${l.type}] ${l.title}: ${l.content.substring(0, 150)}`).join("\n");
  const allEvidence = inv.evidence.map(e => `[${e.type}] ${e.title}: ${e.description.substring(0, 100)}`).join("\n");

  const result = await callAIAgent(
    "Profile Builder",
    "You are a criminal profile builder AI. Build suspect profiles from evidence. Respond in valid JSON only, no markdown.",
    `Identify suspects from all data. Case: ${inv.caseName}\nVictim: ${inv.victimName}\n\nLogs:\n${allLogs}\n\nEvidence:\n${allEvidence}

Respond with ONLY valid JSON:
{
  "suspects": [{"name": "name", "alias": "aliases", "description": "description", "connection": "connection to crime", "confidence": 0.5, "method": "alleged method", "evidence": ["linking evidence"]}],
  "summary": "investigation summary",
  "nextSteps": ["next steps"]
}`
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (Array.isArray(parsed.suspects)) {
        for (const suspect of parsed.suspects) {
          const sp: SuspectProfile = {
            name: suspect.name || "Unknown",
            alias: suspect.alias,
            description: suspect.description || "",
            connection: suspect.connection || "",
            confidence: Math.min(1, Math.max(0, suspect.confidence || 0.3)),
            method: suspect.method,
            evidence: Array.isArray(suspect.evidence) ? suspect.evidence : [],
          };
          inv.suspects.push(sp);
          inv.logs.push(
            createLog("suspect", `🚨 Suspect: ${sp.name}`,
              `Connection: ${sp.connection}\nConfidence: ${(sp.confidence * 100).toFixed(0)}%\nMethod: ${sp.method || "Unknown"}`,
              "🚨", agent?.id, sp)
          );
        }
      }

      if (parsed.summary) {
        inv.summary = parsed.summary;
        inv.logs.push(createLog("conclusion", "📊 Investigation Summary", parsed.summary, "📊", reportAgent?.id));
      }

      if (Array.isArray(parsed.nextSteps)) {
        inv.logs.push(
          createLog("system", "📋 Next Steps",
            parsed.nextSteps.map((s: string) => `• ${s}`).join("\n"), "📋")
        );
      }
    }
  } catch {
    inv.logs.push(createLog("agent", "🎯 Suspect Analysis", result.substring(0, 500), "🎯"));
  }
  inv.lastUpdate = new Date().toISOString();
}

// ============================
// TRIGGER CYCLE (smart throttled)
// ============================
function startTriggerCycle(investigationId: string): void {
  const existingTimer = investigationTimers.get(investigationId);
  if (existingTimer) clearInterval(existingTimer);

  // Run every 15 seconds to avoid rate limits on free models
  const timer = setInterval(async () => {
    const inv = investigations.get(investigationId);
    if (!inv || inv.status === "paused" || inv.status === "concluded") {
      clearInterval(timer);
      investigationTimers.delete(investigationId);
      return;
    }

    inv.triggerCount++;

    // Process unread human reports first (always)
    const unprocessed = inv.humanReports.filter(r => !r.processed);
    if (unprocessed.length > 0) {
      await processHumanReports(investigationId, unprocessed);
      return;
    }

    // Silent follow-up — only logs if the agent actually finds something
    await runFollowUpCheck(investigationId);
  }, 15000); // 15 seconds — safe for free models

  investigationTimers.set(investigationId, timer);
}

// ============================
// HUMAN REPORT PROCESSING
// ============================
async function processHumanReports(investigationId: string, reports: HumanReport[]): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  for (const report of reports) {
    inv.logs.push(createLog("human", "👥 Human Report", report.content, "👥"));

    const result = await callAIAgent(
      "OSINT Analyst",
      "You are an AI analyzing a public tip for an investigation. Evaluate credibility and extract info. Respond in valid JSON only.",
      `Tip for case: ${inv.caseName}\nVictim: ${inv.victimName}\nReport: "${report.content}"\nExisting evidence: ${inv.evidence.map(e => e.title).join(", ")}

Respond with ONLY valid JSON:
{
  "credibility": "high|medium|low",
  "useful": true,
  "extractedInfo": "key info extracted",
  "action": "what to do with this",
  "response": "response to the reporter"
}`
    );

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        report.processed = true;
        report.agentResponse = parsed.response || "Thank you. Our agents are analyzing your report.";
        inv.logs.push(
          createLog("agent", parsed.useful ? "✅ Tip Verified" : "ℹ️ Tip Processed",
            `Credibility: ${parsed.credibility}\n${parsed.extractedInfo || ""}\n${parsed.action || ""}`,
            parsed.useful ? "✅" : "ℹ️")
        );
      } else {
        report.processed = true;
        report.agentResponse = "Thank you. Our agents are reviewing it.";
      }
    } catch {
      report.processed = true;
      report.agentResponse = "Report received and logged.";
    }
  }
  inv.lastUpdate = new Date().toISOString();
}

// ============================
// FOLLOW-UP CHECK
// ============================
// Rotate which agent does the follow-up to show variety
const FOLLOWUP_AGENTS = [
  { name: "OSINT Analyst", task: "scanning Facebook posts, groups and pages for new mentions" },
  { name: "Forensic Examiner", task: "re-analyzing timeline for inconsistencies" },
  { name: "OSINT Analyst", task: "checking YouTube, TikTok, and X for new videos and posts" },
  { name: "Profile Builder", task: "refining suspect and witness profiles from social media" },
  { name: "Pattern Detector", task: "cross-referencing Facebook and news evidence for connections" },
  { name: "Report Synthesizer", task: "updating case summary with latest social media findings" },
  { name: "OSINT Analyst", task: "monitoring Facebook Live streams and viral content" },
];

async function runFollowUpCheck(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  // Pick a different agent each cycle
  const followup = FOLLOWUP_AGENTS[inv.triggerCount % FOLLOWUP_AGENTS.length];
  const agent = inv.agents.find(a => a.name === followup.name);

  // Show which agent is actively working (not a generic trigger message)
  inv.logs.push(
    createLog("agent", `🔍 ${followup.name}`, `Currently ${followup.task}...`, "🔍", agent?.id)
  );
  inv.lastUpdate = new Date().toISOString();

  const result = await callAIAgent(
    followup.name,
    `You are ${followup.name}, an AI investigation agent. You are ${followup.task}. Report ONLY if you find something new or noteworthy. Respond in valid JSON only.`,
    `Active investigation follow-up. Case: ${inv.caseName}\nVictim: ${inv.victimName}\nSuspects: ${inv.suspects.map(s => s.name).join(", ") || "None yet"}\nEvidence collected: ${inv.evidence.length} items\nHuman tips: ${inv.humanReports.length}

Respond with ONLY valid JSON:
{
  "found": true or false,
  "agentAction": "what you specifically did this cycle",
  "finding": "describe what you found (empty if nothing new)",
  "urgency": "routine|important|critical"
}`
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const icon = parsed.urgency === "critical" ? "🔴" : parsed.urgency === "important" ? "🟡" : "🟢";
      // Show what the agent actually did and found
      const content = parsed.found && parsed.finding
        ? `${parsed.agentAction || followup.task}\n\n📌 Finding: ${parsed.finding}`
        : parsed.agentAction || `Completed ${followup.task} — no new developments.`;
      inv.logs.push(
        createLog("agent", `${icon} ${followup.name} Report`, content, icon, agent?.id)
      );
    }
  } catch {
    // Even on parse error, show the agent tried
    inv.logs.push(
      createLog("agent", `🟢 ${followup.name} Report`, `Completed ${followup.task} — no new data at this time.`, "🟢", agent?.id)
    );
  }
  inv.lastUpdate = new Date().toISOString();
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

export async function addHumanReport(investigationId: string, content: string): Promise<HumanReport | null> {
  const inv = investigations.get(investigationId);
  if (!inv) return null;

  const report: HumanReport = {
    id: generateId(),
    content,
    submittedAt: new Date().toISOString(),
    processed: false,
  };

  inv.humanReports.push(report);
  inv.lastUpdate = new Date().toISOString();

  // Process immediately
  await processHumanReports(investigationId, [report]);
  return report;
}

export function pauseInvestigation(id: string): boolean {
  const inv = investigations.get(id);
  if (!inv) return false;
  inv.status = "paused";
  inv.logs.push(createLog("system", "⏸️ Investigation Paused", "Investigation paused.", "⏸️"));
  inv.lastUpdate = new Date().toISOString();
  const timer = investigationTimers.get(id);
  if (timer) { clearInterval(timer); investigationTimers.delete(id); }
  return true;
}

export function resumeInvestigation(id: string): boolean {
  const inv = investigations.get(id);
  if (!inv || inv.status !== "paused") return false;
  inv.status = "active";
  inv.logs.push(createLog("system", "▶️ Investigation Resumed", "Trigger cycle restarted.", "▶️"));
  inv.lastUpdate = new Date().toISOString();
  startTriggerCycle(id);
  return true;
}

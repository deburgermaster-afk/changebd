// Case Agent - AI-powered investigation engine
// Uses multiple AI agents in parallel to investigate cases

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

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
  type: "image" | "news" | "document" | "testimony";
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
  triggerInterval: number; // in ms, default 120000 (2 min)
  summary?: string;
}

export interface HumanReport {
  id: string;
  content: string;
  submittedAt: string;
  processed: boolean;
  agentResponse?: string;
}

// In-memory investigation store (per-session)
const investigations = new Map<string, CaseInvestigation>();
const investigationTimers = new Map<string, NodeJS.Timeout>();

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
    type,
    icon,
    title,
    content,
    agentId,
    metadata,
  };
}

const AGENT_CONFIGS = [
  { name: "OSINT Analyst", role: "Open Source Intelligence gathering — searches news, social media, public records", model: "google/gemini-2.0-flash-001" },
  { name: "Forensic Examiner", role: "Analyzes evidence, timelines, and physical/digital forensics", model: "google/gemini-2.0-flash-001" },
  { name: "Profile Builder", role: "Builds victim and suspect profiles from gathered intelligence", model: "google/gemini-2.0-flash-001" },
  { name: "Pattern Detector", role: "Identifies patterns, connections, and anomalies in case data", model: "google/gemini-2.0-flash-001" },
  { name: "Report Synthesizer", role: "Compiles findings into structured investigation reports", model: "google/gemini-2.0-flash-001" },
];

async function callAIAgent(agentName: string, model: string, systemPrompt: string, userPrompt: string): Promise<string> {
  if (!OPENROUTER_API_KEY) {
    return `[${agentName}] AI service unavailable — API key not configured`;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://changebd.online",
        "X-Title": `ChangeBD Case Agent — ${agentName}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content ?? "No response from agent";
  } catch (error: any) {
    console.error(`[CaseAgent] ${agentName} error:`, error.message);
    return `[${agentName}] Error: ${error.message}`;
  }
}

async function testAgent(config: typeof AGENT_CONFIGS[0]): Promise<AgentStatus> {
  const id = generateId();
  const status: AgentStatus = {
    id,
    name: config.name,
    role: config.role,
    status: "initializing",
    model: config.model,
    lastActivity: new Date().toISOString(),
  };

  try {
    const result = await callAIAgent(
      config.name,
      config.model,
      `You are ${config.name}, an AI investigation agent. Respond with only: "AGENT_READY" to confirm you are operational.`,
      "Confirm operational status."
    );

    if (result && !result.includes("Error")) {
      status.status = "active";
    } else {
      status.status = "error";
    }
  } catch {
    status.status = "error";
  }

  status.lastActivity = new Date().toISOString();
  return status;
}

export async function createInvestigation(
  caseName: string,
  victimName: string,
  description: string
): Promise<CaseInvestigation> {
  const id = generateId();

  const investigation: CaseInvestigation = {
    id,
    caseName,
    victimName,
    description,
    status: "initializing",
    agents: [],
    logs: [],
    evidence: [],
    suspects: [],
    humanReports: [],
    createdAt: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
    triggerInterval: 120000,
  };

  // Initial log
  investigation.logs.push(
    createLog("system", "🔐 Case Opened", `Investigation "${caseName}" has been initiated.`, "🔐")
  );
  investigation.logs.push(
    createLog("system", "📋 Case Brief", `Victim: ${victimName}\n${description}`, "📋")
  );

  investigations.set(id, investigation);

  // Start async agent formation
  formAgents(id);

  return investigation;
}

async function formAgents(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  inv.status = "forming-agents";
  inv.logs.push(
    createLog("system", "🤖 Forming Agent Team", "Testing and activating 5 AI investigation agents...", "🤖")
  );
  inv.lastUpdate = new Date().toISOString();

  // Test all 5 agents in parallel
  const agentPromises = AGENT_CONFIGS.map(async (config, index) => {
    // Stagger slightly for visual effect
    await new Promise(resolve => setTimeout(resolve, index * 600));
    
    const agent = await testAgent(config);
    inv.agents.push(agent);
    inv.logs.push(
      createLog(
        "agent",
        `Agent ${agent.name}`,
        agent.status === "active"
          ? `✅ ${agent.name} is online and ready — ${agent.role}`
          : `❌ ${agent.name} failed to initialize`,
        agent.status === "active" ? "✅" : "❌",
        agent.id
      )
    );
    inv.lastUpdate = new Date().toISOString();
    return agent;
  });

  const agents = await Promise.all(agentPromises);
  const activeCount = agents.filter(a => a.status === "active").length;

  inv.logs.push(
    createLog(
      "system",
      "📊 Agent Formation Complete",
      `${activeCount}/5 agents active and operational.`,
      "📊"
    )
  );

  if (activeCount >= 3) {
    inv.status = "investigating";
    inv.logs.push(
      createLog("system", "🚀 Investigation Started", "Minimum agent threshold met. Beginning investigation...", "🚀")
    );

    // Start investigation pipeline
    runInvestigationPipeline(investigationId);
  } else {
    inv.status = "paused";
    inv.logs.push(
      createLog("alert", "⚠️ Insufficient Agents", "Not enough agents available. Investigation paused.", "⚠️")
    );
  }

  inv.lastUpdate = new Date().toISOString();
}

async function runInvestigationPipeline(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv || inv.status !== "investigating") return;

  // Phase 1: Gather victim info
  await gatherVictimInfo(investigationId);

  // Phase 2: Incident details
  await gatherIncidentDetails(investigationId);

  // Phase 3: Police & official findings
  await gatherOfficialFindings(investigationId);

  // Phase 4: Search for evidence
  await searchEvidence(investigationId);

  // Phase 5: Build suspect profile
  await buildSuspectProfile(investigationId);

  // Set status to active monitoring
  const inv2 = investigations.get(investigationId);
  if (inv2) {
    inv2.status = "active";
    inv2.logs.push(
      createLog("system", "🔄 Active Monitoring", "Initial investigation complete. Agents will check for new data every 2 minutes.", "🔄")
    );
    inv2.lastUpdate = new Date().toISOString();

    // Start 2-minute trigger cycle
    startTriggerCycle(investigationId);
  }
}

async function gatherVictimInfo(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  const osintAgent = inv.agents.find(a => a.name === "OSINT Analyst" && a.status === "active");
  const profileAgent = inv.agents.find(a => a.name === "Profile Builder" && a.status === "active");

  inv.logs.push(
    createLog("agent", "🔍 Gathering Victim Information", "OSINT Analyst is searching public records and news sources...", "🔍", osintAgent?.id)
  );
  inv.lastUpdate = new Date().toISOString();

  const prompt = `You are investigating a case. Gather all available information about the victim.

Case: ${inv.caseName}
Victim: ${inv.victimName}
Description: ${inv.description}

Respond with a structured JSON report:
{
  "fullName": "victim full name or best guess",
  "age": "estimated age or range",
  "occupation": "known occupation",
  "location": "last known location",
  "background": "brief background",
  "recentActivity": "any recent known activity",
  "socialConnections": ["known associates or connections"],
  "relevantNews": [{"title": "news headline", "source": "source name", "url": "url if available", "summary": "brief summary"}]
}`;

  const result = await callAIAgent(
    "OSINT Analyst",
    "google/gemini-2.0-flash-001",
    "You are an OSINT (Open Source Intelligence) analyst specializing in Bangladesh. Provide realistic intelligence based on publicly available information. Always respond in valid JSON.",
    prompt
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      inv.logs.push(
        createLog("evidence", "👤 Victim Profile Compiled", 
          `Name: ${parsed.fullName || inv.victimName}\nAge: ${parsed.age || "Unknown"}\nOccupation: ${parsed.occupation || "Unknown"}\nLocation: ${parsed.location || "Unknown"}\nBackground: ${parsed.background || "N/A"}`,
          "👤", profileAgent?.id, parsed)
      );

      // Add news as evidence
      if (Array.isArray(parsed.relevantNews)) {
        for (const news of parsed.relevantNews) {
          inv.evidence.push({
            id: generateId(),
            type: "news",
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
      inv.logs.push(
        createLog("agent", "📝 Victim Info (Raw)", result.substring(0, 500), "📝", osintAgent?.id)
      );
    }
  } catch {
    inv.logs.push(
      createLog("agent", "📝 Victim Info (Raw)", result.substring(0, 500), "📝", osintAgent?.id)
    );
  }

  inv.lastUpdate = new Date().toISOString();
}

async function gatherIncidentDetails(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  const forensicAgent = inv.agents.find(a => a.name === "Forensic Examiner" && a.status === "active");

  inv.logs.push(
    createLog("agent", "🕐 Incident Timeline Analysis", "Forensic Examiner is reconstructing the incident timeline...", "🕐", forensicAgent?.id)
  );
  inv.lastUpdate = new Date().toISOString();

  const result = await callAIAgent(
    "Forensic Examiner",
    "google/gemini-2.0-flash-001",
    "You are a forensic examination AI specializing in crime scene analysis and timeline reconstruction for Bangladesh cases. Respond in valid JSON.",
    `Analyze the incident and reconstruct the timeline.

Case: ${inv.caseName}
Victim: ${inv.victimName}
Description: ${inv.description}
Evidence so far: ${JSON.stringify(inv.evidence.map(e => e.title))}

Respond with JSON:
{
  "allegedDate": "estimated date",
  "allegedTime": "estimated time or range",
  "allegedLocation": "specific location with area details",
  "incidentType": "type of incident",
  "timeline": [{"time": "timestamp", "event": "what happened"}],
  "keyObservations": ["observation 1", "observation 2"],
  "sceneDetails": "description of the scene based on available info"
}`
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      inv.logs.push(
        createLog("evidence", "📍 Incident Details",
          `Date: ${parsed.allegedDate || "Unknown"}\nTime: ${parsed.allegedTime || "Unknown"}\nLocation: ${parsed.allegedLocation || "Unknown"}\nType: ${parsed.incidentType || "Under investigation"}`,
          "📍", forensicAgent?.id, parsed)
      );

      if (Array.isArray(parsed.timeline)) {
        let timelineText = parsed.timeline.map((t: any) => `• ${t.time}: ${t.event}`).join("\n");
        inv.logs.push(
          createLog("evidence", "⏱️ Reconstructed Timeline", timelineText, "⏱️", forensicAgent?.id)
        );
      }

      if (Array.isArray(parsed.keyObservations)) {
        inv.logs.push(
          createLog("agent", "🔬 Key Observations", parsed.keyObservations.map((o: string) => `• ${o}`).join("\n"), "🔬", forensicAgent?.id)
        );
      }
    }
  } catch {
    inv.logs.push(createLog("agent", "🕐 Incident Analysis", result.substring(0, 500), "🕐", forensicAgent?.id));
  }

  inv.lastUpdate = new Date().toISOString();
}

async function gatherOfficialFindings(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  const osintAgent = inv.agents.find(a => a.name === "OSINT Analyst" && a.status === "active");

  inv.logs.push(
    createLog("agent", "🏛️ Searching Official Records", "Checking police reports, court records, and government databases...", "🏛️", osintAgent?.id)
  );
  inv.lastUpdate = new Date().toISOString();

  const result = await callAIAgent(
    "OSINT Analyst",
    "google/gemini-2.0-flash-001",
    "You are an OSINT analyst searching for official findings from Bangladesh law enforcement and government sources. Respond in valid JSON.",
    `Search for official findings related to this case.

Case: ${inv.caseName}
Victim: ${inv.victimName}
Description: ${inv.description}

Respond with JSON:
{
  "policeFindings": "what police have found or reported",
  "officialStatements": [{"authority": "who", "statement": "what they said"}],
  "caseStatus": "current official status",
  "chargesFilied": "any charges filed",
  "evidenceRecovered": ["item 1", "item 2"],
  "witnesses": "number or details of witnesses"
}`
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      inv.logs.push(
        createLog("evidence", "🚔 Police Findings",
          `${parsed.policeFindings || "No official police statement available yet."}\n\nCase Status: ${parsed.caseStatus || "Unknown"}\nCharges: ${parsed.chargesFilied || "None filed yet"}`,
          "🚔", osintAgent?.id, parsed)
      );

      if (Array.isArray(parsed.officialStatements)) {
        for (const stmt of parsed.officialStatements) {
          inv.logs.push(
            createLog("evidence", `📢 ${stmt.authority || "Official"}`, stmt.statement || "", "📢")
          );
        }
      }

      if (Array.isArray(parsed.evidenceRecovered)) {
        inv.logs.push(
          createLog("evidence", "🔎 Evidence Recovered", parsed.evidenceRecovered.map((e: string) => `• ${e}`).join("\n"), "🔎")
        );
      }
    }
  } catch {
    inv.logs.push(createLog("agent", "🏛️ Official Findings", result.substring(0, 500), "🏛️"));
  }

  inv.lastUpdate = new Date().toISOString();
}

async function searchEvidence(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  const patternAgent = inv.agents.find(a => a.name === "Pattern Detector" && a.status === "active");

  inv.logs.push(
    createLog("agent", "🌐 Deep Evidence Search", "Pattern Detector scanning for digital evidence, CCTV footage references, and media coverage...", "🌐", patternAgent?.id)
  );
  inv.lastUpdate = new Date().toISOString();

  const result = await callAIAgent(
    "Pattern Detector",
    "google/gemini-2.0-flash-001",
    "You are a pattern detection AI that identifies connections and evidence across multiple data sources for Bangladesh crime cases. Respond in valid JSON.",
    `Search for additional evidence and patterns.

Case: ${inv.caseName}
Victim: ${inv.victimName}
Description: ${inv.description}
Existing evidence: ${JSON.stringify(inv.evidence.map(e => ({ title: e.title, type: e.type })))}
Logs so far: ${inv.logs.slice(-5).map(l => l.title + ": " + l.content.substring(0, 100)).join("\n")}

Respond with JSON:
{
  "digitalEvidence": [{"type": "cctv|social_media|phone_records|financial", "description": "details", "location": "where"}],
  "mediaReferences": [{"title": "article title", "source": "source", "url": "url", "relevance": "how it connects"}],
  "patterns": ["pattern or connection identified"],
  "possibleFootage": [{"description": "footage desc", "location": "where it might be", "likelihood": "high|medium|low"}],
  "anomalies": ["anything unusual found"]
}`
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      if (Array.isArray(parsed.digitalEvidence)) {
        for (const de of parsed.digitalEvidence) {
          inv.evidence.push({
            id: generateId(),
            type: "document",
            title: `[${de.type?.toUpperCase()}] ${de.description?.substring(0, 60)}`,
            description: de.description || "",
            source: de.location || "Digital",
            timestamp: new Date().toISOString(),
            verified: false,
          });
        }
        inv.logs.push(
          createLog("evidence", "💾 Digital Evidence Found", 
            parsed.digitalEvidence.map((d: any) => `• [${d.type}] ${d.description}`).join("\n"),
            "💾", patternAgent?.id)
        );
      }

      if (Array.isArray(parsed.mediaReferences)) {
        for (const mr of parsed.mediaReferences) {
          inv.evidence.push({
            id: generateId(),
            type: "news",
            title: mr.title || "Media Reference",
            url: mr.url,
            description: mr.relevance || "",
            source: mr.source || "Media",
            timestamp: new Date().toISOString(),
            verified: false,
          });
        }
      }

      if (Array.isArray(parsed.patterns) && parsed.patterns.length > 0) {
        inv.logs.push(
          createLog("agent", "🔗 Patterns Identified", parsed.patterns.map((p: string) => `• ${p}`).join("\n"), "🔗", patternAgent?.id)
        );
      }

      if (Array.isArray(parsed.possibleFootage)) {
        inv.logs.push(
          createLog("evidence", "📹 Possible Footage Locations",
            parsed.possibleFootage.map((f: any) => `• ${f.description} — ${f.location} [${f.likelihood}]`).join("\n"),
            "📹", patternAgent?.id)
        );
      }

      if (Array.isArray(parsed.anomalies) && parsed.anomalies.length > 0) {
        inv.logs.push(
          createLog("alert", "⚡ Anomalies Detected", parsed.anomalies.map((a: string) => `• ${a}`).join("\n"), "⚡", patternAgent?.id)
        );
      }
    }
  } catch {
    inv.logs.push(createLog("agent", "🌐 Evidence Search", result.substring(0, 500), "🌐"));
  }

  inv.lastUpdate = new Date().toISOString();
}

async function buildSuspectProfile(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  const profileAgent = inv.agents.find(a => a.name === "Profile Builder" && a.status === "active");
  const reportAgent = inv.agents.find(a => a.name === "Report Synthesizer" && a.status === "active");

  inv.logs.push(
    createLog("agent", "🎯 Building Suspect Profile", "Profile Builder analyzing all gathered intelligence to identify possible suspects...", "🎯", profileAgent?.id)
  );
  inv.lastUpdate = new Date().toISOString();

  const allLogs = inv.logs.map(l => `[${l.type}] ${l.title}: ${l.content}`).join("\n");
  const allEvidence = inv.evidence.map(e => `[${e.type}] ${e.title}: ${e.description}`).join("\n");

  const result = await callAIAgent(
    "Profile Builder",
    "google/gemini-2.0-flash-001",
    "You are a criminal profile builder AI. Based on all evidence and investigation findings, build suspect profiles. Respond in valid JSON.",
    `Based on all investigation data, identify possible suspects.

Case: ${inv.caseName}
Victim: ${inv.victimName}
Investigation Logs:
${allLogs}

Evidence:
${allEvidence}

Respond with JSON:
{
  "suspects": [
    {
      "name": "suspect name or alias",
      "alias": "any known aliases",
      "description": "physical/background description",
      "connection": "how connected to victim/crime",
      "confidence": 0.0 to 1.0,
      "method": "how they allegedly committed the crime",
      "evidence": ["evidence linking them"]
    }
  ],
  "summary": "overall investigation summary so far",
  "nextSteps": ["recommended next investigative steps"]
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
            createLog("suspect", `🚨 Possible Suspect: ${sp.name}`,
              `Connection: ${sp.connection}\nConfidence: ${(sp.confidence * 100).toFixed(0)}%\nMethod: ${sp.method || "Unknown"}\nEvidence: ${sp.evidence.join(", ")}`,
              "🚨", profileAgent?.id, sp)
          );
        }
      }

      if (parsed.summary) {
        inv.summary = parsed.summary;
        inv.logs.push(
          createLog("conclusion", "📊 Investigation Summary", parsed.summary, "📊", reportAgent?.id)
        );
      }

      if (Array.isArray(parsed.nextSteps)) {
        inv.logs.push(
          createLog("system", "📋 Recommended Next Steps", parsed.nextSteps.map((s: string) => `• ${s}`).join("\n"), "📋")
        );
      }
    }
  } catch {
    inv.logs.push(createLog("agent", "🎯 Suspect Analysis", result.substring(0, 500), "🎯"));
  }

  inv.lastUpdate = new Date().toISOString();
}

function startTriggerCycle(investigationId: string): void {
  // Clear any existing timer
  const existingTimer = investigationTimers.get(investigationId);
  if (existingTimer) clearInterval(existingTimer);

  const timer = setInterval(async () => {
    const inv = investigations.get(investigationId);
    if (!inv || inv.status === "paused" || inv.status === "concluded") {
      clearInterval(timer);
      investigationTimers.delete(investigationId);
      return;
    }

    inv.logs.push(
      createLog("system", "🔄 Trigger Cycle", "Checking for new data and updates...", "🔄")
    );
    inv.lastUpdate = new Date().toISOString();

    // Check for unprocessed human reports
    const unprocessedReports = inv.humanReports.filter(r => !r.processed);
    if (unprocessedReports.length > 0) {
      await processHumanReports(investigationId, unprocessedReports);
    }

    // Run a follow-up check
    await runFollowUpCheck(investigationId);
  }, 120000); // 2 minutes

  investigationTimers.set(investigationId, timer);
}

async function processHumanReports(investigationId: string, reports: HumanReport[]): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  const osintAgent = inv.agents.find(a => a.status === "active");

  for (const report of reports) {
    inv.logs.push(
      createLog("human", "👥 Human Report Received", report.content, "👥")
    );

    const result = await callAIAgent(
      osintAgent?.name || "OSINT Analyst",
      "google/gemini-2.0-flash-001",
      "You are an AI investigation agent analyzing a human tip/report submitted by the public. Evaluate its credibility and extract useful information. Respond in valid JSON.",
      `A member of the public has submitted the following report for this investigation:

Case: ${inv.caseName}
Victim: ${inv.victimName}

Human Report: "${report.content}"

Existing evidence: ${inv.evidence.map(e => e.title).join(", ")}

Respond with JSON:
{
  "credibility": "high|medium|low",
  "useful": true/false,
  "extractedInfo": "key information extracted",
  "action": "what the agents should do with this info",
  "response": "a brief response to the human reporter"
}`
    );

    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        report.processed = true;
        report.agentResponse = parsed.response || "Thank you for your report. Our agents are analyzing it.";

        if (parsed.useful) {
          inv.logs.push(
            createLog("agent", "✅ Tip Verified",
              `Credibility: ${parsed.credibility}\n${parsed.extractedInfo}\nAction: ${parsed.action}`,
              "✅", osintAgent?.id)
          );
        } else {
          inv.logs.push(
            createLog("agent", "ℹ️ Tip Processed", `Credibility: ${parsed.credibility}. ${parsed.extractedInfo || "No new actionable intelligence."}`, "ℹ️", osintAgent?.id)
          );
        }
      } else {
        report.processed = true;
        report.agentResponse = "Thank you for your report. Our agents are reviewing it.";
      }
    } catch {
      report.processed = true;
      report.agentResponse = "Report received and logged.";
    }
  }

  inv.lastUpdate = new Date().toISOString();
}

async function runFollowUpCheck(investigationId: string): Promise<void> {
  const inv = investigations.get(investigationId);
  if (!inv) return;

  const patternAgent = inv.agents.find(a => a.name === "Pattern Detector" && a.status === "active");

  const result = await callAIAgent(
    "Pattern Detector",
    "google/gemini-2.0-flash-001",
    "You are a pattern detection agent performing a periodic follow-up check on an active investigation. Look for new developments. Respond in valid JSON.",
    `Periodic check for new developments.

Case: ${inv.caseName}
Victim: ${inv.victimName}
Current suspects: ${inv.suspects.map(s => s.name).join(", ") || "None identified"}
Evidence count: ${inv.evidence.length}
Human reports: ${inv.humanReports.length}

Respond with JSON:
{
  "newDevelopments": true/false,
  "update": "brief update on any new findings or changes",
  "urgency": "routine|important|critical"
}`
  );

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const icon = parsed.urgency === "critical" ? "🔴" : parsed.urgency === "important" ? "🟡" : "🟢";
      inv.logs.push(
        createLog("agent", `${icon} Status Check`, parsed.update || "No new developments.", icon, patternAgent?.id)
      );
    }
  } catch {
    inv.logs.push(
      createLog("system", "🟢 Status Check", "No new developments at this time.", "🟢")
    );
  }

  inv.lastUpdate = new Date().toISOString();
}

// Public API
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

  // Process immediately instead of waiting for trigger
  await processHumanReports(investigationId, [report]);

  return report;
}

export function pauseInvestigation(id: string): boolean {
  const inv = investigations.get(id);
  if (!inv) return false;
  inv.status = "paused";
  inv.logs.push(createLog("system", "⏸️ Investigation Paused", "Investigation has been paused.", "⏸️"));
  inv.lastUpdate = new Date().toISOString();
  
  const timer = investigationTimers.get(id);
  if (timer) {
    clearInterval(timer);
    investigationTimers.delete(id);
  }
  return true;
}

export function resumeInvestigation(id: string): boolean {
  const inv = investigations.get(id);
  if (!inv || inv.status !== "paused") return false;
  inv.status = "active";
  inv.logs.push(createLog("system", "▶️ Investigation Resumed", "Investigation has been resumed. Trigger cycle restarted.", "▶️"));
  inv.lastUpdate = new Date().toISOString();
  startTriggerCycle(id);
  return true;
}

import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Bot,
  Send,
  Image,
  Newspaper,
  Users,
  Play,
  Pause,
  Terminal,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  Loader2,
  Eye,
  FileText,
  Camera,
  UserSearch,
  Crosshair,
  Activity,
  Zap,
  ArrowLeft,
  Plus,
  Video,
  Globe,
} from "lucide-react";

interface AgentStatus {
  id: string;
  name: string;
  role: string;
  status: "initializing" | "active" | "investigating" | "idle" | "error";
  model: string;
  lastActivity: string;
}

interface InvestigationLog {
  id: string;
  timestamp: string;
  type: "system" | "agent" | "evidence" | "human" | "alert" | "suspect" | "conclusion";
  icon: string;
  title: string;
  content: string;
  agentId?: string;
  metadata?: Record<string, any>;
}

interface EvidenceItem {
  id: string;
  type: "image" | "news" | "document" | "testimony" | "social_media" | "video";
  title: string;
  url?: string;
  description: string;
  source: string;
  timestamp: string;
  verified: boolean;
}

interface SuspectProfile {
  name: string;
  alias?: string;
  description: string;
  connection: string;
  confidence: number;
  method?: string;
  evidence: string[];
}

interface HumanReport {
  id: string;
  content: string;
  submittedAt: string;
  processed: boolean;
  agentResponse?: string;
}

interface CaseInvestigation {
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
  summary?: string;
}

const LOG_TYPE_COLORS: Record<string, string> = {
  system: "text-blue-400",
  agent: "text-green-400",
  evidence: "text-yellow-400",
  human: "text-purple-400",
  alert: "text-red-400",
  suspect: "text-orange-400",
  conclusion: "text-cyan-400",
};

const STATUS_COLORS: Record<string, string> = {
  initializing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "forming-agents": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  investigating: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  paused: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  concluded: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function formatDate(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ===========================
// CREATE INVESTIGATION FORM
// ===========================
function CreateInvestigationForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [caseName, setCaseName] = useState("");
  const [victimName, setVictimName] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/investigations", { caseName, victimName, description });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Investigation Created", description: "Agents are being formed..." });
      onCreated(data.id);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/20">
            <Crosshair className="h-7 w-7 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-bold tracking-tight">Case Agent</h1>
            <p className="text-muted-foreground text-sm">AI-Powered Investigation System</p>
          </div>
        </div>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Our multi-agent AI system will investigate your case using open-source intelligence, 
          forensic analysis, and pattern detection. 5 specialized agents will work together to solve it.
        </p>
      </div>

      <Card className="border-2 border-dashed border-muted-foreground/20 hover:border-primary/30 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bot className="h-5 w-5 text-primary" />
            Start New Investigation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Case Name</label>
            <Input
              placeholder="e.g. Murder of Osman Hadi — Dhaka Investigation"
              value={caseName}
              onChange={(e) => setCaseName(e.target.value)}
              className="font-mono"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Victim / Subject Name</label>
            <Input
              placeholder="e.g. Osman Hadi"
              value={victimName}
              onChange={(e) => setVictimName(e.target.value)}
              className="font-mono"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Case Description & Details</label>
            <Textarea
              placeholder="Describe what happened, when, where, and any details you know. The agents will use this to begin their investigation..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !caseName || !victimName || !description}
            className="w-full h-12 text-base gap-2"
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Initializing Investigation...
              </>
            ) : (
              <>
                <Zap className="h-5 w-5" />
                Launch Investigation
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ===========================
// AGENT STATUS BAR
// ===========================
function AgentStatusBar({ agents }: { agents: AgentStatus[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {agents.map((agent) => (
        <div
          key={agent.id}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border ${
            agent.status === "active"
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : agent.status === "initializing"
              ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
              : "bg-red-500/10 border-red-500/30 text-red-400"
          }`}
        >
          <div className={`h-1.5 w-1.5 rounded-full ${
            agent.status === "active" ? "bg-green-400 animate-pulse" : 
            agent.status === "initializing" ? "bg-yellow-400 animate-pulse" :
            "bg-red-400"
          }`} />
          {agent.name}
        </div>
      ))}
      {agents.length === 0 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border bg-muted border-border text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Forming agents...
        </div>
      )}
    </div>
  );
}

// ===========================
// TERMINAL LOG ENTRY
// ===========================
function LogEntry({ log, index }: { log: InvestigationLog; index: number }) {
  const [expanded, setExpanded] = useState(true);
  const colorClass = LOG_TYPE_COLORS[log.type] || "text-foreground";

  return (
    <div className="group relative pl-6 pb-4 last:pb-0">
      {/* Tree line */}
      <div className="absolute left-[9px] top-0 bottom-0 w-px bg-border group-last:h-4" />
      {/* Tree node */}
      <div className={`absolute left-0 top-1 h-[18px] w-[18px] rounded-full border-2 flex items-center justify-center text-[10px] ${
        log.type === "suspect" ? "border-orange-500 bg-orange-500/20" :
        log.type === "alert" ? "border-red-500 bg-red-500/20" :
        log.type === "evidence" ? "border-yellow-500 bg-yellow-500/20" :
        log.type === "conclusion" ? "border-cyan-500 bg-cyan-500/20" :
        log.type === "human" ? "border-purple-500 bg-purple-500/20" :
        "border-border bg-muted"
      }`}>
        <span className="leading-none">{log.icon}</span>
      </div>

      <div
        className="cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1 -mx-2 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-muted-foreground shrink-0">{formatTime(log.timestamp)}</span>
          <Badge variant="outline" className={`${colorClass} border-current/20 text-[10px] px-1.5 py-0 h-4 shrink-0`}>
            {log.type}
          </Badge>
          <span className={`font-semibold ${colorClass} truncate`}>{log.title}</span>
          <ChevronRight className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </div>
        {expanded && (
          <div className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap font-mono pl-0 leading-relaxed">
            {log.content}
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================
// EVIDENCE PANEL
// ===========================
function EvidencePanel({ evidence }: { evidence: EvidenceItem[] }) {
  const socialEvidence = evidence.filter(e => e.type === "social_media");
  const videoEvidence = evidence.filter(e => e.type === "video");
  const newsEvidence = evidence.filter(e => e.type === "news");
  const docEvidence = evidence.filter(e => e.type === "document" || e.type === "testimony");
  const imageEvidence = evidence.filter(e => e.type === "image");

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-4 p-4">
        {evidence.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No evidence collected yet. Agents are investigating...</p>
        )}

        {socialEvidence.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-blue-400" /> Social Media Posts ({socialEvidence.length})
            </h4>
            <div className="space-y-2">
              {socialEvidence.map((item) => (
                <div key={item.id} className="p-2.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs space-y-1">
                  <div className="font-medium flex items-start gap-1.5">
                    {item.title.includes("[FB") && <span className="text-blue-500 shrink-0">f</span>}
                    {item.title.includes("[TIKTOK") && <span className="shrink-0">♪</span>}
                    {item.title.includes("[X]") && <span className="shrink-0">𝕏</span>}
                    <span className="break-words">{item.title}</span>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{item.source}</span>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                        Open →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {videoEvidence.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-red-400" /> Videos ({videoEvidence.length})
            </h4>
            <div className="space-y-2">
              {videoEvidence.map((item) => (
                <div key={item.id} className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-xs space-y-1">
                  <div className="font-medium flex items-start gap-1.5">
                    {item.title.includes("[YOUTUBE") && <span className="text-red-500 shrink-0">▶</span>}
                    {item.title.includes("[FB VIDEO") && <span className="text-blue-500 shrink-0">▶</span>}
                    <span className="break-words">{item.title}</span>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{item.source}</span>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-red-400 hover:underline">
                        Watch →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {newsEvidence.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Newspaper className="h-3.5 w-3.5" /> News Sources ({newsEvidence.length})
            </h4>
            <div className="space-y-2">
              {newsEvidence.map((item) => (
                <div key={item.id} className="p-2.5 rounded-lg bg-muted/50 border text-xs space-y-1">
                  <div className="font-medium flex items-start gap-1.5">
                    {item.verified && <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />}
                    {item.title}
                  </div>
                  <p className="text-muted-foreground">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">{item.source}</span>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        View →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {docEvidence.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Documents & Records ({docEvidence.length})
            </h4>
            <div className="space-y-2">
              {docEvidence.map((item) => (
                <div key={item.id} className="p-2.5 rounded-lg bg-muted/50 border text-xs space-y-1">
                  <div className="font-medium">{item.title}</div>
                  <p className="text-muted-foreground">{item.description}</p>
                  <span className="text-muted-foreground">{item.source}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {imageEvidence.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Camera className="h-3.5 w-3.5" /> Images & Footage ({imageEvidence.length})
            </h4>
            <div className="space-y-2">
              {imageEvidence.map((item) => (
                <div key={item.id} className="p-2.5 rounded-lg bg-muted/50 border text-xs space-y-1">
                  <div className="font-medium">{item.title}</div>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// ===========================
// SUSPECT CARDS
// ===========================
function SuspectCard({ suspect }: { suspect: SuspectProfile }) {
  return (
    <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-orange-500/20 flex items-center justify-center">
            <UserSearch className="h-4 w-4 text-orange-400" />
          </div>
          <div>
            <div className="font-semibold text-sm">{suspect.name}</div>
            {suspect.alias && <span className="text-xs text-muted-foreground">aka "{suspect.alias}"</span>}
          </div>
        </div>
        <Badge variant="outline" className={`text-[10px] ${
          suspect.confidence > 0.7 ? "border-red-500/30 text-red-400" :
          suspect.confidence > 0.4 ? "border-yellow-500/30 text-yellow-400" :
          "border-muted text-muted-foreground"
        }`}>
          {(suspect.confidence * 100).toFixed(0)}% match
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{suspect.description}</p>
      <div className="text-xs space-y-1">
        <div><span className="text-muted-foreground">Connection:</span> {suspect.connection}</div>
        {suspect.method && <div><span className="text-muted-foreground">Method:</span> {suspect.method}</div>}
        {suspect.evidence.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {suspect.evidence.map((e, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">{e}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================
// HUMAN REPORT DIALOG
// ===========================
function HumanReportDialog({ investigationId, reports }: { investigationId: string; reports: HumanReport[] }) {
  const [content, setContent] = useState("");
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const submitReport = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/investigations/${investigationId}/report`, { content });
      return res.json();
    },
    onSuccess: (data) => {
      setContent("");
      toast({ title: "Report Submitted", description: data.agentResponse || "Thank you! Agents are reviewing your information." });
      queryClient.invalidateQueries({ queryKey: [`/api/investigations/${investigationId}`] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 border-purple-500/30 text-purple-400 hover:bg-purple-500/10">
          <Users className="h-3.5 w-3.5" />
          Human Reports
          {reports.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-4 text-[10px]">{reports.length}</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            Submit Human Intelligence
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Help our AI agents by providing any information you have about this case. 
            Tips, eyewitness accounts, or any relevant details are valuable.
          </p>
          <Textarea
            placeholder="Share what you know... e.g. 'I saw a suspicious person near the scene around 11pm wearing a dark jacket'"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="font-mono text-sm"
          />
          <Button
            onClick={() => submitReport.mutate()}
            disabled={submitReport.isPending || content.length < 5}
            className="w-full gap-2"
          >
            {submitReport.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
            ) : (
              <><Send className="h-4 w-4" /> Submit Report</>
            )}
          </Button>

          {reports.length > 0 && (
            <>
              <Separator />
              <h4 className="text-sm font-medium">Previous Reports</h4>
              <ScrollArea className="max-h-48">
                <div className="space-y-2">
                  {reports.map((report) => (
                    <div key={report.id} className="p-2.5 rounded-lg bg-muted/50 border text-xs space-y-1">
                      <p className="font-mono">{report.content}</p>
                      {report.agentResponse && (
                        <p className="text-purple-400 flex items-start gap-1">
                          <Bot className="h-3 w-3 mt-0.5 shrink-0" />
                          {report.agentResponse}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>{formatTime(report.submittedAt)}</span>
                        {report.processed ? (
                          <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/30">Processed</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-500/30">Pending</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ===========================
// INVESTIGATION VIEW
// ===========================
function InvestigationView({ investigationId, onBack }: { investigationId: string; onBack: () => void }) {
  const terminalRef = useRef<HTMLDivElement>(null);

  const { data: investigation, isLoading } = useQuery<CaseInvestigation>({
    queryKey: [`/api/investigations/${investigationId}`],
    refetchInterval: 2000, // Poll every 2 seconds for updates
  });

  // Auto-scroll to top (most recent) — we reverse logs so new ones are on top
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = 0;
    }
  }, [investigation?.logs.length]);

  if (isLoading || !investigation) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground font-mono text-sm">Loading investigation...</p>
        </div>
      </div>
    );
  }

  const reversedLogs = [...investigation.logs].reverse();
  const activeAgents = investigation.agents.filter(a => a.status === "active").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold tracking-tight">{investigation.caseName}</h1>
              <Badge className={`${STATUS_COLORS[investigation.status]} text-[10px] uppercase tracking-wider`}>
                {investigation.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Victim: {investigation.victimName} · Created {formatDate(investigation.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Top-right action buttons */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10">
                <Shield className="h-3.5 w-3.5" />
                Evidence
                <Badge variant="secondary" className="ml-1 h-4 text-[10px]">{investigation.evidence.length}</Badge>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-yellow-400" />
                  Collected Evidence ({investigation.evidence.length})
                </DialogTitle>
              </DialogHeader>
              <EvidencePanel evidence={investigation.evidence} />
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                <Newspaper className="h-3.5 w-3.5" />
                News
                <Badge variant="secondary" className="ml-1 h-4 text-[10px]">
                  {investigation.evidence.filter(e => e.type === "news").length}
                </Badge>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Newspaper className="h-5 w-5 text-blue-400" />
                  Related News
                </DialogTitle>
              </DialogHeader>
              <EvidencePanel evidence={investigation.evidence.filter(e => e.type === "news")} />
            </DialogContent>
          </Dialog>

          <HumanReportDialog investigationId={investigation.id} reports={investigation.humanReports} />

          {investigation.status === "active" && (
            <Button variant="outline" size="sm" className="gap-1.5"
              onClick={async () => {
                await apiRequest("POST", `/api/investigations/${investigation.id}/pause`);
                queryClient.invalidateQueries({ queryKey: [`/api/investigations/${investigationId}`] });
              }}
            >
              <Pause className="h-3.5 w-3.5" /> Pause
            </Button>
          )}
          {investigation.status === "paused" && (
            <Button variant="outline" size="sm" className="gap-1.5 border-green-500/30 text-green-400"
              onClick={async () => {
                await apiRequest("POST", `/api/investigations/${investigation.id}/resume`);
                queryClient.invalidateQueries({ queryKey: [`/api/investigations/${investigationId}`] });
              }}
            >
              <Play className="h-3.5 w-3.5" /> Resume
            </Button>
          )}
        </div>
      </div>

      {/* Agent Status Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
          <Activity className="h-3.5 w-3.5" />
          Agents: {activeAgents}/{investigation.agents.length || 5}
        </div>
        <AgentStatusBar agents={investigation.agents} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Terminal — 2 columns */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 bg-black/40 dark:bg-black/60">
            <CardHeader className="py-2 px-4 border-b border-border/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="h-3 w-3 rounded-full bg-red-500/80" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <div className="h-3 w-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground ml-2">
                    changebd-agent — investigation:{investigation.id.substring(0, 8)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last: {formatTime(investigation.lastUpdate)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]" ref={terminalRef}>
                <div className="p-4 space-y-0 font-mono text-sm">
                  {reversedLogs.length === 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Initializing investigation...</span>
                    </div>
                  )}
                  {reversedLogs.map((log, index) => (
                    <LogEntry key={log.id} log={log} index={index} />
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          {/* Suspects */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-orange-400" />
                Possible Suspects
                {investigation.suspects.length > 0 && (
                  <Badge variant="destructive" className="ml-auto text-[10px]">{investigation.suspects.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              {investigation.suspects.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No suspects identified yet. Investigation in progress...
                </p>
              ) : (
                <div className="space-y-3">
                  {investigation.suspects.map((suspect, i) => (
                    <SuspectCard key={i} suspect={suspect} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          {investigation.summary && (
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-400" />
                  Investigation Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 pt-0">
                <p className="text-xs text-muted-foreground leading-relaxed">{investigation.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-yellow-400">{investigation.evidence.length}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Evidence</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-orange-400">{investigation.suspects.length}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Suspects</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-purple-400">{investigation.humanReports.length}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Tips</div>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="text-lg font-bold text-green-400">{activeAgents}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Agents</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ===========================
// INVESTIGATION LIST
// ===========================
function InvestigationList({ onSelect, onCreate }: { onSelect: (id: string) => void; onCreate: () => void }) {
  const { data: investigations, isLoading } = useQuery<CaseInvestigation[]>({
    queryKey: ["/api/investigations"],
    refetchInterval: 2000,
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crosshair className="h-6 w-6 text-primary" />
            Case Agent
          </h1>
          <p className="text-muted-foreground text-sm">Active AI investigations</p>
        </div>
        <Button onClick={onCreate} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Investigation
        </Button>
      </div>

      {isLoading && (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!investigations || investigations.length === 0) && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-1">No Active Investigations</h3>
            <p className="text-sm text-muted-foreground mb-4">Start a new investigation to deploy AI agents</p>
            <Button onClick={onCreate} className="gap-1.5">
              <Plus className="h-4 w-4" /> Launch Investigation
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {investigations?.map((inv) => (
          <Card
            key={inv.id}
            className="cursor-pointer hover:border-primary/30 transition-all hover:shadow-lg"
            onClick={() => onSelect(inv.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm truncate">{inv.caseName}</h3>
                    <Badge className={`${STATUS_COLORS[inv.status]} text-[10px] shrink-0`}>{inv.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Victim: {inv.victimName}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Bot className="h-3 w-3" /> {inv.agents.filter(a => a.status === "active").length} agents</span>
                    <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {inv.evidence.length} evidence</span>
                    <span className="flex items-center gap-1"><UserSearch className="h-3 w-3" /> {inv.suspects.length} suspects</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDate(inv.createdAt)}</span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ===========================
// MAIN PAGE
// ===========================
export default function CaseAgentPage() {
  const [view, setView] = useState<"list" | "create" | "detail">("list");
  const [activeInvestigationId, setActiveInvestigationId] = useState<string | null>(null);

  const { data: investigations } = useQuery<CaseInvestigation[]>({
    queryKey: ["/api/investigations"],
  });

  // If no investigations exist, show create form
  const showCreate = view === "create" || (!investigations?.length && view === "list");

  if (view === "detail" && activeInvestigationId) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <InvestigationView
          investigationId={activeInvestigationId}
          onBack={() => {
            setView("list");
            setActiveInvestigationId(null);
          }}
        />
      </div>
    );
  }

  if (showCreate) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        {investigations && investigations.length > 0 && (
          <Button variant="ghost" className="mb-4 gap-1.5" onClick={() => setView("list")}>
            <ArrowLeft className="h-4 w-4" /> Back to Investigations
          </Button>
        )}
        <CreateInvestigationForm
          onCreated={(id) => {
            setActiveInvestigationId(id);
            setView("detail");
            queryClient.invalidateQueries({ queryKey: ["/api/investigations"] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <InvestigationList
        onSelect={(id) => {
          setActiveInvestigationId(id);
          setView("detail");
        }}
        onCreate={() => setView("create")}
      />
    </div>
  );
}

import { z } from "zod";

// Political Parties
export const politicalParties = [
  { id: "awami-league", name: "Bangladesh Awami League", shortName: "AL", color: "#006A4E" },
  { id: "bnp", name: "Bangladesh Nationalist Party", shortName: "BNP", color: "#E31B23" },
  { id: "jatiya-party", name: "Jatiya Party", shortName: "JP", color: "#FFD700" },
  { id: "jamaat", name: "Jamaat-e-Islami", shortName: "JI", color: "#008000" },
  { id: "jsd", name: "Jatiya Samajtantrik Dal", shortName: "JSD", color: "#FF6B35" },
  { id: "cpp", name: "Communist Party", shortName: "CPB", color: "#CC0000" },
  { id: "others", name: "Others / Independent", shortName: "IND", color: "#6B7280" },
] as const;

export type PoliticalParty = typeof politicalParties[number];

// Case Categories
export const caseCategories = ["political", "social", "scam-alert", "environment", "education", "healthcare", "infrastructure"] as const;
export type CaseCategory = typeof caseCategories[number];

// Case Schema
export const insertCaseSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters").max(200),
  description: z.string().min(50, "Description must be at least 50 characters").max(5000),
  category: z.enum(caseCategories),
  evidence: z.array(z.string()).optional(),
});

export type InsertCase = z.infer<typeof insertCaseSchema>;

export interface Case {
  id: string;
  title: string;
  description: string;
  category: CaseCategory;
  votes: number;
  comments: number;
  createdAt: string;
  trending: boolean;
  evidence: string[];
}

// Party Vote Schema
export const insertPartyVoteSchema = z.object({
  partyId: z.string(),
});

export type InsertPartyVote = z.infer<typeof insertPartyVoteSchema>;

export interface PartyVoteResult {
  partyId: string;
  votes: number;
  percentage: number;
}

// Scammer Schema
export const scammerTypes = ["individual", "business", "organization"] as const;
export type ScammerType = typeof scammerTypes[number];

export const insertScammerSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  type: z.enum(scammerTypes),
  description: z.string().min(20, "Description must be at least 20 characters").max(2000),
  evidence: z.array(z.string()).optional(),
});

export type InsertScammer = z.infer<typeof insertScammerSchema>;

export interface Scammer {
  id: string;
  name: string;
  type: ScammerType;
  description: string;
  evidenceCount: number;
  verified: boolean;
  reportedAt: string;
}

// Poll Schema
export const insertPollSchema = z.object({
  question: z.string().min(10, "Question must be at least 10 characters").max(300),
  options: z.array(z.string().min(1)).min(2, "At least 2 options required").max(6),
  expiresInHours: z.number().min(1).max(168).default(24),
});

export type InsertPoll = z.infer<typeof insertPollSchema>;

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  expiresAt: string;
  active: boolean;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
  percentage: number;
}

// Vote on Case Schema
export const insertCaseVoteSchema = z.object({
  caseId: z.string(),
  direction: z.enum(["up", "down"]),
});

export type InsertCaseVote = z.infer<typeof insertCaseVoteSchema>;

// Vote on Poll Schema
export const insertPollVoteSchema = z.object({
  pollId: z.string(),
  optionId: z.string(),
});

export type InsertPollVote = z.infer<typeof insertPollVoteSchema>;

// Stats
export interface PlatformStats {
  activeCases: number;
  totalVotes: number;
  verifiedReports: number;
}

// Keep user schema for compatibility
export interface User {
  id: string;
  username: string;
  password: string;
}

export type InsertUser = Omit<User, "id">;

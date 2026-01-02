import { z } from "zod";
import { pgTable, varchar, text, integer, boolean, timestamp, jsonb, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Political Parties - Based on Bangladesh Election Commission data (2024-2025)
// Note: Awami League registration SUSPENDED after July 2024 uprising
export const politicalParties = [
  { 
    id: "awami-league", 
    name: "Bangladesh Awami League", 
    shortName: "AL", 
    color: "#006A4E",
    symbol: "boat",
    nominations: 0,
    status: "banned",
    founded: 1949,
    description: "Registration SUSPENDED by Election Commission"
  },
  { 
    id: "bnp", 
    name: "Bangladesh Nationalist Party", 
    shortName: "BNP", 
    color: "#E31B23",
    symbol: "sheaf",
    nominations: 331,
    status: "active",
    founded: 1978,
    description: "Leading opposition party"
  },
  { 
    id: "jamaat", 
    name: "Jamaat-e-Islami Bangladesh", 
    shortName: "JI", 
    color: "#228B22",
    symbol: "scales",
    nominations: 276,
    status: "active",
    founded: 1941,
    description: "Major Islamic democratic party"
  },
  { 
    id: "jatiya-party", 
    name: "Jatiya Party", 
    shortName: "JP", 
    color: "#FFD700",
    symbol: "plough",
    nominations: 224,
    status: "active",
    founded: 1986,
    description: "Centrist political party"
  },
  { 
    id: "islami-andolon", 
    name: "Islami Andolon Bangladesh", 
    shortName: "IAB", 
    color: "#2E8B57",
    symbol: "crescent",
    nominations: 268,
    status: "active",
    founded: 1987,
    description: "Islamic political movement"
  },
  { 
    id: "gono-odhikar", 
    name: "Gono Odhikar Parishad", 
    shortName: "GOP", 
    color: "#FF6B35",
    symbol: "torch",
    nominations: 104,
    status: "active",
    founded: 2017,
    description: "People's Rights Council"
  },
  { 
    id: "ncp", 
    name: "National Citizen Party", 
    shortName: "NCP", 
    color: "#4169E1",
    symbol: "star",
    nominations: 44,
    status: "active",
    founded: 2025,
    description: "Youth-led reform party (formed Feb 2025)"
  },
  { 
    id: "cpb", 
    name: "Communist Party of Bangladesh", 
    shortName: "CPB", 
    color: "#CC0000",
    symbol: "hammer-sickle",
    nominations: 65,
    status: "active",
    founded: 1948,
    description: "Left-wing socialist party"
  },
  { 
    id: "others", 
    name: "Others / Independent", 
    shortName: "IND", 
    color: "#6B7280",
    symbol: "people",
    nominations: 0,
    status: "active",
    founded: 0,
    description: "Independent candidates and smaller parties"
  },
  { 
    id: "shahid", 
    name: "Shahid (Martyr)", 
    shortName: "Shahid", 
    color: "#FFD700",
    symbol: "star",
    nominations: 0,
    status: "martyr",
    founded: 0,
    description: "In memory of the martyrs of July 2024 uprising"
  },
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

// ========================================
// Admin Panel Types
// ========================================

export type ContentStatus = "pending" | "approved" | "rejected";

export interface PendingCase extends Case {
  status: ContentStatus;
  aiSuggestion?: {
    recommendation: "approve" | "reject";
    confidence: number;
    reason: string;
  };
}

export interface PendingScammer extends Scammer {
  status: ContentStatus;
  aiSuggestion?: {
    recommendation: "approve" | "reject";
    confidence: number;
    reason: string;
  };
}

export interface News {
  id: string;
  title: string;
  content: string;
  source: string;
  sourceUrl: string;
  publishedAt: string;
  trustScore: number;
  verified: boolean;
  likes: number;
  comments: NewsComment[];
  status: ContentStatus;
}

export interface NewsComment {
  id: string;
  content: string;
  createdAt: string;
  sessionId: string;
}

export const insertNewsSchema = z.object({
  title: z.string().min(10).max(300),
  content: z.string().min(50).max(10000),
  source: z.string().min(2).max(100),
  sourceUrl: z.string().url(),
});

export type InsertNews = z.infer<typeof insertNewsSchema>;

export const insertNewsCommentSchema = z.object({
  newsId: z.string(),
  content: z.string().min(1).max(1000),
});

export type InsertNewsComment = z.infer<typeof insertNewsCommentSchema>;

// ========================================
// MP/Constituency Voting (আসন ভিত্তিক ভোট)
// Based on Bangladesh Election Commission 2026 data
// ========================================

export interface Candidate {
  id: string;
  name: string;
  nameBn: string;
  partyId: string;
  photo?: string;
  age?: number;
  profession?: string;
  education?: string;
}

export interface Constituency {
  id: string;
  code: string;
  name: string;
  nameBn: string;
  division: string;
  district: string;
  areas: string[];
  areasBn: string[];
  candidates: Candidate[];
  totalVoters: number;
}

export interface ConstituencyVoteResult {
  constituencyId: string;
  candidateId: string;
  votes: number;
  percentage: number;
}

export const insertConstituencyVoteSchema = z.object({
  constituencyId: z.string(),
  candidateId: z.string(),
});

export type InsertConstituencyVote = z.infer<typeof insertConstituencyVoteSchema>;

// Bangladesh Divisions
export const divisions = [
  { id: "dhaka", name: "Dhaka", nameBn: "ঢাকা" },
  { id: "chittagong", name: "Chittagong", nameBn: "চট্টগ্রাম" },
  { id: "rajshahi", name: "Rajshahi", nameBn: "রাজশাহী" },
  { id: "khulna", name: "Khulna", nameBn: "খুলনা" },
  { id: "sylhet", name: "Sylhet", nameBn: "সিলেট" },
  { id: "barisal", name: "Barisal", nameBn: "বরিশাল" },
  { id: "rangpur", name: "Rangpur", nameBn: "রংপুর" },
  { id: "mymensingh", name: "Mymensingh", nameBn: "ময়মনসিংহ" },
] as const;

// Sample constituencies with real 2026 election data
export const constituencies: Constituency[] = [
  {
    id: "dhaka-1",
    code: "Dhaka-1",
    name: "Dhaka-1",
    nameBn: "ঢাকা-১",
    division: "dhaka",
    district: "Dhaka",
    areas: ["Tejgaon", "Farmgate", "Karwan Bazar", "Hatirjheel"],
    areasBn: ["তেজগাঁও", "ফার্মগেট", "কাওরান বাজার", "হাতিরঝিল"],
    totalVoters: 285000,
    candidates: [
      { id: "d1-bnp", name: "Md. Shahidul Islam", nameBn: "মো. শহিদুল ইসলাম", partyId: "bnp" },
      { id: "d1-jamaat", name: "Abdul Karim", nameBn: "আব্দুল করিম", partyId: "jamaat" },
      { id: "d1-ncp", name: "Rafiqul Islam", nameBn: "রফিকুল ইসলাম", partyId: "ncp" },
      { id: "d1-ind", name: "Kamal Hossain", nameBn: "কামাল হোসাইন", partyId: "others" },
    ]
  },
  {
    id: "dhaka-3",
    code: "Dhaka-3",
    name: "Dhaka-3",
    nameBn: "ঢাকা-৩",
    division: "dhaka",
    district: "Dhaka",
    areas: ["Mohammadpur", "Adabor", "Ring Road", "Shyamoli"],
    areasBn: ["মোহাম্মদপুর", "আদাবর", "রিং রোড", "শ্যামলী"],
    totalVoters: 312000,
    candidates: [
      { id: "d3-bnp", name: "Gayeshwar Chandra Roy", nameBn: "গয়েশ্বর চন্দ্র রায়", partyId: "bnp", profession: "Politician" },
      { id: "d3-jamaat", name: "Maulana Abdur Rashid", nameBn: "মাওলানা আব্দুর রশিদ", partyId: "jamaat" },
      { id: "d3-jp", name: "Shamsul Haque", nameBn: "শামসুল হক", partyId: "jatiya-party" },
    ]
  },
  {
    id: "dhaka-8",
    code: "Dhaka-8",
    name: "Dhaka-8",
    nameBn: "ঢাকা-৮",
    division: "dhaka",
    district: "Dhaka",
    areas: ["Gulshan", "Banani", "Baridhara", "Niketan"],
    areasBn: ["গুলশান", "বনানী", "বারিধারা", "নিকেতন"],
    totalVoters: 267000,
    candidates: [
      { id: "d8-bnp", name: "Mirza Abbas", nameBn: "মির্জা আব্বাস", partyId: "bnp", profession: "Former Minister" },
      { id: "d8-ncp", name: "Farhan Ahmed", nameBn: "ফারহান আহমেদ", partyId: "ncp" },
      { id: "d8-jamaat", name: "Dr. Nurul Islam", nameBn: "ডা. নুরুল ইসলাম", partyId: "jamaat" },
      { id: "d8-ind", name: "Advocate Rahim", nameBn: "এডভোকেট রহিম", partyId: "others" },
      { id: "d8-shahid", name: "Shohid Shorif Usman Hadi", nameBn: "শহীদ শরীফ উসমান হাদী", partyId: "shahid", profession: "Martyr" },
    ]
  },
  {
    id: "dhaka-9",
    code: "Dhaka-9",
    name: "Dhaka-9",
    nameBn: "ঢাকা-৯",
    division: "dhaka",
    district: "Dhaka",
    areas: ["Uttara", "Airport", "Diabari", "Ranavola"],
    areasBn: ["উত্তরা", "এয়ারপোর্ট", "দিয়াবারী", "রনাভোলা"],
    totalVoters: 298000,
    candidates: [
      { id: "d9-tasnim", name: "Dr. Tasnim Jara", nameBn: "ডা. তাসনিম জারা", partyId: "others", profession: "Independent Candidate" },
      { id: "d9-bnp", name: "Habibur Rashid Habib", nameBn: "হাবিবুর রশিদ হাবিব", partyId: "bnp" },
      { id: "d9-jamaat", name: "Kabir Ahmed", nameBn: "কবির আহমেদ", partyId: "jamaat" },
    ]
  },
  {
    id: "dhaka-10",
    code: "Dhaka-10",
    name: "Dhaka-10",
    nameBn: "ঢাকা-১০",
    division: "dhaka",
    district: "Dhaka",
    areas: ["Mirpur-1", "Mirpur-2", "Pallabi", "Kafrul"],
    areasBn: ["মিরপুর-১", "মিরপুর-২", "পল্লবী", "কাফরুল"],
    totalVoters: 342000,
    candidates: [
      { id: "d10-bnp", name: "Sheikh Rabiul Alam", nameBn: "শেখ রাবিউল আলম", partyId: "bnp" },
      { id: "d10-jamaat", name: "Jashim Uddin Sarkar", nameBn: "জসিম উদ্দিন সরকার", partyId: "jamaat", profession: "Supreme Court Lawyer" },
      { id: "d10-ncp", name: "Asif Mahmud", nameBn: "আসিফ মাহমুদ", partyId: "ncp" },
    ]
  },
  {
    id: "dhaka-11",
    code: "Dhaka-11",
    name: "Dhaka-11",
    nameBn: "ঢাকা-১১",
    division: "dhaka",
    district: "Dhaka",
    areas: ["Mirpur-10", "Mirpur-11", "Mirpur-12", "Shah Ali"],
    areasBn: ["মিরপুর-১০", "মিরপুর-১১", "মিরপুর-১২", "শাহ আলী"],
    totalVoters: 356000,
    candidates: [
      { id: "d11-ncp", name: "Nahid Islam", nameBn: "নাহিদ ইসলাম", partyId: "ncp", profession: "NCP Convener" },
      { id: "d11-bnp", name: "MA Qaiyum", nameBn: "এম এ কাইয়ুম", partyId: "bnp" },
      { id: "d11-jamaat", name: "Atikur Rahman", nameBn: "আতিকুর রহমান", partyId: "jamaat" },
    ]
  },
  {
    id: "dhaka-18",
    code: "Dhaka-18",
    name: "Dhaka-18",
    nameBn: "ঢাকা-১৮",
    division: "dhaka",
    district: "Dhaka",
    areas: ["Dhanmondi", "Kalabagan", "Kathalbagan", "Green Road"],
    areasBn: ["ধানমন্ডি", "কলাবাগান", "কাঠালবাগান", "গ্রীন রোড"],
    totalVoters: 278000,
    candidates: [
      { id: "d18-ncp", name: "Nasiruddin Patwary", nameBn: "নাসিরুদ্দিন পাটোয়ারী", partyId: "ncp", profession: "NCP Chief Coordinator" },
      { id: "d18-bnp", name: "SM Jahangir Hossain", nameBn: "এস এম জাহাঙ্গীর হোসাইন", partyId: "bnp" },
      { id: "d18-jamaat", name: "Ashraful Haque", nameBn: "আশরাফুল হক", partyId: "jamaat" },
    ]
  },
  {
    id: "ctg-1",
    code: "Chittagong-1",
    name: "Chittagong-1",
    nameBn: "চট্টগ্রাম-১",
    division: "chittagong",
    district: "Chittagong",
    areas: ["Sadarghat", "Chawkbazar", "Kotwali", "Firingee Bazar"],
    areasBn: ["সদরঘাট", "চকবাজার", "কোতোয়ালি", "ফিরিঙ্গি বাজার"],
    totalVoters: 298000,
    candidates: [
      { id: "ctg1-bnp", name: "M Shahidul Alam", nameBn: "এম শহিদুল আলম", partyId: "bnp" },
      { id: "ctg1-jamaat", name: "Maulana Nurul Haque", nameBn: "মাওলানা নুরুল হক", partyId: "jamaat" },
      { id: "ctg1-jp", name: "Farid Uddin", nameBn: "ফরিদ উদ্দিন", partyId: "jatiya-party" },
    ]
  },
  {
    id: "ctg-10",
    code: "Chittagong-10",
    name: "Chittagong-10",
    nameBn: "চট্টগ্রাম-১০",
    division: "chittagong",
    district: "Chittagong",
    areas: ["Patenga", "Double Mooring", "Halishahar", "Barik Building"],
    areasBn: ["পতেঙ্গা", "ডাবল মুরিং", "হালিশহর", "বাড়িক বিল্ডিং"],
    totalVoters: 287000,
    candidates: [
      { id: "ctg10-bnp", name: "Amir Khasru Mahmud Chowdhury", nameBn: "আমির খসরু মাহমুদ চৌধুরী", partyId: "bnp", profession: "Former Minister" },
      { id: "ctg10-jamaat", name: "Abdul Halim", nameBn: "আব্দুল হালিম", partyId: "jamaat" },
      { id: "ctg10-ncp", name: "Rafiq Ahmed", nameBn: "রফিক আহমেদ", partyId: "ncp" },
    ]
  },
  {
    id: "sylhet-2",
    code: "Sylhet-2",
    name: "Sylhet-2",
    nameBn: "সিলেট-২",
    division: "sylhet",
    district: "Sylhet",
    areas: ["Sylhet Sadar", "Khadim Nagar", "South Surma", "Tilagarh"],
    areasBn: ["সিলেট সদর", "খাদিম নগর", "দক্ষিণ সুরমা", "টিলাগড়"],
    totalVoters: 265000,
    candidates: [
      { id: "syl2-bnp", name: "Tahsina Rushdir Luna", nameBn: "তাহসিনা রুশদির লুনা", partyId: "bnp", profession: "Wife of disappeared MP Ilias Ali" },
      { id: "syl2-jamaat", name: "Maulana Farid Ahmed", nameBn: "মাওলানা ফরিদ আহমেদ", partyId: "jamaat" },
      { id: "syl2-ind", name: "Shamsul Haque Miah", nameBn: "শামসুল হক মিয়া", partyId: "others" },
    ]
  },
  {
    id: "cumilla-4",
    code: "Cumilla-4",
    name: "Cumilla-4",
    nameBn: "কুমিল্লা-৪",
    division: "chittagong",
    district: "Cumilla",
    areas: ["Burichang", "Laksam", "Brahmanpara", "Chandina"],
    areasBn: ["বুড়িচং", "লাকসাম", "ব্রাহ্মণপাড়া", "চান্দিনা"],
    totalVoters: 312000,
    candidates: [
      { id: "cum4-ncp", name: "Hasnat Abdullah", nameBn: "হাসনাত আব্দুল্লাহ", partyId: "ncp", profession: "NCP Chief Organiser (South)" },
      { id: "cum4-bnp", name: "M Hanif Khan", nameBn: "এম হানিফ খান", partyId: "bnp" },
      { id: "cum4-jamaat", name: "Hafez Rashidul Islam", nameBn: "হাফেজ রশিদুল ইসলাম", partyId: "jamaat" },
    ]
  },
  {
    id: "bogura-7",
    code: "Bogura-7",
    name: "Bogura-7",
    nameBn: "বগুড়া-৭",
    division: "rajshahi",
    district: "Bogura",
    areas: ["Gabtali", "Sonatala", "Shibganj", "Bogura Sadar"],
    areasBn: ["গাবতলী", "সোনাতলা", "শিবগঞ্জ", "বগুড়া সদর"],
    totalVoters: 345000,
    candidates: [
      { id: "bog7-bnp", name: "Begum Khaleda Zia", nameBn: "বেগম খালেদা জিয়া", partyId: "bnp", profession: "BNP Chairperson, Former PM" },
      { id: "bog7-jamaat", name: "Maulana Abdul Quddus", nameBn: "মাওলানা আব্দুল কুদ্দুস", partyId: "jamaat" },
      { id: "bog7-jp", name: "Anwar Hossain", nameBn: "আনোয়ার হোসাইন", partyId: "jatiya-party" },
    ]
  },
  {
    id: "panchagarh-1",
    code: "Panchagarh-1",
    name: "Panchagarh-1",
    nameBn: "পঞ্চগড়-১",
    division: "rangpur",
    district: "Panchagarh",
    areas: ["Panchagarh Sadar", "Atwari", "Boda", "Debiganj"],
    areasBn: ["পঞ্চগড় সদর", "আটোয়ারী", "বোদা", "দেবীগঞ্জ"],
    totalVoters: 289000,
    candidates: [
      { id: "pan1-ncp", name: "Sarjis Alam", nameBn: "সারজিস আলম", partyId: "ncp", profession: "NCP Chief Organiser (North)" },
      { id: "pan1-bnp", name: "Abdul Mannan", nameBn: "আব্দুল মান্নান", partyId: "bnp" },
      { id: "pan1-jamaat", name: "Hafez Nurul Islam", nameBn: "হাফেজ নুরুল ইসলাম", partyId: "jamaat" },
    ]
  },
  {
    id: "rangpur-4",
    code: "Rangpur-4",
    name: "Rangpur-4",
    nameBn: "রংপুর-৪",
    division: "rangpur",
    district: "Rangpur",
    areas: ["Pirganj", "Kaunia", "Taraganj", "Rangpur Sadar"],
    areasBn: ["পীরগঞ্জ", "কাউনিয়া", "তারাগঞ্জ", "রংপুর সদর"],
    totalVoters: 298000,
    candidates: [
      { id: "ran4-ncp", name: "Akhtar Hossain", nameBn: "আখতার হোসাইন", partyId: "ncp" },
      { id: "ran4-bnp", name: "Md. Shahjahan", nameBn: "মো. শাহজাহান", partyId: "bnp" },
      { id: "ran4-jp", name: "Moshiur Rahman", nameBn: "মশিউর রহমান", partyId: "jatiya-party" },
    ]
  },
  {
    id: "cox-1",
    code: "Cox's Bazar-1",
    name: "Cox's Bazar-1",
    nameBn: "কক্সবাজার-১",
    division: "chittagong",
    district: "Cox's Bazar",
    areas: ["Cox's Bazar Sadar", "Ramu", "Eidgaon", "Kolatoli"],
    areasBn: ["কক্সবাজার সদর", "রামু", "ঈদগাঁও", "কলাতলী"],
    totalVoters: 276000,
    candidates: [
      { id: "cox1-bnp", name: "Salahuddin Ahmed", nameBn: "সালাহউদ্দিন আহমেদ", partyId: "bnp" },
      { id: "cox1-jamaat", name: "Mufti Abdul Hai", nameBn: "মুফতি আব্দুল হাই", partyId: "jamaat" },
      { id: "cox1-ncp", name: "Jahirul Islam", nameBn: "জহিরুল ইসলাম", partyId: "ncp" },
    ]
  },
];

// ========================================
// Gonovote 2026 Referendum
// ========================================

export interface GonovoteResult {
  yesVotes: number;
  noVotes: number;
  totalVotes: number;
  yesPercentage: number;
  noPercentage: number;
  expiresAt: string;
}

export const insertGonovoteSchema = z.object({
  vote: z.enum(["yes", "no"]),
});

export type InsertGonovote = z.infer<typeof insertGonovoteSchema>;

// Gonovote poll questions in Bangla and English
export const gonovoteQuestions = [
  {
    bn: "তত্ত্বাবধায়ক সরকার, নির্বাচন কমিশন ও সরকারি কর্ম কমিশন (পিএসসি) গঠনে সরকারি দল ও বিরোধী দল একত্রে কাজ করবে।",
    en: "The ruling party and opposition will work together to form the Caretaker Government, Election Commission, and Public Service Commission (PSC)."
  },
  {
    bn: "সরকারি দল ইচ্ছেমতো সংবিধান সংশোধন করতে পারবে না।",
    en: "The ruling party cannot amend the constitution at will."
  },
  {
    bn: "সংবিধানের গুরুত্বপূর্ণ পরিবর্তনের ক্ষেত্রে গণভোটের বিধান চালু হবে।",
    en: "A referendum system will be established for major constitutional changes."
  },
  {
    bn: "বিরোধী দল থেকে ডেপুটি স্পিকার এবং গুরুত্বপূর্ণ সংসদীয় কমিটিসমূহের সভাপতি নির্বাচিত হবেন।",
    en: "The Deputy Speaker and chairpersons of important parliamentary committees will be elected from the opposition party."
  },
  {
    bn: "যত মেয়াদই হোক, কেউ সর্বোচ্চ ১০ বছরের বেশি প্রধানমন্ত্রী থাকতে পারবেন না।",
    en: "Regardless of the number of terms, no one can serve as Prime Minister for more than 10 years."
  },
  {
    bn: "সংসদে নারীর প্রতিনিধিত্ব পর্যায়ক্রমে বাড়বে।",
    en: "Women's representation in parliament will gradually increase."
  },
  {
    bn: "ক্ষমতার ভারসাম্য প্রতিষ্ঠার জন্য পার্লামেন্টে একটি উচ্চকক্ষ গঠিত হবে।",
    en: "An upper house will be established in Parliament to ensure balance of power."
  },
  {
    bn: "দেশের বিচারব্যবস্থা স্বাধীনভাবে কাজ করবে।",
    en: "The country's judiciary will function independently."
  },
  {
    bn: "আপনার মৌলিক অধিকারের সংখ্যা (যেমন: ইন্টারনেট সেবা কখনও বন্ধ করা যাবে না) বাড়বে।",
    en: "Your fundamental rights will increase (e.g., internet service can never be blocked)."
  },
  {
    bn: "দণ্ডপ্রাপ্ত অপরাধীকে রাষ্ট্রপতি ইচ্ছেমতো ক্ষমা করতে পারবেন না।",
    en: "The President cannot pardon convicted criminals at will."
  },
  {
    bn: "রাষ্ট্রপতি ও প্রধানমন্ত্রীর ক্ষমতার মধ্যে ভারসাম্য থাকবে।",
    en: "There will be a balance of power between the President and Prime Minister."
  },
] as const;

// ========================================
// Database Tables (Drizzle ORM)
// ========================================

export const casesTable = pgTable("cases", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  votes: integer("votes").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  trending: boolean("trending").notNull().default(false),
  evidence: jsonb("evidence").$type<string[]>().default([]),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
});

export const caseVotesTable = pgTable("case_votes", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull(),
  ipHash: varchar("ip_hash", { length: 128 }).notNull(),
  direction: varchar("direction", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pollsTable = pgTable("polls", {
  id: serial("id").primaryKey(),
  question: varchar("question", { length: 300 }).notNull(),
  options: jsonb("options").$type<{ id: string; text: string; votes: number }[]>().notNull(),
  totalVotes: integer("total_votes").notNull().default(0),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pollVotesTable = pgTable("poll_votes", {
  id: serial("id").primaryKey(),
  pollId: integer("poll_id").notNull(),
  optionId: varchar("option_id", { length: 50 }).notNull(),
  ipHash: varchar("ip_hash", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scammersTable = pgTable("scammers", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  description: text("description").notNull(),
  evidenceCount: integer("evidence_count").notNull().default(0),
  verified: boolean("verified").notNull().default(false),
  reportedAt: timestamp("reported_at").defaultNow().notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
});

export const partyVotesTable = pgTable("party_votes", {
  id: serial("id").primaryKey(),
  partyId: varchar("party_id", { length: 50 }).notNull(),
  ipHash: varchar("ip_hash", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const constituencyVotesTable = pgTable("constituency_votes", {
  id: serial("id").primaryKey(),
  constituencyId: varchar("constituency_id", { length: 50 }).notNull(),
  candidateId: varchar("candidate_id", { length: 50 }).notNull(),
  ipHash: varchar("ip_hash", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const newsTable = pgTable("news", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content").notNull(),
  source: varchar("source", { length: 100 }).notNull(),
  sourceUrl: varchar("source_url", { length: 500 }).notNull(),
  publishedAt: timestamp("published_at").defaultNow().notNull(),
  trustScore: integer("trust_score").notNull().default(50),
  verified: boolean("verified").notNull().default(false),
  likes: integer("likes").notNull().default(0),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
});

export const newsCommentsTable = pgTable("news_comments", {
  id: serial("id").primaryKey(),
  newsId: integer("news_id").notNull(),
  content: text("content").notNull(),
  ipHash: varchar("ip_hash", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const newsLikesTable = pgTable("news_likes", {
  id: serial("id").primaryKey(),
  newsId: integer("news_id").notNull(),
  ipHash: varchar("ip_hash", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gonovoteVotesTable = pgTable("gonovote_votes", {
  id: serial("id").primaryKey(),
  vote: varchar("vote", { length: 10 }).notNull(),
  ipHash: varchar("ip_hash", { length: 128 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DbCase = typeof casesTable.$inferSelect;
export type DbPoll = typeof pollsTable.$inferSelect;
export type DbScammer = typeof scammersTable.$inferSelect;
export type DbNews = typeof newsTable.$inferSelect;
export type DbNewsComment = typeof newsCommentsTable.$inferSelect;

import { randomUUID } from "crypto";
import type {
  Case,
  InsertCase,
  Poll,
  InsertPoll,
  PollOption,
  Scammer,
  InsertScammer,
  PartyVoteResult,
  PlatformStats,
  CaseCategory,
  Constituency,
  ConstituencyVoteResult,
  PendingCase,
  PendingScammer,
  News,
  InsertNews,
  NewsComment,
  ContentStatus,
} from "@shared/schema";
import { politicalParties, constituencies } from "@shared/schema";

export interface IStorage {
  getStats(): Promise<PlatformStats>;
  getCases(): Promise<Case[]>;
  getCase(id: string): Promise<Case | undefined>;
  createCase(data: InsertCase): Promise<Case>;
  voteOnCase(caseId: string, sessionId: string, direction: "up" | "down"): Promise<boolean>;
  getPolls(): Promise<Poll[]>;
  getPoll(id: string): Promise<Poll | undefined>;
  createPoll(data: InsertPoll): Promise<Poll>;
  voteOnPoll(pollId: string, optionId: string, sessionId: string): Promise<boolean>;
  getPollVoteStatus(sessionId: string): Promise<Record<string, string>>;
  getScammers(): Promise<Scammer[]>;
  createScammer(data: InsertScammer): Promise<Scammer>;
  getPartyVotes(): Promise<PartyVoteResult[]>;
  voteOnParty(partyId: string, sessionId: string): Promise<boolean>;
  getPartyVoteStatus(sessionId: string): Promise<{ hasVoted: boolean; partyId?: string }>;
  getConstituencies(): Promise<Constituency[]>;
  getConstituency(id: string): Promise<Constituency | undefined>;
  getConstituencyVotes(constituencyId: string): Promise<ConstituencyVoteResult[]>;
  voteOnConstituency(constituencyId: string, candidateId: string, sessionId: string): Promise<boolean>;
  getConstituencyVoteStatus(sessionId: string): Promise<Record<string, string>>;
  
  // Admin: Pending content
  getPendingCases(): Promise<PendingCase[]>;
  updateCaseStatus(caseId: string, status: ContentStatus): Promise<boolean>;
  getPendingScammers(): Promise<PendingScammer[]>;
  updateScammerStatus(scammerId: string, status: ContentStatus): Promise<boolean>;
  
  // News
  getNews(): Promise<News[]>;
  getNewsItem(id: string): Promise<News | undefined>;
  createNews(data: InsertNews): Promise<News>;
  updateNewsStatus(newsId: string, status: ContentStatus): Promise<boolean>;
  likeNews(newsId: string, sessionId: string): Promise<boolean>;
  addNewsComment(newsId: string, content: string, sessionId: string): Promise<NewsComment | null>;
}

export class MemStorage implements IStorage {
  private cases: Map<string, Case> = new Map();
  private caseStatuses: Map<string, ContentStatus> = new Map();
  private caseVotes: Map<string, Set<string>> = new Map();
  private polls: Map<string, Poll> = new Map();
  private pollVotes: Map<string, Map<string, string>> = new Map();
  private scammers: Map<string, Scammer> = new Map();
  private scammerStatuses: Map<string, ContentStatus> = new Map();
  private partyVotes: Map<string, number> = new Map();
  private partyVoters: Map<string, string> = new Map();
  private constituencyVotes: Map<string, Map<string, number>> = new Map();
  private constituencyVoters: Map<string, string> = new Map();
  private news: Map<string, News> = new Map();
  private newsLikes: Map<string, Set<string>> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    const sampleCases: Omit<Case, "id">[] = [
      {
        title: "Demand for Clean Drinking Water in Rural Sylhet",
        description: "Many villages in rural Sylhet are suffering from a severe shortage of clean drinking water. The existing tube wells have been contaminated with arsenic, and the government has failed to provide alternative sources. We demand immediate action to ensure safe drinking water for all residents.",
        category: "infrastructure",
        votes: 1247,
        comments: 89,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        trending: true,
        evidence: [],
      },
      {
        title: "Stop Illegal Deforestation in Sundarbans Buffer Zone",
        description: "Illegal logging operations are destroying the buffer zone of the Sundarbans, the world's largest mangrove forest. This is threatening wildlife habitats and increasing vulnerability to cyclones. We call for strict enforcement of forest protection laws.",
        category: "environment",
        votes: 892,
        comments: 56,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        trending: true,
        evidence: [],
      },
      {
        title: "Investigate Corruption in Road Construction Projects",
        description: "Multiple road construction projects in Dhaka have been delayed and over budget due to alleged corruption. Poor quality materials are being used, leading to roads deteriorating within months. We demand a transparent investigation and accountability.",
        category: "political",
        votes: 2341,
        comments: 234,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        trending: true,
        evidence: [],
      },
      {
        title: "Improve Access to Healthcare in Chittagong Hill Tracts",
        description: "Indigenous communities in the Chittagong Hill Tracts lack basic healthcare facilities. The nearest hospital is often hours away, and mobile health clinics are rare. We need permanent healthcare infrastructure and trained medical staff.",
        category: "healthcare",
        votes: 678,
        comments: 42,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        trending: false,
        evidence: [],
      },
      {
        title: "Reform University Admission Process",
        description: "The current university admission system is chaotic and unfair. Students have to travel across the country for multiple exams. We propose a unified admission test system that reduces stress and travel costs for students and their families.",
        category: "education",
        votes: 1567,
        comments: 128,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        trending: true,
        evidence: [],
      },
      {
        title: "Protect Street Vendors from Eviction",
        description: "Street vendors are an essential part of Bangladesh's economy, providing affordable goods and services. Recent eviction drives have destroyed livelihoods without providing alternatives. We demand fair treatment and designated vending zones.",
        category: "social",
        votes: 445,
        comments: 31,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        trending: false,
        evidence: [],
      },
    ];

    sampleCases.forEach((c) => {
      const id = randomUUID();
      this.cases.set(id, { ...c, id });
    });

    const samplePolls: Omit<Poll, "id">[] = [
      {
        question: "Should Bangladesh implement a carbon tax to fight climate change?",
        options: [
          { id: randomUUID(), text: "Yes, immediately", votes: 234, percentage: 45.2 },
          { id: randomUUID(), text: "Yes, but gradually", votes: 189, percentage: 36.5 },
          { id: randomUUID(), text: "No, it will hurt the economy", votes: 67, percentage: 12.9 },
          { id: randomUUID(), text: "Not sure", votes: 28, percentage: 5.4 },
        ],
        totalVotes: 518,
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        active: true,
      },
      {
        question: "What is the biggest challenge facing Bangladesh today?",
        options: [
          { id: randomUUID(), text: "Corruption", votes: 412, percentage: 38.1 },
          { id: randomUUID(), text: "Climate change", votes: 287, percentage: 26.5 },
          { id: randomUUID(), text: "Education quality", votes: 198, percentage: 18.3 },
          { id: randomUUID(), text: "Healthcare access", votes: 121, percentage: 11.2 },
          { id: randomUUID(), text: "Infrastructure", votes: 64, percentage: 5.9 },
        ],
        totalVotes: 1082,
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        active: true,
      },
    ];

    samplePolls.forEach((p) => {
      const id = randomUUID();
      this.polls.set(id, { ...p, id });
    });

    const sampleScammers: Omit<Scammer, "id">[] = [
      {
        name: "Fake Import-Export Company Ltd",
        type: "business",
        description: "This company promises to facilitate import-export deals but takes advance payments and never delivers. Multiple victims have reported losses of 50,000-500,000 BDT.",
        evidenceCount: 12,
        verified: true,
        reportedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        name: "Online Job Scam Network",
        type: "organization",
        description: "A network of fake job posting websites that collect registration fees promising overseas employment. They use fake documents and official-looking websites to deceive job seekers.",
        evidenceCount: 8,
        verified: true,
        reportedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        name: "Md. Rahman (Alias: Online Trader)",
        type: "individual",
        description: "Operates multiple social media accounts selling electronics at suspiciously low prices. Takes payment via bKash but never delivers products. Changes numbers frequently.",
        evidenceCount: 5,
        verified: false,
        reportedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];

    sampleScammers.forEach((s) => {
      const id = randomUUID();
      this.scammers.set(id, { ...s, id });
    });

    politicalParties.forEach((party) => {
      this.partyVotes.set(party.id, Math.floor(Math.random() * 500) + 100);
    });
  }

  async getStats(): Promise<PlatformStats> {
    const totalVotes = Array.from(this.cases.values()).reduce((sum, c) => sum + c.votes, 0) +
      Array.from(this.polls.values()).reduce((sum, p) => sum + p.totalVotes, 0) +
      Array.from(this.partyVotes.values()).reduce((sum, v) => sum + v, 0);
    
    return {
      activeCases: this.cases.size,
      totalVotes,
      verifiedReports: Array.from(this.scammers.values()).filter(s => s.verified).length,
    };
  }

  async getCases(): Promise<Case[]> {
    return Array.from(this.cases.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getCase(id: string): Promise<Case | undefined> {
    return this.cases.get(id);
  }

  async createCase(data: InsertCase): Promise<Case> {
    const id = randomUUID();
    const newCase: Case = {
      id,
      title: data.title,
      description: data.description,
      category: data.category,
      votes: 0,
      comments: 0,
      createdAt: new Date().toISOString(),
      trending: false,
      evidence: data.evidence ?? [],
    };
    this.cases.set(id, newCase);
    return newCase;
  }

  async voteOnCase(caseId: string, sessionId: string, direction: "up" | "down"): Promise<boolean> {
    const caseItem = this.cases.get(caseId);
    if (!caseItem) return false;

    const voters = this.caseVotes.get(caseId) ?? new Set();
    if (voters.has(sessionId)) return false;

    voters.add(sessionId);
    this.caseVotes.set(caseId, voters);

    caseItem.votes += direction === "up" ? 1 : -1;
    if (caseItem.votes > 500) caseItem.trending = true;
    this.cases.set(caseId, caseItem);

    return true;
  }

  async getPolls(): Promise<Poll[]> {
    const now = new Date();
    return Array.from(this.polls.values()).map((poll) => {
      const isActive = new Date(poll.expiresAt) > now;
      return { ...poll, active: isActive };
    }).sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime();
    });
  }

  async getPoll(id: string): Promise<Poll | undefined> {
    return this.polls.get(id);
  }

  async createPoll(data: InsertPoll): Promise<Poll> {
    const id = randomUUID();
    const options: PollOption[] = data.options.map((text) => ({
      id: randomUUID(),
      text,
      votes: 0,
      percentage: 0,
    }));

    const poll: Poll = {
      id,
      question: data.question,
      options,
      totalVotes: 0,
      expiresAt: new Date(Date.now() + data.expiresInHours * 60 * 60 * 1000).toISOString(),
      active: true,
    };
    this.polls.set(id, poll);
    return poll;
  }

  async voteOnPoll(pollId: string, optionId: string, sessionId: string): Promise<boolean> {
    const poll = this.polls.get(pollId);
    if (!poll || !poll.active) return false;

    const pollVoters = this.pollVotes.get(pollId) ?? new Map();
    if (pollVoters.has(sessionId)) return false;

    const option = poll.options.find((o) => o.id === optionId);
    if (!option) return false;

    pollVoters.set(sessionId, optionId);
    this.pollVotes.set(pollId, pollVoters);

    option.votes += 1;
    poll.totalVotes += 1;

    poll.options.forEach((o) => {
      o.percentage = poll.totalVotes > 0 ? (o.votes / poll.totalVotes) * 100 : 0;
    });

    this.polls.set(pollId, poll);
    return true;
  }

  async getPollVoteStatus(sessionId: string): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    this.pollVotes.forEach((voters, pollId) => {
      const optionId = voters.get(sessionId);
      if (optionId) {
        result[pollId] = optionId;
      }
    });
    return result;
  }

  async getScammers(): Promise<Scammer[]> {
    return Array.from(this.scammers.values()).sort(
      (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
    );
  }

  async createScammer(data: InsertScammer): Promise<Scammer> {
    const id = randomUUID();
    const scammer: Scammer = {
      id,
      name: data.name,
      type: data.type,
      description: data.description,
      evidenceCount: data.evidence?.length ?? 0,
      verified: false,
      reportedAt: new Date().toISOString(),
    };
    this.scammers.set(id, scammer);
    return scammer;
  }

  async getPartyVotes(): Promise<PartyVoteResult[]> {
    const total = Array.from(this.partyVotes.values()).reduce((sum, v) => sum + v, 0);
    return politicalParties.map((party) => {
      const votes = this.partyVotes.get(party.id) ?? 0;
      return {
        partyId: party.id,
        votes,
        percentage: total > 0 ? (votes / total) * 100 : 0,
      };
    });
  }

  async voteOnParty(partyId: string, sessionId: string): Promise<boolean> {
    if (this.partyVoters.has(sessionId)) return false;
    
    const party = politicalParties.find((p) => p.id === partyId);
    if (!party) return false;

    this.partyVoters.set(sessionId, partyId);
    const current = this.partyVotes.get(partyId) ?? 0;
    this.partyVotes.set(partyId, current + 1);
    return true;
  }

  async getPartyVoteStatus(sessionId: string): Promise<{ hasVoted: boolean; partyId?: string }> {
    const partyId = this.partyVoters.get(sessionId);
    return { hasVoted: !!partyId, partyId };
  }

  async getConstituencies(): Promise<Constituency[]> {
    return constituencies;
  }

  async getConstituency(id: string): Promise<Constituency | undefined> {
    return constituencies.find(c => c.id === id);
  }

  async getConstituencyVotes(constituencyId: string): Promise<ConstituencyVoteResult[]> {
    const constituency = constituencies.find(c => c.id === constituencyId);
    if (!constituency) return [];

    let votes = this.constituencyVotes.get(constituencyId);
    
    if (!votes) {
      votes = new Map();
      constituency.candidates.forEach(candidate => {
        votes!.set(candidate.id, Math.floor(Math.random() * 1000) + 100);
      });
      this.constituencyVotes.set(constituencyId, votes);
    }

    const totalVotes = Array.from(votes.values()).reduce((sum, v) => sum + v, 0);

    return constituency.candidates.map(candidate => {
      const candidateVotes = votes!.get(candidate.id) ?? 0;
      return {
        constituencyId,
        candidateId: candidate.id,
        votes: candidateVotes,
        percentage: totalVotes > 0 ? (candidateVotes / totalVotes) * 100 : 0,
      };
    });
  }

  async voteOnConstituency(constituencyId: string, candidateId: string, sessionId: string): Promise<boolean> {
    const voteKey = `${sessionId}:${constituencyId}`;
    if (this.constituencyVoters.has(voteKey)) return false;

    const constituency = constituencies.find(c => c.id === constituencyId);
    if (!constituency) return false;

    const candidate = constituency.candidates.find(c => c.id === candidateId);
    if (!candidate) return false;

    this.constituencyVoters.set(voteKey, candidateId);

    let votes = this.constituencyVotes.get(constituencyId);
    if (!votes) {
      votes = new Map();
      constituency.candidates.forEach(c => {
        votes!.set(c.id, Math.floor(Math.random() * 1000) + 100);
      });
      this.constituencyVotes.set(constituencyId, votes);
    }
    
    const current = votes.get(candidateId) ?? 0;
    votes.set(candidateId, current + 1);

    return true;
  }

  async getConstituencyVoteStatus(sessionId: string): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    this.constituencyVoters.forEach((candidateId, key) => {
      if (key.startsWith(`${sessionId}:`)) {
        const constituencyId = key.split(":")[1];
        result[constituencyId] = candidateId;
      }
    });
    return result;
  }

  // Admin: Pending content
  async getPendingCases(): Promise<PendingCase[]> {
    return Array.from(this.cases.values()).map(c => ({
      ...c,
      status: this.caseStatuses.get(c.id) ?? "pending",
    }));
  }

  async updateCaseStatus(caseId: string, status: ContentStatus): Promise<boolean> {
    if (!this.cases.has(caseId)) return false;
    this.caseStatuses.set(caseId, status);
    return true;
  }

  async getPendingScammers(): Promise<PendingScammer[]> {
    return Array.from(this.scammers.values()).map(s => ({
      ...s,
      status: this.scammerStatuses.get(s.id) ?? "pending",
    }));
  }

  async updateScammerStatus(scammerId: string, status: ContentStatus): Promise<boolean> {
    if (!this.scammers.has(scammerId)) return false;
    this.scammerStatuses.set(scammerId, status);
    return true;
  }

  // News
  async getNews(): Promise<News[]> {
    return Array.from(this.news.values())
      .filter(n => n.status === "approved")
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }

  async getNewsItem(id: string): Promise<News | undefined> {
    return this.news.get(id);
  }

  async createNews(data: InsertNews): Promise<News> {
    const id = randomUUID();
    const news: News = {
      id,
      title: data.title,
      content: data.content,
      source: data.source,
      sourceUrl: data.sourceUrl,
      publishedAt: new Date().toISOString(),
      trustScore: 0,
      verified: false,
      likes: 0,
      comments: [],
      status: "pending",
    };
    this.news.set(id, news);
    return news;
  }

  async updateNewsStatus(newsId: string, status: ContentStatus): Promise<boolean> {
    const news = this.news.get(newsId);
    if (!news) return false;
    news.status = status;
    this.news.set(newsId, news);
    return true;
  }

  async likeNews(newsId: string, sessionId: string): Promise<boolean> {
    const news = this.news.get(newsId);
    if (!news) return false;
    
    const likes = this.newsLikes.get(newsId) ?? new Set();
    if (likes.has(sessionId)) return false;
    
    likes.add(sessionId);
    this.newsLikes.set(newsId, likes);
    news.likes += 1;
    this.news.set(newsId, news);
    return true;
  }

  async addNewsComment(newsId: string, content: string, sessionId: string): Promise<NewsComment | null> {
    const news = this.news.get(newsId);
    if (!news) return null;
    
    const comment: NewsComment = {
      id: randomUUID(),
      content,
      createdAt: new Date().toISOString(),
      sessionId,
    };
    news.comments.push(comment);
    this.news.set(newsId, news);
    return comment;
  }

  // Admin only methods for pending news
  async getAllNews(): Promise<News[]> {
    return Array.from(this.news.values())
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }
}

export const storage = new MemStorage();

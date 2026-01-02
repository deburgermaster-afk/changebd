import { randomUUID, createHash } from "crypto";
import { eq, and, sql, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
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
  Constituency,
  ConstituencyVoteResult,
  PendingCase,
  PendingScammer,
  News,
  InsertNews,
  NewsComment,
  ContentStatus,
} from "@shared/schema";
import { 
  politicalParties, 
  constituencies,
  casesTable,
  caseVotesTable,
  pollsTable,
  pollVotesTable,
  scammersTable,
  partyVotesTable,
  constituencyVotesTable,
  newsTable,
  newsCommentsTable,
  newsLikesTable,
  gonovoteVotesTable,
  type GonovoteResult,
} from "@shared/schema";

const IP_SALT = process.env.SESSION_SECRET || "changebd-secure-salt-2026";

export function hashIP(ip: string): string {
  return createHash("sha256")
    .update(ip + IP_SALT)
    .digest("hex");
}

export interface IStorage {
  getStats(): Promise<PlatformStats>;
  getCases(): Promise<Case[]>;
  getCase(id: string): Promise<Case | undefined>;
  createCase(data: InsertCase): Promise<Case>;
  voteOnCase(caseId: string, ipHash: string, direction: "up" | "down"): Promise<boolean>;
  getPolls(): Promise<Poll[]>;
  getPoll(id: string): Promise<Poll | undefined>;
  createPoll(data: InsertPoll): Promise<Poll>;
  voteOnPoll(pollId: string, optionId: string, ipHash: string): Promise<boolean>;
  getPollVoteStatus(ipHash: string): Promise<Record<string, string>>;
  getScammers(): Promise<Scammer[]>;
  createScammer(data: InsertScammer): Promise<Scammer>;
  getPartyVotes(): Promise<PartyVoteResult[]>;
  voteOnParty(partyId: string, ipHash: string): Promise<boolean>;
  getPartyVoteStatus(ipHash: string): Promise<{ hasVoted: boolean; partyId?: string }>;
  getConstituencies(): Promise<Constituency[]>;
  getConstituency(id: string): Promise<Constituency | undefined>;
  getConstituencyVotes(constituencyId: string): Promise<ConstituencyVoteResult[]>;
  voteOnConstituency(constituencyId: string, candidateId: string, ipHash: string): Promise<boolean>;
  getConstituencyVoteStatus(ipHash: string): Promise<Record<string, string>>;
  
  getPendingCases(): Promise<PendingCase[]>;
  updateCaseStatus(caseId: string, status: ContentStatus): Promise<boolean>;
  getPendingScammers(): Promise<PendingScammer[]>;
  updateScammerStatus(scammerId: string, status: ContentStatus): Promise<boolean>;
  
  getNews(): Promise<News[]>;
  getNewsItem(id: string): Promise<News | undefined>;
  createNews(data: InsertNews): Promise<News>;
  updateNewsStatus(newsId: string, status: ContentStatus): Promise<boolean>;
  likeNews(newsId: string, ipHash: string): Promise<boolean>;
  addNewsComment(newsId: string, content: string, ipHash: string): Promise<NewsComment | null>;
  getAllNews(): Promise<News[]>;
  
  getGonovoteResult(): Promise<GonovoteResult>;
  voteOnGonovote(vote: "yes" | "no", ipHash: string): Promise<boolean>;
  getGonovoteVoteStatus(ipHash: string): Promise<{ hasVoted: boolean; vote?: string }>;
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool);

export class DatabaseStorage implements IStorage {
  async getStats(): Promise<PlatformStats> {
    const casesResult = await db.select({ count: sql<number>`count(*)` }).from(casesTable).where(eq(casesTable.status, "approved"));
    const scammersResult = await db.select({ count: sql<number>`count(*)` }).from(scammersTable).where(eq(scammersTable.verified, true));
    
    const partyVotesResult = await db.select({ count: sql<number>`count(*)` }).from(partyVotesTable);
    const caseVotesResult = await db.select({ count: sql<number>`count(*)` }).from(caseVotesTable);
    const pollVotesResult = await db.select({ count: sql<number>`count(*)` }).from(pollVotesTable);
    
    return {
      activeCases: Number(casesResult[0]?.count ?? 0),
      totalVotes: Number(partyVotesResult[0]?.count ?? 0) + Number(caseVotesResult[0]?.count ?? 0) + Number(pollVotesResult[0]?.count ?? 0),
      verifiedReports: Number(scammersResult[0]?.count ?? 0),
    };
  }

  async getCases(): Promise<Case[]> {
    const result = await db.select().from(casesTable).where(eq(casesTable.status, "approved")).orderBy(desc(casesTable.createdAt));
    return result.map(c => ({
      id: String(c.id),
      title: c.title,
      description: c.description,
      category: c.category as Case["category"],
      votes: c.votes,
      comments: c.commentsCount,
      createdAt: c.createdAt.toISOString(),
      trending: c.trending,
      evidence: c.evidence ?? [],
    }));
  }

  async getCase(id: string): Promise<Case | undefined> {
    const result = await db.select().from(casesTable).where(eq(casesTable.id, parseInt(id)));
    const c = result[0];
    if (!c) return undefined;
    return {
      id: String(c.id),
      title: c.title,
      description: c.description,
      category: c.category as Case["category"],
      votes: c.votes,
      comments: c.commentsCount,
      createdAt: c.createdAt.toISOString(),
      trending: c.trending,
      evidence: c.evidence ?? [],
    };
  }

  async createCase(data: InsertCase): Promise<Case> {
    const result = await db.insert(casesTable).values({
      title: data.title,
      description: data.description,
      category: data.category,
      evidence: data.evidence ?? [],
      status: "pending",
    }).returning();
    
    const c = result[0];
    return {
      id: String(c.id),
      title: c.title,
      description: c.description,
      category: c.category as Case["category"],
      votes: c.votes,
      comments: c.commentsCount,
      createdAt: c.createdAt.toISOString(),
      trending: c.trending,
      evidence: c.evidence ?? [],
    };
  }

  async voteOnCase(caseId: string, ipHash: string, direction: "up" | "down"): Promise<boolean> {
    const existing = await db.select().from(caseVotesTable)
      .where(and(eq(caseVotesTable.caseId, parseInt(caseId)), eq(caseVotesTable.ipHash, ipHash)));
    
    if (existing.length > 0) return false;

    await db.insert(caseVotesTable).values({
      caseId: parseInt(caseId),
      ipHash,
      direction,
    });

    const increment = direction === "up" ? 1 : -1;
    await db.update(casesTable)
      .set({ votes: sql`${casesTable.votes} + ${increment}` })
      .where(eq(casesTable.id, parseInt(caseId)));

    return true;
  }

  async getPolls(): Promise<Poll[]> {
    const result = await db.select().from(pollsTable).orderBy(desc(pollsTable.createdAt));
    const now = new Date();
    return result.map(p => ({
      id: String(p.id),
      question: p.question,
      options: p.options.map(o => ({
        ...o,
        percentage: p.totalVotes > 0 ? (o.votes / p.totalVotes) * 100 : 0,
      })),
      totalVotes: p.totalVotes,
      expiresAt: p.expiresAt.toISOString(),
      active: p.expiresAt > now,
    }));
  }

  async getPoll(id: string): Promise<Poll | undefined> {
    const result = await db.select().from(pollsTable).where(eq(pollsTable.id, parseInt(id)));
    const p = result[0];
    if (!p) return undefined;
    const now = new Date();
    return {
      id: String(p.id),
      question: p.question,
      options: p.options.map(o => ({
        ...o,
        percentage: p.totalVotes > 0 ? (o.votes / p.totalVotes) * 100 : 0,
      })),
      totalVotes: p.totalVotes,
      expiresAt: p.expiresAt.toISOString(),
      active: p.expiresAt > now,
    };
  }

  async createPoll(data: InsertPoll): Promise<Poll> {
    const options = data.options.map(text => ({
      id: randomUUID(),
      text,
      votes: 0,
    }));
    
    const expiresAt = new Date(Date.now() + (data.expiresInHours ?? 24) * 60 * 60 * 1000);
    
    const result = await db.insert(pollsTable).values({
      question: data.question,
      options,
      expiresAt,
    }).returning();
    
    const p = result[0];
    return {
      id: String(p.id),
      question: p.question,
      options: options.map(o => ({ ...o, percentage: 0 })),
      totalVotes: 0,
      expiresAt: expiresAt.toISOString(),
      active: true,
    };
  }

  async voteOnPoll(pollId: string, optionId: string, ipHash: string): Promise<boolean> {
    const existing = await db.select().from(pollVotesTable)
      .where(and(eq(pollVotesTable.pollId, parseInt(pollId)), eq(pollVotesTable.ipHash, ipHash)));
    
    if (existing.length > 0) return false;

    const poll = await db.select().from(pollsTable).where(eq(pollsTable.id, parseInt(pollId)));
    if (poll.length === 0 || poll[0].expiresAt < new Date()) return false;

    const updatedOptions = poll[0].options.map(o => 
      o.id === optionId ? { ...o, votes: o.votes + 1 } : o
    );

    await db.update(pollsTable)
      .set({ 
        options: updatedOptions,
        totalVotes: sql`${pollsTable.totalVotes} + 1`,
      })
      .where(eq(pollsTable.id, parseInt(pollId)));

    await db.insert(pollVotesTable).values({
      pollId: parseInt(pollId),
      optionId,
      ipHash,
    });

    return true;
  }

  async getPollVoteStatus(ipHash: string): Promise<Record<string, string>> {
    const result = await db.select().from(pollVotesTable).where(eq(pollVotesTable.ipHash, ipHash));
    const status: Record<string, string> = {};
    result.forEach(v => {
      status[String(v.pollId)] = v.optionId;
    });
    return status;
  }

  async getScammers(): Promise<Scammer[]> {
    const result = await db.select().from(scammersTable).where(eq(scammersTable.status, "approved")).orderBy(desc(scammersTable.reportedAt));
    return result.map(s => ({
      id: String(s.id),
      name: s.name,
      type: s.type as Scammer["type"],
      description: s.description,
      evidenceCount: s.evidenceCount,
      verified: s.verified,
      reportedAt: s.reportedAt.toISOString(),
    }));
  }

  async createScammer(data: InsertScammer): Promise<Scammer> {
    const result = await db.insert(scammersTable).values({
      name: data.name,
      type: data.type,
      description: data.description,
      evidenceCount: data.evidence?.length ?? 0,
      status: "pending",
    }).returning();
    
    const s = result[0];
    return {
      id: String(s.id),
      name: s.name,
      type: s.type as Scammer["type"],
      description: s.description,
      evidenceCount: s.evidenceCount,
      verified: s.verified,
      reportedAt: s.reportedAt.toISOString(),
    };
  }

  async getPartyVotes(): Promise<PartyVoteResult[]> {
    const result = await db.select({
      partyId: partyVotesTable.partyId,
      count: sql<number>`count(*)`,
    }).from(partyVotesTable).groupBy(partyVotesTable.partyId);
    
    const votesMap = new Map(result.map(r => [r.partyId, Number(r.count)]));
    const total = result.reduce((sum, r) => sum + Number(r.count), 0);
    
    return politicalParties.map(party => {
      const votes = votesMap.get(party.id) ?? 0;
      return {
        partyId: party.id,
        votes,
        percentage: total > 0 ? (votes / total) * 100 : 0,
      };
    });
  }

  async voteOnParty(partyId: string, ipHash: string): Promise<boolean> {
    const existing = await db.select().from(partyVotesTable).where(eq(partyVotesTable.ipHash, ipHash));
    if (existing.length > 0) return false;

    const party = politicalParties.find(p => p.id === partyId);
    if (!party) return false;

    await db.insert(partyVotesTable).values({ partyId, ipHash });
    return true;
  }

  async getPartyVoteStatus(ipHash: string): Promise<{ hasVoted: boolean; partyId?: string }> {
    const result = await db.select().from(partyVotesTable).where(eq(partyVotesTable.ipHash, ipHash));
    if (result.length === 0) return { hasVoted: false };
    return { hasVoted: true, partyId: result[0].partyId };
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

    const result = await db.select({
      candidateId: constituencyVotesTable.candidateId,
      count: sql<number>`count(*)`,
    }).from(constituencyVotesTable)
      .where(eq(constituencyVotesTable.constituencyId, constituencyId))
      .groupBy(constituencyVotesTable.candidateId);

    const votesMap = new Map(result.map(r => [r.candidateId, Number(r.count)]));
    const total = result.reduce((sum, r) => sum + Number(r.count), 0);

    return constituency.candidates.map(candidate => ({
      constituencyId,
      candidateId: candidate.id,
      votes: votesMap.get(candidate.id) ?? 0,
      percentage: total > 0 ? ((votesMap.get(candidate.id) ?? 0) / total) * 100 : 0,
    }));
  }

  async voteOnConstituency(constituencyId: string, candidateId: string, ipHash: string): Promise<boolean> {
    const existing = await db.select().from(constituencyVotesTable)
      .where(and(
        eq(constituencyVotesTable.constituencyId, constituencyId),
        eq(constituencyVotesTable.ipHash, ipHash)
      ));
    
    if (existing.length > 0) return false;

    const constituency = constituencies.find(c => c.id === constituencyId);
    if (!constituency) return false;

    const candidate = constituency.candidates.find(c => c.id === candidateId);
    if (!candidate) return false;

    await db.insert(constituencyVotesTable).values({ constituencyId, candidateId, ipHash });
    return true;
  }

  async getConstituencyVoteStatus(ipHash: string): Promise<Record<string, string>> {
    const result = await db.select().from(constituencyVotesTable).where(eq(constituencyVotesTable.ipHash, ipHash));
    const status: Record<string, string> = {};
    result.forEach(v => {
      status[v.constituencyId] = v.candidateId;
    });
    return status;
  }

  async getPendingCases(): Promise<PendingCase[]> {
    const result = await db.select().from(casesTable).orderBy(desc(casesTable.createdAt));
    return result.map(c => ({
      id: String(c.id),
      title: c.title,
      description: c.description,
      category: c.category as Case["category"],
      votes: c.votes,
      comments: c.commentsCount,
      createdAt: c.createdAt.toISOString(),
      trending: c.trending,
      evidence: c.evidence ?? [],
      status: c.status as ContentStatus,
    }));
  }

  async updateCaseStatus(caseId: string, status: ContentStatus): Promise<boolean> {
    const result = await db.update(casesTable).set({ status }).where(eq(casesTable.id, parseInt(caseId))).returning();
    return result.length > 0;
  }

  async getPendingScammers(): Promise<PendingScammer[]> {
    const result = await db.select().from(scammersTable).orderBy(desc(scammersTable.reportedAt));
    return result.map(s => ({
      id: String(s.id),
      name: s.name,
      type: s.type as Scammer["type"],
      description: s.description,
      evidenceCount: s.evidenceCount,
      verified: s.verified,
      reportedAt: s.reportedAt.toISOString(),
      status: s.status as ContentStatus,
    }));
  }

  async updateScammerStatus(scammerId: string, status: ContentStatus): Promise<boolean> {
    const updates: any = { status };
    if (status === "approved") updates.verified = true;
    const result = await db.update(scammersTable).set(updates).where(eq(scammersTable.id, parseInt(scammerId))).returning();
    return result.length > 0;
  }

  async getNews(): Promise<News[]> {
    const newsResult = await db.select().from(newsTable).where(eq(newsTable.status, "approved")).orderBy(desc(newsTable.publishedAt));
    
    const newsWithComments: News[] = [];
    for (const n of newsResult) {
      const comments = await db.select().from(newsCommentsTable).where(eq(newsCommentsTable.newsId, n.id)).orderBy(desc(newsCommentsTable.createdAt));
      newsWithComments.push({
        id: String(n.id),
        title: n.title,
        content: n.content,
        source: n.source,
        sourceUrl: n.sourceUrl,
        publishedAt: n.publishedAt.toISOString(),
        trustScore: n.trustScore / 100,
        verified: n.verified,
        likes: n.likes,
        comments: comments.map(c => ({
          id: String(c.id),
          content: c.content,
          createdAt: c.createdAt.toISOString(),
          sessionId: c.ipHash.substring(0, 8),
        })),
        status: n.status as ContentStatus,
      });
    }
    return newsWithComments;
  }

  async getNewsItem(id: string): Promise<News | undefined> {
    const result = await db.select().from(newsTable).where(eq(newsTable.id, parseInt(id)));
    const n = result[0];
    if (!n) return undefined;

    const comments = await db.select().from(newsCommentsTable).where(eq(newsCommentsTable.newsId, n.id)).orderBy(desc(newsCommentsTable.createdAt));
    
    return {
      id: String(n.id),
      title: n.title,
      content: n.content,
      source: n.source,
      sourceUrl: n.sourceUrl,
      publishedAt: n.publishedAt.toISOString(),
      trustScore: n.trustScore / 100,
      verified: n.verified,
      likes: n.likes,
      comments: comments.map(c => ({
        id: String(c.id),
        content: c.content,
        createdAt: c.createdAt.toISOString(),
        sessionId: c.ipHash.substring(0, 8),
      })),
      status: n.status as ContentStatus,
    };
  }

  async createNews(data: InsertNews): Promise<News> {
    const result = await db.insert(newsTable).values({
      title: data.title,
      content: data.content,
      source: data.source,
      sourceUrl: data.sourceUrl,
      status: "pending",
    }).returning();
    
    const n = result[0];
    return {
      id: String(n.id),
      title: n.title,
      content: n.content,
      source: n.source,
      sourceUrl: n.sourceUrl,
      publishedAt: n.publishedAt.toISOString(),
      trustScore: n.trustScore / 100,
      verified: n.verified,
      likes: n.likes,
      comments: [],
      status: n.status as ContentStatus,
    };
  }

  async updateNewsStatus(newsId: string, status: ContentStatus): Promise<boolean> {
    const updates: any = { status };
    if (status === "approved") updates.verified = true;
    const result = await db.update(newsTable).set(updates).where(eq(newsTable.id, parseInt(newsId))).returning();
    return result.length > 0;
  }

  async likeNews(newsId: string, ipHash: string): Promise<boolean> {
    const existing = await db.select().from(newsLikesTable)
      .where(and(eq(newsLikesTable.newsId, parseInt(newsId)), eq(newsLikesTable.ipHash, ipHash)));
    
    if (existing.length > 0) return false;

    await db.insert(newsLikesTable).values({ newsId: parseInt(newsId), ipHash });
    await db.update(newsTable).set({ likes: sql`${newsTable.likes} + 1` }).where(eq(newsTable.id, parseInt(newsId)));
    return true;
  }

  async addNewsComment(newsId: string, content: string, ipHash: string): Promise<NewsComment | null> {
    const result = await db.insert(newsCommentsTable).values({
      newsId: parseInt(newsId),
      content,
      ipHash,
    }).returning();

    const c = result[0];
    return {
      id: String(c.id),
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      sessionId: ipHash.substring(0, 8),
    };
  }

  async getAllNews(): Promise<News[]> {
    const newsResult = await db.select().from(newsTable).orderBy(desc(newsTable.publishedAt));
    
    const newsWithComments: News[] = [];
    for (const n of newsResult) {
      const comments = await db.select().from(newsCommentsTable).where(eq(newsCommentsTable.newsId, n.id));
      newsWithComments.push({
        id: String(n.id),
        title: n.title,
        content: n.content,
        source: n.source,
        sourceUrl: n.sourceUrl,
        publishedAt: n.publishedAt.toISOString(),
        trustScore: n.trustScore / 100,
        verified: n.verified,
        likes: n.likes,
        comments: comments.map(c => ({
          id: String(c.id),
          content: c.content,
          createdAt: c.createdAt.toISOString(),
          sessionId: c.ipHash.substring(0, 8),
        })),
        status: n.status as ContentStatus,
      });
    }
    return newsWithComments;
  }

  async getGonovoteResult(): Promise<GonovoteResult> {
    const yesResult = await db.select({ count: sql<number>`count(*)` })
      .from(gonovoteVotesTable)
      .where(eq(gonovoteVotesTable.vote, "yes"));
    const noResult = await db.select({ count: sql<number>`count(*)` })
      .from(gonovoteVotesTable)
      .where(eq(gonovoteVotesTable.vote, "no"));

    const yesVotes = Number(yesResult[0]?.count ?? 0);
    const noVotes = Number(noResult[0]?.count ?? 0);
    const totalVotes = yesVotes + noVotes;

    const expiresAt = new Date("2026-06-30T23:59:59Z");

    return {
      yesVotes,
      noVotes,
      totalVotes,
      yesPercentage: totalVotes > 0 ? (yesVotes / totalVotes) * 100 : 0,
      noPercentage: totalVotes > 0 ? (noVotes / totalVotes) * 100 : 0,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async voteOnGonovote(vote: "yes" | "no", ipHash: string): Promise<boolean> {
    const existing = await db.select().from(gonovoteVotesTable)
      .where(eq(gonovoteVotesTable.ipHash, ipHash));
    
    if (existing.length > 0) return false;

    await db.insert(gonovoteVotesTable).values({ vote, ipHash });
    return true;
  }

  async getGonovoteVoteStatus(ipHash: string): Promise<{ hasVoted: boolean; vote?: string }> {
    const result = await db.select().from(gonovoteVotesTable)
      .where(eq(gonovoteVotesTable.ipHash, ipHash));
    
    if (result.length === 0) return { hasVoted: false };
    return { hasVoted: true, vote: result[0].vote };
  }
}

export const storage = new DatabaseStorage();

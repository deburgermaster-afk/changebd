import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage, hashIP } from "./storage";
import { insertCaseSchema, insertPollSchema, insertScammerSchema, insertCaseVoteSchema, insertPollVoteSchema, insertPartyVoteSchema, insertConstituencyVoteSchema, insertNewsCommentSchema, insertGonovoteSchema } from "@shared/schema";
import { z } from "zod";
import { analyzeContent, fetchAndAnalyzeNews, fetchOnlineNews, enhanceNewsWithAI, generateNewsFromContext } from "./ai";
import { createInvestigation, getInvestigation, getAllInvestigations, addHumanReport, pauseInvestigation, resumeInvestigation } from "./case-agent";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function getClientIP(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.socket.remoteAddress || "unknown";
  return ip;
}

function getIPHash(req: Request): string {
  return hashIP(getClientIP(req));
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/cases", async (req, res) => {
    try {
      const cases = await storage.getCases();
      res.json(cases);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cases" });
    }
  });

  app.get("/api/cases/:id", async (req, res) => {
    try {
      const caseItem = await storage.getCase(req.params.id);
      if (!caseItem) {
        return res.status(404).json({ error: "Case not found" });
      }
      res.json(caseItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch case" });
    }
  });

  app.post("/api/cases", async (req, res) => {
    try {
      const data = insertCaseSchema.parse(req.body);
      const newCase = await storage.createCase(data);
      res.status(201).json(newCase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create case" });
    }
  });

  app.post("/api/cases/:id/vote", async (req, res) => {
    try {
      const ipHash = getIPHash(req);
      const { direction } = insertCaseVoteSchema.pick({ direction: true }).parse(req.body);
      const success = await storage.voteOnCase(req.params.id, ipHash, direction);
      if (!success) {
        return res.status(400).json({ error: "Already voted or case not found" });
      }
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to vote" });
    }
  });

  app.get("/api/polls", async (req, res) => {
    try {
      const polls = await storage.getPolls();
      res.json(polls);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch polls" });
    }
  });

  app.get("/api/polls/vote-status", async (req, res) => {
    try {
      const ipHash = getIPHash(req);
      const status = await storage.getPollVoteStatus(ipHash);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vote status" });
    }
  });

  app.post("/api/polls", async (req, res) => {
    try {
      const data = insertPollSchema.parse(req.body);
      const poll = await storage.createPoll(data);
      res.status(201).json(poll);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create poll" });
    }
  });

  app.post("/api/polls/:id/vote", async (req, res) => {
    try {
      const ipHash = getIPHash(req);
      const { optionId } = z.object({ optionId: z.string() }).parse(req.body);
      const success = await storage.voteOnPoll(req.params.id, optionId, ipHash);
      if (!success) {
        return res.status(400).json({ error: "Already voted or poll not found" });
      }
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to vote" });
    }
  });

  app.get("/api/scammers", async (req, res) => {
    try {
      const scammers = await storage.getScammers();
      res.json(scammers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scammers" });
    }
  });

  app.post("/api/scammers", async (req, res) => {
    try {
      const data = insertScammerSchema.parse(req.body);
      const scammer = await storage.createScammer(data);
      res.status(201).json(scammer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create scammer report" });
    }
  });

  app.get("/api/parties/votes", async (req, res) => {
    try {
      const results = await storage.getPartyVotes();
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch party votes" });
    }
  });

  app.get("/api/parties/vote-status", async (req, res) => {
    try {
      const ipHash = getIPHash(req);
      const status = await storage.getPartyVoteStatus(ipHash);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vote status" });
    }
  });

  app.post("/api/parties/vote", async (req, res) => {
    try {
      const ipHash = getIPHash(req);
      const { partyId } = insertPartyVoteSchema.parse(req.body);
      console.log(`[Party Vote] IP hash: ${ipHash.substring(0, 8)}... voting for: ${partyId}`);
      const success = await storage.voteOnParty(partyId, ipHash);
      if (!success) {
        console.log(`[Party Vote] DENIED - IP hash ${ipHash.substring(0, 8)}... already voted`);
        return res.status(400).json({ error: "Already voted or party not found" });
      }
      console.log(`[Party Vote] SUCCESS - IP hash ${ipHash.substring(0, 8)}... voted for ${partyId}`);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to vote" });
    }
  });

  // Constituency/MP Voting Routes
  app.get("/api/constituencies", async (req, res) => {
    try {
      const constituencies = await storage.getConstituencies();
      res.json(constituencies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch constituencies" });
    }
  });

  app.get("/api/constituency-vote-status", async (req, res) => {
    try {
      const ipHash = getIPHash(req);
      const status = await storage.getConstituencyVoteStatus(ipHash);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vote status" });
    }
  });

  app.get("/api/constituencies/:id", async (req, res) => {
    try {
      const constituency = await storage.getConstituency(req.params.id);
      if (!constituency) {
        return res.status(404).json({ error: "Constituency not found" });
      }
      res.json(constituency);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch constituency" });
    }
  });

  app.get("/api/constituencies/:id/votes", async (req, res) => {
    try {
      const votes = await storage.getConstituencyVotes(req.params.id);
      res.json(votes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch constituency votes" });
    }
  });

  app.post("/api/constituencies/:id/vote", async (req, res) => {
    try {
      const ipHash = getIPHash(req);
      const { candidateId } = insertConstituencyVoteSchema.omit({ constituencyId: true }).parse(req.body);
      console.log(`[Constituency Vote] IP hash: ${ipHash.substring(0, 8)}... constituency: ${req.params.id}, candidate: ${candidateId}`);
      const result = await storage.voteOnConstituency(req.params.id, candidateId, ipHash);
      if (!result.success) {
        console.log(`[Constituency Vote] DENIED - IP hash ${ipHash.substring(0, 8)}... ${result.error}`);
        return res.status(400).json({ error: result.error || "Already voted in another constituency" });
      }
      console.log(`[Constituency Vote] SUCCESS - IP hash ${ipHash.substring(0, 8)}... voted in ${req.params.id}`);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to vote" });
    }
  });

  // ========================================
  // Gonovote 2026 Routes
  // ========================================

  app.get("/api/gonovote/result", async (req, res) => {
    try {
      const result = await storage.getGonovoteResult();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get results" });
    }
  });

  app.get("/api/gonovote/vote-status", async (req, res) => {
    try {
      const ipHash = getIPHash(req);
      const status = await storage.getGonovoteVoteStatus(ipHash);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to get vote status" });
    }
  });

  app.post("/api/gonovote/vote", async (req, res) => {
    try {
      const ipHash = getIPHash(req);
      const { vote } = insertGonovoteSchema.parse(req.body);
      console.log(`[Gonovote] IP hash: ${ipHash.substring(0, 8)}... vote: ${vote}`);
      
      const success = await storage.voteOnGonovote(vote, ipHash);
      if (!success) {
        console.log(`[Gonovote] DENIED - IP hash ${ipHash.substring(0, 8)}... already voted`);
        return res.status(400).json({ error: "You have already voted on this referendum" });
      }
      
      console.log(`[Gonovote] SUCCESS - IP hash ${ipHash.substring(0, 8)}... voted ${vote}`);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid vote data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to vote" });
    }
  });

  // ========================================
  // Admin Routes
  // ========================================
  
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string(),
      }).parse(req.body);

      console.log("Login attempt:", { email, hasPassword: !!password, adminEmailSet: !!ADMIN_EMAIL, adminPassSet: !!ADMIN_PASSWORD });

      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.json({ success: true });
      } else {
        console.log("Credentials mismatch");
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      console.log("Login parse error:", error);
      res.status(400).json({ error: "Invalid request" });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.isAdmin = false;
    res.json({ success: true });
  });

  app.get("/api/admin/status", (req, res) => {
    res.json({ isAdmin: !!req.session.isAdmin });
  });

  // Admin: Cases
  app.get("/api/admin/cases", requireAdmin, async (req, res) => {
    try {
      const cases = await storage.getPendingCases();
      const casesWithAI = await Promise.all(
        cases.map(async (c) => {
          if (!c.aiSuggestion) {
            const aiSuggestion = await analyzeContent(
              `Title: ${c.title}\n\nDescription: ${c.description}\n\nCategory: ${c.category}`,
              "case"
            );
            return { ...c, aiSuggestion };
          }
          return c;
        })
      );
      res.json(casesWithAI);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cases" });
    }
  });

  app.post("/api/admin/cases/:id/approve", requireAdmin, async (req, res) => {
    try {
      const success = await storage.updateCaseStatus(req.params.id, "approved");
      if (!success) {
        return res.status(404).json({ error: "Case not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to approve case" });
    }
  });

  app.post("/api/admin/cases/:id/reject", requireAdmin, async (req, res) => {
    try {
      const success = await storage.updateCaseStatus(req.params.id, "rejected");
      if (!success) {
        return res.status(404).json({ error: "Case not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reject case" });
    }
  });

  // Admin: Scammers
  app.get("/api/admin/scammers", requireAdmin, async (req, res) => {
    try {
      const scammers = await storage.getPendingScammers();
      const scammersWithAI = await Promise.all(
        scammers.map(async (s) => {
          if (!s.aiSuggestion) {
            const aiSuggestion = await analyzeContent(
              `Name: ${s.name}\n\nType: ${s.type}\n\nDescription: ${s.description}`,
              "scammer"
            );
            return { ...s, aiSuggestion };
          }
          return s;
        })
      );
      res.json(scammersWithAI);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch scammers" });
    }
  });

  app.post("/api/admin/scammers/:id/approve", requireAdmin, async (req, res) => {
    try {
      const success = await storage.updateScammerStatus(req.params.id, "approved");
      if (!success) {
        return res.status(404).json({ error: "Scammer not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to approve scammer" });
    }
  });

  app.post("/api/admin/scammers/:id/reject", requireAdmin, async (req, res) => {
    try {
      const success = await storage.updateScammerStatus(req.params.id, "rejected");
      if (!success) {
        return res.status(404).json({ error: "Scammer not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reject scammer" });
    }
  });

  // Admin: News
  app.get("/api/admin/news", requireAdmin, async (req, res) => {
    try {
      const news = await (storage as any).getAllNews();
      res.json(news);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.post("/api/admin/news/generate", requireAdmin, async (req, res) => {
    try {
      const existingNews = await storage.getAllNews();
      const existingTitles = existingNews.map(n => n.title);
      
      const newsItems = await fetchAndAnalyzeNews(existingTitles);
      const createdNews = await Promise.all(
        newsItems.map(async (item) => {
          const news = await storage.createNews({
            title: item.title,
            summary: item.summary,
            content: item.content,
            imageUrl: item.imageUrl,
            source: item.source,
            sourceUrl: item.sourceUrl,
            crossCheckedSources: item.crossCheckedSources,
          });
          return { ...news, trustScore: item.trustScore };
        })
      );
      res.json(createdNews);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate news" });
    }
  });

  app.post("/api/admin/news/fetch-online", requireAdmin, async (req, res) => {
    try {
      const { topic } = req.body;
      const searchTopic = topic || "bangladesh politics";
      
      const existingNews = await storage.getAllNews();
      const existingTitles = existingNews.map(n => n.title.toLowerCase());
      
      let newsItems = await fetchOnlineNews(searchTopic);
      
      if (newsItems.length === 0) {
        return res.status(400).json({ 
          error: "No online news found. Please configure GNEWS_API_KEY or try a different topic.",
          requiresApiKey: true 
        });
      }
      
      newsItems = newsItems.filter(item => 
        !existingTitles.includes(item.title.toLowerCase())
      );
      
      if (newsItems.length === 0) {
        return res.json({ message: "All fetched news already exists", created: [] });
      }
      
      const enhancedNews = await Promise.all(
        newsItems.slice(0, 5).map(async (item) => {
          return enhanceNewsWithAI(item);
        })
      );
      
      const createdNews = await Promise.all(
        enhancedNews.map(async (item) => {
          const news = await storage.createNews({
            title: item.title,
            summary: item.summary,
            content: item.content,
            imageUrl: item.imageUrl,
            source: item.source,
            sourceUrl: item.sourceUrl,
            crossCheckedSources: item.crossCheckedSources,
          });
          return { ...news, trustScore: item.trustScore };
        })
      );
      
      res.json(createdNews);
    } catch (error) {
      console.error("Fetch online news error:", error);
      res.status(500).json({ error: "Failed to fetch online news" });
    }
  });

  app.get("/api/admin/news/topics", requireAdmin, async (req, res) => {
    const topics = [
      { id: "bangladesh", label: "Bangladesh General" },
      { id: "bangladesh politics", label: "Politics" },
      { id: "bangladesh election", label: "Elections" },
      { id: "dhaka", label: "Dhaka News" },
      { id: "bangladesh economy", label: "Economy" },
      { id: "bangladesh education", label: "Education" },
      { id: "bangladesh healthcare", label: "Healthcare" },
      { id: "bangladesh environment", label: "Environment" },
      { id: "bangladesh corruption", label: "Corruption" },
      { id: "bangladesh protest", label: "Protests" },
    ];
    res.json(topics);
  });

  app.post("/api/admin/news/generate-from-context", requireAdmin, async (req, res) => {
    try {
      const { context } = req.body;
      
      if (!context || context.trim().length < 10) {
        return res.status(400).json({ error: "Please provide a context with at least 10 characters" });
      }
      
      const existingNews = await storage.getAllNews();
      const existingTitles = existingNews.map(n => n.title.toLowerCase());
      
      const newsItems = await generateNewsFromContext(context.trim(), existingTitles);
      
      if (newsItems.length === 0) {
        return res.status(400).json({ error: "Failed to generate news from context. Please try again." });
      }
      
      const createdNews = await Promise.all(
        newsItems.map(async (item) => {
          return storage.createNews({
            title: item.title,
            summary: item.summary,
            content: item.content,
            imageUrl: item.imageUrl,
            source: item.source,
            sourceUrl: item.sourceUrl,
            crossCheckedSources: item.crossCheckedSources,
          });
        })
      );
      
      res.json(createdNews);
    } catch (error) {
      console.error("Generate from context error:", error);
      res.status(500).json({ error: "Failed to generate news from context" });
    }
  });

  app.post("/api/admin/news/:id/approve", requireAdmin, async (req, res) => {
    try {
      const success = await storage.updateNewsStatus(req.params.id, "approved");
      if (!success) {
        return res.status(404).json({ error: "News not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to approve news" });
    }
  });

  app.post("/api/admin/news/:id/reject", requireAdmin, async (req, res) => {
    try {
      const success = await storage.updateNewsStatus(req.params.id, "rejected");
      if (!success) {
        return res.status(404).json({ error: "News not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to reject news" });
    }
  });

  // ========================================
  // Public News Routes
  // ========================================
  
  app.get("/api/news", async (req, res) => {
    try {
      const news = await storage.getNews();
      res.json(news);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const newsItem = await storage.getNewsItem(req.params.id);
      if (!newsItem || newsItem.status !== "approved") {
        return res.status(404).json({ error: "News not found" });
      }
      res.json(newsItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.post("/api/news/:id/like", async (req, res) => {
    try {
      const ipHash = getIPHash(req);
      const success = await storage.likeNews(req.params.id, ipHash);
      if (!success) {
        return res.status(400).json({ error: "Already liked or news not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to like news" });
    }
  });

  app.post("/api/news/:id/comment", async (req, res) => {
    try {
      const ipHash = getIPHash(req);
      const { content } = insertNewsCommentSchema.omit({ newsId: true }).parse(req.body);
      const comment = await storage.addNewsComment(req.params.id, content, ipHash);
      if (!comment) {
        return res.status(404).json({ error: "News not found" });
      }
      res.json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to add comment" });
    }
  });

  // ========================================
  // Case Agent Investigation Routes
  // ========================================

  app.post("/api/investigations", async (req, res) => {
    try {
      const { caseName, victimName, description } = z.object({
        caseName: z.string().min(5, "Case name must be at least 5 characters"),
        victimName: z.string().min(2, "Victim name is required"),
        description: z.string().min(10, "Description must be at least 10 characters"),
      }).parse(req.body);

      const investigation = await createInvestigation(caseName, victimName, description);
      res.status(201).json(investigation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create investigation" });
    }
  });

  app.get("/api/investigations", async (req, res) => {
    try {
      const investigations = getAllInvestigations();
      res.json(investigations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch investigations" });
    }
  });

  app.get("/api/investigations/:id", async (req, res) => {
    try {
      const investigation = getInvestigation(req.params.id);
      if (!investigation) {
        return res.status(404).json({ error: "Investigation not found" });
      }
      res.json(investigation);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch investigation" });
    }
  });

  app.post("/api/investigations/:id/report", async (req, res) => {
    try {
      const { content } = z.object({
        content: z.string().min(5, "Report must be at least 5 characters"),
      }).parse(req.body);

      const report = await addHumanReport(req.params.id, content);
      if (!report) {
        return res.status(404).json({ error: "Investigation not found" });
      }
      res.json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to submit report" });
    }
  });

  app.post("/api/investigations/:id/pause", async (req, res) => {
    const success = pauseInvestigation(req.params.id);
    if (!success) return res.status(404).json({ error: "Investigation not found" });
    res.json({ success: true });
  });

  app.post("/api/investigations/:id/resume", async (req, res) => {
    const success = resumeInvestigation(req.params.id);
    if (!success) return res.status(404).json({ error: "Investigation not found or not paused" });
    res.json({ success: true });
  });

  return httpServer;
}

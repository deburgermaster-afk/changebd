import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCaseSchema, insertPollSchema, insertScammerSchema, insertCaseVoteSchema, insertPollVoteSchema, insertPartyVoteSchema, insertConstituencyVoteSchema, insertNewsCommentSchema } from "@shared/schema";
import { z } from "zod";
import { analyzeContent, fetchAndAnalyzeNews } from "./ai";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.isAdmin) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function getSessionId(req: Request): string {
  if (!req.session.anonymousId) {
    req.session.anonymousId = Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
  return req.session.anonymousId;
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
      const sessionId = getSessionId(req);
      const { direction } = insertCaseVoteSchema.pick({ direction: true }).parse(req.body);
      const success = await storage.voteOnCase(req.params.id, sessionId, direction);
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
      const sessionId = getSessionId(req);
      const status = await storage.getPollVoteStatus(sessionId);
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
      const sessionId = getSessionId(req);
      const { optionId } = z.object({ optionId: z.string() }).parse(req.body);
      const success = await storage.voteOnPoll(req.params.id, optionId, sessionId);
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
      const sessionId = getSessionId(req);
      const status = await storage.getPartyVoteStatus(sessionId);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vote status" });
    }
  });

  app.post("/api/parties/vote", async (req, res) => {
    try {
      const sessionId = getSessionId(req);
      const { partyId } = insertPartyVoteSchema.parse(req.body);
      const success = await storage.voteOnParty(partyId, sessionId);
      if (!success) {
        return res.status(400).json({ error: "Already voted or party not found" });
      }
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
      const sessionId = getSessionId(req);
      const status = await storage.getConstituencyVoteStatus(sessionId);
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
      const sessionId = getSessionId(req);
      const { candidateId } = insertConstituencyVoteSchema.omit({ constituencyId: true }).parse(req.body);
      const success = await storage.voteOnConstituency(req.params.id, candidateId, sessionId);
      if (!success) {
        return res.status(400).json({ error: "Already voted or candidate not found" });
      }
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
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
            content: item.content,
            source: item.source,
            sourceUrl: item.sourceUrl,
          });
          return { ...news, trustScore: item.trustScore };
        })
      );
      res.json(createdNews);
    } catch (error) {
      res.status(500).json({ error: "Failed to generate news" });
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
      const sessionId = getSessionId(req);
      const success = await storage.likeNews(req.params.id, sessionId);
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
      const sessionId = getSessionId(req);
      const { content } = insertNewsCommentSchema.omit({ newsId: true }).parse(req.body);
      const comment = await storage.addNewsComment(req.params.id, content, sessionId);
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

  return httpServer;
}

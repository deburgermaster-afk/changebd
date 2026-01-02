import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertCaseSchema, insertPollSchema, insertScammerSchema, insertCaseVoteSchema, insertPollVoteSchema, insertPartyVoteSchema } from "@shared/schema";
import { z } from "zod";

import type { Request } from "express";

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

  return httpServer;
}

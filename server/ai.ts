const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

interface AIResponse {
  recommendation: "approve" | "reject";
  confidence: number;
  reason: string;
}

export async function analyzeContent(content: string, type: "case" | "scammer" | "news"): Promise<AIResponse> {
  if (!OPENROUTER_API_KEY) {
    return {
      recommendation: "approve",
      confidence: 0.5,
      reason: "AI analysis unavailable - manual review required",
    };
  }

  const systemPrompt = `You are a content moderation AI for ChangeBD.org, a Bangladesh civic engagement platform. 
Analyze the submitted content and provide a recommendation to approve or reject it.

For ${type} submissions, consider:
- Is the content genuine and not spam?
- Is it relevant to Bangladesh civic issues?
- Does it contain hate speech, misinformation, or harmful content?
- Is the language appropriate?

Respond with JSON only:
{
  "recommendation": "approve" or "reject",
  "confidence": 0.0 to 1.0,
  "reason": "brief explanation"
}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://changebd.org",
        "X-Title": "ChangeBD.org Admin",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Please analyze this ${type} submission:\n\n${content}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content ?? "";
    
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        recommendation: parsed.recommendation === "reject" ? "reject" : "approve",
        confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.7)),
        reason: parsed.reason ?? "Analysis complete",
      };
    }
    
    return {
      recommendation: "approve",
      confidence: 0.5,
      reason: "Unable to parse AI response - manual review required",
    };
  } catch (error) {
    console.error("AI analysis error:", error);
    return {
      recommendation: "approve",
      confidence: 0.5,
      reason: "AI analysis failed - manual review required",
    };
  }
}

interface NewsItem {
  title: string;
  content: string;
  source: string;
  sourceUrl: string;
  trustScore: number;
}

export async function fetchAndAnalyzeNews(existingTitles: string[] = []): Promise<NewsItem[]> {
  if (!OPENROUTER_API_KEY) {
    return [];
  }

  const excludeSection = existingTitles.length > 0 
    ? `\n\nIMPORTANT: Do NOT generate news with these titles or similar topics (already exist):\n${existingTitles.map(t => `- "${t}"`).join('\n')}\n\nGenerate completely NEW and DIFFERENT stories.`
    : "";

  const systemPrompt = `You are a news aggregator AI for ChangeBD.org, a Bangladesh civic engagement platform.
Generate 5 realistic news items about Bangladesh that would be relevant for civic engagement.
Focus on: politics, elections, social issues, environment, education, healthcare, infrastructure.

Include news from major sources like: Al Jazeera, BBC, Reuters, The Daily Star, Prothom Alo, bdnews24.

Respond with JSON array only:
[
  {
    "title": "News headline",
    "content": "Full news content (200-500 words)",
    "source": "News source name",
    "sourceUrl": "https://example.com/news-article",
    "trustScore": 0.0 to 1.0 (credibility score)
  }
]

Make the news realistic and relevant to current Bangladesh affairs (January 2026 timeframe, upcoming election on Feb 12, 2026).${excludeSection}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://changebd.org",
        "X-Title": "ChangeBD.org News",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate 5 current Bangladesh news items for today's date. Each must be unique and different from any previously generated news." }
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content ?? "";
    
    const jsonMatch = aiText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.map((item: any) => ({
        title: item.title ?? "Untitled",
        content: item.content ?? "",
        source: item.source ?? "Unknown",
        sourceUrl: item.sourceUrl ?? "https://example.com",
        trustScore: Math.min(1, Math.max(0, item.trustScore ?? 0.5)),
      }));
    }
    
    return [];
  } catch (error) {
    console.error("News fetch error:", error);
    return [];
  }
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

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

interface CrossCheckedSource {
  name: string;
  url: string;
  logo?: string;
}

interface NewsItem {
  title: string;
  summary: string;
  content: string;
  imageUrl?: string;
  source: string;
  sourceUrl: string;
  crossCheckedSources: CrossCheckedSource[];
  trustScore: number;
}

export async function generateNewsFromContext(context: string, existingTitles: string[] = []): Promise<NewsItem[]> {
  if (!OPENROUTER_API_KEY) {
    return [];
  }

  const excludeSection = existingTitles.length > 0 
    ? `\n\nIMPORTANT: Do NOT generate news with these titles or similar topics (already exist):\n${existingTitles.map(t => `- "${t}"`).join('\n')}\n\nGenerate completely NEW and DIFFERENT stories.`
    : "";

  const systemPrompt = `You are a news aggregator AI for ChangeBD.org, a Bangladesh civic engagement platform.
Generate 3 realistic news items based on the following context/topic provided by the admin.
The news should be relevant to Bangladesh and civic engagement.

CONTEXT FROM ADMIN:
${context}

Primary sources: Al Jazeera, BBC, Reuters, The Daily Star, Prothom Alo, bdnews24, The Guardian, DW, CNN.

Respond with JSON array only:
[
  {
    "title": "News headline",
    "summary": "A short 1-2 sentence summary of the news (50-100 words)",
    "content": "Full detailed news content (200-500 words)",
    "imageUrl": "URL to a relevant Unsplash image (use https://images.unsplash.com/photo-xxx format)",
    "source": "Primary news source name",
    "sourceUrl": "https://example.com/news-article",
    "crossCheckedSources": [
      {"name": "Source 2", "url": "https://source2.com/article"},
      {"name": "Source 3", "url": "https://source3.com/article"}
    ],
    "trustScore": 0.0 to 1.0 (higher if cross-checked by multiple reputable sources)
  }
]

For imageUrl, use realistic Unsplash URLs.
Make the news realistic and relevant to the provided context (January 2026 timeframe).${excludeSection}`;

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
          { role: "user", content: `Generate 3 news items based on the context: "${context}"` }
        ],
        temperature: 0.8,
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
        summary: item.summary ?? (item.content?.substring(0, 150) + "...") ?? "",
        content: item.content ?? "",
        imageUrl: item.imageUrl,
        source: item.source ?? "Unknown",
        sourceUrl: item.sourceUrl ?? "https://example.com",
        crossCheckedSources: Array.isArray(item.crossCheckedSources) 
          ? item.crossCheckedSources.map((s: any) => ({
              name: s.name ?? "Unknown",
              url: s.url ?? "#",
            }))
          : [],
        trustScore: Math.min(1, Math.max(0, item.trustScore ?? 0.5)),
      }));
    }
    
    return [];
  } catch (error) {
    console.error("Context news generation error:", error);
    return [];
  }
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

Primary sources: Al Jazeera, BBC, Reuters, The Daily Star, Prothom Alo, bdnews24, The Guardian, DW, CNN.

Respond with JSON array only:
[
  {
    "title": "News headline",
    "summary": "A short 1-2 sentence summary of the news (50-100 words)",
    "content": "Full detailed news content (200-500 words)",
    "imageUrl": "URL to a relevant Unsplash image (use https://images.unsplash.com/photo-xxx format)",
    "source": "Primary news source name",
    "sourceUrl": "https://example.com/news-article",
    "crossCheckedSources": [
      {"name": "Source 2", "url": "https://source2.com/article"},
      {"name": "Source 3", "url": "https://source3.com/article"}
    ],
    "trustScore": 0.0 to 1.0 (higher if cross-checked by multiple reputable sources)
  }
]

For imageUrl, use realistic Unsplash URLs like:
- https://images.unsplash.com/photo-1583508915901-b5f84c1dcde1 (Bangladesh politics)
- https://images.unsplash.com/photo-1570168007204-dfb528c6958f (government buildings)
- https://images.unsplash.com/photo-1526304640581-d334cdbbf45e (city/infrastructure)
- https://images.unsplash.com/photo-1504711434969-e33886168f5c (news/journalism)

Make the news realistic and relevant to current Bangladesh affairs (January 2026 timeframe, upcoming election on Feb 12, 2026).
Cross-checked sources should be 1-3 other reputable news outlets that would cover the same story.${excludeSection}`;

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
        summary: item.summary ?? (item.content?.substring(0, 150) + "...") ?? "",
        content: item.content ?? "",
        imageUrl: item.imageUrl,
        source: item.source ?? "Unknown",
        sourceUrl: item.sourceUrl ?? "https://example.com",
        crossCheckedSources: Array.isArray(item.crossCheckedSources) 
          ? item.crossCheckedSources.map((s: any) => ({
              name: s.name ?? "Unknown",
              url: s.url ?? "#",
            }))
          : [],
        trustScore: Math.min(1, Math.max(0, item.trustScore ?? 0.5)),
      }));
    }
    
    return [];
  } catch (error) {
    console.error("News fetch error:", error);
    return [];
  }
}

interface OnlineNewsItem {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

export async function fetchOnlineNews(topic: string = "bangladesh"): Promise<NewsItem[]> {
  if (!GNEWS_API_KEY) {
    console.log("GNews API key not configured, falling back to AI generation");
    return [];
  }

  try {
    const encodedTopic = encodeURIComponent(topic);
    const url = `https://gnews.io/api/v4/search?q=${encodedTopic}&lang=en&country=bd&max=10&apikey=${GNEWS_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`GNews API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const articles: OnlineNewsItem[] = data.articles || [];

    return articles.map((article) => ({
      title: article.title,
      summary: article.description || article.content?.substring(0, 200) || "",
      content: article.content || article.description || "",
      imageUrl: article.image || undefined,
      source: article.source?.name || "Unknown",
      sourceUrl: article.url,
      crossCheckedSources: [],
      trustScore: 0.7,
    }));
  } catch (error) {
    console.error("Online news fetch error:", error);
    return [];
  }
}

export async function enhanceNewsWithAI(newsItem: NewsItem): Promise<NewsItem> {
  if (!OPENROUTER_API_KEY) {
    return newsItem;
  }

  const systemPrompt = `You are a news enhancement AI for ChangeBD.org. Given a news article, provide:
1. A better summary (50-100 words)
2. Cross-checked sources that would likely cover this story
3. A trust score based on the source reliability

Respond with JSON only:
{
  "summary": "Enhanced summary",
  "crossCheckedSources": [
    {"name": "Source Name", "url": "https://example.com/likely-article"}
  ],
  "trustScore": 0.0 to 1.0
}`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://changebd.org",
        "X-Title": "ChangeBD.org News Enhancement",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-001",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Title: ${newsItem.title}\n\nContent: ${newsItem.content}\n\nSource: ${newsItem.source}` }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      return newsItem;
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content ?? "";
    
    const jsonMatch = aiText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ...newsItem,
        summary: parsed.summary || newsItem.summary,
        crossCheckedSources: Array.isArray(parsed.crossCheckedSources) 
          ? parsed.crossCheckedSources.map((s: any) => ({
              name: s.name ?? "Unknown",
              url: s.url ?? "#",
            }))
          : newsItem.crossCheckedSources,
        trustScore: Math.min(1, Math.max(0, parsed.trustScore ?? newsItem.trustScore)),
      };
    }
    
    return newsItem;
  } catch (error) {
    console.error("News enhancement error:", error);
    return newsItem;
  }
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { News, NewsSource } from "@shared/schema";
import { 
  ArrowLeft, Heart, MessageCircle, ExternalLink, 
  CheckCircle, Clock, Send, Shield, Newspaper
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

const SOURCE_LOGOS: Record<string, string> = {
  "Al Jazeera": "https://upload.wikimedia.org/wikipedia/en/thumb/d/d5/Al_Jazeera_English.svg/200px-Al_Jazeera_English.svg.png",
  "BBC": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/BBC_Logo_2021.svg/200px-BBC_Logo_2021.svg.png",
  "Reuters": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Reuters_Logo.svg/200px-Reuters_Logo.svg.png",
  "The Daily Star": "https://www.thedailystar.net/sites/all/themes/flavor/tds/logo.svg",
  "Prothom Alo": "https://www.prothomalo.com/assets/img/logo.png",
  "bdnews24": "https://d30fl32nd2baj9.cloudfront.net/media/2019/05/14/bdnews24-logo.png",
  "The Guardian": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/The_Guardian_%282018%29.svg/200px-The_Guardian_%282018%29.svg.png",
  "DW": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/DW_2012_logo.svg/200px-DW_2012_logo.svg.png",
  "CNN": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN.svg/200px-CNN.svg.png",
  "AP News": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Associated_Press_logo_2012.svg/200px-Associated_Press_logo_2012.svg.png",
  "France 24": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/France_24_logo_2018.svg/200px-France_24_logo_2018.svg.png",
  "New York Times": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/New_York_Times_logo_variation.jpg/200px-New_York_Times_logo_variation.jpg",
};

const SOURCE_URLS: Record<string, string> = {
  "Al Jazeera": "https://www.aljazeera.com",
  "BBC": "https://www.bbc.com/news",
  "Reuters": "https://www.reuters.com",
  "The Daily Star": "https://www.thedailystar.net",
  "Prothom Alo": "https://www.prothomalo.com",
  "bdnews24": "https://bdnews24.com",
  "The Guardian": "https://www.theguardian.com",
  "DW": "https://www.dw.com",
  "CNN": "https://www.cnn.com",
  "AP News": "https://apnews.com",
  "France 24": "https://www.france24.com",
  "New York Times": "https://www.nytimes.com",
};

function getSourceLogo(sourceName: string): string | undefined {
  const normalized = Object.keys(SOURCE_LOGOS).find(
    key => sourceName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(sourceName.toLowerCase())
  );
  return normalized ? SOURCE_LOGOS[normalized] : undefined;
}

function getSourceUrl(sourceName: string): string {
  const normalized = Object.keys(SOURCE_URLS).find(
    key => sourceName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(sourceName.toLowerCase())
  );
  return normalized ? SOURCE_URLS[normalized] : "#";
}

function SourceCard({ source, isPrimary }: { source: NewsSource; isPrimary?: boolean }) {
  const logo = getSourceLogo(source.name);
  const url = getSourceUrl(source.name);
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-3 p-3 rounded-lg hover-elevate transition-all ${
        isPrimary ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
      }`}
      data-testid={`link-source-${source.name.replace(/\s+/g, '-').toLowerCase()}`}
    >
      {logo ? (
        <img 
          src={logo} 
          alt={source.name} 
          className="h-6 w-auto max-w-[80px] object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <Newspaper className="w-6 h-6 text-muted-foreground" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{source.name}</p>
        <p className="text-xs text-muted-foreground truncate">{url}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </a>
  );
}

export default function NewsArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");

  const { data: allNews = [], isLoading } = useQuery<News[]>({
    queryKey: ["/api/news"],
  });

  const news = allNews.find(n => n.id === id);

  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/news/${id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    },
    onError: () => {
      toast({ title: "Already liked", variant: "destructive" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => 
      apiRequest("POST", `/api/news/${id}/comment`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
      setNewComment("");
      toast({ title: "Comment added" });
    },
    onError: () => {
      toast({ title: "Failed to add comment", variant: "destructive" });
    },
  });

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      commentMutation.mutate(newComment.trim());
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="h-64 bg-muted rounded-lg animate-pulse mb-4" />
        <div className="h-8 bg-muted rounded w-3/4 animate-pulse mb-4" />
        <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
      </div>
    );
  }

  if (!news) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">Article Not Found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This news article could not be found.
            </p>
            <Link href="/news">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to News
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const trustPercent = Math.round(news.trustScore * 100);
  const primarySource = { name: news.source, url: news.sourceUrl };
  const crossSources = news.crossCheckedSources || [];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <Link href="/news">
        <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back-to-news">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to News
        </Button>
      </Link>

      {news.imageUrl && (
        <div className="w-full h-64 sm:h-80 rounded-lg overflow-hidden mb-6">
          <img 
            src={news.imageUrl} 
            alt={news.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.parentElement!.style.display = 'none';
            }}
          />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap mb-4">
        {news.verified && (
          <Badge variant="default" className="text-xs">
            <CheckCircle className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        )}
        <Badge 
          variant="outline" 
          className={`text-xs ${
            trustPercent >= 70 ? "border-green-500 text-green-600 dark:text-green-400" : 
            trustPercent >= 40 ? "border-yellow-500 text-yellow-600 dark:text-yellow-400" : 
            "border-red-500 text-red-600 dark:text-red-400"
          }`}
        >
          Trust Score: {trustPercent}%
        </Badge>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {formatDistanceToNow(new Date(news.publishedAt), { addSuffix: true })}
        </span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold mb-4" data-testid="text-news-title">
        {news.title}
      </h1>

      <div className="prose prose-sm dark:prose-invert max-w-none mb-8">
        <p className="text-base leading-relaxed whitespace-pre-wrap">
          {news.content}
        </p>
      </div>

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">News Sources</h3>
            <Badge variant="secondary" className="ml-auto">
              {1 + crossSources.length} source{crossSources.length > 0 ? "s" : ""}
            </Badge>
          </div>
          
          <div className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Primary Source</p>
              <SourceCard source={primarySource} isPrimary />
            </div>
            
            {crossSources.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Cross-Checked Sources</p>
                <div className="space-y-2">
                  {crossSources.map((source, idx) => (
                    <SourceCard key={idx} source={source} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-4 py-4 border-y mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => likeMutation.mutate()}
          disabled={likeMutation.isPending}
          className="gap-2"
          data-testid="button-like-news"
        >
          <Heart className={`w-4 h-4 ${news.likes > 0 ? "fill-red-500 text-red-500" : ""}`} />
          <span>{news.likes} likes</span>
        </Button>
        
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <MessageCircle className="w-4 h-4" />
          {news.comments.length} comments
        </span>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold">Comments</h3>
        
        <div className="flex gap-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
            data-testid="input-comment"
          />
          <Button
            size="icon"
            onClick={handleSubmitComment}
            disabled={!newComment.trim() || commentMutation.isPending}
            data-testid="button-submit-comment"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {news.comments.length > 0 ? (
          <div className="space-y-3">
            {news.comments.map((comment) => (
              <div 
                key={comment.id} 
                className="bg-muted/30 rounded-md p-4"
                data-testid={`comment-${comment.id}`}
              >
                <p className="text-sm">{comment.content}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">
            No comments yet. Be the first to comment!
          </p>
        )}
      </div>
    </div>
  );
}

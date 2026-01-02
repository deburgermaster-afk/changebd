import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { News, NewsSource } from "@shared/schema";
import { 
  Newspaper, Heart, MessageCircle, ExternalLink, 
  CheckCircle, Clock, Send, ChevronDown, ChevronUp, Shield
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

function getSourceLogo(sourceName: string): string | undefined {
  const normalized = Object.keys(SOURCE_LOGOS).find(
    key => sourceName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(sourceName.toLowerCase())
  );
  return normalized ? SOURCE_LOGOS[normalized] : undefined;
}

function SourceBadge({ source }: { source: NewsSource }) {
  const logo = getSourceLogo(source.name);
  
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 bg-muted/50 rounded-md px-2 py-1 hover-elevate transition-all"
    >
      {logo ? (
        <img 
          src={logo} 
          alt={source.name} 
          className="h-4 w-auto max-w-[60px] object-contain"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : null}
      <span className="text-xs text-muted-foreground">{source.name}</span>
    </a>
  );
}

function NewsCard({ news }: { news: News }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  
  const trustPercent = Math.round(news.trustScore * 100);
  
  const likeMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/news/${news.id}/like`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/news"] });
    },
    onError: () => {
      toast({ title: "Already liked", variant: "destructive" });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (content: string) => 
      apiRequest("POST", `/api/news/${news.id}/comment`, { content }),
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

  const allSources = [
    { name: news.source, url: news.sourceUrl },
    ...(news.crossCheckedSources || [])
  ];

  return (
    <Card 
      className="overflow-hidden hover-elevate cursor-pointer transition-all" 
      data-testid={`card-news-${news.id}`}
      onClick={() => !expanded && setExpanded(true)}
    >
      <div className="flex flex-col sm:flex-row">
        {news.imageUrl && (
          <div className="sm:w-48 sm:min-w-48 h-48 sm:h-auto overflow-hidden">
            <img 
              src={news.imageUrl} 
              alt={news.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}
        
        <CardContent className="flex-1 p-4 sm:p-5">
          <div className="flex items-center gap-2 flex-wrap mb-2">
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
              Trust: {trustPercent}%
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(news.publishedAt), { addSuffix: true })}
            </span>
          </div>
          
          <h3 
            className="font-bold text-base sm:text-lg mb-2 line-clamp-2" 
            data-testid={`text-news-title-${news.id}`}
          >
            {news.title}
          </h3>
          
          {!expanded ? (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {news.summary || news.content.substring(0, 150) + "..."}
            </p>
          ) : (
            <div onClick={(e) => e.stopPropagation()}>
              <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">
                {news.content}
              </p>
              
              {allSources.length > 0 && (
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Shield className="w-3 h-3" />
                    <span>Cross-checked Sources ({allSources.length})</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {allSources.map((source, idx) => (
                      <SourceBadge key={idx} source={source} />
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex items-center gap-4 pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => likeMutation.mutate()}
                  disabled={likeMutation.isPending}
                  className="gap-2"
                  data-testid={`button-like-news-${news.id}`}
                >
                  <Heart className={`w-4 h-4 ${news.likes > 0 ? "fill-red-500 text-red-500" : ""}`} />
                  <span>{news.likes}</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                  className="gap-2"
                  data-testid={`button-toggle-comments-${news.id}`}
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{news.comments.length}</span>
                  {showComments ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
                
                <a 
                  href={news.sourceUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors ml-auto"
                  data-testid={`link-news-source-${news.id}`}
                >
                  <ExternalLink className="w-3 h-3" />
                  Read Original
                </a>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpanded(false)}
                >
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Collapse
                </Button>
              </div>
              
              {showComments && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[60px] text-sm"
                      data-testid={`input-comment-${news.id}`}
                    />
                    <Button
                      size="icon"
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || commentMutation.isPending}
                      data-testid={`button-submit-comment-${news.id}`}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {news.comments.length > 0 ? (
                    <div className="space-y-3">
                      {news.comments.map((comment) => (
                        <div 
                          key={comment.id} 
                          className="bg-muted/30 rounded-md p-3"
                          data-testid={`comment-${comment.id}`}
                        >
                          <p className="text-sm">{comment.content}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {!expanded && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Heart className={`w-3 h-3 ${news.likes > 0 ? "fill-red-500 text-red-500" : ""}`} />
                {news.likes}
              </span>
              <span className="flex items-center gap-1">
                <MessageCircle className="w-3 h-3" />
                {news.comments.length}
              </span>
              {news.crossCheckedSources && news.crossCheckedSources.length > 0 && (
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {news.crossCheckedSources.length + 1} sources
                </span>
              )}
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}

export default function NewsPage() {
  const { data: news = [], isLoading } = useQuery<News[]>({
    queryKey: ["/api/news"],
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <Newspaper className="w-7 h-7 text-primary" />
          Bangladesh News
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Latest verified news about Bangladesh civic affairs
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : news.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No News Available</h3>
            <p className="text-sm text-muted-foreground">
              Check back later for the latest news updates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {news.map(n => <NewsCard key={n.id} news={n} />)}
        </div>
      )}
    </div>
  );
}

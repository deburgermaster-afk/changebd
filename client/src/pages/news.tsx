import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { News } from "@shared/schema";
import { 
  Newspaper, Heart, MessageCircle, ExternalLink, 
  CheckCircle, Clock, Send, ChevronDown, ChevronUp
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function NewsCard({ news }: { news: News }) {
  const { toast } = useToast();
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
  });

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      commentMutation.mutate(newComment.trim());
    }
  };

  return (
    <Card className="mb-4" data-testid={`card-news-${news.id}`}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
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
                  trustPercent >= 70 ? "border-green-500 text-green-600" : 
                  trustPercent >= 40 ? "border-yellow-500 text-yellow-600" : 
                  "border-red-500 text-red-600"
                }`}
              >
                Trust: {trustPercent}%
              </Badge>
            </div>
            
            <h3 className="font-bold text-base sm:text-lg mb-2" data-testid={`text-news-title-${news.id}`}>
              {news.title}
            </h3>
            
            <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">
              {news.content}
            </p>
            
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 flex-wrap">
              <a 
                href={news.sourceUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:text-primary transition-colors"
                data-testid={`link-news-source-${news.id}`}
              >
                <ExternalLink className="w-3 h-3" />
                {news.source}
              </a>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(news.publishedAt), { addSuffix: true })}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
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
        </div>
      </CardContent>
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
        news.map(n => <NewsCard key={n.id} news={n} />)
      )}
    </div>
  );
}

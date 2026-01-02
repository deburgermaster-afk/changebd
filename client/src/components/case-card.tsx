import { Link } from "wouter";
import { ThumbsUp, MessageCircle, Share2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Case, CaseCategory } from "@shared/schema";

interface CaseCardProps {
  caseItem: Case;
  onVote?: (id: string) => void;
}

const categoryColors: Record<CaseCategory, string> = {
  political: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  social: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "scam-alert": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  environment: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  education: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  healthcare: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  infrastructure: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

const categoryLabels: Record<CaseCategory, string> = {
  political: "Political",
  social: "Social",
  "scam-alert": "Scam Alert",
  environment: "Environment",
  education: "Education",
  healthcare: "Healthcare",
  infrastructure: "Infrastructure",
};

export function CaseCard({ caseItem, onVote }: CaseCardProps) {
  const timeAgo = getTimeAgo(caseItem.createdAt);

  return (
    <Card className="hover-elevate group" data-testid={`card-case-${caseItem.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <Badge 
            variant="secondary" 
            className={categoryColors[caseItem.category]}
            data-testid={`badge-category-${caseItem.id}`}
          >
            {categoryLabels[caseItem.category]}
          </Badge>
          {caseItem.trending && (
            <Badge variant="outline" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Trending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        <Link href={`/cases/${caseItem.id}`}>
          <h3 
            className="font-semibold text-lg leading-tight mb-2 line-clamp-2 group-hover:text-primary transition-colors cursor-pointer"
            data-testid={`text-case-title-${caseItem.id}`}
          >
            {caseItem.title}
          </h3>
        </Link>
        <p 
          className="text-sm text-muted-foreground line-clamp-3"
          data-testid={`text-case-excerpt-${caseItem.id}`}
        >
          {caseItem.description}
        </p>
        <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
          <span>Anonymous</span>
          <span>•</span>
          <span>{timeAgo}</span>
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between gap-2 pt-0 border-t">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1 tabular-nums" data-testid={`text-vote-count-${caseItem.id}`}>
            <ThumbsUp className="h-4 w-4" />
            {caseItem.votes.toLocaleString()}
          </span>
          <span className="flex items-center gap-1 tabular-nums">
            <MessageCircle className="h-4 w-4" />
            {caseItem.comments}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigator.share?.({ title: caseItem.title, url: `/cases/${caseItem.id}` })}
            data-testid={`button-share-${caseItem.id}`}
          >
            <Share2 className="h-4 w-4" />
          </Button>
          <Button 
            size="sm"
            onClick={() => onVote?.(caseItem.id)}
            data-testid={`button-support-${caseItem.id}`}
          >
            Support
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface CaseListProps {
  cases: Case[];
  onVote?: (id: string) => void;
  isLoading?: boolean;
}

export function CaseList({ cases, onVote, isLoading }: CaseListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-5 w-20 bg-muted rounded" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="h-6 bg-muted rounded mb-2" />
              <div className="h-4 bg-muted rounded w-3/4 mb-1" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </CardContent>
            <CardFooter className="border-t">
              <div className="h-8 w-full bg-muted rounded" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (cases.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No cases found. Be the first to raise your voice!</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="grid-cases">
      {cases.map((c) => (
        <CaseCard key={c.id} caseItem={c} onVote={onVote} />
      ))}
    </div>
  );
}

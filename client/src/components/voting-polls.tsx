import { useState } from "react";
import { BarChart3, Clock, Lock, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import type { Poll, PollOption } from "@shared/schema";

interface PollCardProps {
  poll: Poll;
  onVote?: (pollId: string, optionId: string) => void;
  hasVoted?: boolean;
  selectedOptionId?: string;
}

function getTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();
  
  if (diffMs <= 0) return "Expired";
  
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffDays > 0) return `${diffDays}d remaining`;
  if (diffHours > 0) return `${diffHours}h remaining`;
  return "Less than 1h";
}

export function PollCard({ poll, onVote, hasVoted = false, selectedOptionId }: PollCardProps) {
  const [localSelected, setLocalSelected] = useState<string | null>(selectedOptionId ?? null);
  const [submitting, setSubmitting] = useState(false);
  
  const timeRemaining = getTimeRemaining(poll.expiresAt);
  const isExpired = timeRemaining === "Expired";

  const handleVote = async () => {
    if (!localSelected || hasVoted || isExpired) return;
    setSubmitting(true);
    await onVote?.(poll.id, localSelected);
    setSubmitting(false);
  };

  return (
    <Card className={!poll.active ? "opacity-60" : ""} data-testid={`card-poll-${poll.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight" data-testid={`text-poll-question-${poll.id}`}>
            {poll.question}
          </CardTitle>
          <Badge 
            variant={isExpired ? "secondary" : "outline"} 
            className="flex-shrink-0 gap-1"
          >
            <Clock className="h-3 w-3" />
            {timeRemaining}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-3">
        {hasVoted || isExpired ? (
          <div className="space-y-3">
            {poll.options.map((option) => (
              <div key={option.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${
                    selectedOptionId === option.id ? "font-medium" : ""
                  }`}>
                    {selectedOptionId === option.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                    {option.text}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {option.percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress value={option.percentage} className="h-2" />
              </div>
            ))}
          </div>
        ) : (
          <RadioGroup
            value={localSelected ?? undefined}
            onValueChange={setLocalSelected}
            className="space-y-2"
          >
            {poll.options.map((option) => (
              <div 
                key={option.id} 
                className="flex items-center space-x-3 p-3 rounded-md border hover-elevate cursor-pointer"
                onClick={() => setLocalSelected(option.id)}
              >
                <RadioGroupItem 
                  value={option.id} 
                  id={`option-${option.id}`}
                  data-testid={`radio-poll-option-${option.id}`}
                />
                <Label 
                  htmlFor={`option-${option.id}`} 
                  className="flex-1 cursor-pointer"
                >
                  {option.text}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-2 pt-0 border-t">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BarChart3 className="h-4 w-4" />
          <span className="tabular-nums" data-testid={`text-poll-votes-${poll.id}`}>
            {poll.totalVotes.toLocaleString()} votes
          </span>
        </div>
        
        {!hasVoted && !isExpired && (
          <Button 
            size="sm"
            onClick={handleVote}
            disabled={!localSelected || submitting}
            className="gap-1"
            data-testid={`button-vote-poll-${poll.id}`}
          >
            <Lock className="h-3 w-3" />
            {submitting ? "Voting..." : "Vote Anonymously"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

interface PollListProps {
  polls: Poll[];
  onVote?: (pollId: string, optionId: string) => void;
  votedPolls?: Record<string, string>;
  isLoading?: boolean;
}

export function PollList({ polls, onVote, votedPolls = {}, isLoading }: PollListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-5 bg-muted rounded w-3/4" />
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-3">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-10 bg-muted rounded" />
                ))}
              </div>
            </CardContent>
            <CardFooter className="border-t">
              <div className="h-8 bg-muted rounded w-24" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No active polls at the moment.</p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="grid-polls">
      {polls.map((poll) => (
        <PollCard
          key={poll.id}
          poll={poll}
          onVote={onVote}
          hasVoted={poll.id in votedPolls}
          selectedOptionId={votedPolls[poll.id]}
        />
      ))}
    </div>
  );
}

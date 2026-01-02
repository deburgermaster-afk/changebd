import { useState } from "react";
import { Ban, Check, Users, Vote, Ship, Wheat, Scale, Tractor, Moon, Flame, Star, CircleDot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { politicalParties, type PartyVoteResult } from "@shared/schema";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type PartyType = typeof politicalParties[number];

function PartySymbol({ symbol, color, size = 24 }: { symbol: string; color: string; size?: number }) {
  const iconProps = { size, color, strokeWidth: 2 };
  
  switch (symbol) {
    case "boat":
      return <Ship {...iconProps} />;
    case "sheaf":
      return <Wheat {...iconProps} />;
    case "scales":
      return <Scale {...iconProps} />;
    case "plough":
      return <Tractor {...iconProps} />;
    case "crescent":
      return <Moon {...iconProps} />;
    case "torch":
      return <Flame {...iconProps} />;
    case "star":
      return <Star {...iconProps} />;
    case "hammer-sickle":
      return <CircleDot {...iconProps} />;
    case "people":
      return <Users {...iconProps} />;
    default:
      return <Vote {...iconProps} />;
  }
}

interface PartyButtonProps {
  party: PartyType;
  voteResult?: PartyVoteResult;
  isSelected: boolean;
  hasVoted: boolean;
  onVote: () => void;
  isPending: boolean;
}

function PartyButton({ party, voteResult, isSelected, hasVoted, onVote, isPending }: PartyButtonProps) {
  const isBanned = party.status === "banned";
  const votes = voteResult?.votes ?? 0;
  const percentage = voteResult?.percentage ?? 0;

  return (
    <button
      onClick={() => !isBanned && !hasVoted && onVote()}
      disabled={isBanned || hasVoted || isPending}
      className={`
        relative w-full p-4 rounded-md border transition-all text-left
        ${isBanned 
          ? "bg-destructive/10 border-destructive/30 cursor-not-allowed opacity-70" 
          : isSelected 
            ? "bg-primary/10 border-primary ring-2 ring-primary" 
            : hasVoted 
              ? "bg-muted/50 cursor-default"
              : "bg-card border-border hover-elevate active-elevate-2 cursor-pointer"
        }
      `}
      data-testid={`button-vote-party-${party.id}`}
    >
      {isBanned && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-destructive/5 rounded-md">
          <div className="flex flex-col items-center gap-1">
            <Ban className="h-10 w-10 text-destructive" />
            <span className="text-xs font-bold text-destructive uppercase tracking-wider">BANNED</span>
          </div>
        </div>
      )}
      
      <div className={`flex items-center gap-2 sm:gap-3 ${isBanned ? "opacity-40" : ""}`}>
        <div 
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${party.color}20`, border: `2px solid ${party.color}` }}
        >
          <PartySymbol symbol={party.symbol} color={party.color} size={18} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <h3 className="font-semibold text-xs sm:text-sm truncate">{party.name}</h3>
            <Badge variant="secondary" className="text-[10px] sm:text-xs hidden sm:inline-flex">{party.shortName}</Badge>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">{party.description}</p>
          
          {hasVoted && !isBanned && (
            <div className="flex items-center gap-2 sm:gap-3 mt-1 sm:mt-2 text-[10px] sm:text-xs">
              <span className="font-medium tabular-nums">{percentage.toFixed(1)}%</span>
              <span className="text-muted-foreground tabular-nums">{votes.toLocaleString()}</span>
            </div>
          )}
        </div>
        
        {isSelected && hasVoted && (
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>
    </button>
  );
}

interface PartyVotingSectionProps {
  results?: PartyVoteResult[];
  onVote?: (partyId: string) => void;
  hasVoted?: boolean;
  selectedPartyId?: string;
  isLoading?: boolean;
}

export function PartyVotingSection({ 
  results, 
  onVote, 
  hasVoted = false,
  selectedPartyId,
  isLoading 
}: PartyVotingSectionProps) {
  const [isPending, setIsPending] = useState(false);
  const [confirmParty, setConfirmParty] = useState<string | null>(null);
  const [localVotedParty, setLocalVotedParty] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const effectiveHasVoted = hasVoted || localVotedParty !== null;
  const effectiveSelectedParty = selectedPartyId || localVotedParty;

  const handleSelectParty = (partyId: string) => {
    if (effectiveHasVoted || isPending || voteError) return;
    setConfirmParty(partyId);
  };

  const handleConfirmVote = async () => {
    if (!confirmParty || effectiveHasVoted || isPending) return;
    setIsPending(true);
    setVoteError(null);
    const votedFor = confirmParty;
    setConfirmParty(null);
    
    try {
      await onVote?.(votedFor);
      setLocalVotedParty(votedFor);
    } catch (err) {
      setVoteError("Vote failed. Please try again.");
      setConfirmParty(votedFor);
    } finally {
      setIsPending(false);
    }
  };

  const handleCancelVote = () => {
    setConfirmParty(null);
    setVoteError(null);
  };

  const getVoteResult = (partyId: string) => {
    return results?.find(r => r.partyId === partyId);
  };

  const chartData = effectiveHasVoted && results 
    ? politicalParties
        .filter(p => p.status !== "banned")
        .map(party => {
          const result = getVoteResult(party.id);
          return {
            name: party.shortName,
            votes: result?.votes ?? 0,
            color: party.color,
          };
        })
        .sort((a, b) => b.votes - a.votes)
    : [];

  const totalVotes = results?.reduce((sum, r) => sum + r.votes, 0) ?? 0;

  if (isLoading) {
    return (
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-8 w-64 bg-muted rounded mb-6 animate-pulse" />
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-20 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-6 sm:py-8" data-testid="section-party-voting">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2" data-testid="text-party-voting-title">
            <Vote className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            Party Voting
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            {effectiveHasVoted 
              ? `You voted! ${totalVotes.toLocaleString()} total votes.`
              : "Tap to cast your anonymous vote"}
          </p>
        </div>

        {chartData.length > 0 && (
          <Card className="mb-6 p-4">
            <h3 className="text-sm font-medium mb-4 text-muted-foreground">Vote Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px",
                    fontSize: "12px"
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="votes" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {confirmParty && !effectiveHasVoted && (
          <Card className={`mb-4 p-4 ${voteError ? "border-destructive bg-destructive/5" : "border-primary bg-primary/5"}`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <Vote className={`h-5 w-5 ${voteError ? "text-destructive" : "text-primary"}`} />
                <div>
                  <p className="font-medium text-sm">
                    {voteError ? "Vote Failed" : "Confirm your vote"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {voteError || `Vote for ${politicalParties.find(p => p.id === confirmParty)?.name}?`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCancelVote}
                  disabled={isPending}
                  data-testid="button-cancel-vote"
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleConfirmVote}
                  disabled={isPending}
                  data-testid="button-confirm-vote"
                >
                  {isPending ? "Voting..." : voteError ? "Retry" : "Confirm Vote"}
                </Button>
              </div>
            </div>
          </Card>
        )}

        <div className="grid gap-2 sm:gap-3 md:grid-cols-2">
          {politicalParties.map((party) => (
            <PartyButton
              key={party.id}
              party={party}
              voteResult={getVoteResult(party.id)}
              isSelected={confirmParty === party.id || effectiveSelectedParty === party.id}
              hasVoted={effectiveHasVoted}
              onVote={() => handleSelectParty(party.id)}
              isPending={isPending}
            />
          ))}
        </div>

        {effectiveHasVoted && (
          <div className="mt-3 sm:mt-4 flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span data-testid="text-total-party-votes">
              Total votes: {totalVotes.toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

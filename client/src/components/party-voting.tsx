import { useState } from "react";
import { Check, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { politicalParties, type PartyVoteResult } from "@shared/schema";

interface PartyCardProps {
  party: typeof politicalParties[number];
  voteResult?: PartyVoteResult;
  isSelected: boolean;
  hasVoted: boolean;
  onSelect: () => void;
}

function PartyIcon({ partyId, color }: { partyId: string; color: string }) {
  const initials = partyId.split("-").map(w => w[0].toUpperCase()).join("");
  return (
    <div 
      className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  );
}

function PartyCard({ party, voteResult, isSelected, hasVoted, onSelect }: PartyCardProps) {
  const percentage = voteResult?.percentage ?? 0;
  const votes = voteResult?.votes ?? 0;

  return (
    <Card 
      className={`cursor-pointer transition-all hover-elevate ${
        isSelected ? "ring-2 ring-primary" : ""
      } ${hasVoted && !isSelected ? "opacity-60" : ""}`}
      onClick={onSelect}
      data-testid={`card-party-${party.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <PartyIcon partyId={party.id} color={party.color} />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate" data-testid={`text-party-name-${party.id}`}>
              {party.name}
            </h3>
            <p className="text-xs text-muted-foreground">{party.shortName}</p>
            {hasVoted && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="tabular-nums">{percentage.toFixed(1)}%</span>
                  <span className="text-muted-foreground tabular-nums">{votes.toLocaleString()} votes</span>
                </div>
                <Progress value={percentage} className="h-2" />
              </div>
            )}
          </div>
          {isSelected && hasVoted && (
            <div className="flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
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
  const [localSelected, setLocalSelected] = useState<string | null>(selectedPartyId ?? null);
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = (partyId: string) => {
    if (hasVoted) return;
    setLocalSelected(partyId);
  };

  const handleSubmit = async () => {
    if (!localSelected || hasVoted) return;
    setSubmitting(true);
    await onVote?.(localSelected);
    setSubmitting(false);
  };

  const getVoteResult = (partyId: string) => {
    return results?.find(r => r.partyId === partyId);
  };

  if (isLoading) {
    return (
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="h-8 w-48 bg-muted rounded mb-6 animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-muted" />
                    <div className="flex-1">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12" data-testid="section-party-voting">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-party-voting-title">
              Political Party Voting
            </h2>
            <p className="text-muted-foreground text-sm">
              {hasVoted 
                ? "Thank you for voting! Results are shown below."
                : "Select your preferred party and cast your anonymous vote"}
            </p>
          </div>
          {!hasVoted && localSelected && (
            <Button 
              onClick={handleSubmit} 
              disabled={submitting}
              data-testid="button-submit-party-vote"
            >
              {submitting ? "Submitting..." : "Cast Vote"}
            </Button>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {politicalParties.map((party) => (
            <PartyCard
              key={party.id}
              party={party}
              voteResult={getVoteResult(party.id)}
              isSelected={localSelected === party.id}
              hasVoted={hasVoted}
              onSelect={() => handleSelect(party.id)}
            />
          ))}
        </div>

        {hasVoted && results && (
          <Card className="mt-6 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span data-testid="text-total-party-votes">
                Total votes: {results.reduce((sum, r) => sum + r.votes, 0).toLocaleString()}
              </span>
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}

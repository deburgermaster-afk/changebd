import { useQuery, useMutation } from "@tanstack/react-query";
import { PartyVotingSection } from "@/components/party-voting";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { politicalParties, type PartyVoteResult } from "@shared/schema";
import { Info, AlertTriangle, Users, Vote } from "lucide-react";

export default function PartiesPage() {
  const { toast } = useToast();

  const { data: results, isLoading } = useQuery<PartyVoteResult[]>({
    queryKey: ["/api/parties/votes"],
  });

  const { data: voteStatus } = useQuery<{ hasVoted: boolean; partyId?: string }>({
    queryKey: ["/api/parties/vote-status"],
  });

  const voteOnParty = useMutation({
    mutationFn: async (partyId: string) => {
      return apiRequest("POST", "/api/parties/vote", { partyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties/votes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parties/vote-status"] });
      toast({ title: "Vote cast!", description: "Your anonymous party vote has been recorded." });
    },
  });

  const handleVote = async (partyId: string) => {
    await voteOnParty.mutateAsync(partyId);
  };

  const totalVotes = results?.reduce((sum, r) => sum + r.votes, 0) ?? 0;
  const registeredParties = politicalParties.filter(p => p.status === "active").length;
  const bannedParties = politicalParties.filter(p => p.status === "banned").length;

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-parties-page-title">
            <Vote className="h-8 w-8 text-primary" />
            Political Party Voting
          </h1>
          <p className="text-muted-foreground mt-1">
            Based on Bangladesh Election Commission data (2024-2025)
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{formatNumber(totalVotes)}</p>
                <p className="text-xs text-muted-foreground">Total Votes</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                <Info className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{registeredParties}</p>
                <p className="text-xs text-muted-foreground">Active Parties</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{bannedParties}</p>
                <p className="text-xs text-muted-foreground">Suspended</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mb-6 p-4 bg-muted/50">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Election Commission Update</p>
              <p>As of 2025, Bangladesh has 59 registered political parties. Following the July 2024 uprising, the Bangladesh Awami League's registration has been suspended. 26+ new parties have been formed since then, including the youth-led National Citizen Party (NCP).</p>
            </div>
          </div>
        </Card>
      </div>

      <PartyVotingSection
        results={results}
        hasVoted={voteStatus?.hasVoted}
        selectedPartyId={voteStatus?.partyId}
        onVote={handleVote}
        isLoading={isLoading}
      />
    </div>
  );
}

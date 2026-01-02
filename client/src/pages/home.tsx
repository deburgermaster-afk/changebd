import { useQuery, useMutation } from "@tanstack/react-query";
import { HeroSection } from "@/components/hero-section";
import { CaseList } from "@/components/case-card";
import { Leaderboard } from "@/components/leaderboard";
import { PollList } from "@/components/voting-polls";
import { PartyVotingSection } from "@/components/party-voting";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Case, PlatformStats, Poll, PartyVoteResult } from "@shared/schema";

export default function HomePage() {
  const { toast } = useToast();

  const { data: stats } = useQuery<PlatformStats>({
    queryKey: ["/api/stats"],
  });

  const { data: cases, isLoading: casesLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const { data: polls, isLoading: pollsLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
  });

  const { data: partyResults, isLoading: partyLoading } = useQuery<PartyVoteResult[]>({
    queryKey: ["/api/parties/votes"],
  });

  const { data: partyVoteStatus } = useQuery<{ hasVoted: boolean; partyId?: string }>({
    queryKey: ["/api/parties/vote-status"],
  });

  const { data: pollVoteStatus } = useQuery<Record<string, string>>({
    queryKey: ["/api/polls/vote-status"],
  });

  const voteOnCase = useMutation({
    mutationFn: async (caseId: string) => {
      return apiRequest("POST", `/api/cases/${caseId}/vote`, { direction: "up" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Vote recorded!", description: "Thank you for your support." });
    },
  });

  const voteOnParty = useMutation({
    mutationFn: async (partyId: string) => {
      return apiRequest("POST", "/api/parties/vote", { partyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parties/votes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parties/vote-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Vote cast!", description: "Your party vote has been recorded." });
    },
  });

  const voteOnPoll = useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string }) => {
      return apiRequest("POST", `/api/polls/${pollId}/vote`, { optionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls/vote-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Vote recorded!", description: "Thank you for participating." });
    },
  });

  const featuredCases = cases?.slice(0, 4) ?? [];
  const featuredPolls = polls?.filter(p => p.active).slice(0, 2) ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <HeroSection stats={stats} />

      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-recent-cases-title">Recent Cases</h2>
              <p className="text-muted-foreground text-sm">The latest issues raised by the community</p>
            </div>
            <Link href="/cases">
              <Button variant="outline" className="gap-1" data-testid="button-view-all-cases">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <CaseList 
            cases={featuredCases} 
            isLoading={casesLoading} 
            onVote={(id) => voteOnCase.mutate(id)}
          />
        </div>
      </section>

      <PartyVotingSection
        results={partyResults}
        hasVoted={partyVoteStatus?.hasVoted}
        selectedPartyId={partyVoteStatus?.partyId}
        onVote={(partyId) => voteOnParty.mutate(partyId)}
        isLoading={partyLoading}
      />

      <section className="py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
                <div>
                  <h2 className="text-2xl font-bold" data-testid="text-active-polls-title">Active Polls</h2>
                  <p className="text-muted-foreground text-sm">Have your say on current issues</p>
                </div>
                <Link href="/vote">
                  <Button variant="outline" size="sm" className="gap-1">
                    All Polls
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <PollList 
                polls={featuredPolls} 
                isLoading={pollsLoading}
                votedPolls={pollVoteStatus ?? {}}
                onVote={(pollId, optionId) => voteOnPoll.mutate({ pollId, optionId })}
              />
            </div>
            <div>
              <Leaderboard cases={cases ?? []} isLoading={casesLoading} limit={5} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus } from "lucide-react";
import { PollList } from "@/components/voting-polls";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Poll } from "@shared/schema";

export default function VotePage() {
  const { toast } = useToast();

  const { data: polls, isLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
  });

  const { data: pollVoteStatus } = useQuery<Record<string, string>>({
    queryKey: ["/api/polls/vote-status"],
  });

  const voteOnPoll = useMutation({
    mutationFn: async ({ pollId, optionId }: { pollId: string; optionId: string }) => {
      return apiRequest("POST", `/api/polls/${pollId}/vote`, { optionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls/vote-status"] });
      toast({ title: "Vote recorded!", description: "Thank you for participating." });
    },
  });

  const activePolls = polls?.filter(p => p.active) ?? [];
  const expiredPolls = polls?.filter(p => !p.active) ?? [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-vote-page-title">Voting Polls</h1>
          <p className="text-muted-foreground">Cast your anonymous vote on community issues</p>
        </div>
        <Link href="/create-poll">
          <Button className="gap-1" data-testid="button-create-poll">
            <Plus className="h-4 w-4" />
            Create Poll
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="active" className="space-y-6">
        <TabsList>
          <TabsTrigger value="active" data-testid="tab-active-polls">
            Active ({activePolls.length})
          </TabsTrigger>
          <TabsTrigger value="expired" data-testid="tab-expired-polls">
            Expired ({expiredPolls.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <PollList 
            polls={activePolls}
            isLoading={isLoading}
            votedPolls={pollVoteStatus ?? {}}
            onVote={(pollId, optionId) => voteOnPoll.mutate({ pollId, optionId })}
          />
        </TabsContent>

        <TabsContent value="expired">
          <PollList 
            polls={expiredPolls}
            isLoading={isLoading}
            votedPolls={pollVoteStatus ?? {}}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

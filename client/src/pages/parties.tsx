import { useQuery, useMutation } from "@tanstack/react-query";
import { PartyVotingSection } from "@/components/party-voting";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { politicalParties, type PartyVoteResult } from "@shared/schema";

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
      toast({ title: "Vote cast!", description: "Your party vote has been recorded." });
    },
  });

  const chartData = results?.map(r => {
    const party = politicalParties.find(p => p.id === r.partyId);
    return {
      name: party?.shortName ?? r.partyId,
      value: r.votes,
      color: party?.color ?? "#6B7280",
    };
  }).filter(d => d.value > 0) ?? [];

  const totalVotes = results?.reduce((sum, r) => sum + r.votes, 0) ?? 0;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold" data-testid="text-parties-page-title">Political Party Voting</h1>
          <p className="text-muted-foreground">Cast your anonymous vote for your preferred political party</p>
        </div>

        {voteStatus?.hasVoted && chartData.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Current Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} votes`, "Votes"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center text-sm text-muted-foreground mt-4">
                Total votes: {totalVotes.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <PartyVotingSection
        results={results}
        hasVoted={voteStatus?.hasVoted}
        selectedPartyId={voteStatus?.partyId}
        onVote={(partyId) => voteOnParty.mutate(partyId)}
        isLoading={isLoading}
      />
    </div>
  );
}

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Search, MapPin, Users, Check, Vote, User, ChevronRight, Building } from "lucide-react";
import { type Constituency, type ConstituencyVoteResult, divisions, politicalParties } from "@shared/schema";

function getPartyColor(partyId: string): string {
  return politicalParties.find(p => p.id === partyId)?.color ?? "#6B7280";
}

function getPartyName(partyId: string): string {
  return politicalParties.find(p => p.id === partyId)?.shortName ?? "IND";
}

interface CandidateCardProps {
  candidate: Constituency["candidates"][number];
  voteResult?: ConstituencyVoteResult;
  isSelected: boolean;
  hasVoted: boolean;
  onSelect: () => void;
  isPending: boolean;
}

function CandidateCard({ candidate, voteResult, isSelected, hasVoted, onSelect, isPending }: CandidateCardProps) {
  const partyColor = getPartyColor(candidate.partyId);
  const partyName = getPartyName(candidate.partyId);
  const votes = voteResult?.votes ?? 0;
  const percentage = voteResult?.percentage ?? 0;

  return (
    <button
      onClick={onSelect}
      disabled={hasVoted || isPending}
      className={`
        w-full p-4 rounded-md border transition-all text-left
        ${isSelected 
          ? "bg-primary/10 border-primary ring-2 ring-primary" 
          : hasVoted 
            ? "bg-muted/50 cursor-default"
            : "bg-card border-border hover-elevate active-elevate-2 cursor-pointer"
        }
      `}
      data-testid={`button-vote-candidate-${candidate.id}`}
    >
      <div className="flex items-center gap-4">
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg"
          style={{ backgroundColor: partyColor }}
        >
          <User className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold">{candidate.name}</h3>
            <Badge 
              variant="secondary" 
              className="text-xs"
              style={{ backgroundColor: `${partyColor}20`, color: partyColor }}
            >
              {partyName}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{candidate.nameBn}</p>
          {candidate.profession && (
            <p className="text-xs text-muted-foreground mt-1">{candidate.profession}</p>
          )}
          
          {hasVoted && (
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="font-medium tabular-nums">{percentage.toFixed(1)}%</span>
              <span className="text-muted-foreground tabular-nums">{votes.toLocaleString()} votes</span>
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

interface ConstituencyDetailProps {
  constituency: Constituency;
  onBack: () => void;
}

function ConstituencyDetail({ constituency, onBack }: ConstituencyDetailProps) {
  const { toast } = useToast();
  const [confirmCandidate, setConfirmCandidate] = useState<string | null>(null);
  const [localVotedCandidate, setLocalVotedCandidate] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);

  const { data: votes } = useQuery<ConstituencyVoteResult[]>({
    queryKey: ["/api/constituencies", constituency.id, "votes"],
  });

  const { data: voteStatus } = useQuery<Record<string, string>>({
    queryKey: ["/api/constituency-vote-status"],
  });

  const voteOnConstituency = useMutation({
    mutationFn: async (candidateId: string) => {
      return apiRequest("POST", `/api/constituencies/${constituency.id}/vote`, { candidateId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/constituencies", constituency.id, "votes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/constituency-vote-status"] });
      toast({ title: "Vote cast!", description: "Your anonymous vote has been recorded." });
    },
  });

  const hasVoted = !!voteStatus?.[constituency.id] || localVotedCandidate !== null;
  const selectedCandidateId = voteStatus?.[constituency.id] || localVotedCandidate;

  const handleSelectCandidate = (candidateId: string) => {
    if (hasVoted || isPending || voteError) return;
    setConfirmCandidate(candidateId);
  };

  const handleConfirmVote = async () => {
    if (!confirmCandidate || hasVoted || isPending) return;
    setIsPending(true);
    setVoteError(null);
    const votedFor = confirmCandidate;
    setConfirmCandidate(null);
    
    try {
      await voteOnConstituency.mutateAsync(votedFor);
      setLocalVotedCandidate(votedFor);
    } catch (err) {
      setVoteError("Vote failed. Please try again.");
      setConfirmCandidate(votedFor);
    } finally {
      setIsPending(false);
    }
  };

  const handleCancelVote = () => {
    setConfirmCandidate(null);
    setVoteError(null);
  };

  const getVoteResult = (candidateId: string) => {
    return votes?.find(v => v.candidateId === candidateId);
  };

  const chartData = hasVoted && votes
    ? constituency.candidates.map(c => ({
        name: c.name.split(" ").slice(-1)[0],
        party: getPartyName(c.partyId),
        votes: getVoteResult(c.id)?.votes ?? 0,
        color: getPartyColor(c.partyId),
      })).sort((a, b) => b.votes - a.votes)
    : [];

  const totalVotes = votes?.reduce((sum, v) => sum + v.votes, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="outline" size="sm" onClick={onBack} data-testid="button-back-to-list">
          Back to List
        </Button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            {constituency.code}
          </h2>
          <p className="text-muted-foreground">{constituency.nameBn}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Building className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{constituency.district}, {constituency.division.charAt(0).toUpperCase() + constituency.division.slice(1)}</p>
              <p className="text-xs text-muted-foreground">
                {constituency.areas.join(", ")}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{constituency.totalVoters.toLocaleString()} Eligible Voters</p>
              <p className="text-xs text-muted-foreground">
                {totalVotes.toLocaleString()} votes cast on this platform
              </p>
            </div>
          </div>
        </Card>
      </div>

      {hasVoted && chartData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium mb-4 text-muted-foreground">Vote Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="party" 
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

      {confirmCandidate && !hasVoted && (
        <Card className={`p-4 ${voteError ? "border-destructive bg-destructive/5" : "border-primary bg-primary/5"}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Vote className={`h-5 w-5 ${voteError ? "text-destructive" : "text-primary"}`} />
              <div>
                <p className="font-medium text-sm">
                  {voteError ? "Vote Failed" : "Confirm your vote"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {voteError || `Vote for ${constituency.candidates.find(c => c.id === confirmCandidate)?.name}?`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleCancelVote}
                disabled={isPending}
                data-testid="button-cancel-constituency-vote"
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                onClick={handleConfirmVote}
                disabled={isPending}
                data-testid="button-confirm-constituency-vote"
              >
                {isPending ? "Voting..." : voteError ? "Retry" : "Confirm Vote"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="space-y-3">
        <h3 className="font-medium">Candidates ({constituency.candidates.length})</h3>
        {constituency.candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            voteResult={getVoteResult(candidate.id)}
            isSelected={confirmCandidate === candidate.id || selectedCandidateId === candidate.id}
            hasVoted={hasVoted}
            onSelect={() => handleSelectCandidate(candidate.id)}
            isPending={isPending}
          />
        ))}
      </div>
    </div>
  );
}

export default function ConstituenciesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDivision, setSelectedDivision] = useState<string>("all");
  const [selectedConstituency, setSelectedConstituency] = useState<Constituency | null>(null);

  const { data: constituencies, isLoading } = useQuery<Constituency[]>({
    queryKey: ["/api/constituencies"],
  });

  const filteredConstituencies = constituencies?.filter(c => {
    const matchesSearch = 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nameBn.includes(searchQuery) ||
      c.areas.some(a => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
      c.areasBn.some(a => a.includes(searchQuery)) ||
      c.district.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDivision = selectedDivision === "all" || c.division === selectedDivision;
    
    return matchesSearch && matchesDivision;
  }) ?? [];

  if (selectedConstituency) {
    return (
      <div className="min-h-screen">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <ConstituencyDetail 
            constituency={selectedConstituency} 
            onBack={() => setSelectedConstituency(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-constituencies-page-title">
            <Vote className="h-8 w-8 text-primary" />
            MP/Constituency Voting
          </h1>
          <p className="text-muted-foreground mt-1">
            আসন ভিত্তিক ভোট - Based on Bangladesh Election Commission 2026 data
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold tabular-nums">{constituencies?.length ?? 0}</p>
                <p className="text-xs text-muted-foreground">Constituencies</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold tabular-nums">2,582</p>
                <p className="text-xs text-muted-foreground">Total Candidates</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <Building className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-2xl font-bold tabular-nums">8</p>
                <p className="text-xs text-muted-foreground">Divisions</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mb-6 p-4 bg-muted/50">
          <p className="text-sm text-muted-foreground">
            <strong>Election Date:</strong> February 12, 2026 | <strong>Total Seats:</strong> 300 | <strong>Eligible Voters:</strong> 127.7 million
          </p>
        </Card>

        <div className="flex gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search constituency, area, or district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-constituency"
            />
          </div>
          <Select value={selectedDivision} onValueChange={setSelectedDivision}>
            <SelectTrigger className="w-[180px]" data-testid="select-division">
              <SelectValue placeholder="All Divisions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {divisions.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name} ({d.nameBn})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : filteredConstituencies.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No constituencies found matching your search.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredConstituencies.map(constituency => (
              <Card 
                key={constituency.id}
                className="p-4 cursor-pointer hover-elevate"
                onClick={() => setSelectedConstituency(constituency)}
                data-testid={`card-constituency-${constituency.id}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{constituency.code}</h3>
                        <Badge variant="secondary" className="text-xs">{constituency.nameBn}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {constituency.district} | {constituency.areas.slice(0, 2).join(", ")}
                        {constituency.areas.length > 2 && ` +${constituency.areas.length - 2} more`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {constituency.candidates.length} candidates | {constituency.totalVoters.toLocaleString()} voters
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
import { Search, MapPin, Users, Check, Vote, User, ChevronRight, Building, Star, Share2, Download } from "lucide-react";
import { type Constituency, type ConstituencyVoteResult, divisions, politicalParties } from "@shared/schema";
import { PartyLogo } from "@/components/party-logos";
import html2canvas from "html2canvas";

function getParty(partyId: string) {
  return politicalParties.find(p => p.id === partyId);
}

function getPartyColor(partyId: string): string {
  return getParty(partyId)?.color ?? "#6B7280";
}

function getPartyFullName(partyId: string): string {
  return getParty(partyId)?.name ?? "Independent";
}

function getPartySymbol(partyId: string): string {
  return getParty(partyId)?.symbol ?? "";
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
  const party = getParty(candidate.partyId);
  const partyColor = party?.color ?? "#6B7280";
  const partyName = party?.name ?? "Independent";
  const votes = voteResult?.votes ?? 0;
  const percentage = voteResult?.percentage ?? 0;
  const isShahid = candidate.partyId === "shahid";

  return (
    <button
      onClick={onSelect}
      disabled={hasVoted || isPending || isShahid}
      className={`
        w-full p-4 rounded-md border-2 transition-all text-left
        ${isShahid 
          ? "bg-gradient-to-r from-amber-100 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/20 border-amber-400 ring-2 ring-amber-400/50 cursor-default"
          : isSelected 
            ? "bg-primary/10 border-primary ring-2 ring-primary" 
            : hasVoted 
              ? "bg-muted/50 cursor-default border-border"
              : "bg-card border-border hover-elevate active-elevate-2 cursor-pointer"
        }
      `}
      data-testid={`button-vote-candidate-${candidate.id}`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <div 
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-lg p-2 ${isShahid ? "ring-4 ring-amber-400 shadow-lg shadow-amber-400/30" : ""}`}
          style={{ backgroundColor: partyColor }}
        >
          <PartyLogo symbol={getPartySymbol(candidate.partyId)} className="w-6 h-6 sm:w-7 sm:h-7" alt={partyName} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-semibold ${isShahid ? "text-amber-700 dark:text-amber-400" : ""}`}>{candidate.name}</h3>
            {isShahid && (
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            )}
          </div>
          <p className="text-sm text-muted-foreground">{candidate.nameBn}</p>
          
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <div 
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-md"
              style={{ backgroundColor: `${partyColor}20` }}
            >
              <PartyLogo symbol={getPartySymbol(candidate.partyId)} className="w-4 h-4" alt={partyName} />
              <span className="text-xs font-medium text-foreground">{partyName}</span>
            </div>
          </div>
          
          {candidate.profession && (
            <p className="text-xs text-muted-foreground mt-1">{candidate.profession}</p>
          )}
          
          {hasVoted && !isShahid && (
            <div className="flex items-center gap-3 mt-2 text-sm">
              <span className="font-medium tabular-nums">{percentage.toFixed(1)}%</span>
              <span className="text-muted-foreground tabular-nums">{votes.toLocaleString()} votes</span>
            </div>
          )}
        </div>
        
        {isSelected && hasVoted && !isShahid && (
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
  const [isSharing, setIsSharing] = useState(false);
  const shareRef = useRef<HTMLDivElement>(null);

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
    const candidate = constituency.candidates.find(c => c.id === candidateId);
    if (candidate?.partyId === "shahid") return;
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

  const votableCandidates = constituency.candidates.filter(c => c.partyId !== "shahid");
  
  const chartData = hasVoted && votes
    ? votableCandidates.map(c => {
        const result = getVoteResult(c.id);
        return {
          name: c.name.split(" ").slice(-1)[0],
          fullName: c.name,
          party: getPartyFullName(c.partyId),
          votes: result?.votes ?? 0,
          color: getPartyColor(c.partyId),
        };
      }).sort((a, b) => b.votes - a.votes)
    : [];

  const totalVotes = votes?.filter(v => {
    const candidate = constituency.candidates.find(c => c.id === v.candidateId);
    return candidate?.partyId !== "shahid";
  }).reduce((sum, v) => sum + v.votes, 0) ?? 0;

  const handleShare = async () => {
    if (!shareRef.current || !hasVoted) return;
    setIsSharing(true);
    
    try {
      const canvas = await html2canvas(shareRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), "image/png");
      });
      
      if (!blob) {
        toast({ title: "Failed to generate image", variant: "destructive" });
        return;
      }
      
      const file = new File([blob], `jonomotbd-${constituency.code}.png`, { type: "image/png" });
      
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: `${constituency.code} - Vote Results`,
            text: `Check out the voting results for ${constituency.code} on JonomotBD!`,
          });
        } catch {
          downloadBlob(blob);
        }
      } else {
        downloadBlob(blob);
      }
      
      toast({ title: "Share image ready!" });
    } catch {
      toast({ title: "Failed to generate share image", variant: "destructive" });
    } finally {
      setIsSharing(false);
    }
  };

  const downloadBlob = (blob: Blob) => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `jonomotbd-${constituency.code}.png`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <Button variant="outline" size="sm" onClick={onBack} data-testid="button-back-to-list">
            Back
          </Button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              {constituency.code}
            </h2>
            <p className="text-sm text-muted-foreground">{constituency.nameBn}</p>
          </div>
        </div>
        
        {hasVoted && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleShare}
            disabled={isSharing}
            data-testid="button-share-results"
          >
            {isSharing ? (
              <Download className="h-4 w-4 animate-pulse" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            <span className="ml-1.5 hidden sm:inline">Share</span>
          </Button>
        )}
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
        <div ref={shareRef} className="rounded-lg overflow-hidden" data-testid="share-container">
          <Card className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <div>
                <h3 className="font-bold text-sm sm:text-base" data-testid="text-share-constituency">{constituency.code} - {constituency.nameBn}</h3>
                <p className="text-xs text-muted-foreground">{constituency.district}, {constituency.division}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium" data-testid="text-share-votes">{totalVotes.toLocaleString()} votes</p>
                <p className="text-xs text-muted-foreground">on JonomotBD</p>
              </div>
            </div>
            
            <div className="bg-muted/30 rounded-md p-2 sm:p-3">
              <ResponsiveContainer width="100%" height={Math.max(150, chartData.length * 45)}>
                <BarChart 
                  data={chartData} 
                  layout="vertical"
                  margin={{ top: 5, right: 60, left: 5, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category"
                    dataKey="party" 
                    tick={{ fontSize: 10 }}
                    className="fill-muted-foreground"
                    width={80}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))", 
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "6px",
                      fontSize: "11px"
                    }}
                    formatter={(value: number) => [`${value.toLocaleString()} votes`, "Votes"]}
                    labelFormatter={(label) => chartData.find(d => d.party === label)?.fullName ?? label}
                  />
                  <Bar 
                    dataKey="votes" 
                    radius={[0, 4, 4, 0]}
                    maxBarSize={32}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList 
                      dataKey="votes" 
                      position="right" 
                      formatter={(value: number) => `${value.toLocaleString()}`}
                      className="text-xs"
                      style={{ fill: "currentColor" }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">Bangladesh 2026 Election</p>
              <p className="text-xs font-medium text-primary" data-testid="text-share-url">jonomotbd.replit.app</p>
            </div>
          </Card>
        </div>
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
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
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
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 sm:gap-3" data-testid="text-constituencies-page-title">
            <Vote className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            MP Voting
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            আসন ভিত্তিক ভোট - Bangladesh Election 2026
          </p>
        </div>

        <div className="grid gap-3 grid-cols-3 mb-4 sm:mb-6">
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <div>
                <p className="text-lg sm:text-2xl font-bold tabular-nums">{constituencies?.length ?? 0}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Constituencies</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold tabular-nums">2,582</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Candidates</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
              <Building className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              <div>
                <p className="text-lg sm:text-2xl font-bold tabular-nums">8</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Divisions</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="mb-4 sm:mb-6 p-3 sm:p-4 bg-muted/50">
          <p className="text-xs sm:text-sm text-muted-foreground">
            <strong>Election:</strong> Feb 12, 2026 | <strong>Seats:</strong> 300 | <strong>Voters:</strong> 127.7M
          </p>
        </Card>

        <div className="flex gap-2 sm:gap-3 mb-4 sm:mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-constituency"
            />
          </div>
          <Select value={selectedDivision} onValueChange={setSelectedDivision}>
            <SelectTrigger className="w-[130px] sm:w-[180px]" data-testid="select-division">
              <SelectValue placeholder="Division" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Divisions</SelectItem>
              {divisions.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
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
          <div className="space-y-2 sm:space-y-3">
            {filteredConstituencies.map(constituency => (
              <Card 
                key={constituency.id}
                className="p-3 sm:p-4 cursor-pointer hover-elevate"
                onClick={() => setSelectedConstituency(constituency)}
                data-testid={`card-constituency-${constituency.id}`}
              >
                <div className="flex items-center justify-between gap-2 sm:gap-4">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm sm:text-base">{constituency.code}</h3>
                        <Badge variant="secondary" className="text-[10px] sm:text-xs">{constituency.nameBn}</Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {constituency.district} | {constituency.areas[0]}
                        {constituency.areas.length > 1 && ` +${constituency.areas.length - 1}`}
                      </p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                        {constituency.candidates.length} candidates
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

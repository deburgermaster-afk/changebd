import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, Filter, Plus } from "lucide-react";
import { CaseList } from "@/components/case-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Case, CaseCategory } from "@shared/schema";

const categoryLabels: Record<CaseCategory | "all", string> = {
  all: "All Categories",
  political: "Political",
  social: "Social",
  "scam-alert": "Scam Alert",
  environment: "Environment",
  education: "Education",
  healthcare: "Healthcare",
  infrastructure: "Infrastructure",
};

export default function CasesPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<string>("recent");

  const { data: cases, isLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const voteOnCase = useMutation({
    mutationFn: async (caseId: string) => {
      return apiRequest("POST", `/api/cases/${caseId}/vote`, { direction: "up" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({ title: "Vote recorded!", description: "Thank you for your support." });
    },
  });

  let filteredCases = cases ?? [];

  if (search) {
    filteredCases = filteredCases.filter(c => 
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.description.toLowerCase().includes(search.toLowerCase())
    );
  }

  if (category !== "all") {
    filteredCases = filteredCases.filter(c => c.category === category);
  }

  if (sort === "votes") {
    filteredCases = [...filteredCases].sort((a, b) => b.votes - a.votes);
  } else if (sort === "trending") {
    filteredCases = [...filteredCases].filter(c => c.trending);
  } else {
    filteredCases = [...filteredCases].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-cases-page-title">Cases</h1>
          <p className="text-muted-foreground">Browse and support community issues</p>
        </div>
        <Link href="/submit">
          <Button className="gap-1" data-testid="button-raise-new-case">
            <Plus className="h-4 w-4" />
            Raise a Case
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-cases"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-44" data-testid="select-case-category-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(categoryLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-full sm:w-36" data-testid="select-case-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="votes">Most Votes</SelectItem>
            <SelectItem value="trending">Trending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <CaseList 
        cases={filteredCases} 
        isLoading={isLoading}
        onVote={(id) => voteOnCase.mutate(id)}
      />
    </div>
  );
}

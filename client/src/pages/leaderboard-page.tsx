import { useQuery } from "@tanstack/react-query";
import { Leaderboard } from "@/components/leaderboard";
import type { Case } from "@shared/schema";

export default function LeaderboardPage() {
  const { data: cases, isLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold" data-testid="text-leaderboard-page-title">Leaderboard</h1>
        <p className="text-muted-foreground">Top cases by community support</p>
      </div>

      <Leaderboard cases={cases ?? []} isLoading={isLoading} limit={50} />
    </div>
  );
}

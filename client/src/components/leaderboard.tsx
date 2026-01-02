import { Link } from "wouter";
import { Trophy, TrendingUp, TrendingDown, Minus, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import type { Case, CaseCategory } from "@shared/schema";

interface LeaderboardProps {
  cases: Case[];
  isLoading?: boolean;
  limit?: number;
}

const categoryColors: Record<CaseCategory, string> = {
  political: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  social: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  "scam-alert": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  environment: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  education: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  healthcare: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  infrastructure: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

const categoryLabels: Record<CaseCategory, string> = {
  political: "Political",
  social: "Social",
  "scam-alert": "Scam Alert",
  environment: "Environment",
  education: "Education",
  healthcare: "Healthcare",
  infrastructure: "Infrastructure",
};

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
        <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <Trophy className="h-4 w-4 text-gray-500" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
        <Trophy className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
      <span className="text-sm font-medium tabular-nums">{rank}</span>
    </div>
  );
}

function TrendIndicator({ trending }: { trending: boolean }) {
  if (trending) {
    return <TrendingUp className="h-4 w-4 text-green-500" />;
  }
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export function Leaderboard({ cases, isLoading, limit = 10 }: LeaderboardProps) {
  const sortedCases = [...cases]
    .sort((a, b) => b.votes - a.votes)
    .slice(0, limit);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-muted" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
                <div className="h-6 w-16 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sortedCases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No cases yet. Be the first to raise your voice!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-leaderboard">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Top Cases
        </CardTitle>
        <Link href="/leaderboard">
          <Button variant="ghost" size="sm">
            View All
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Case</TableHead>
                <TableHead className="w-24">Category</TableHead>
                <TableHead className="w-24 text-right">Votes</TableHead>
                <TableHead className="w-12 text-center">Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCases.map((c, index) => (
                <TableRow key={c.id} className="hover-elevate" data-testid={`row-leaderboard-${c.id}`}>
                  <TableCell>
                    <RankBadge rank={index + 1} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/cases/${c.id}`}>
                      <span className="font-medium hover:text-primary cursor-pointer line-clamp-1" data-testid={`text-leaderboard-title-${c.id}`}>
                        {c.title}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${categoryColors[c.category]}`}
                    >
                      {categoryLabels[c.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums" data-testid={`text-leaderboard-votes-${c.id}`}>
                    {c.votes.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-center">
                    <TrendIndicator trending={c.trending} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

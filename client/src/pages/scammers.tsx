import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus } from "lucide-react";
import { ScammerListing } from "@/components/scammer-listing";
import { Button } from "@/components/ui/button";
import type { Scammer } from "@shared/schema";

export default function ScammersPage() {
  const { data: scammers, isLoading } = useQuery<Scammer[]>({
    queryKey: ["/api/scammers"],
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-scammers-page-title">Scammer Reports</h1>
          <p className="text-muted-foreground">Help protect the community by reporting and viewing scammers</p>
        </div>
        <Link href="/report-scammer">
          <Button variant="destructive" className="gap-1" data-testid="button-report-scammer">
            <Plus className="h-4 w-4" />
            Report Scammer
          </Button>
        </Link>
      </div>

      <ScammerListing scammers={scammers ?? []} isLoading={isLoading} />
    </div>
  );
}

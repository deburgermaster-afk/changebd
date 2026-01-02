import { Link } from "wouter";
import { Shield, TrendingUp, Users, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { PlatformStats } from "@shared/schema";

interface HeroSectionProps {
  stats?: PlatformStats;
}

export function HeroSection({ stats }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 gradient-bd opacity-50" />
      <div className="absolute top-0 right-0 w-1/2 h-full opacity-5">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path
            d="M50 5 L95 30 L95 70 L50 95 L5 70 L5 30 Z"
            fill="currentColor"
            className="text-primary"
          />
        </svg>
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4" data-testid="text-hero-title">
            Voice of <span className="text-gradient-bd">Bangladesh</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
            Raise your voice, vote on issues, report scammers - all anonymously and encrypted.
            Together we build a better Bangladesh.
          </p>
          
          <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-8">
            <Shield className="h-4 w-4 text-primary" />
            <span>Fully Anonymous & Encrypted</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 mb-12">
            <Link href="/submit">
              <Button size="lg" data-testid="button-hero-raise-voice">
                Raise Your Voice
              </Button>
            </Link>
            <Link href="/cases">
              <Button variant="outline" size="lg" data-testid="button-hero-browse">
                Browse Cases
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold tabular-nums" data-testid="stat-active-cases">
                {stats?.activeCases ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Active Cases</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold tabular-nums" data-testid="stat-total-votes">
                {stats?.totalVotes ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Total Votes</div>
            </Card>
            <Card className="p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold tabular-nums" data-testid="stat-verified-reports">
                {stats?.verifiedReports ?? 0}
              </div>
              <div className="text-xs text-muted-foreground">Verified Reports</div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

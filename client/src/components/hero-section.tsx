import { Link } from "wouter";
import { Shield, TrendingUp, Users, FileText, Vote, ArrowRight, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      
      <div className="relative max-w-7xl mx-auto px-3 sm:px-4 py-10 sm:py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-3 sm:mb-4" data-testid="text-hero-title">
            Voice of <span className="text-gradient-bd">Bangladesh</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
            Raise your voice, vote on issues, report scammers - all anonymously.
            Together we build a better Bangladesh.
          </p>
          
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground mb-8 px-2">
            <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-full">
              <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span>100% Anonymous</span>
            </div>
            <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-full">
              <Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span>AES-256 Encrypted</span>
            </div>
            <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-1 rounded-full">
              <EyeOff className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              <span>Zero Tracking</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-6">
            <Link href="/submit">
              <Button size="default" className="sm:h-11 sm:px-6" data-testid="button-hero-raise-voice">
                Raise Your Voice
              </Button>
            </Link>
            <Link href="/cases">
              <Button variant="outline" size="default" className="sm:h-11 sm:px-6" data-testid="button-hero-browse">
                Browse Cases
              </Button>
            </Link>
          </div>

          <Link href="/gonovote">
            <div className="inline-flex items-center gap-3 px-4 sm:px-6 py-3 mb-8 sm:mb-12 rounded-md bg-gradient-to-r from-[#006A4E] to-[#008060] border border-[#006A4E]/50 shadow-lg hover-elevate cursor-pointer" data-testid="button-gonovote-banner">
              <Vote className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              <div className="text-left">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold text-sm sm:text-base">গণভোট ২০২৬</span>
                  <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">
                    LIVE
                  </Badge>
                </div>
                <span className="text-white/80 text-xs sm:text-sm">Constitutional Reform Referendum</span>
              </div>
              <ArrowRight className="h-5 w-5 text-white/80 ml-2" />
            </div>
          </Link>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 max-w-lg mx-auto">
            <Card className="p-2 sm:p-4 text-center">
              <div className="flex items-center justify-center mb-1 sm:mb-2">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="text-lg sm:text-2xl font-bold tabular-nums" data-testid="stat-active-cases">
                {stats?.activeCases ?? 0}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Active Cases</div>
            </Card>
            <Card className="p-2 sm:p-4 text-center">
              <div className="flex items-center justify-center mb-1 sm:mb-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="text-lg sm:text-2xl font-bold tabular-nums" data-testid="stat-total-votes">
                {stats?.totalVotes ?? 0}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Total Votes</div>
            </Card>
            <Card className="p-2 sm:p-4 text-center">
              <div className="flex items-center justify-center mb-1 sm:mb-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="text-lg sm:text-2xl font-bold tabular-nums" data-testid="stat-verified-reports">
                {stats?.verifiedReports ?? 0}
              </div>
              <div className="text-[10px] sm:text-xs text-muted-foreground">Verified</div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Shield, Lock, Heart } from "lucide-react";
import { BangladeshFlag } from "@/components/bangladesh-flag";

export function Footer() {
  return (
    <footer className="border-t bg-muted/30 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BangladeshFlag size="sm" />
              <span className="font-semibold">changebd.live</span>
            </div>
            <p className="text-sm text-muted-foreground">
              A platform for the people of Bangladesh to raise their voice, 
              vote on issues, and build a better future together.
            </p>
          </div>

          <div>
            <h4 className="font-medium mb-3">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/cases" className="hover:text-foreground transition-colors">Browse Cases</a></li>
              <li><a href="/vote" className="hover:text-foreground transition-colors">Vote on Polls</a></li>
              <li><a href="/parties" className="hover:text-foreground transition-colors">Party Voting</a></li>
              <li><a href="/leaderboard" className="hover:text-foreground transition-colors">Leaderboard</a></li>
              <li><a href="/scammers" className="hover:text-foreground transition-colors">Report Scammer</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-3">Trust & Security</h4>
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <span>Fully Anonymous</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <span>End-to-End Encrypted</span>
              </div>
              <p className="text-xs mt-3">
                Your data is never stored with personal identifiers. 
                All submissions are encrypted and anonymous.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>2026 changebd.live. Made with <Heart className="h-3 w-3 inline text-destructive" /> for Bangladesh.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-foreground transition-colors">Community Guidelines</a>
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

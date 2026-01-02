import { Link, useLocation } from "wouter";
import { Menu, X, Shield, User } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { BangladeshFlag } from "@/components/bangladesh-flag";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/cases", label: "Cases" },
  { href: "/vote", label: "Vote" },
  { href: "/parties", label: "Parties" },
  { href: "/constituencies", label: "MPs" },
  { href: "/news", label: "News" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/scammers", label: "Scammers" },
];

export function Navigation() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between gap-4 h-16">
          <Link href="/" className="flex items-center gap-2">
            <BangladeshFlag size="md" />
            <span className="font-semibold text-lg hidden sm:block" data-testid="text-logo">
              JonomotBD
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? "secondary" : "ghost"}
                  size="sm"
                  data-testid={`link-nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-1 rounded-md">
              <Shield className="h-3 w-3" />
              <span>Anonymous</span>
            </div>
            
            <Link href="/submit">
              <Button size="sm" data-testid="button-raise-case">
                Raise a Case
              </Button>
            </Link>

            <ThemeToggle />

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <nav className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={location === item.href ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setMobileOpen(false)}
                    data-testid={`link-mobile-nav-${item.label.toLowerCase().replace(" ", "-")}`}
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}

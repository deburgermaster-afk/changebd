import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import CasesPage from "@/pages/cases";
import VotePage from "@/pages/vote";
import PartiesPage from "@/pages/parties";
import LeaderboardPage from "@/pages/leaderboard-page";
import ScammersPage from "@/pages/scammers";
import SubmitCasePage from "@/pages/submit-case";
import ReportScammerPage from "@/pages/report-scammer";
import CreatePollPage from "@/pages/create-poll";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/cases" component={CasesPage} />
      <Route path="/vote" component={VotePage} />
      <Route path="/parties" component={PartiesPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/scammers" component={ScammersPage} />
      <Route path="/submit" component={SubmitCasePage} />
      <Route path="/report-scammer" component={ReportScammerPage} />
      <Route path="/create-poll" component={CreatePollPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <div className="min-h-screen flex flex-col">
            <Navigation />
            <main className="flex-1">
              <Router />
            </main>
            <Footer />
          </div>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

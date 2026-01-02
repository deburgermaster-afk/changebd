import { Switch, Route, useLocation } from "wouter";
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
import ConstituenciesPage from "@/pages/constituencies";
import LeaderboardPage from "@/pages/leaderboard-page";
import ScammersPage from "@/pages/scammers";
import SubmitCasePage from "@/pages/submit-case";
import ReportScammerPage from "@/pages/report-scammer";
import CreatePollPage from "@/pages/create-poll";
import NewsPage from "@/pages/news";
import NewsArticlePage from "@/pages/news-article";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import GonovotePage from "@/pages/gonovote";

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/cases" component={CasesPage} />
      <Route path="/vote" component={VotePage} />
      <Route path="/parties" component={PartiesPage} />
      <Route path="/constituencies" component={ConstituenciesPage} />
      <Route path="/leaderboard" component={LeaderboardPage} />
      <Route path="/scammers" component={ScammersPage} />
      <Route path="/submit" component={SubmitCasePage} />
      <Route path="/report-scammer" component={ReportScammerPage} />
      <Route path="/create-poll" component={CreatePollPage} />
      <Route path="/news" component={NewsPage} />
      <Route path="/news/:id" component={NewsArticlePage} />
      <Route path="/glen20/login" component={AdminLogin} />
      <Route path="/glen20/dashboard" component={AdminDashboard} />
      <Route path="/gonovote" component={GonovotePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const [location] = useLocation();
  const isAdminRoute = location.startsWith("/glen20");

  if (isAdminRoute) {
    return <Router />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-1">
        <Router />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;

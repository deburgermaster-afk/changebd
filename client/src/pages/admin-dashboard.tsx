import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PendingCase, PendingScammer, News } from "@shared/schema";
import { 
  Shield, LogOut, FileText, AlertTriangle, Newspaper, 
  Check, X, Sparkles, RefreshCw, ExternalLink, ThumbsUp, ThumbsDown, Globe, Wand2
} from "lucide-react";

function CaseApprovalCard({ caseItem, onApprove, onReject, isPending }: { 
  caseItem: PendingCase; 
  onApprove: () => void; 
  onReject: () => void;
  isPending: boolean;
}) {
  const aiRec = caseItem.aiSuggestion;
  
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-semibold text-sm">{caseItem.title}</h3>
              <Badge variant="secondary" className="text-xs">{caseItem.category}</Badge>
              <Badge 
                variant={caseItem.status === "approved" ? "default" : caseItem.status === "rejected" ? "destructive" : "outline"}
                className="text-xs"
              >
                {caseItem.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{caseItem.description}</p>
            
            {aiRec && (
              <div className={`mt-3 p-2 rounded-md text-xs ${
                aiRec.recommendation === "approve" 
                  ? "bg-green-500/10 border border-green-500/30" 
                  : "bg-red-500/10 border border-red-500/30"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span className="font-medium">
                    AI: {aiRec.recommendation.toUpperCase()} ({Math.round(aiRec.confidence * 100)}%)
                  </span>
                </div>
                <p className="text-muted-foreground">{aiRec.reason}</p>
              </div>
            )}
          </div>
          
          {caseItem.status === "pending" && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onReject}
                disabled={isPending}
                data-testid={`button-reject-case-${caseItem.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                onClick={onApprove}
                disabled={isPending}
                data-testid={`button-approve-case-${caseItem.id}`}
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ScammerApprovalCard({ scammer, onApprove, onReject, isPending }: { 
  scammer: PendingScammer; 
  onApprove: () => void; 
  onReject: () => void;
  isPending: boolean;
}) {
  const aiRec = scammer.aiSuggestion;
  
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-semibold text-sm">{scammer.name}</h3>
              <Badge variant="secondary" className="text-xs">{scammer.type}</Badge>
              <Badge 
                variant={scammer.status === "approved" ? "default" : scammer.status === "rejected" ? "destructive" : "outline"}
                className="text-xs"
              >
                {scammer.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2">{scammer.description}</p>
            
            {aiRec && (
              <div className={`mt-3 p-2 rounded-md text-xs ${
                aiRec.recommendation === "approve" 
                  ? "bg-green-500/10 border border-green-500/30" 
                  : "bg-red-500/10 border border-red-500/30"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span className="font-medium">
                    AI: {aiRec.recommendation.toUpperCase()} ({Math.round(aiRec.confidence * 100)}%)
                  </span>
                </div>
                <p className="text-muted-foreground">{aiRec.reason}</p>
              </div>
            )}
          </div>
          
          {scammer.status === "pending" && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onReject}
                disabled={isPending}
                data-testid={`button-reject-scammer-${scammer.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                onClick={onApprove}
                disabled={isPending}
                data-testid={`button-approve-scammer-${scammer.id}`}
              >
                <Check className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function NewsCard({ news, onApprove, onReject, isPending }: { 
  news: News; 
  onApprove: () => void; 
  onReject: () => void;
  isPending: boolean;
}) {
  const trustPercent = Math.round(news.trustScore * 100);
  
  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h3 className="font-semibold text-sm">{news.title}</h3>
              <Badge 
                variant={news.status === "approved" ? "default" : news.status === "rejected" ? "destructive" : "outline"}
                className="text-xs"
              >
                {news.status}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{news.content}</p>
            
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                {news.source}
              </span>
              <span className={`font-medium ${
                trustPercent >= 70 ? "text-green-600" : trustPercent >= 40 ? "text-yellow-600" : "text-red-600"
              }`}>
                Trust: {trustPercent}%
              </span>
              {news.verified && (
                <Badge variant="default" className="text-xs">
                  <Check className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
          </div>
          
          {news.status === "pending" && (
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onReject}
                disabled={isPending}
                data-testid={`button-reject-news-${news.id}`}
              >
                <ThumbsDown className="w-4 h-4" />
              </Button>
              <Button 
                size="sm" 
                onClick={onApprove}
                disabled={isPending}
                data-testid={`button-approve-news-${news.id}`}
              >
                <ThumbsUp className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("cases");

  const { data: authStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
  });

  const { data: cases = [], isLoading: casesLoading } = useQuery<PendingCase[]>({
    queryKey: ["/api/admin/cases"],
    enabled: !!authStatus?.isAdmin,
  });

  const { data: scammers = [], isLoading: scammersLoading } = useQuery<PendingScammer[]>({
    queryKey: ["/api/admin/scammers"],
    enabled: !!authStatus?.isAdmin,
  });

  const { data: news = [], isLoading: newsLoading } = useQuery<News[]>({
    queryKey: ["/api/admin/news"],
    enabled: !!authStatus?.isAdmin,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/logout"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/status"] });
      setLocation("/glen20/login");
    },
  });

  const approveCaseMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/cases/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cases"] });
      toast({ title: "Case approved" });
    },
  });

  const rejectCaseMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/cases/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cases"] });
      toast({ title: "Case rejected" });
    },
  });

  const approveScammerMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/scammers/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scammers"] });
      toast({ title: "Scammer report approved" });
    },
  });

  const rejectScammerMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/scammers/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/scammers"] });
      toast({ title: "Scammer report rejected" });
    },
  });

  const approveNewsMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/news/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
      toast({ title: "News approved" });
    },
  });

  const rejectNewsMutation = useMutation({
    mutationFn: (id: string) => apiRequest("POST", `/api/admin/news/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
      toast({ title: "News rejected" });
    },
  });

  const generateNewsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/news/generate"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
      toast({ title: "5 news articles generated with AI" });
    },
    onError: () => {
      toast({ title: "Failed to generate news", variant: "destructive" });
    },
  });

  const [selectedTopic, setSelectedTopic] = useState<string>("bangladesh politics");
  
  const { data: topics = [] } = useQuery<{ id: string; label: string }[]>({
    queryKey: ["/api/admin/news/topics"],
  });

  const fetchOnlineNewsMutation = useMutation({
    mutationFn: (topic: string) => apiRequest("POST", "/api/admin/news/fetch-online", { topic }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
      if (data.message) {
        toast({ title: data.message });
      } else {
        toast({ title: `${Array.isArray(data) ? data.length : 0} news articles fetched from online` });
      }
    },
    onError: (error: any) => {
      if (error?.requiresApiKey) {
        toast({ 
          title: "API Key Required", 
          description: "Please configure GNEWS_API_KEY to fetch online news",
          variant: "destructive" 
        });
      } else {
        toast({ title: "Failed to fetch online news", variant: "destructive" });
      }
    },
  });

  const [customContext, setCustomContext] = useState("");

  const generateFromContextMutation = useMutation({
    mutationFn: (context: string) => apiRequest("POST", "/api/admin/news/generate-from-context", { context }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/news"] });
      setCustomContext("");
      toast({ title: `${Array.isArray(data) ? data.length : 0} news articles generated from context` });
    },
    onError: (error: any) => {
      toast({ title: error?.message || "Failed to generate news from context", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (authStatus && !authStatus.isAdmin) {
      setLocation("/glen20/login");
    }
  }, [authStatus, setLocation]);

  if (!authStatus?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  const pendingCases = cases.filter(c => c.status === "pending");
  const pendingScammers = scammers.filter(s => s.status === "pending");
  const pendingNews = news.filter(n => n.status === "pending");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <div>
              <h1 className="font-bold text-lg">Admin Panel</h1>
              <p className="text-xs text-muted-foreground">changebd.live Moderation</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/">
              <Button variant="outline" size="sm">
                View Site
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => logoutMutation.mutate()}
              data-testid="button-admin-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{pendingCases.length}</p>
              <p className="text-xs text-muted-foreground">Pending Cases</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-yellow-600" />
              <p className="text-2xl font-bold">{pendingScammers.length}</p>
              <p className="text-xs text-muted-foreground">Pending Scammers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Newspaper className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold">{pendingNews.length}</p>
              <p className="text-xs text-muted-foreground">Pending News</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="cases" data-testid="tab-admin-cases">
              Cases ({pendingCases.length})
            </TabsTrigger>
            <TabsTrigger value="scammers" data-testid="tab-admin-scammers">
              Scammers ({pendingScammers.length})
            </TabsTrigger>
            <TabsTrigger value="news" data-testid="tab-admin-news">
              News ({pendingNews.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cases">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Case Approval
                </CardTitle>
              </CardHeader>
              <CardContent>
                {casesLoading ? (
                  <p className="text-muted-foreground text-sm">Loading cases...</p>
                ) : cases.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No cases to review</p>
                ) : (
                  cases.map(c => (
                    <CaseApprovalCard
                      key={c.id}
                      caseItem={c}
                      onApprove={() => approveCaseMutation.mutate(c.id)}
                      onReject={() => rejectCaseMutation.mutate(c.id)}
                      isPending={approveCaseMutation.isPending || rejectCaseMutation.isPending}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scammers">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Scammer Approval
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scammersLoading ? (
                  <p className="text-muted-foreground text-sm">Loading scammer reports...</p>
                ) : scammers.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No scammer reports to review</p>
                ) : (
                  scammers.map(s => (
                    <ScammerApprovalCard
                      key={s.id}
                      scammer={s}
                      onApprove={() => approveScammerMutation.mutate(s.id)}
                      onReject={() => rejectScammerMutation.mutate(s.id)}
                      isPending={approveScammerMutation.isPending || rejectScammerMutation.isPending}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="news">
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-row items-center justify-between gap-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Newspaper className="w-5 h-5" />
                    News Management
                  </CardTitle>
                  <Button
                    onClick={() => generateNewsMutation.mutate()}
                    disabled={generateNewsMutation.isPending}
                    data-testid="button-generate-news"
                  >
                    {generateNewsMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Generate
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-md flex-wrap">
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Fetch from online:</span>
                  <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                    <SelectTrigger className="w-[180px]" data-testid="select-news-topic">
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={() => fetchOnlineNewsMutation.mutate(selectedTopic)}
                    disabled={fetchOnlineNewsMutation.isPending}
                    data-testid="button-fetch-online-news"
                  >
                    {fetchOnlineNewsMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4 mr-2" />
                        Fetch Online
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-3 bg-muted/50 rounded-md space-y-2">
                  <div className="flex items-center gap-2">
                    <Wand2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Generate from custom context:</span>
                  </div>
                  <Textarea
                    placeholder="Enter your custom context or topic here (e.g., 'Recent developments in Bangladesh student movements and their impact on political reform')"
                    value={customContext}
                    onChange={(e) => setCustomContext(e.target.value)}
                    className="min-h-[80px] text-sm"
                    data-testid="textarea-custom-context"
                  />
                  <Button
                    variant="outline"
                    onClick={() => generateFromContextMutation.mutate(customContext)}
                    disabled={generateFromContextMutation.isPending || customContext.trim().length < 10}
                    data-testid="button-generate-from-context"
                  >
                    {generateFromContextMutation.isPending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        Generate from Context
                      </>
                    )}
                  </Button>
                  {customContext.trim().length > 0 && customContext.trim().length < 10 && (
                    <p className="text-xs text-muted-foreground">Please enter at least 10 characters</p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {newsLoading ? (
                  <p className="text-muted-foreground text-sm">Loading news...</p>
                ) : news.length === 0 ? (
                  <div className="text-center py-8">
                    <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm mb-4">No news articles yet</p>
                    <Button
                      onClick={() => generateNewsMutation.mutate()}
                      disabled={generateNewsMutation.isPending}
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate News
                    </Button>
                  </div>
                ) : (
                  news.map(n => (
                    <NewsCard
                      key={n.id}
                      news={n}
                      onApprove={() => approveNewsMutation.mutate(n.id)}
                      onReject={() => rejectNewsMutation.mutate(n.id)}
                      isPending={approveNewsMutation.isPending || rejectNewsMutation.isPending}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

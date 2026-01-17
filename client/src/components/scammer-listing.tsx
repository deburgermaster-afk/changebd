import { useState } from "react";
import { Search, AlertTriangle, CheckCircle, Clock, Filter, ExternalLink, FileText, Link as LinkIcon, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Scammer, ScammerType } from "@shared/schema";

interface ScammerListingProps {
  scammers: Scammer[];
  isLoading?: boolean;
}

const typeLabels: Record<ScammerType, string> = {
  individual: "Individual",
  business: "Business",
  organization: "Organization",
};

const typeColors: Record<ScammerType, string> = {
  individual: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  business: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  organization: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

function VerificationBadge({ verified }: { verified: boolean }) {
  if (verified) {
    return (
      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 gap-1">
        <CheckCircle className="h-3 w-3" />
        Verified
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
}

export function ScammerListing({ scammers, isLoading }: ScammerListingProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedScammer, setSelectedScammer] = useState<Scammer | null>(null);

  const filteredScammers = scammers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || s.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Reported Scammers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
                <div className="h-6 w-20 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="card-scammer-listing">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          Reported Scammers
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-scammer-search"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-scammer-type">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="individual">Individual</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="organization">Organization</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredScammers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search || typeFilter !== "all" 
              ? "No scammers match your search criteria."
              : "No scammers reported yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name / Entity</TableHead>
                  <TableHead className="w-28">Type</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="w-20 text-center">Evidence</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24">Reported</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredScammers.map((scammer) => (
                  <TableRow 
                    key={scammer.id} 
                    className="hover-elevate cursor-pointer" 
                    onClick={() => setSelectedScammer(scammer)}
                    data-testid={`row-scammer-${scammer.id}`}
                  >
                    <TableCell className="font-medium" data-testid={`text-scammer-name-${scammer.id}`}>
                      {scammer.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={typeColors[scammer.type]}>
                        {typeLabels[scammer.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                      {scammer.description}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {scammer.evidenceCount}
                    </TableCell>
                    <TableCell>
                      <VerificationBadge verified={scammer.verified} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(scammer.reportedAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <Dialog open={!!selectedScammer} onOpenChange={(open) => !open && setSelectedScammer(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh]" data-testid="dialog-scammer-detail">
            {selectedScammer && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-xl">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    {selectedScammer.name}
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh]">
                  <div className="space-y-4 pr-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className={typeColors[selectedScammer.type]}>
                        {typeLabels[selectedScammer.type]}
                      </Badge>
                      <VerificationBadge verified={selectedScammer.verified} />
                      <span className="text-sm text-muted-foreground">
                        Reported: {new Date(selectedScammer.reportedAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedScammer.description}
                      </p>
                    </div>

                    {selectedScammer.evidenceLinks && selectedScammer.evidenceLinks.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <LinkIcon className="h-4 w-4" />
                          Evidence Links ({selectedScammer.evidenceLinks.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedScammer.evidenceLinks.map((link, i) => (
                            <a
                              key={i}
                              href={link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm hover-elevate"
                              data-testid={`link-evidence-${i}`}
                            >
                              <ExternalLink className="h-3 w-3 flex-shrink-0" />
                              <span className="flex-1 truncate underline">{link}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedScammer.evidenceFiles && selectedScammer.evidenceFiles.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2 flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Evidence Files ({selectedScammer.evidenceFiles.length})
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {selectedScammer.evidenceFiles.map((file, i) => (
                            <div key={i} className="rounded-md overflow-hidden border">
                              {file.startsWith("data:image") ? (
                                <img 
                                  src={file} 
                                  alt={`Evidence ${i + 1}`} 
                                  className="w-full h-32 object-cover"
                                  data-testid={`img-evidence-${i}`}
                                />
                              ) : (
                                <div className="p-4 bg-muted flex items-center justify-center">
                                  <FileText className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!selectedScammer.evidenceLinks?.length && !selectedScammer.evidenceFiles?.length) && (
                      <div className="p-4 bg-muted rounded-md text-center text-sm text-muted-foreground">
                        No evidence attached to this report
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

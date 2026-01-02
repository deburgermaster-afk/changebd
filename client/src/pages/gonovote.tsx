import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Check, X, Clock, FileText, Scale, Users, Shield, Landmark, Vote, Globe } from "lucide-react";
import type { GonovoteResult } from "@shared/schema";

const reformQuestions = [
  {
    titleBn: "তত্ত্বাবধায়ক সরকার গঠন",
    titleEn: "Caretaker Government Formation",
    descBn: "নির্বাচনকালীন তত্ত্বাবধায়ক সরকার ব্যবস্থা পুনঃপ্রতিষ্ঠা",
    descEn: "Reinstatement of caretaker government system during elections",
    icon: Users,
  },
  {
    titleBn: "সংবিধান সংশোধন সীমাবদ্ধতা",
    titleEn: "Constitutional Amendment Restrictions",
    descBn: "সংবিধানের মূল কাঠামো সংশোধনে জনগণের অনুমোদন বাধ্যতামূলক",
    descEn: "Mandatory public approval for amendments to constitutional fundamentals",
    icon: FileText,
  },
  {
    titleBn: "গণভোট আইন (গণভোট বিল)",
    titleEn: "Referendum System (Gonovote Bill)",
    descBn: "জাতীয় গুরুত্বপূর্ণ বিষয়ে জনগণের সরাসরি ভোটের অধিকার",
    descEn: "Citizens' right to direct vote on matters of national importance",
    icon: Vote,
  },
  {
    titleBn: "সংসদে বিরোধী দলের প্রতিনিধিত্ব",
    titleEn: "Opposition Representation in Parliament",
    descBn: "সংসদে বিরোধী দলের ন্যায্য প্রতিনিধিত্ব নিশ্চিতকরণ",
    descEn: "Ensuring fair opposition representation in parliament",
    icon: Users,
  },
  {
    titleBn: "প্রধানমন্ত্রীর ১০ বছর মেয়াদ সীমা",
    titleEn: "PM 10-Year Term Limit",
    descBn: "একজন ব্যক্তির সর্বোচ্চ ১০ বছর প্রধানমন্ত্রী থাকার সীমা",
    descEn: "Maximum 10-year limit for any individual to serve as Prime Minister",
    icon: Clock,
  },
  {
    titleBn: "নারী প্রতিনিধিত্ব বৃদ্ধি",
    titleEn: "Increased Women Representation",
    descBn: "সংসদ ও সরকারি পদে নারীদের প্রতিনিধিত্ব বৃদ্ধি",
    descEn: "Increased women representation in parliament and government positions",
    icon: Users,
  },
  {
    titleBn: "উচ্চকক্ষ প্রতিষ্ঠা",
    titleEn: "Upper House Establishment",
    descBn: "দ্বিকক্ষ বিশিষ্ট সংসদ প্রতিষ্ঠা - সিনেট/উচ্চকক্ষ সৃষ্টি",
    descEn: "Establishment of bicameral parliament - creating Senate/Upper House",
    icon: Landmark,
  },
  {
    titleBn: "স্বাধীন বিচার বিভাগ",
    titleEn: "Independent Judiciary",
    descBn: "বিচার বিভাগের সম্পূর্ণ স্বাধীনতা ও নির্বাহী বিভাগ থেকে পৃথকীকরণ",
    descEn: "Complete independence of judiciary and separation from executive",
    icon: Scale,
  },
  {
    titleBn: "মৌলিক অধিকার সুরক্ষা",
    titleEn: "Fundamental Rights Protection",
    descBn: "ইন্টারনেট কখনো বন্ধ না করাসহ মৌলিক অধিকার সুরক্ষা",
    descEn: "Protection of fundamental rights including internet never blocked",
    icon: Globe,
  },
  {
    titleBn: "সীমিত রাষ্ট্রপতি ক্ষমা",
    titleEn: "Limited Presidential Pardons",
    descBn: "রাষ্ট্রপতির ক্ষমা ক্ষমতায় সীমাবদ্ধতা আরোপ",
    descEn: "Restrictions on presidential pardon powers",
    icon: Shield,
  },
  {
    titleBn: "রাষ্ট্রপতি/প্রধানমন্ত্রী ক্ষমতার ভারসাম্য",
    titleEn: "President/PM Power Balance",
    descBn: "রাষ্ট্রপতি ও প্রধানমন্ত্রীর মধ্যে ক্ষমতার যথাযথ ভারসাম্য",
    descEn: "Proper balance of power between President and Prime Minister",
    icon: Scale,
  },
];

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const target = new Date(targetDate).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = target - now;
      
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
        return;
      }
      
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <div className="flex gap-2 sm:gap-4 justify-center flex-wrap" data-testid="countdown-timer">
      {Object.entries(timeLeft).map(([unit, value]) => (
        <div key={unit} className="text-center">
          <div className="bg-card border rounded-md p-2 sm:p-3 min-w-[50px] sm:min-w-[70px]">
            <span className="text-xl sm:text-3xl font-bold text-[#006A4E]" data-testid={`countdown-${unit}`}>
              {value.toString().padStart(2, '0')}
            </span>
          </div>
          <span className="text-xs text-muted-foreground capitalize mt-1 block">
            {unit === 'days' ? 'দিন/Days' : 
             unit === 'hours' ? 'ঘণ্টা/Hours' : 
             unit === 'minutes' ? 'মিনিট/Min' : 'সেকেন্ড/Sec'}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function GonovotePage() {
  const { toast } = useToast();

  const { data: result, isLoading } = useQuery<GonovoteResult>({
    queryKey: ["/api/gonovote/result"],
  });

  const { data: voteStatus } = useQuery<{ hasVoted: boolean; vote?: string }>({
    queryKey: ["/api/gonovote/vote-status"],
  });

  const voteMutation = useMutation({
    mutationFn: async (vote: "yes" | "no") => {
      return apiRequest("POST", "/api/gonovote/vote", { vote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gonovote/result"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gonovote/vote-status"] });
      toast({ 
        title: "ভোট সফল! Vote Successful!", 
        description: "আপনার ভোট গৃহীত হয়েছে। Your vote has been recorded." 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "ভোট ব্যর্থ / Vote Failed", 
        description: error.message || "আপনি ইতিমধ্যে ভোট দিয়েছেন। You have already voted.",
        variant: "destructive"
      });
    },
  });

  const hasVoted = voteStatus?.hasVoted ?? false;
  const userVote = voteStatus?.vote;
  const yesPercent = result?.yesPercentage ?? 0;
  const noPercent = result?.noPercentage ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="relative bg-gradient-to-br from-[#006A4E] to-[#004d38] text-white py-10 sm:py-16">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-4xl mx-auto px-4 text-center">
          <Badge className="mb-4 bg-white/20 text-white border-white/30" data-testid="badge-gonovote-2026">
            গণভোট ২০২৬ / Gonovote 2026
          </Badge>
          
          <h1 className="text-2xl sm:text-4xl font-bold mb-3">
            সাংবিধানিক সংস্কার গণভোট
          </h1>
          <h2 className="text-lg sm:text-2xl font-semibold mb-6 opacity-90">
            Constitutional Reform Referendum
          </h2>
          
          <p className="text-sm sm:text-base opacity-80 mb-6 max-w-2xl mx-auto">
            বাংলাদেশের সংবিধানে প্রস্তাবিত ১১টি সংস্কারের উপর আপনার মতামত দিন
            <br />
            Cast your vote on 11 proposed constitutional reforms for Bangladesh
          </p>

          <div className="mb-6">
            <p className="text-sm opacity-70 mb-2">ভোটদান সময়সীমা / Voting Deadline</p>
            {result?.expiresAt && <CountdownTimer targetDate={result.expiresAt} />}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {!hasVoted ? (
              <>
                <Button
                  size="lg"
                  className="min-w-[140px] bg-[#006A4E] hover:bg-[#005540] border-2 border-white/30 text-white font-bold text-lg gap-2"
                  onClick={() => voteMutation.mutate("yes")}
                  disabled={voteMutation.isPending}
                  data-testid="button-vote-yes"
                >
                  <Check className="h-5 w-5" />
                  হ্যাঁ / YES
                </Button>
                <Button
                  size="lg"
                  className="min-w-[140px] bg-[#F42A41] hover:bg-[#d42438] border-2 border-white/30 text-white font-bold text-lg gap-2"
                  onClick={() => voteMutation.mutate("no")}
                  disabled={voteMutation.isPending}
                  data-testid="button-vote-no"
                >
                  <X className="h-5 w-5" />
                  না / NO
                </Button>
              </>
            ) : (
              <div className="bg-white/10 rounded-md px-6 py-3 backdrop-blur">
                <p className="text-lg font-medium">
                  আপনি ভোট দিয়েছেন: {userVote === 'yes' ? 'হ্যাঁ (YES)' : 'না (NO)'}
                </p>
                <p className="text-sm opacity-80">You have voted: {userVote?.toUpperCase()}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="py-8 sm:py-12 bg-muted/30">
        <div className="max-w-4xl mx-auto px-4">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-center text-lg sm:text-xl">
                বর্তমান ফলাফল / Current Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="animate-pulse h-20 bg-muted rounded" />
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm sm:text-base">
                    <span className="text-[#006A4E] font-semibold flex items-center gap-2">
                      <Check className="h-4 w-4" />
                      হ্যাঁ / YES
                    </span>
                    <span className="font-bold" data-testid="text-yes-count">
                      {result?.yesVotes?.toLocaleString() ?? 0} ({yesPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={yesPercent} className="h-3 bg-muted [&>div]:bg-[#006A4E]" />

                  <div className="flex justify-between items-center text-sm sm:text-base">
                    <span className="text-[#F42A41] font-semibold flex items-center gap-2">
                      <X className="h-4 w-4" />
                      না / NO
                    </span>
                    <span className="font-bold" data-testid="text-no-count">
                      {result?.noVotes?.toLocaleString() ?? 0} ({noPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={noPercent} className="h-3 bg-muted [&>div]:bg-[#F42A41]" />

                  <div className="text-center pt-4 border-t">
                    <span className="text-muted-foreground text-sm">
                      মোট ভোট / Total Votes: 
                    </span>
                    <span className="font-bold ml-2" data-testid="text-total-votes">
                      {result?.totalVotes?.toLocaleString() ?? 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-center mb-2">
              প্রস্তাবিত সংস্কারসমূহ
            </h3>
            <p className="text-center text-muted-foreground text-sm sm:text-base mb-6">
              Proposed Constitutional Reforms
            </p>
          </div>

          <div className="grid gap-4">
            {reformQuestions.map((q, idx) => (
              <Card key={idx} className="hover-elevate">
                <CardContent className="py-4">
                  <div className="flex gap-3 sm:gap-4 items-start">
                    <div className="rounded-full bg-[#006A4E]/10 p-2 sm:p-3 shrink-0">
                      <q.icon className="h-5 w-5 sm:h-6 sm:w-6 text-[#006A4E]" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm sm:text-base mb-1" data-testid={`text-reform-title-${idx}`}>
                        {idx + 1}. {q.titleBn}
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                        {q.titleEn}
                      </p>
                      <p className="text-xs text-muted-foreground/80">
                        {q.descBn} / {q.descEn}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-lg sm:text-xl font-bold mb-4">
            আপনার ভোট গুরুত্বপূর্ণ
          </h3>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
            এই গণভোটে অংশগ্রহণ করে বাংলাদেশের ভবিষ্যত গঠনে সহায়তা করুন। প্রতিটি ভোট একটি কণ্ঠস্বর।
            <br />
            Participate in this referendum to help shape the future of Bangladesh. Every vote is a voice.
          </p>
        </div>
      </section>
    </div>
  );
}

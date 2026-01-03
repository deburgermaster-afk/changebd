import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Check, X, Clock, FileText, Scale, Users, Shield, Landmark, Vote, Globe, ChevronDown } from "lucide-react";
import type { GonovoteResult } from "@shared/schema";
import { AnimatedNumber, AnimatedPercentage } from "@/components/animated-number";

const reformQuestions = [
  {
    titleBn: "অন্তর্বর্তী সরকার ব্যবস্থা",
    titleEn: "Interim Government System",
    descBn: "নির্বাচন পরিচালনার জন্য অন্তর্বর্তী সরকার নিয়োগ। সংসদ মেয়াদ শেষ হওয়ার ১৫ দিন আগে বা বিলুপ্তির ১৫ দিনের মধ্যে প্রধান উপদেষ্টা নিয়োগ করতে হবে।",
    descEn: "Appointment of interim government to conduct elections. Chief Adviser must be appointed 15 days before assembly expiry or within 15 days of dissolution.",
    icon: Users,
  },
  {
    titleBn: "সংবিধান সংশোধন পদ্ধতি",
    titleEn: "Constitutional Amendment Process",
    descBn: "অনুচ্ছেদ ৭ক ও ৭খ বিলোপ। সংবিধান সংশোধনে উভয় কক্ষে দুই-তৃতীয়াংশ সংখ্যাগরিষ্ঠতা এবং গণভোটে অনুমোদন প্রয়োজন।",
    descEn: "Deletion of Articles 7A and 7B. Constitutional amendments require two-thirds majority in both houses followed by referendum approval.",
    icon: FileText,
  },
  {
    titleBn: "দ্বিকক্ষ বিশিষ্ট সংসদ (উচ্চকক্ষ)",
    titleEn: "Bicameral Parliament (Upper House)",
    descBn: "১০০ সদস্যের আনুপাতিক নির্বাচিত উচ্চকক্ষ (সিনেট) প্রতিষ্ঠা। সংবিধান সংশোধনে উচ্চকক্ষের সংখ্যাগরিষ্ঠতা আবশ্যক।",
    descEn: "Establishment of 100-member proportionally elected Upper House (Senate). Senate majority required for constitutional amendments.",
    icon: Landmark,
  },
  {
    titleBn: "প্রধানমন্ত্রীর মেয়াদ সীমা",
    titleEn: "Prime Minister Term Limit",
    descBn: "একজন ব্যক্তি সর্বোচ্চ দুইবার প্রধানমন্ত্রী হিসেবে দায়িত্ব পালন করতে পারবেন। ভবিষ্যতে স্বৈরাচারী শাসন প্রতিরোধে এই সীমা।",
    descEn: "A person can serve as Prime Minister for maximum two terms. This limit prevents future autocratic rule.",
    icon: Clock,
  },
  {
    titleBn: "জাতীয় সাংবিধানিক কাউন্সিল",
    titleEn: "National Constitutional Council",
    descBn: "রাষ্ট্রের তিন বিভাগের ভারসাম্য নিশ্চিতে এনসিসি গঠন। সদস্য: রাষ্ট্রপতি, প্রধানমন্ত্রী, বিরোধী দলীয় নেতা, উভয় কক্ষের স্পিকার, প্রধান বিচারপতি।",
    descEn: "NCC formation to ensure balance among state branches. Members: President, PM, Opposition Leader, Speakers of both houses, Chief Justice.",
    icon: Scale,
  },
  {
    titleBn: "মৌলিক অধিকার সম্প্রসারণ",
    titleEn: "Fundamental Rights Expansion",
    descBn: "মৌলিক অধিকারে খাদ্য, বস্ত্র, বাসস্থান, শিক্ষা, ইন্টারনেট এবং ভোটাধিকার অন্তর্ভুক্তি। ইন্টারনেট কখনো বন্ধ করা যাবে না।",
    descEn: "Fundamental rights expanded to include food, clothing, shelter, education, internet, and right to vote. Internet can never be blocked.",
    icon: Globe,
  },
  {
    titleBn: "বিচার বিভাগের স্বাধীনতা",
    titleEn: "Judicial Independence",
    descBn: "বিচার বিভাগকে সম্পূর্ণ আর্থিক স্বায়ত্তশাসন প্রদান। নির্বাহী বিভাগ থেকে সম্পূর্ণ পৃথকীকরণ নিশ্চিত।",
    descEn: "Full financial autonomy for judiciary. Complete separation from executive branch ensured.",
    icon: Scale,
  },
  {
    titleBn: "স্থানীয় সরকার ক্ষমতায়ন",
    titleEn: "Local Government Empowerment",
    descBn: "স্থানীয় সরকার প্রতিষ্ঠানগুলো স্থানীয়ভাবে তহবিল সংগ্রহ করতে পারবে। বাজেট ঘাটতি পূরণে উচ্চকক্ষের স্থানীয় সরকার কমিটির অনুমোদন।",
    descEn: "Local government institutions can raise funds locally. Upper House Local Government Committee approval for budget deficit allocation.",
    icon: Users,
  },
  {
    titleBn: "রাষ্ট্রের মূলনীতি পরিবর্তন",
    titleEn: "State Fundamental Principles",
    descBn: "জাতীয়তাবাদ, সমাজতন্ত্র, ধর্মনিরপেক্ষতার পরিবর্তে সমতা, মানবিক মর্যাদা, সামাজিক ন্যায়বিচার ও বহুত্ববাদ।",
    descEn: "Replace nationalism, socialism, secularism with equality, human dignity, social justice and pluralism.",
    icon: Shield,
  },
  {
    titleBn: "নাগরিক পরিচয়",
    titleEn: "National Identity",
    descBn: "নাগরিকদের 'বাঙালি' এর পরিবর্তে 'বাংলাদেশি' হিসেবে অভিহিত করা। সকল বাংলাদেশির মাতৃভাষাকে সাধারণ ভাষা হিসেবে স্বীকৃতি।",
    descEn: "Citizens called 'Bangladeshis' instead of 'Bengalees'. Recognition of mother tongues of all Bangladeshis as common languages.",
    icon: Users,
  },
  {
    titleBn: "রাষ্ট্রপতি নির্বাচন পদ্ধতি",
    titleEn: "Presidential Election System",
    descBn: "রাষ্ট্রপতির মেয়াদ ৪ বছর। উভয় কক্ষের সদস্য, জেলা সমন্বয় কাউন্সিল এবং স্থানীয় সরকার প্রতিনিধিদের ভোটে নির্বাচন।",
    descEn: "President's term 4 years. Election by Electoral College: members of both houses, District Coordination Councils, local government representatives.",
    icon: Vote,
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
  const voteCardRef = useRef<HTMLDivElement>(null);
  const [showStickyButton, setShowStickyButton] = useState(true);

  const { data: result, isLoading } = useQuery<GonovoteResult>({
    queryKey: ["/api/gonovote/result"],
    refetchInterval: 5000,
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

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyButton(!entry.isIntersecting);
      },
      { threshold: 0.3 }
    );

    if (voteCardRef.current) {
      observer.observe(voteCardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const scrollToVote = () => {
    voteCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

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

          <div className="mb-4">
            <p className="text-sm opacity-70 mb-2">ভোটদান সময়সীমা / Voting Deadline</p>
            {result?.expiresAt && <CountdownTimer targetDate={result.expiresAt} />}
          </div>

          <div className="animate-bounce mt-6">
            <div className="flex flex-col items-center gap-1 cursor-pointer opacity-80 hover:opacity-100 transition-opacity" onClick={() => window.scrollTo({ top: window.innerHeight * 0.7, behavior: 'smooth' })}>
              <span className="text-xs sm:text-sm">নিচে স্ক্রল করুন / Scroll to Vote</span>
              <ChevronDown className="h-5 w-5" />
            </div>
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
                      <AnimatedNumber value={result?.yesVotes ?? 0} /> (<AnimatedPercentage value={yesPercent} />)
                    </span>
                  </div>
                  <Progress value={yesPercent} className="h-3 bg-muted [&>div]:bg-[#006A4E]" />

                  <div className="flex justify-between items-center text-sm sm:text-base">
                    <span className="text-[#F42A41] font-semibold flex items-center gap-2">
                      <X className="h-4 w-4" />
                      না / NO
                    </span>
                    <span className="font-bold" data-testid="text-no-count">
                      <AnimatedNumber value={result?.noVotes ?? 0} /> (<AnimatedPercentage value={noPercent} />)
                    </span>
                  </div>
                  <Progress value={noPercent} className="h-3 bg-muted [&>div]:bg-[#F42A41]" />

                  <div className="text-center pt-4 border-t">
                    <span className="text-muted-foreground text-sm">
                      মোট ভোট / Total Votes: 
                    </span>
                    <span className="font-bold ml-2" data-testid="text-total-votes">
                      <AnimatedNumber value={result?.totalVotes ?? 0} />
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

          <div className="grid gap-4 mb-8">
            {reformQuestions.map((q, idx) => (
              <Card key={idx} className="hover-elevate">
                <CardContent className="py-4">
                  <div className="flex gap-3 sm:gap-4 items-start">
                    <div className="rounded-full bg-[#006A4E]/10 p-2 sm:p-3 shrink-0">
                      <q.icon className="h-5 w-5 sm:h-6 sm:w-6 text-[#006A4E]" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm sm:text-base mb-1" data-testid={`text-reform-title-${idx}`}>
                        {idx + 1}. {q.titleBn}
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                        {q.titleEn}
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground/80 leading-relaxed">
                        {q.descBn}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {q.descEn}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card ref={voteCardRef} className="bg-gradient-to-br from-[#006A4E]/5 to-[#F42A41]/5 border-2">
            <CardHeader>
              <CardTitle className="text-center text-lg sm:text-xl">
                আপনার মতামত দিন / Cast Your Vote
              </CardTitle>
              <p className="text-center text-muted-foreground text-sm">
                উপরের ১১টি সংস্কার প্রস্তাবের সাথে আপনি কি একমত?
                <br />
                Do you agree with the 11 reform proposals above?
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                {!hasVoted ? (
                  <>
                    <Button
                      size="lg"
                      className="min-w-[160px] bg-[#006A4E] hover:bg-[#005540] text-white font-bold text-lg gap-2"
                      onClick={() => voteMutation.mutate("yes")}
                      disabled={voteMutation.isPending}
                      data-testid="button-vote-yes"
                    >
                      <Check className="h-5 w-5" />
                      হ্যাঁ / YES
                    </Button>
                    <Button
                      size="lg"
                      className="min-w-[160px] bg-[#F42A41] hover:bg-[#d42438] text-white font-bold text-lg gap-2"
                      onClick={() => voteMutation.mutate("no")}
                      disabled={voteMutation.isPending}
                      data-testid="button-vote-no"
                    >
                      <X className="h-5 w-5" />
                      না / NO
                    </Button>
                  </>
                ) : (
                  <div className="bg-muted rounded-md px-6 py-4 text-center">
                    <p className="text-lg font-medium">
                      আপনি ভোট দিয়েছেন: {userVote === 'yes' ? 'হ্যাঁ (YES)' : 'না (NO)'}
                    </p>
                    <p className="text-sm text-muted-foreground">You have voted: {userVote?.toUpperCase()}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-lg sm:text-xl font-bold mb-4">
            আপনার ভোট গুরুত্বপূর্ণ
          </h3>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto mb-4">
            এই গণভোটে অংশগ্রহণ করে বাংলাদেশের ভবিষ্যত গঠনে সহায়তা করুন। প্রতিটি ভোট একটি কণ্ঠস্বর।
            <br />
            Participate in this referendum to help shape the future of Bangladesh. Every vote is a voice.
          </p>
          <p className="text-xs text-muted-foreground/60">
            তথ্যসূত্র: সংবিধান সংস্কার কমিশন রিপোর্ট ২০২৫ (প্রধান উপদেষ্টা অধ্যাপক ড. মুহাম্মদ ইউনূস)
            <br />
            Source: Constitutional Reform Commission Report 2025 (Chief Adviser Prof. Dr. Muhammad Yunus)
          </p>
        </div>
      </section>

      {showStickyButton && !hasVoted && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-50">
          <div className="max-w-md mx-auto">
            <Button
              size="lg"
              className="w-full bg-[#006A4E] hover:bg-[#005540] text-white font-bold text-base gap-2 shadow-lg"
              onClick={scrollToVote}
              data-testid="button-scroll-to-vote"
            >
              <ChevronDown className="h-5 w-5 animate-bounce" />
              ভোট দিতে নিচে যান / Scroll to Vote
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

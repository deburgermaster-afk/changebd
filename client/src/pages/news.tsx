import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { News } from "@shared/schema";
import { 
  Newspaper, Heart, MessageCircle, 
  CheckCircle, Clock, Shield, ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const SOURCE_LOGOS: Record<string, string> = {
  "Al Jazeera": "https://upload.wikimedia.org/wikipedia/en/thumb/d/d5/Al_Jazeera_English.svg/200px-Al_Jazeera_English.svg.png",
  "BBC": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/BBC_Logo_2021.svg/200px-BBC_Logo_2021.svg.png",
  "Reuters": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/Reuters_Logo.svg/200px-Reuters_Logo.svg.png",
  "The Daily Star": "https://www.thedailystar.net/sites/all/themes/flavor/tds/logo.svg",
  "Prothom Alo": "https://www.prothomalo.com/assets/img/logo.png",
  "bdnews24": "https://d30fl32nd2baj9.cloudfront.net/media/2019/05/14/bdnews24-logo.png",
  "The Guardian": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/The_Guardian_%282018%29.svg/200px-The_Guardian_%282018%29.svg.png",
  "DW": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/DW_2012_logo.svg/200px-DW_2012_logo.svg.png",
  "CNN": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/CNN.svg/200px-CNN.svg.png",
  "AP News": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Associated_Press_logo_2012.svg/200px-Associated_Press_logo_2012.svg.png",
  "France 24": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/France_24_logo_2018.svg/200px-France_24_logo_2018.svg.png",
  "New York Times": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/New_York_Times_logo_variation.jpg/200px-New_York_Times_logo_variation.jpg",
};

function getSourceLogo(sourceName: string): string | undefined {
  const normalized = Object.keys(SOURCE_LOGOS).find(
    key => sourceName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(sourceName.toLowerCase())
  );
  return normalized ? SOURCE_LOGOS[normalized] : undefined;
}

function NewsCard({ news }: { news: News }) {
  const trustPercent = Math.round(news.trustScore * 100);
  const logo = getSourceLogo(news.source);
  const totalSources = 1 + (news.crossCheckedSources?.length || 0);

  return (
    <Link href={`/news/${news.id}`}>
      <Card 
        className="overflow-hidden hover-elevate cursor-pointer transition-all group" 
        data-testid={`card-news-${news.id}`}
      >
        <div className="flex flex-col sm:flex-row">
          {news.imageUrl && (
            <div className="sm:w-48 sm:min-w-48 h-48 sm:h-auto overflow-hidden">
              <img 
                src={news.imageUrl} 
                alt={news.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.parentElement!.style.display = 'none';
                }}
              />
            </div>
          )}
          
          <CardContent className="flex-1 p-4 sm:p-5">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              {logo ? (
                <img 
                  src={logo} 
                  alt={news.source} 
                  className="h-4 w-auto max-w-[60px] object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : null}
              <span className="text-xs font-medium text-muted-foreground">{news.source}</span>
              <span className="text-xs text-muted-foreground">|</span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(new Date(news.publishedAt), { addSuffix: true })}
              </span>
            </div>
            
            <h3 
              className="font-bold text-base sm:text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors" 
              data-testid={`text-news-title-${news.id}`}
            >
              {news.title}
            </h3>
            
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {news.summary || news.content.substring(0, 150) + "..."}
            </p>
            
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                {news.verified && (
                  <Badge variant="default" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
                <Badge 
                  variant="outline" 
                  className={`text-xs ${
                    trustPercent >= 70 ? "border-green-500 text-green-600 dark:text-green-400" : 
                    trustPercent >= 40 ? "border-yellow-500 text-yellow-600 dark:text-yellow-400" : 
                    "border-red-500 text-red-600 dark:text-red-400"
                  }`}
                >
                  {trustPercent}% Trust
                </Badge>
                {totalSources > 1 && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Shield className="w-3 h-3" />
                    {totalSources} sources
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Heart className={`w-3 h-3 ${news.likes > 0 ? "fill-red-500 text-red-500" : ""}`} />
                  {news.likes}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" />
                  {news.comments.length}
                </span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
}

export default function NewsPage() {
  const { data: news = [], isLoading } = useQuery<News[]>({
    queryKey: ["/api/news"],
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
          <Newspaper className="w-7 h-7 text-primary" />
          Bangladesh News
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Latest verified news about Bangladesh civic affairs
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : news.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Newspaper className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No News Available</h3>
            <p className="text-sm text-muted-foreground">
              Check back later for the latest news updates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {news.map(n => <NewsCard key={n.id} news={n} />)}
        </div>
      )}
    </div>
  );
}

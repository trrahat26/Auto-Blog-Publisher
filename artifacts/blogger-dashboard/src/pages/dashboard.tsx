import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { 
  useGetAuthStatus, 
  getAuthUrl, 
  useGetPostStats, 
  useGetSchedulerStatus,
  useGeneratePost,
  useListPosts,
  getGetPostStatsQueryKey,
  getListPostsQueryKey,
  getGetSchedulerStatusQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { Activity, AlertTriangle, CheckCircle2, Clock, Play, Plus, Zap, FileText, BarChart3, TrendingUp, Link as LinkIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: authStatus, isLoading: isLoadingAuth } = useGetAuthStatus();
  const { data: stats, isLoading: isLoadingStats } = useGetPostStats();
  const { data: scheduler, isLoading: isLoadingScheduler } = useGetSchedulerStatus();
  const { data: recentPosts, isLoading: isLoadingPosts } = useListPosts({ limit: 5 });

  const { mutate: generatePost, isPending: isGenerating } = useGeneratePost({
    mutation: {
      onSuccess: () => {
        toast({ title: "Post generation started", description: "The system is writing and publishing your post." });
        queryClient.invalidateQueries({ queryKey: getGetPostStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListPostsQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to generate post", description: err.message || "An error occurred", variant: "destructive" });
      }
    }
  });

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const authParam = searchParams.get('auth');
    if (authParam === 'success') {
      toast({ title: "Authentication Successful", description: "Connected to Blogger account." });
      setLocation('/', { replace: true });
    } else if (authParam === 'error') {
      toast({ title: "Authentication Failed", description: "Could not connect to Blogger.", variant: "destructive" });
      setLocation('/', { replace: true });
    }
  }, [setLocation, toast]);

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      const res = await getAuthUrl();
      if (res?.url) {
        window.location.href = res.url;
      }
    } catch (e) {
      toast({ title: "Error", description: "Failed to get authentication URL.", variant: "destructive" });
      setIsConnecting(false);
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!authStatus?.authenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
          <LinkIcon className="w-10 h-10 text-primary" />
        </div>
        <div className="max-w-md space-y-2">
          <h1 className="text-3xl font-bold font-mono tracking-tight text-foreground">System Offline</h1>
          <p className="text-muted-foreground">Connect your Blogger account to activate the automated publishing pipeline.</p>
        </div>
        <Button 
          onClick={handleConnect} 
          disabled={isConnecting}
          size="lg"
          className="font-mono shadow-lg shadow-primary/20"
        >
          {isConnecting ? "Connecting..." : "Connect Blogger"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight flex items-center gap-3">
            System Overview 
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </span>
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Status: Active &bull; Connected to {authStatus.blogTitle}</p>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto">
          <Button 
            onClick={() => generatePost({ data: {} })} 
            disabled={isGenerating}
            className="flex-1 sm:flex-none font-mono"
          >
            <Zap className="w-4 h-4 mr-2" />
            {isGenerating ? "Generating..." : "Trigger Post"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Published Total" 
          value={stats?.totalPublished} 
          icon={<FileText className="w-4 h-4 text-primary" />} 
          loading={isLoadingStats}
        />
        <StatCard 
          title="Published Today" 
          value={stats?.todayCount} 
          icon={<Activity className="w-4 h-4 text-chart-2" />} 
          loading={isLoadingStats}
        />
        <StatCard 
          title="Published This Week" 
          value={stats?.thisWeekCount} 
          icon={<TrendingUp className="w-4 h-4 text-chart-3" />} 
          loading={isLoadingStats}
        />
        <StatCard 
          title="Failed / Drafts" 
          value={`${stats?.totalFailed || 0} / ${stats?.totalDraft || 0}`} 
          icon={<AlertTriangle className="w-4 h-4 text-chart-4" />} 
          loading={isLoadingStats}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-lg font-mono flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Recent Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoadingPosts ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : recentPosts?.posts?.length ? (
                <div className="divide-y divide-border/50">
                  {recentPosts.posts.map(post => (
                    <div key={post.id} className="p-4 flex items-center justify-between hover:bg-secondary/50 transition-colors">
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={post.status} />
                          <h4 className="font-medium text-sm truncate">{post.title || 'Untitled Post'}</h4>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                          <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                          <span>&bull;</span>
                          <span className="uppercase text-primary/80">{post.niche}</span>
                        </div>
                      </div>
                      {post.bloggerUrl && (
                        <a href={post.bloggerUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 p-2 text-muted-foreground hover:text-primary transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-muted-foreground font-mono text-sm">
                  No recent operations. Trigger a post to get started.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border bg-card/50 backdrop-blur overflow-hidden relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-chart-2"></div>
            <CardHeader>
              <CardTitle className="text-lg font-mono">Scheduler</CardTitle>
              <CardDescription>Automated chron job</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 font-mono text-sm">
              {isLoadingScheduler ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Status</span>
                    {scheduler?.enabled ? (
                      <span className="text-primary flex items-center gap-1.5"><Play className="w-3 h-3" /> Running</span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1.5"><Clock className="w-3 h-3" /> Paused</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Rate</span>
                    <span>{scheduler?.postsPerDay} posts / day</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Next run</span>
                    <span>{scheduler?.nextRunAt ? format(new Date(scheduler.nextRunAt), 'HH:mm') : '—'}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg font-mono">Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingStats ? (
                <Skeleton className="h-32 w-full" />
              ) : stats?.byNiche?.length ? (
                <div className="space-y-3">
                  {stats.byNiche.map(niche => {
                    const percentage = Math.round((niche.count / Math.max(1, stats.totalPublished)) * 100);
                    return (
                      <div key={niche.niche} className="space-y-1">
                        <div className="flex justify-between text-xs font-mono">
                          <span className="uppercase text-muted-foreground">{niche.niche}</span>
                          <span>{niche.count} ({percentage}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-muted-foreground font-mono text-sm py-4">No data</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, loading }: { title: string, value?: number | string, icon: ReactNode, loading?: boolean }) {
  return (
    <Card className="border-border bg-card/50 backdrop-blur">
      <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-mono text-muted-foreground tracking-tight">{title}</p>
          <div className="p-2 bg-secondary rounded-md">{icon}</div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <p className="text-3xl font-bold tracking-tighter">{value ?? 0}</p>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'published') return <Badge variant="default" className="bg-primary text-primary-foreground font-mono text-[10px] uppercase rounded-sm px-1.5 py-0">PUB</Badge>;
  if (status === 'failed') return <Badge variant="destructive" className="font-mono text-[10px] uppercase rounded-sm px-1.5 py-0">ERR</Badge>;
  return <Badge variant="secondary" className="font-mono text-[10px] uppercase rounded-sm px-1.5 py-0">DRF</Badge>;
}

import { useState, useEffect } from "react";
import { useListLogs } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Activity, Search, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function Logs() {
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  
  // Real-time polling
  const { data, isLoading } = useListLogs(
    { 
      limit: 100, 
      level: levelFilter !== "all" ? levelFilter as any : undefined
    }, 
    { 
      query: { 
        refetchInterval: 5000, // Poll every 5s for terminal feel
        keepPreviousData: true 
      } as any 
    }
  );

  const logs = data?.logs || [];
  
  const filteredLogs = search 
    ? logs.filter(l => l.message.toLowerCase().includes(search.toLowerCase()) || (l.details && l.details.toLowerCase().includes(search.toLowerCase())))
    : logs;

  return (
    <div className="space-y-6 h-[calc(100vh-120px)] flex flex-col animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            System Output
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Live activity stream</p>
        </div>
      </div>

      <div className="bg-card/50 border border-border p-4 rounded-lg backdrop-blur flex flex-col sm:flex-row gap-4 items-center justify-between shrink-0">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Filter logs..." 
            className="pl-9 font-mono text-sm bg-background/50 border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto flex gap-3">
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[140px] font-mono text-sm">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex-1 bg-[#09090b] border border-border rounded-lg overflow-hidden flex flex-col relative font-mono text-sm shadow-inner shadow-black/50">
        <div className="flex bg-[#121214] border-b border-border/50 text-xs text-muted-foreground uppercase tracking-wider p-3 shrink-0">
          <div className="w-[160px]">Timestamp</div>
          <div className="w-[80px]">Level</div>
          <div className="flex-1">Message</div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isLoading && logs.length === 0 ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-4 w-32 bg-secondary" />
                  <Skeleton className="h-4 w-12 bg-secondary" />
                  <Skeleton className="h-4 w-full max-w-md bg-secondary" />
                </div>
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground opacity-50">
              No logs matching criteria. System is idle.
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="flex gap-2 sm:gap-4 p-1.5 hover:bg-white/5 rounded transition-colors group">
                <div className="w-[120px] sm:w-[150px] shrink-0 text-muted-foreground/80 text-[11px] sm:text-xs pt-0.5">
                  {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss")}
                </div>
                <div className="w-[50px] sm:w-[70px] shrink-0 pt-0.5">
                  <LogLevelBadge level={log.level} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs sm:text-sm ${log.level === 'error' ? 'text-destructive' : log.level === 'warn' ? 'text-chart-3' : 'text-foreground/90'}`}>
                    {log.message}
                  </div>
                  {log.details && (
                    <div className="mt-1 text-[10px] sm:text-xs text-muted-foreground/60 whitespace-pre-wrap break-words bg-black/40 p-2 rounded border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity h-0 group-hover:h-auto overflow-hidden">
                      {log.details}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          
          <div className="h-4 w-full flex items-center gap-2 text-primary/50 text-xs px-2 pt-4 pb-8">
            <span className="w-2 h-4 bg-primary animate-pulse inline-block"></span>
            System listening...
          </div>
        </div>
      </div>
    </div>
  );
}

function LogLevelBadge({ level }: { level: string }) {
  if (level === 'error') {
    return <span className="text-[10px] uppercase text-destructive flex items-center gap-1 font-bold"><AlertCircle className="w-3 h-3" /> ERR</span>;
  }
  if (level === 'warn') {
    return <span className="text-[10px] uppercase text-chart-3 flex items-center gap-1 font-bold"><AlertTriangle className="w-3 h-3" /> WRN</span>;
  }
  return <span className="text-[10px] uppercase text-primary flex items-center gap-1 font-bold"><Info className="w-3 h-3" /> INF</span>;
}
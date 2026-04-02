import { useState } from "react";
import { useListPosts } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ExternalLink, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Posts() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const limit = 15;
  const offset = (page - 1) * limit;

  // We are not using search parameter because our generated API doesn't have it, 
  // but we provide the UI for consistency.
  const [search, setSearch] = useState("");

  const { data, isLoading } = useListPosts(
    { 
      limit, 
      offset,
      status: statusFilter !== "all" ? statusFilter as any : undefined
    }, 
    { query: { keepPreviousData: true } as any }
  );

  const posts = data?.posts || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit) || 1;

  // Client-side search filtering (since API might not support text search)
  const filteredPosts = search 
    ? posts.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.topic.toLowerCase().includes(search.toLowerCase()))
    : posts;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" />
            Content Database
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Total indexed: {total} records</p>
        </div>
      </div>

      <div className="bg-card/50 border border-border p-4 rounded-lg backdrop-blur flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search titles or topics..." 
            className="pl-9 font-mono text-sm bg-background/50 border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto flex gap-3">
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
            <SelectTrigger className="w-[140px] font-mono text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="draft">Drafts</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border border-border rounded-lg overflow-hidden bg-card/30 backdrop-blur">
        <Table>
          <TableHeader className="bg-secondary/50">
            <TableRow className="border-border/50">
              <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground w-[100px]">Status</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground w-[120px]">Niche</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">Title & Topic</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground w-[150px]">Date</TableHead>
              <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground text-right w-[80px]">Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border/50">
                  <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full max-w-[300px]" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : filteredPosts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-mono text-sm">
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              filteredPosts.map((post) => (
                <TableRow key={post.id} className="border-border/50 hover:bg-secondary/30 transition-colors">
                  <TableCell>
                    <StatusBadge status={post.status} />
                  </TableCell>
                  <TableCell>
                    <NicheBadge niche={post.niche} />
                  </TableCell>
                  <TableCell className="max-w-[200px] sm:max-w-none">
                    <div className="font-medium text-sm truncate">{post.title || 'Untitled'}</div>
                    <div className="text-xs text-muted-foreground truncate font-mono mt-0.5">{post.topic}</div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {format(new Date(post.createdAt), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell className="text-right">
                    {post.bloggerUrl ? (
                      <a href={post.bloggerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex p-2 hover:bg-secondary rounded text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-muted-foreground/30 inline-flex p-2">
                        <ExternalLink className="w-4 h-4" />
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-mono">
          Showing {posts.length > 0 ? offset + 1 : 0} to {Math.min(offset + limit, total)} of {total} entries
        </p>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="font-mono text-xs px-2">
            Page {page} of {totalPages}
          </div>
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || isLoading}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'published') return <Badge variant="default" className="bg-primary text-primary-foreground font-mono text-[10px] uppercase rounded-sm px-1.5 py-0">PUB</Badge>;
  if (status === 'failed') return <Badge variant="destructive" className="font-mono text-[10px] uppercase rounded-sm px-1.5 py-0">ERR</Badge>;
  return <Badge variant="secondary" className="font-mono text-[10px] uppercase rounded-sm px-1.5 py-0">DRF</Badge>;
}

function NicheBadge({ niche }: { niche: string }) {
  const colors: Record<string, string> = {
    motivation: "text-chart-2 bg-chart-2/10 border-chart-2/20",
    ai: "text-primary bg-primary/10 border-primary/20",
    money: "text-chart-3 bg-chart-3/10 border-chart-3/20",
    facts: "text-chart-5 bg-chart-5/10 border-chart-5/20",
    tech: "text-chart-4 bg-chart-4/10 border-chart-4/20",
  };
  
  const className = colors[niche] || "text-muted-foreground bg-secondary border-border";
  
  return (
    <Badge variant="outline" className={`font-mono text-[10px] uppercase rounded-sm px-1.5 py-0 border ${className}`}>
      {niche}
    </Badge>
  );
}
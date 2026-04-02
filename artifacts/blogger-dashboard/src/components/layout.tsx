import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Activity, Settings as SettingsIcon, LayoutDashboard, FileText, Menu, ExternalLink, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useGetAuthStatus, useLogout } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row bg-background text-foreground dark">
      <Sidebar className="hidden md:flex w-64 border-r border-border bg-card/50 flex-col" />
      <div className="flex-1 flex flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ className }: { className?: string }) {
  const [location] = useLocation();
  const { data: authStatus } = useGetAuthStatus();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleLogout = () => {
    logout(undefined, {
      onSuccess: () => {
        toast({ title: "Logged out", description: "Successfully disconnected from Blogger." });
        queryClient.invalidateQueries();
      }
    });
  };

  const links = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/posts", label: "Posts", icon: FileText },
    { href: "/logs", label: "Activity Logs", icon: Activity },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className={className}>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center font-mono font-bold text-primary-foreground">
            A
          </div>
          <div>
            <h1 className="font-mono font-bold tracking-tight text-lg leading-none">AutoBlog</h1>
            <p className="text-xs text-muted-foreground font-mono mt-1">SYSTEM TERMINAL</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 px-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location === link.href;
          return (
            <Link key={link.href} href={link.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all font-mono text-sm ${isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
              <Icon className="w-4 h-4" />
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-border/50 flex flex-col gap-2">
        {authStatus?.authenticated && authStatus.blogUrl && (
          <a href={authStatus.blogUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-primary transition-colors px-2 py-1.5 rounded hover:bg-secondary">
            <ExternalLink className="w-3 h-3" />
            <span className="truncate">{authStatus.blogTitle || "View Blog"}</span>
          </a>
        )}
        
        {authStatus?.authenticated && (
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-destructive transition-colors px-2 py-1.5 rounded hover:bg-destructive/10 text-left"
          >
            <LogOut className="w-3 h-3" />
            <span>Disconnect</span>
          </button>
        )}
      </div>
    </div>
  );
}

function MobileHeader() {
  return (
    <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card/50">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center font-mono font-bold text-primary-foreground text-xs">
          A
        </div>
        <span className="font-mono font-bold">AutoBlog</span>
      </div>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <Menu className="w-4 h-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-64 bg-background border-r-border">
          <Sidebar className="flex h-full flex-col" />
        </SheetContent>
      </Sheet>
    </div>
  );
}
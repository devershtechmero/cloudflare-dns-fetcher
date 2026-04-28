import { Cloud, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboard = location.pathname === "/dashboard";

  const handleLogout = () => {
    toast({ title: "Logged out", description: "You have been signed out." });
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-elegant transition-transform group-hover:scale-105">
            <Cloud className="h-5 w-5 text-primary-foreground" fill="currentColor" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-base font-semibold tracking-tight text-foreground">
              DNS Lookup
            </span>
            <span className="text-[11px] text-muted-foreground">
              Cloudflare A Records
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isDashboard && (
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

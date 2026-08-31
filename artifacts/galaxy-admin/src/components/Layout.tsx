import { useState } from "react";
import { useLocation } from "wouter";
import { useAdmin } from "@/App";
import {
  LayoutDashboard, Users, CreditCard, Radio, Bell, Settings,
  LogOut, Menu, X, Flag, ChevronRight, Zap, Gift, Image,
  Package, Send, Crown, Trophy, Gamepad2, ClipboardList, Eye,
  Wallet, FileText, HelpCircle, BarChart, Sparkles, Heart,
  Shield, UserCheck, Gavel, DollarSign, ListChecks, BadgeDollarSign,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard },
      { path: "/leaderboard", label: "Leaderboard", icon: Trophy },
    ],
  },
  {
    label: "Users & Reports",
    items: [
      { path: "/users", label: "All Users", icon: Users },
      { path: "/vip", label: "VIP & Officials", icon: Crown },
      { path: "/applications", label: "Applications", icon: ClipboardList },
      { path: "/kyc", label: "KYC Verification", icon: Shield },
      { path: "/reports-list", label: "Reports List", icon: Flag },
      { path: "/report-reasons", label: "Report Reasons", icon: Gavel },
    ],
  },
  {
    label: "Finance & Payouts",
    items: [
      { path: "/recharge", label: "Recharges", icon: CreditCard },
      { path: "/packages", label: "Coin Packages", icon: Package },
      { path: "/payout-requests", label: "Payout Requests", icon: DollarSign },
      { path: "/payout-methods", label: "Payout Methods", icon: Wallet },
      { path: "/wealth-levels", label: "Wealth Levels", icon: BarChart },
      { path: "/lucky-gift", label: "Lucky Gift", icon: Gift },
    ],
  },
  {
    label: "Content & Engagement",
    items: [
      { path: "/rooms", label: "Rooms", icon: Radio },
      { path: "/gifts", label: "Gifts", icon: Gift },
      { path: "/banners", label: "Banners", icon: Image },
      { path: "/games", label: "Games", icon: Gamepad2 },
      { path: "/game-bets", label: "Game Bets", icon: ListChecks },
      { path: "/posts", label: "Posts", icon: FileText },
      { path: "/beauty-effects", label: "Beauty Effects", icon: Sparkles },
      { path: "/reactions", label: "Reactions", icon: Heart },
    ],
  },
  {
    label: "Broadcast",
    items: [
      { path: "/alerts", label: "Global Alerts", icon: Bell },
      { path: "/notifications", label: "Notifications", icon: Send },
    ],
  },
  {
    label: "Support",
    items: [
      { path: "/help", label: "Help Requests", icon: HelpCircle },
    ],
  },
  {
    label: "Staff & Roles",
    items: [
      { path: "/staff", label: "Staff Management", icon: Users },
      { path: "/access-roles", label: "Access Roles", icon: UserCheck },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/settings", label: "Main Settings", icon: Settings },
      { path: "/settings/general", label: "General", icon: Settings2 },
      { path: "/settings/payment", label: "Payment", icon: CreditCard },
      { path: "/settings/moderation", label: "Moderation", icon: Gavel },
      { path: "/settings/withdrawal", label: "Withdrawal", icon: BadgeDollarSign },
      { path: "/settings/profile", label: "Profile", icon: UserCheck },
      { path: "/official-frames", label: "Official Frames", icon: Image },
    ],
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { adminUser, isDemo, setAdminLoggedIn } = useAdmin();

  function handleLogout() {
    setAdminLoggedIn(false);
    navigate("/login");
  }

  function isActive(path: string) {
    if (path === "/") return location === "/";
    if (path === "/settings") return location === "/settings";
    return location.startsWith(path);
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-4 border-b border-sidebar-border shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">Galaxy Admin</p>
            <p className="text-[10px] text-sidebar-foreground/50 mt-0.5">Control Panel v1.0</p>
          </div>
        </div>
        {isDemo && (
          <div className="mt-2 flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 rounded-md px-2 py-1">
            <Eye className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="text-[10px] text-amber-300 font-semibold">VIEW ONLY — Demo Mode</span>
          </div>
        )}
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-2 mb-1">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map(({ path, label, icon: Icon }) => {
                const active = isActive(path);
                return (
                  <button
                    key={path}
                    onClick={() => { navigate(path); setSidebarOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all group",
                      active
                        ? "bg-sidebar-accent text-white"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-white"
                    )}
                  >
                    <Icon className={cn("w-3.5 h-3.5 shrink-0", active ? "text-primary" : "text-sidebar-foreground/40 group-hover:text-primary/70")} />
                    <span className="flex-1 text-left">{label}</span>
                    {active && <ChevronRight className="w-3 h-3 text-primary/70 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-2 py-3 border-t border-sidebar-border shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-2 mb-1.5 rounded-lg bg-sidebar-accent/20">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-sm shrink-0">
            {isDemo ? "👁️" : "🌟"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-white truncate leading-none">{adminUser?.name || "Admin"}</p>
            <p className={cn("text-[10px] mt-0.5", isDemo ? "text-amber-400" : "text-primary/70")}>
              {isDemo ? "Demo Viewer" : "Super Admin"}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}
          className="w-full justify-start text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10 text-xs h-7">
          <LogOut className="w-3 h-3 mr-2" />Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Demo banner */}
      {isDemo && (
        <div className="fixed top-0 left-0 right-0 z-[999] bg-amber-500/90 text-amber-950 text-center text-xs font-bold py-1 px-4">
          👁️ DEMO MODE — View Only. Actions are disabled.
        </div>
      )}

      <aside className={cn("hidden lg:flex flex-col w-52 shrink-0 bg-sidebar border-r border-sidebar-border", isDemo && "mt-7")}>
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className={cn("relative z-10 flex flex-col w-52 bg-sidebar border-r border-sidebar-border", isDemo && "mt-7")}>
            <button className="absolute top-3 right-3 text-sidebar-foreground/60 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className={cn("flex-1 flex flex-col min-w-0 overflow-hidden", isDemo && "mt-7")}>
        <header className="lg:hidden flex items-center h-13 px-4 border-b border-border bg-card shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="mr-3 h-8 w-8">
            <Menu className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-sm">Galaxy Admin</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
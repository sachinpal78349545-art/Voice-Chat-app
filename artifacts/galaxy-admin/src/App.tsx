import { useState, useEffect, createContext, useContext } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoginPage from "@/pages/LoginPage";
import Dashboard from "@/pages/Dashboard";
import UsersPage from "@/pages/UsersPage";
import RechargePage from "@/pages/RechargePage";
import RoomsPage from "@/pages/RoomsPage";
import AlertsPage from "@/pages/AlertsPage";
import SettingsPage from "@/pages/SettingsPage";
import ReportsPage from "@/pages/ReportsPage";
import GiftsPage from "@/pages/GiftsPage";
import BannersPage from "@/pages/BannersPage";
import PackagesPage from "@/pages/PackagesPage";
import NotificationsPage from "@/pages/NotificationsPage";
import VipPage from "@/pages/VipPage";
import LeaderboardPage from "@/pages/LeaderboardPage";
import ApplicationsPage from "@/pages/ApplicationsPage";
import GamesPage from "@/pages/GamesPage";
import OfficialFramesPage from "@/pages/OfficialFramesPage";
import Layout from "@/components/Layout";

// ─── NEW IMPORTS ──────────────────────────────────────────────
import GeneralSettings from "@/pages/GeneralSettings";
import PaymentSettings from "@/pages/PaymentSettings";
import ContentModeration from "@/pages/ContentModeration";
import WithdrawalSettings from "@/pages/WithdrawalSettings";
import ProfileManagement from "@/pages/ProfileManagement";
import PayoutRequests from "@/pages/PayoutRequests";
import PayoutMethod from "@/pages/PayoutMethod";
import Report from "@/pages/Report";
import ReportReason from "@/pages/ReportReason";
import Help from "@/pages/Help";
import WealthLevel from "@/pages/WealthLevel";
import LuckyGiftHistory from "@/pages/LuckyGiftHistory";
import BeautyEffect from "@/pages/BeautyEffect";
import Reaction from "@/pages/Reaction";
import KycVerification from "@/pages/KycVerification";
import UserOverview from "@/pages/UserOverview";
import Post from "@/pages/Post";
import AccessRoles from "@/pages/AccessRoles";
import StaffManagement from "@/pages/StaffManagement";
import GameBetManagement from "@/pages/GameBetManagement";

const queryClient = new QueryClient();

const SESSION_KEY      = "galaxy_admin_auth";
const DEMO_SESSION_KEY = "galaxy_admin_demo";

// ─── Hardcoded demo credentials — view-only, cannot be changed via config ───
export const DEMO_USERNAME = "demo";
export const DEMO_PASSWORD = "demo123";

// ─── Auth Context ────────────────────────────────────────────────────────────
interface AuthContextType {
  adminUser: { name: string; avatar?: string } | null;
  loading: boolean;
  isDemo: boolean;
  setAdminLoggedIn: (v: boolean, demo?: boolean) => void;
  /** Call this inside any write action to show the demo-blocked popup */
  showDemoBlock: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  adminUser: null,
  loading: false,
  isDemo: false,
  setAdminLoggedIn: () => {},
  showDemoBlock: () => {},
});
export const useAdmin = () => useContext(AuthContext);

// ─── Demo Blocked Modal ───────────────────────────────────────────────────────
function DemoBlockedModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [, navigate] = useLocation();
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%)",
          border: "1px solid rgba(251,191,36,0.3)",
          borderRadius: 20, padding: "32px 28px", maxWidth: 380, width: "100%",
          textAlign: "center", boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        }}
      >
        {/* Lock icon */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%", margin: "0 auto 20px",
          background: "rgba(251,191,36,0.12)", border: "2px solid rgba(251,191,36,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32,
        }}>🔒</div>

        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fbbf24", margin: "0 0 10px" }}>
          Permission Denied
        </h2>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, margin: "0 0 8px" }}>
          You are logged in as a <strong style={{ color: "#fbbf24" }}>Demo User</strong>.
        </p>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.6, margin: "0 0 28px" }}>
          Demo accounts can only view data. All actions (create, edit, delete, approve, ban, etc.) are disabled. Login with your admin credentials to make changes.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)", fontSize: 13,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            Got It
          </button>
          <button
            onClick={() => { onClose(); navigate("/login"); }}
            style={{
              flex: 1, padding: "10px 0", borderRadius: 10, border: "none",
              background: "linear-gradient(90deg, #f59e0b, #d97706)", color: "#1a0a00", fontSize: 13,
              fontWeight: 700, cursor: "pointer",
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { adminUser, loading } = useAdmin();
  const [, navigate] = useLocation();
  useEffect(() => {
    if (!loading && !adminUser) navigate("/login");
  }, [loading, adminUser, navigate]);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading Galaxy Admin...</p>
        </div>
      </div>
    );
  }
  if (!adminUser) return null;
  return <>{children}</>;
}

function Guarded({ children }: { children: React.ReactNode }) {
  return <AuthGuard><Layout>{children}</Layout></AuthGuard>;
}

// ─── Router ───────────────────────────────────────────────────────────────────
function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">            <Guarded><Dashboard /></Guarded></Route>
      <Route path="/users">       <Guarded><UsersPage /></Guarded></Route>
      <Route path="/recharge">    <Guarded><RechargePage /></Guarded></Route>
      <Route path="/rooms">       <Guarded><RoomsPage /></Guarded></Route>
      <Route path="/alerts">      <Guarded><AlertsPage /></Guarded></Route>
      <Route path="/reports">     <Guarded><ReportsPage /></Guarded></Route>
      <Route path="/gifts">       <Guarded><GiftsPage /></Guarded></Route>
      <Route path="/banners">     <Guarded><BannersPage /></Guarded></Route>
      <Route path="/packages">    <Guarded><PackagesPage /></Guarded></Route>
      <Route path="/notifications"><Guarded><NotificationsPage /></Guarded></Route>
      <Route path="/vip">         <Guarded><VipPage /></Guarded></Route>
      <Route path="/leaderboard"> <Guarded><LeaderboardPage /></Guarded></Route>
      <Route path="/applications"><Guarded><ApplicationsPage /></Guarded></Route>
      <Route path="/games">       <Guarded><GamesPage /></Guarded></Route>
      <Route path="/official-frames"><Guarded><OfficialFramesPage /></Guarded></Route>
      <Route path="/settings">    <Guarded><SettingsPage /></Guarded></Route>

      {/* ─── NEW ADMIN ROUTES ────────────────────────────── */}
      <Route path="/settings/general">
        <Guarded><GeneralSettings /></Guarded>
      </Route>
      <Route path="/settings/payment">
        <Guarded><PaymentSettings /></Guarded>
      </Route>
      <Route path="/settings/moderation">
        <Guarded><ContentModeration /></Guarded>
      </Route>
      <Route path="/settings/withdrawal">
        <Guarded><WithdrawalSettings /></Guarded>
      </Route>
      <Route path="/settings/profile">
        <Guarded><ProfileManagement /></Guarded>
      </Route>

      <Route path="/payout-requests">
        <Guarded><PayoutRequests /></Guarded>
      </Route>
      <Route path="/payout-methods">
        <Guarded><PayoutMethod /></Guarded>
      </Route>

      {/* New Reports page (avoid conflict with existing /reports) */}
      <Route path="/reports-list">
        <Guarded><Report /></Guarded>
      </Route>
      <Route path="/report-reasons">
        <Guarded><ReportReason /></Guarded>
      </Route>

      <Route path="/help">
        <Guarded><Help /></Guarded>
      </Route>

      <Route path="/wealth-levels">
        <Guarded><WealthLevel /></Guarded>
      </Route>
      <Route path="/lucky-gift">
        <Guarded><LuckyGiftHistory /></Guarded>
      </Route>
      <Route path="/beauty-effects">
        <Guarded><BeautyEffect /></Guarded>
      </Route>
      <Route path="/reactions">
        <Guarded><Reaction /></Guarded>
      </Route>

      <Route path="/kyc">
        <Guarded><KycVerification /></Guarded>
      </Route>

      {/* UserOverview uses a dynamic param */}
      <Route path="/user/:uid">
        <Guarded><UserOverview /></Guarded>
      </Route>

      <Route path="/posts">
        <Guarded><Post /></Guarded>
      </Route>

      <Route path="/access-roles">
        <Guarded><AccessRoles /></Guarded>
      </Route>
      <Route path="/staff">
        <Guarded><StaffManagement /></Guarded>
      </Route>
      <Route path="/game-bets">
        <Guarded><GameBetManagement /></Guarded>
      </Route>

    </Switch>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
function App() {
  const [adminUser, setAdminUser] = useState<{ name: string; avatar?: string } | null>(null);
  const [loading, setLoading]     = useState(true);
  const [isDemo, setIsDemo]       = useState(false);
  const [demoBlockOpen, setDemoBlockOpen] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    const demo   = sessionStorage.getItem(DEMO_SESSION_KEY);
    if (stored === "true") {
      setAdminUser({ name: "SuperAdmin" });
      setIsDemo(false);
    } else if (demo === "true") {
      setAdminUser({ name: "Demo Viewer" });
      setIsDemo(true);
    }
    setLoading(false);
  }, []);

  const setAdminLoggedIn = (v: boolean, demo = false) => {
    if (v) {
      if (demo) {
        sessionStorage.setItem(DEMO_SESSION_KEY, "true");
        sessionStorage.removeItem(SESSION_KEY);
        setAdminUser({ name: "Demo Viewer" });
        setIsDemo(true);
      } else {
        sessionStorage.setItem(SESSION_KEY, "true");
        sessionStorage.removeItem(DEMO_SESSION_KEY);
        setAdminUser({ name: "SuperAdmin" });
        setIsDemo(false);
      }
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(DEMO_SESSION_KEY);
      setAdminUser(null);
      setIsDemo(false);
    }
  };

  const showDemoBlock = () => setDemoBlockOpen(true);

  return (
    <AuthContext.Provider value={{ adminUser, loading, isDemo, setAdminLoggedIn, showDemoBlock }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
            <DemoBlockedModal open={demoBlockOpen} onClose={() => setDemoBlockOpen(false)} />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}

export default App;
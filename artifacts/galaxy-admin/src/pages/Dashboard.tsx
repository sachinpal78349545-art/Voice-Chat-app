import { useEffect, useState } from "react";
import { Users, Radio, CreditCard, TrendingUp, Activity, Clock } from "lucide-react";
import { getAdminStats } from "@/lib/adminService";
import { cn } from "@/lib/utils";

interface Stats {
  totalUsers: number;
  onlineUsers: number;
  totalRooms: number;
  liveRooms: number;
  pendingRecharges: number;
  totalRecharges: number;
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  color,
}: {
  title: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground font-medium">{title}</p>
        <p className="text-2xl font-bold text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then(s => {
      setStats(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Galaxy Voice Chat — live overview</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            title="Total Users"
            value={stats?.totalUsers ?? 0}
            icon={Users}
            color="bg-blue-600"
            sub="Registered accounts"
          />
          <StatCard
            title="Online Now"
            value={stats?.onlineUsers ?? 0}
            icon={Activity}
            color="bg-green-600"
            sub="Active users"
          />
          <StatCard
            title="Total Rooms"
            value={stats?.totalRooms ?? 0}
            icon={Radio}
            color="bg-purple-600"
            sub="All rooms"
          />
          <StatCard
            title="Live Rooms"
            value={stats?.liveRooms ?? 0}
            icon={TrendingUp}
            color="bg-pink-600"
            sub="Currently active"
          />
          <StatCard
            title="Pending Recharges"
            value={stats?.pendingRecharges ?? 0}
            icon={Clock}
            color="bg-orange-600"
            sub="Awaiting approval"
          />
          <StatCard
            title="Total Recharges"
            value={stats?.totalRecharges ?? 0}
            icon={CreditCard}
            color="bg-teal-600"
            sub="All time"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-white mb-3 text-sm">Quick Stats</h3>
          <div className="space-y-3">
            {[
              { label: "Online Rate", value: stats ? `${stats.totalUsers > 0 ? Math.round((stats.onlineUsers / stats.totalUsers) * 100) : 0}%` : "—" },
              { label: "Live Room Rate", value: stats ? `${stats.totalRooms > 0 ? Math.round((stats.liveRooms / stats.totalRooms) * 100) : 0}%` : "—" },
              { label: "Pending Approval Rate", value: stats ? `${stats.totalRecharges > 0 ? Math.round((stats.pendingRecharges / stats.totalRecharges) * 100) : 0}%` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold text-white">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-white mb-3 text-sm">Admin Shortcuts</h3>
          <div className="space-y-2">
            {[
              { label: "Manage pending recharges", href: "/recharge" },
              { label: "Search & manage users", href: "/users" },
              { label: "Monitor live rooms", href: "/rooms" },
              { label: "Send global alert", href: "/alerts" },
              { label: "App settings & maintenance", href: "/settings" },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={import.meta.env.BASE_URL.replace(/\/$/, "") + href}
                className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted text-foreground hover:text-white transition-colors"
              >
                <span>{label}</span>
                <span className="text-muted-foreground">→</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

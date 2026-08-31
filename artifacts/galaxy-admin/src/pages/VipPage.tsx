import { useState, useEffect } from "react";
import { Crown, RefreshCw, Star, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllUsers, setOfficialRole, addCoins, UserProfile } from "@/lib/adminService";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/App";
import { cn } from "@/lib/utils";

function timeAgo(ts: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString();
}

export default function VipPage() {
  const { toast } = useToast();
  const { isDemo, showDemoBlock } = useAdmin();
  const [users, setUsers]   = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"vip" | "top_coins" | "top_level" | "official">("vip");

  async function load() {
    setLoading(true);
    const all = await getAllUsers();
    setUsers(all);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = (() => {
    if (filter === "vip")       return users.filter(u => u.vip).sort((a, b) => (b.level || 0) - (a.level || 0));
    if (filter === "top_coins") return [...users].sort((a, b) => (b.coins || 0) - (a.coins || 0)).slice(0, 50);
    if (filter === "top_level") return [...users].sort((a, b) => (b.level || 0) - (a.level || 0)).slice(0, 50);
    if (filter === "official")  return users.filter(u => u.globalRole === "official" || u.globalRole === "officialHost");
    return users;
  })();

  const filters = [
    { key: "vip" as const,       label: "VIP Users",  count: users.filter(u => u.vip).length },
    { key: "top_coins" as const, label: "Top Coins",  count: null },
    { key: "top_level" as const, label: "Top Level",  count: null },
    { key: "official" as const,  label: "Officials",  count: users.filter(u => u.globalRole === "official" || u.globalRole === "officialHost").length },
  ];

  async function handleAddCoins(uid: string, amount: number) {
    if (isDemo) { showDemoBlock(); return; }
    try {
      await addCoins(uid, amount);
      toast({ title: `+${amount} coins added` });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }

  async function toggleOfficial(user: UserProfile) {
    if (isDemo) { showDemoBlock(); return; }
    try {
      await setOfficialRole(user.uid, user.globalRole !== "official");
      toast({ title: user.globalRole === "official" ? "Official removed" : "Official granted" });
      load();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">VIP & Officials</h1>
          <p className="text-muted-foreground text-sm">
            {users.filter(u => u.vip).length} VIP · {users.filter(u => u.globalRole === "official" || u.globalRole === "officialHost").length} officials
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />Refresh
        </Button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {filters.map(({ key, label, count }) => (
          <Button key={key} size="sm" variant={filter === key ? "default" : "outline"} onClick={() => setFilter(key)} className="text-xs">
            {label} {count !== null && <span className="ml-1 opacity-70">({count})</span>}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Crown className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No users in this category</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((user, idx) => (
            <div key={user.uid} className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">
                {(filter === "top_coins" || filter === "top_level") ? idx + 1 : <span>{user.avatar || "👤"}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-sm text-white">{user.name || "Unknown"}</span>
                  {user.vip && <Crown className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                  {user.globalRole === "official" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-bold">OFFICIAL</span>}
                  {user.globalRole === "officialHost" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 font-bold">HOST</span>}
                </div>
                <p className="text-xs text-muted-foreground">ID: {user.userId} · Lv {user.level || 1} · 🪙 {(user.coins || 0).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-yellow-400 hover:bg-yellow-400/10" onClick={() => handleAddCoins(user.uid, 100)}>
                  +100🪙
                </Button>
                <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-blue-400 hover:bg-blue-400/10" onClick={() => toggleOfficial(user)}>
                  <Star className={cn("w-3.5 h-3.5", user.globalRole === "official" && "fill-blue-400")} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

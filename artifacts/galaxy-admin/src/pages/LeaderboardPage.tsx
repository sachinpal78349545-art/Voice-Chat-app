import { useState, useEffect } from "react";
import { Trophy, RefreshCw, Gift, Star, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllUsers, UserProfile } from "@/lib/adminService";
import { get, ref } from "firebase/database";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";

interface GiftEntry {
  uid: string;
  name: string;
  avatar: string;
  totalCoins: number;
}

export default function LeaderboardPage() {
  const [tab, setTab] = useState<"rich" | "gifters" | "earners">("rich");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [gifters, setGifters] = useState<GiftEntry[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const all = await getAllUsers();
    setUsers(all);

    const giftSnap = await get(ref(db, "gifts")).catch(() => null);
    if (giftSnap?.exists()) {
      const val = giftSnap.val();
      const totals: Record<string, { name: string; avatar: string; coins: number }> = {};
      for (const g of Object.values(val) as any[]) {
        if (!totals[g.senderId]) totals[g.senderId] = { name: g.senderName, avatar: g.senderAvatar, coins: 0 };
        totals[g.senderId].coins += g.coins || 0;
      }
      const list: GiftEntry[] = Object.entries(totals).map(([uid, d]) => ({ uid, name: d.name, avatar: d.avatar, totalCoins: d.coins }));
      list.sort((a, b) => b.totalCoins - a.totalCoins);
      setGifters(list.slice(0, 50));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const richUsers = [...users].sort((a, b) => (b.coins || 0) - (a.coins || 0)).slice(0, 50);
  const earnerUsers = [...users].sort((a, b) => (b.totalEarnings || 0) - (a.totalEarnings || 0)).slice(0, 50);

  const tabs = [
    { key: "rich" as const, label: "💰 Richest", data: richUsers, valueKey: "coins" as const, suffix: " coins" },
    { key: "gifters" as const, label: "🎁 Top Gifters", data: gifters, valueKey: "totalCoins" as const, suffix: " sent" },
    { key: "earners" as const, label: "📈 Top Earners", data: earnerUsers, valueKey: "totalEarnings" as const, suffix: " earned" },
  ];

  const currentTab = tabs.find(t => t.key === tab)!;

  const medalColors = ["text-yellow-400", "text-gray-300", "text-orange-400"];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
          <p className="text-muted-foreground text-sm">Top users across all metrics</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {tabs.map(t => (
          <Button key={t.key} size="sm" variant={tab === t.key ? "default" : "outline"} onClick={() => setTab(t.key)} className="text-xs">
            {t.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-14 bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-1.5">
          {(currentTab.data as any[]).map((item: any, idx) => (
            <div key={item.uid} className={cn("bg-card border rounded-xl px-4 py-3 flex items-center gap-3", idx < 3 ? "border-primary/30" : "border-border")}>
              <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0", idx < 3 ? "bg-primary/20" : "bg-muted")}>
                {idx < 3 ? (
                  <span className={medalColors[idx]}>
                    {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">{idx + 1}</span>
                )}
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm shrink-0">
                {item.avatar || "👤"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-white truncate">{item.name || "Unknown"}</p>
                {item.userId && <p className="text-xs text-muted-foreground">ID: {item.userId}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-yellow-400">
                  🪙 {((item[currentTab.valueKey] || 0) as number).toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">{currentTab.suffix}</p>
              </div>
            </div>
          ))}
          {(currentTab.data as any[]).length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No data yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

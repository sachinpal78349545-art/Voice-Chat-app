import { useState, useEffect, useCallback } from "react";
import {
  Search, Ban, ShieldCheck, Coins, Star, Ghost, Smartphone,
  ChevronDown, ChevronUp, RefreshCw, Check, X, Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  getAllUsers, searchUsers, banUser, unbanUser, shadowBanUser,
  deviceBanUser, setOfficialRole, setUserCoins, UserProfile,
} from "@/lib/adminService";
import { useAdmin } from "@/App";
import { cn } from "@/lib/utils";

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold", color)}>
      {label}
    </span>
  );
}

function UserRow({ user, adminUid, onRefresh }: { user: UserProfile; adminUid: string; onRefresh: () => void }) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("");
  const [newCoins, setNewCoins] = useState(String(user.coins || 0));
  const [showBanForm, setShowBanForm] = useState(false);
  const [showCoinsForm, setShowCoinsForm] = useState(false);

  async function doAction(fn: () => Promise<void>, msg: string) {
    setLoading(true);
    try {
      await fn();
      toast({ title: msg });
      onRefresh();
    } catch {
      toast({ title: "Error", description: "Action failed", variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-base shrink-0">
          {user.avatar || "👤"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-sm text-white truncate">{user.name || "Unknown"}</span>
            {user.globalRole === "official" && <Badge label="Official" color="bg-blue-500/20 text-blue-400" />}
            {user.isBanned && <Badge label="Banned" color="bg-red-500/20 text-red-400" />}
            {user.shadowBanned && <Badge label="Shadow" color="bg-yellow-500/20 text-yellow-400" />}
            {user.deviceBanned && <Badge label="DevBan" color="bg-orange-500/20 text-orange-400" />}
          </div>
          <p className="text-xs text-muted-foreground">ID: {user.userId} · {user.email}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-yellow-400 font-semibold hidden sm:block">🪙 {user.coins ?? 0}</span>
          <span className={cn("w-1.5 h-1.5 rounded-full", user.online ? "bg-green-400" : "bg-muted-foreground")} />
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/10">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><p className="text-muted-foreground text-xs">Level</p><p className="font-semibold text-white">{user.level ?? 1}</p></div>
            <div><p className="text-muted-foreground text-xs">Coins</p><p className="font-semibold text-yellow-400">🪙 {user.coins ?? 0}</p></div>
            <div><p className="text-muted-foreground text-xs">Followers</p><p className="font-semibold text-white">{user.followers ?? 0}</p></div>
            <div><p className="text-muted-foreground text-xs">Rooms Joined</p><p className="font-semibold text-white">{user.roomsJoined ?? 0}</p></div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={loading}
              onClick={() => doAction(
                () => setOfficialRole(user.uid, user.globalRole !== "official"),
                user.globalRole === "official" ? "Official role removed" : "Official role granted"
              )}
            >
              <Star className="w-3.5 h-3.5 mr-1.5" />
              {user.globalRole === "official" ? "Remove Official" : "Make Official"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={loading}
              onClick={() => doAction(
                () => shadowBanUser(user.uid, !user.shadowBanned),
                user.shadowBanned ? "Shadow ban removed" : "Shadow banned"
              )}
            >
              <Ghost className="w-3.5 h-3.5 mr-1.5" />
              {user.shadowBanned ? "Un-Shadow Ban" : "Shadow Ban"}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              disabled={loading}
              onClick={() => doAction(
                () => deviceBanUser(user.uid, !user.deviceBanned),
                user.deviceBanned ? "Device ban removed" : "Device banned"
              )}
            >
              <Smartphone className="w-3.5 h-3.5 mr-1.5" />
              {user.deviceBanned ? "Un-Device Ban" : "Device Ban"}
            </Button>

            <Button
              size="sm"
              variant={user.isBanned ? "outline" : "destructive"}
              className="text-xs"
              disabled={loading}
              onClick={() => {
                if (user.isBanned) {
                  doAction(() => unbanUser(user.uid), "User unbanned");
                } else {
                  setShowBanForm(v => !v);
                }
              }}
            >
              {user.isBanned ? <><ShieldCheck className="w-3.5 h-3.5 mr-1.5" />Unban</> : <><Ban className="w-3.5 h-3.5 mr-1.5" />Ban</>}
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => setShowCoinsForm(v => !v)}
            >
              <Coins className="w-3.5 h-3.5 mr-1.5" />
              Set Coins
            </Button>
          </div>

          {showBanForm && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-destructive">Ban User</p>
              <Input
                placeholder="Ban reason"
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                className="text-xs h-8 bg-background"
              />
              <Input
                placeholder="Duration in hours (blank = permanent)"
                type="number"
                value={banDuration}
                onChange={e => setBanDuration(e.target.value)}
                className="text-xs h-8 bg-background"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-xs flex-1"
                  disabled={loading || !banReason}
                  onClick={() => {
                    doAction(
                      () => banUser(user.uid, adminUid, banReason, banDuration ? Number(banDuration) : undefined),
                      "User banned"
                    );
                    setShowBanForm(false);
                  }}
                >
                  <Check className="w-3 h-3 mr-1" /> Confirm Ban
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowBanForm(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}

          {showCoinsForm && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-yellow-400">Set Coins</p>
              <Input
                type="number"
                value={newCoins}
                onChange={e => setNewCoins(e.target.value)}
                className="text-xs h-8 bg-background"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="text-xs flex-1 bg-yellow-600 hover:bg-yellow-700"
                  disabled={loading}
                  onClick={() => {
                    doAction(() => setUserCoins(user.uid, Number(newCoins)), `Coins set to ${newCoins}`);
                    setShowCoinsForm(false);
                  }}
                >
                  <Check className="w-3 h-3 mr-1" /> Set
                </Button>
                <Button size="sm" variant="outline" className="text-xs" onClick={() => setShowCoinsForm(false)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function UsersPage() {
  const { adminUser } = useAdmin();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "online" | "banned" | "official">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const list = query ? await searchUsers(query) : await getAllUsers();
    setUsers(list);
    setLoading(false);
  }, [query]);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u => {
    if (filter === "online") return u.online;
    if (filter === "banned") return u.isBanned;
    if (filter === "official") return u.globalRole === "official";
    return true;
  });

  const filters: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "online", label: "Online" },
    { key: "banned", label: "Banned" },
    { key: "official", label: "Official" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-muted-foreground text-sm">{users.length} total users</p>
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or user ID..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-1.5">
          {filters.map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={filter === key ? "default" : "outline"}
              onClick={() => setFilter(key)}
              className="text-xs"
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Crown className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(user => (
            <UserRow key={user.uid} user={user} adminUid={adminUser?.uid || ""} onRefresh={load} />
          ))}
        </div>
      )}
    </div>
  );
}

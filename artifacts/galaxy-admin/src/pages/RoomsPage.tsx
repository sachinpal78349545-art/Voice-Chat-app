import { useState, useEffect } from "react";
import { Trash2, Radio, Users, Lock, Star, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { subscribeRooms, deleteRoom, wipeDummyRooms, setOfficialRoom, Room } from "@/lib/adminService";
import { useAdmin } from "@/App";
import { cn } from "@/lib/utils";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function RoomCard({ room, onRefresh }: { room: Room & { isOfficial?: boolean }; onRefresh: () => void }) {
  const { toast } = useToast();
  const { isDemo, showDemoBlock } = useAdmin();
  const [loading, setLoading] = useState(false);

  async function doAction(fn: () => Promise<void>, msg: string) {
    if (isDemo) { showDemoBlock(); return; }
    setLoading(true);
    try {
      await fn();
      toast({ title: msg });
      onRefresh();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setLoading(false);
  }

  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-lg shrink-0">
          {room.coverEmoji || "🎤"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-white truncate">{room.name}</span>
            {room.isOfficial && <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-1.5 py-0.5 rounded font-semibold">OFFICIAL</span>}
            {room.isPrivate && <Lock className="w-3 h-3 text-muted-foreground" />}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{room.listeners ?? 0}</span>
            <span>by {room.host}</span>
            <span>{room.category}</span>
            <span>{timeAgo(room.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" variant="outline" className="text-xs h-7 px-2" disabled={loading}
            onClick={() => doAction(() => setOfficialRoom(room.id, !room.isOfficial), room.isOfficial ? "Official tag removed" : "Room marked official")}>
            <Star className={cn("w-3 h-3", room.isOfficial ? "text-yellow-400 fill-yellow-400" : "")} />
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={loading}
            onClick={() => { if (confirm(`Delete room "${room.name}"?`)) doAction(() => deleteRoom(room.id), "Room deleted"); }}>
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const { toast } = useToast();
  const { isDemo, showDemoBlock } = useAdmin();
  const [rooms, setRooms]       = useState<(Room & { isOfficial?: boolean })[]>([]);
  const [loading, setLoading]   = useState(true);
  const [wipingDummy, setWipingDummy] = useState(false);
  const [filter, setFilter]     = useState<"all" | "live" | "private" | "official">("all");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeRooms(list => { setRooms(list as any); setLoading(false); });
    return unsub;
  }, [refreshKey]);

  async function handleWipeDummy() {
    if (isDemo) { showDemoBlock(); return; }
    if (!confirm("This will delete all empty rooms (0 listeners). Continue?")) return;
    setWipingDummy(true);
    try {
      const count = await wipeDummyRooms();
      toast({ title: `Wiped ${count} empty rooms` });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setWipingDummy(false);
  }

  const filtered = rooms.filter(r => {
    if (filter === "live")     return r.isLive && (r.listeners || 0) > 0;
    if (filter === "private")  return r.isPrivate;
    if (filter === "official") return (r as any).isOfficial;
    return true;
  });

  const filters: { key: typeof filter; label: string }[] = [
    { key: "all",      label: "All"      },
    { key: "live",     label: "Live"     },
    { key: "private",  label: "Private"  },
    { key: "official", label: "Official" },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Rooms</h1>
          <p className="text-muted-foreground text-sm">{rooms.length} total rooms</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setRefreshKey(k => k + 1)} disabled={loading}>
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />Refresh
          </Button>
          <Button size="sm" variant="outline" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={handleWipeDummy} disabled={wipingDummy}>
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />Wipe Empty Rooms
          </Button>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {filters.map(({ key, label }) => (
          <Button key={key} size="sm" variant={filter === key ? "default" : "outline"} onClick={() => setFilter(key)} className="text-xs">{label}</Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-card border border-border rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground"><Radio className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No rooms found</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(room => <RoomCard key={room.id} room={room} onRefresh={() => setRefreshKey(k => k + 1)} />)}
        </div>
      )}
    </div>
  );
}

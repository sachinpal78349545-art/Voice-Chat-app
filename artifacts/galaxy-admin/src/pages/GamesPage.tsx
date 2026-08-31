import { useState, useEffect } from "react";
import { ref, onValue, off, set, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAdmin } from "@/App";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Gamepad2, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface GameConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  url: string;          // deep link or route e.g. /games/ludo
  imageUrl?: string;    // banner image
  category: "mini" | "party" | "skill";
  enabled: boolean;
  comingSoon?: boolean;
  order: number;
  playerCount?: string; // e.g. "2-4 players"
  createdAt: number;
}

const DEFAULT_GAMES: Omit<GameConfig, "createdAt">[] = [
  { id: "ludo", name: "Ludo", icon: "🎲", description: "Classic board game for 2-4 players", url: "/games/ludo", category: "party", enabled: true, order: 1, playerCount: "2-4 players" },
  { id: "carrom", name: "Carrom", icon: "🎯", description: "Skill-based board game", url: "/games/carrom", category: "skill", enabled: true, order: 2, playerCount: "2 players" },
  { id: "truth_dare", name: "Truth & Dare", icon: "🎭", description: "Fun party game for groups", url: "/games/truth-dare", category: "party", enabled: true, order: 3, playerCount: "3+ players" },
  { id: "snake_ladder", name: "Snake & Ladder", icon: "🐍", description: "Classic board game", url: "/games/snake-ladder", category: "party", enabled: true, order: 4, playerCount: "2-4 players" },
  { id: "yummy_crush", name: "Yummy Crush", icon: "🍭", description: "Match 3 puzzle game", url: "/games/yummy-crush", category: "mini", enabled: false, comingSoon: true, order: 5 },
];

const CATEGORY_COLORS = {
  mini: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  party: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  skill: "bg-green-500/20 text-green-400 border-green-500/30",
};

const emptyForm = (): Partial<GameConfig> => ({
  name: "", icon: "🎮", description: "", url: "", imageUrl: "",
  category: "mini", enabled: true, order: 99, playerCount: "",
});

export default function GamesPage() {
  const [games, setGames] = useState<GameConfig[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<GameConfig | null>(null);
  const [form, setForm] = useState<Partial<GameConfig>>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { isDemo, showDemoBlock } = useAdmin();
  const { toast } = useToast();

  useEffect(() => {
    const r = ref(db, "appConfig/games");
    const h = onValue(r, snap => {
      if (!snap.exists()) {
        setGames([]);
        return;
      }
      const arr = (Object.values(snap.val()) as GameConfig[]).sort((a, b) => a.order - b.order);
      setGames(arr);
      setSeeded(true);
    });
    return () => off(r, "value", h);
  }, []);

  async function seedDefaults() {
    if (isDemo) { showDemoBlock(); return; }
    for (const g of DEFAULT_GAMES) {
      await set(ref(db, `appConfig/games/${g.id}`), { ...g, createdAt: Date.now() });
    }
    toast({ title: "Default games seeded!" });
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(g: GameConfig) {
    setEditing(g);
    setForm({ ...g });
    setShowForm(true);
  }

  async function handleSave() {
    if (isDemo) { showDemoBlock(); return; }
    if (!form.name || !form.url) return toast({ title: "Name and URL are required.", variant: "destructive" });
    setSaving(true);
    const id = editing?.id || form.name!.toLowerCase().replace(/\s+/g, "_");
    try {
      await set(ref(db, `appConfig/games/${id}`), {
        ...form, id,
        createdAt: editing?.createdAt || Date.now(),
        enabled: form.enabled ?? true,
        order: Number(form.order) || 99,
      });
      toast({ title: editing ? "Game updated!" : "Game added!" });
      setShowForm(false);
    } catch {
      toast({ title: "Error saving game", variant: "destructive" });
    }
    setSaving(false);
  }

  async function toggleEnabled(g: GameConfig) {
    if (isDemo) { showDemoBlock(); return; }
    await update(ref(db, `appConfig/games/${g.id}`), { enabled: !g.enabled });
    toast({ title: `${g.name} ${!g.enabled ? "enabled" : "disabled"}` });
  }

  async function handleDelete(id: string) {
    if (isDemo) { showDemoBlock(); return; }
    setDeleting(id);
    try {
      await remove(ref(db, `appConfig/games/${id}`));
      toast({ title: "Game removed." });
    } catch {
      toast({ title: "Error deleting game", variant: "destructive" });
    }
    setDeleting(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Gamepad2 className="w-5 h-5 text-primary" /> Games Management
          </h1>
          <p className="text-muted-foreground text-sm">Configure games shown in the app. Add links, enable/disable, set order.</p>
        </div>
        <div className="flex gap-2">
          {!seeded && (
            <Button variant="outline" size="sm" onClick={seedDefaults} className="text-xs gap-1.5">
              Seed Defaults
            </Button>
          )}
          <Button size="sm" onClick={openAdd} className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Add Game
          </Button>
        </div>
      </div>

      {games.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <Gamepad2 className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">No games configured yet.</p>
          <Button variant="outline" size="sm" onClick={seedDefaults}>Seed Default Games</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {games.map(g => (
            <div key={g.id} className={cn(
              "bg-card border rounded-xl p-4 transition-all",
              g.enabled ? "border-border" : "border-border/50 opacity-60"
            )}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-2xl shrink-0">
                    {g.imageUrl ? <img src={g.imageUrl} alt="" className="w-10 h-10 rounded-xl object-cover" /> : g.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{g.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Badge className={cn("text-[10px] py-0", CATEGORY_COLORS[g.category])}>{g.category}</Badge>
                      {g.comingSoon && <Badge className="text-[10px] py-0 bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Coming Soon</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg text-muted-foreground hover:text-white hover:bg-muted/50 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(g.id)} disabled={deleting === g.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{g.description}</p>

              {g.playerCount && <p className="text-xs text-muted-foreground mt-1">👥 {g.playerCount}</p>}

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <a href={g.url} target="_blank" rel="noreferrer"
                  className="text-xs text-primary/70 hover:text-primary flex items-center gap-1 flex-1 min-w-0 truncate">
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">{g.url}</span>
                </a>
                <button onClick={() => toggleEnabled(g)}
                  className={cn("flex items-center gap-1 text-xs font-medium transition-colors shrink-0",
                    g.enabled ? "text-green-400 hover:text-green-300" : "text-muted-foreground hover:text-white")}>
                  {g.enabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  {g.enabled ? "On" : "Off"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">{editing ? "Edit Game" : "Add Game"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-1">
                <Label className="text-xs text-muted-foreground">Icon</Label>
                <Input value={form.icon || ""} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                  className="bg-muted border-border text-center text-xl" maxLength={4} />
              </div>
              <div className="col-span-3">
                <Label className="text-xs text-muted-foreground">Game Name *</Label>
                <Input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Ludo" className="bg-muted border-border text-foreground" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Description</Label>
              <Input value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short description" className="bg-muted border-border text-foreground" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">URL / Route *</Label>
              <Input value={form.url || ""} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder="/games/ludo or https://..." className="bg-muted border-border text-foreground font-mono text-xs" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Banner Image URL (optional)</Label>
              <Input value={form.imageUrl || ""} onChange={e => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..." className="bg-muted border-border text-foreground text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Category</Label>
                <select value={form.category || "mini"} onChange={e => setForm(f => ({ ...f, category: e.target.value as any }))}
                  className="w-full h-9 rounded-md bg-muted border border-border text-foreground text-sm px-2">
                  <option value="mini">Mini</option>
                  <option value="party">Party</option>
                  <option value="skill">Skill</option>
                </select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Order</Label>
                <Input type="number" value={form.order ?? 99} onChange={e => setForm(f => ({ ...f, order: Number(e.target.value) }))}
                  className="bg-muted border-border text-foreground" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Player Count</Label>
              <Input value={form.playerCount || ""} onChange={e => setForm(f => ({ ...f, playerCount: e.target.value }))}
                placeholder="e.g. 2-4 players" className="bg-muted border-border text-foreground" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.enabled} onChange={e => setForm(f => ({ ...f, enabled: e.target.checked }))}
                  className="rounded" />
                <span className="text-xs text-muted-foreground">Enabled</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.comingSoon} onChange={e => setForm(f => ({ ...f, comingSoon: e.target.checked }))}
                  className="rounded" />
                <span className="text-xs text-muted-foreground">Coming Soon</span>
              </label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editing ? "Save Changes" : "Add Game"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

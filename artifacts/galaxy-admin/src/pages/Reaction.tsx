// src/pages/Reaction.tsx
import { useState, useEffect } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

interface Reaction {
  id: string;
  name: string;
  emoji: string;
  status: "active" | "inactive";
  createdAt: number;
}

export default function Reaction() {
  const { toast } = useToast();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReaction, setNewReaction] = useState({ name: "", emoji: "" });

  useEffect(() => {
    const refReactions = ref(db, "reactions");
    const unsub = onValue(refReactions, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map(key => ({ ...data[key], id: key }));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setReactions(list);
      } else setReactions([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    if (!newReaction.name || !newReaction.emoji) { toast({ title: "Name and emoji required", variant: "destructive" }); return; }
    await set(ref(db, `reactions/${Date.now()}`), { ...newReaction, status: "active", createdAt: Date.now() });
    toast({ title: "Reaction added" });
    setNewReaction({ name: "", emoji: "" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reaction?")) return;
    await remove(ref(db, `reactions/${id}`));
    toast({ title: "Deleted" });
  };

  const toggleStatus = async (id: string, current: string) => {
    const status = current === "active" ? "inactive" : "active";
    await set(ref(db, `reactions/${id}/status`), status);
    toast({ title: `Status ${status}` });
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Reactions</h1><p className="text-muted-foreground text-sm">Manage your reactions</p></div>
        <div className="flex gap-2">
          <Input placeholder="Name" value={newReaction.name} onChange={e => setNewReaction({...newReaction, name: e.target.value})} className="w-40 bg-background border-border" />
          <Input placeholder="Emoji" value={newReaction.emoji} onChange={e => setNewReaction({...newReaction, emoji: e.target.value})} className="w-20 bg-background border-border" />
          <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" />Add</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold text-white">{reactions.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold text-green-400">{reactions.filter(r => r.status === "active").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Inactive</p><p className="text-2xl font-bold text-red-400">{reactions.filter(r => r.status === "inactive").length}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {reactions.map(r => (
          <Card key={r.id} className="bg-card border-border p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{r.emoji}</span>
              <span className="text-white font-medium">{r.name}</span>
              <Badge className={r.status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>{r.status}</Badge>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => toggleStatus(r.id, r.status)}>{r.status === "active" ? "Deactivate" : "Activate"}</Button>
              <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </Card>
        ))}
        {reactions.length === 0 && <div className="col-span-3 text-center text-muted-foreground py-8">No reactions</div>}
      </div>
    </div>
  );
}
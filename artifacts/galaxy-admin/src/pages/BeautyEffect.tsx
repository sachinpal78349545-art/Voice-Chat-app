// src/pages/BeautyEffect.tsx
import { useState, useEffect } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

interface BeautyEffect {
  id: string;
  name: string;
  imageUrl?: string;
  status: "active" | "inactive";
  createdAt: number;
}

export default function BeautyEffect() {
  const { toast } = useToast();
  const [effects, setEffects] = useState<BeautyEffect[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newImage, setNewImage] = useState("");

  useEffect(() => {
    const refEffects = ref(db, "beautyEffects");
    const unsub = onValue(refEffects, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map(key => ({ ...data[key], id: key }));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setEffects(list);
      } else setEffects([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    await set(ref(db, `beautyEffects/${Date.now()}`), { name: newName.trim(), imageUrl: newImage, status: "active", createdAt: Date.now() });
    toast({ title: "Effect added" });
    setNewName(""); setNewImage("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this effect?")) return;
    await remove(ref(db, `beautyEffects/${id}`));
    toast({ title: "Deleted" });
  };

  const toggleStatus = async (id: string, current: string) => {
    const status = current === "active" ? "inactive" : "active";
    await set(ref(db, `beautyEffects/${id}/status`), status);
    toast({ title: `Status ${status}` });
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Beauty Effects</h1><p className="text-muted-foreground text-sm">Manage your beauty effects</p></div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Effects</p><p className="text-2xl font-bold text-white">{effects.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold text-green-400">{effects.filter(e => e.status === "active").length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Inactive</p><p className="text-2xl font-bold text-red-400">{effects.filter(e => e.status === "inactive").length}</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Effect Name" value={newName} onChange={e => setNewName(e.target.value)} className="max-w-xs bg-background border-border" />
        <Input placeholder="Image URL" value={newImage} onChange={e => setNewImage(e.target.value)} className="max-w-sm bg-background border-border" />
        <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" />Add</Button>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {effects.map(e => (
          <Card key={e.id} className="bg-card border-border p-3">
            {e.imageUrl && <img src={e.imageUrl} className="w-full h-24 object-cover rounded" />}
            <div className="mt-2 flex items-center justify-between">
              <span className="text-white font-medium">{e.name}</span>
              <Badge className={e.status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>{e.status}</Badge>
            </div>
            <div className="mt-2 flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => toggleStatus(e.id, e.status)}>{e.status === "active" ? "Deactivate" : "Activate"}</Button>
              <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleDelete(e.id)}><Trash2 className="w-4 h-4" /></Button>
            </div>
          </Card>
        ))}
        {effects.length === 0 && <div className="col-span-4 text-center text-muted-foreground py-8">No effects</div>}
      </div>
    </div>
  );
}
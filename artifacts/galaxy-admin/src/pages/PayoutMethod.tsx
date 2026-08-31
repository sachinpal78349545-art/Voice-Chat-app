// src/pages/PayoutMethod.tsx
import { useState, useEffect } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

interface PayoutMethod {
  id: string;
  name: string;
  image?: string;
  requiredDetails: string[];
  status: "active" | "inactive";
  createdAt: number;
}

export default function PayoutMethod() {
  const { toast } = useToast();
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", image: "", requiredDetails: [""] });

  useEffect(() => {
    const refMethods = ref(db, "payoutMethods");
    const unsub = onValue(refMethods, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map(key => ({ ...data[key], id: key }));
        setMethods(list);
      } else setMethods([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!form.name) { toast({ title: "Name required", variant: "destructive" }); return; }
    await set(ref(db, `payoutMethods/${Date.now()}`), { ...form, status: "active", createdAt: Date.now() });
    toast({ title: "Method added" });
    setForm({ name: "", image: "", requiredDetails: [""] });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this method?")) return;
    await remove(ref(db, `payoutMethods/${id}`));
    toast({ title: "Deleted" });
  };

  const toggleStatus = async (id: string, current: string) => {
    const status = current === "active" ? "inactive" : "active";
    await set(ref(db, `payoutMethods/${id}/status`), status);
    toast({ title: `Status ${status}` });
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  const active = methods.filter(m => m.status === "active").length;
  const inactive = methods.filter(m => m.status === "inactive").length;

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Payout Methods</h1><p className="text-muted-foreground text-sm">Configure and manage payout options</p></div>
        <Button onClick={handleSave}><Plus className="w-4 h-4 mr-2" />Add Method</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Methods</p><p className="text-2xl font-bold text-white">{methods.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold text-green-400">{active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Inactive</p><p className="text-2xl font-bold text-red-400">{inactive}</p></CardContent></Card>
      </div>

      <Card className="bg-card border-border p-4 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <Input placeholder="Method Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-background border-border" />
          <Input placeholder="Image URL (optional)" value={form.image} onChange={e => setForm({...form, image: e.target.value})} className="bg-background border-border" />
          <Input placeholder="Required details (comma separated)" value={form.requiredDetails.join(", ")} onChange={e => setForm({...form, requiredDetails: e.target.value.split(",").map(s => s.trim())})} className="bg-background border-border" />
        </div>
        <Button onClick={handleSave} className="mt-2">Save Method</Button>
      </Card>

      <div className="bg-card border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground"><th>Image</th><th>Name</th><th>Required Details</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {methods.map(m => (
              <tr key={m.id} className="border-b border-border/40">
                <td className="p-3">{m.image ? <img src={m.image} className="w-8 h-8 rounded" /> : <div className="w-8 h-8 bg-muted rounded" />}</td>
                <td className="p-3 text-white font-semibold">{m.name}</td>
                <td className="p-3 text-white text-xs">{m.requiredDetails.join(", ")}</td>
                <td><Badge className={m.status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>{m.status}</Badge></td>
                <td className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleStatus(m.id, m.status)}>{m.status === "active" ? "Deactivate" : "Activate"}</Button>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleDelete(m.id)}><Trash2 className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
            {methods.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No methods</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
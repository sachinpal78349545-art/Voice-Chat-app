// src/pages/ReportReason.tsx
import { useState, useEffect } from "react";
import { ref, onValue, set, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

interface ReportReason {
  id: string;
  title: string;
  status: "active" | "inactive";
  createdAt: number;
  updatedAt?: number;
}

export default function ReportReason() {
  const { toast } = useToast();
  const [reasons, setReasons] = useState<ReportReason[]>([]);
  const [loading, setLoading] = useState(true);
  const [newReason, setNewReason] = useState("");

  useEffect(() => {
    const refReasons = ref(db, "reportReasons");
    const unsub = onValue(refReasons, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list = Object.keys(data).map(key => ({ ...data[key], id: key }));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setReasons(list);
      } else setReasons([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAdd = async () => {
    if (!newReason.trim()) { toast({ title: "Title required", variant: "destructive" }); return; }
    await set(ref(db, `reportReasons/${Date.now()}`), { title: newReason.trim(), status: "active", createdAt: Date.now() });
    toast({ title: "Added" });
    setNewReason("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this reason?")) return;
    await remove(ref(db, `reportReasons/${id}`));
    toast({ title: "Deleted" });
  };

  const toggleStatus = async (id: string, current: string) => {
    const status = current === "active" ? "inactive" : "active";
    await set(ref(db, `reportReasons/${id}/status`), status);
    await set(ref(db, `reportReasons/${id}/updatedAt`), Date.now());
    toast({ title: `Status ${status}` });
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  const active = reasons.filter(r => r.status === "active").length;
  const inactive = reasons.filter(r => r.status === "inactive").length;

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Report Reasons</h1><p className="text-muted-foreground text-sm">View and manage report reasons</p></div>
        <div className="flex gap-2">
          <Input placeholder="New Reason Title" value={newReason} onChange={e => setNewReason(e.target.value)} className="w-64 bg-background border-border" />
          <Button onClick={handleAdd}><Plus className="w-4 h-4 mr-2" />Add</Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total</p><p className="text-2xl font-bold text-white">{reasons.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Active</p><p className="text-2xl font-bold text-green-400">{active}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Inactive</p><p className="text-2xl font-bold text-red-400">{inactive}</p></CardContent></Card>
      </div>

      <div className="bg-card border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground"><th>Title</th><th>Created</th><th>Updated</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {reasons.map(r => (
              <tr key={r.id} className="border-b border-border/40">
                <td className="p-3 text-white">{r.title}</td>
                <td className="p-3 text-white text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                <td className="p-3 text-white text-xs">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : "—"}</td>
                <td><Badge className={r.status === "active" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>{r.status}</Badge></td>
                <td className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleStatus(r.id, r.status)}>{r.status === "active" ? "Deactivate" : "Activate"}</Button>
                  <Button size="sm" variant="ghost" className="text-red-400" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
            {reasons.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No reasons</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
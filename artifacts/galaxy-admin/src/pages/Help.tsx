// src/pages/Help.tsx
import { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Check, MessageCircle } from "lucide-react";

interface HelpRequest {
  id: string;
  userName: string;
  subject: string;
  contact: string;
  imageUrl?: string;
  status: "pending" | "solved";
  createdAt: number;
}

export default function Help() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [filtered, setFiltered] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, pending: 0, solved: 0 });

  useEffect(() => {
    const refHelp = ref(db, "helpRequests");
    const unsub = onValue(refHelp, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list: HelpRequest[] = Object.keys(data).map(key => ({ ...data[key], id: key }));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setRequests(list);
        setFiltered(list);
        setStats({ total: list.length, pending: list.filter(r => r.status === "pending").length, solved: list.filter(r => r.status === "solved").length });
      } else { setRequests([]); setFiltered([]); setStats({ total: 0, pending: 0, solved: 0 }); }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toLowerCase();
    setSearch(q);
    setFiltered(requests.filter(r => r.userName.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q)));
  };

  const resolveRequest = async (id: string) => {
    await update(ref(db, `helpRequests/${id}`), { status: "solved" });
    toast({ title: "Request marked as solved" });
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <h1 className="text-2xl font-bold text-white">Help Requests</h1>
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Help</p><p className="text-2xl font-bold text-white">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-400">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Solved</p><p className="text-2xl font-bold text-green-400">{stats.solved}</p></CardContent></Card>
      </div>

      <Input placeholder="Search by name, username..." value={search} onChange={handleSearch} className="max-w-md bg-background border-border" />

      <div className="bg-card border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground"><th>User</th><th>Help Request</th><th>Contact</th><th>Date</th><th>Image</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (<tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No requests</td></tr>) : (
              filtered.map(r => (
                <tr key={r.id} className="border-b border-border/40">
                  <td className="p-3 text-white">{r.userName}</td>
                  <td className="p-3 text-white">{r.subject}</td>
                  <td className="p-3 text-white">{r.contact}</td>
                  <td className="p-3 text-white text-xs">{new Date(r.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">{r.imageUrl && <img src={r.imageUrl} className="w-8 h-8 rounded object-cover" />}</td>
                  <td className="p-3"><Badge className={r.status === "pending" ? "bg-yellow-500/20 text-yellow-400" : "bg-green-500/20 text-green-400"}>{r.status}</Badge></td>
                  <td className="p-3 flex gap-1">
                    {r.status === "pending" && (<Button size="sm" variant="ghost" className="text-green-400" onClick={() => resolveRequest(r.id)}><Check className="w-4 h-4" /></Button>)}
                    <Button size="sm" variant="ghost"><MessageCircle className="w-4 h-4" /></Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
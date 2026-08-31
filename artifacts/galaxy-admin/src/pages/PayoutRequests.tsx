// src/pages/PayoutRequests.tsx
import { useState, useEffect } from "react";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface PayoutRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  coins: number;
  amount: number;
  paymentMethod: string;
  paymentDetails: Record<string, string>;
  requestDate: number;
  status: "pending" | "processing" | "completed" | "rejected";
  processedAt?: number;
}

export default function PayoutRequests() {
  const { toast } = useToast();
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [filtered, setFiltered] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ pending: 0, processing: 0, completedToday: 0, thisMonth: 0 });

  useEffect(() => {
    const refPayout = ref(db, "payoutRequests");
    const unsub = onValue(refPayout, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list: PayoutRequest[] = Object.keys(data).map(key => ({ ...data[key], id: key }));
        list.sort((a, b) => b.requestDate - a.requestDate);
        setRequests(list);
        calculateStats(list);
        setFiltered(filterByTab(list, tab));
      } else { setRequests([]); setFiltered([]); setStats({ pending: 0, processing: 0, completedToday: 0, thisMonth: 0 }); }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => { setFiltered(filterByTab(requests, tab)); }, [tab, requests]);

  const calculateStats = (list: PayoutRequest[]) => {
    const now = new Date();
    const today = now.toDateString();
    const thisMonth = now.getMonth();
    setStats({
      pending: list.filter(r => r.status === "pending").length,
      processing: list.filter(r => r.status === "processing").length,
      completedToday: list.filter(r => r.status === "completed" && new Date(r.requestDate).toDateString() === today).length,
      thisMonth: list.filter(r => r.status === "completed" && new Date(r.requestDate).getMonth() === thisMonth).length,
    });
  };

  const filterByTab = (list: PayoutRequest[], tab: string) => list.filter(r => r.status === tab);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toLowerCase();
    setSearch(q);
    setFiltered(filterByTab(requests, tab).filter(r => r.userName.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)));
  };

  const updateStatus = async (id: string, status: string) => {
    await update(ref(db, `payoutRequests/${id}`), { status, processedAt: Date.now() });
    toast({ title: `Payout ${status}` });
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  const totalAmount = (status: string) => requests.filter(r => r.status === status).reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Payout Requests</h1><p className="text-muted-foreground text-sm">Review and process payout requests</p></div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-400">${totalAmount("pending").toFixed(2)}</p><p className="text-xs text-muted-foreground">{stats.pending} requests</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Processing</p><p className="text-2xl font-bold text-blue-400">${totalAmount("processing").toFixed(2)}</p><p className="text-xs text-muted-foreground">{stats.processing} requests</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Completed Today</p><p className="text-2xl font-bold text-green-400">${totalAmount("completed").toFixed(2)}</p><p className="text-xs text-muted-foreground">{stats.completedToday} requests</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">This Month</p><p className="text-2xl font-bold text-purple-400">${totalAmount("completed").toFixed(2)}</p><p className="text-xs text-muted-foreground">{stats.thisMonth} requests</p></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-card border-border"><TabsTrigger value="pending">Pending</TabsTrigger><TabsTrigger value="processing">Processing</TabsTrigger><TabsTrigger value="completed">Completed</TabsTrigger><TabsTrigger value="rejected">Rejected</TabsTrigger></TabsList>
        <div className="mt-4"><Input placeholder="Search by name, username, ID..." value={search} onChange={handleSearch} className="max-w-xs bg-background border-border" /></div>
        <TabsContent value={tab} className="mt-4">
          <div className="bg-card border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground"><th>Payout ID</th><th>User</th><th>Coins</th><th>Amount ($)</th><th>Payment Method</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {filtered.length === 0 ? (<tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No {tab} requests</td></tr>) : (
                  filtered.map(r => (
                    <tr key={r.id} className="border-b border-border/40">
                      <td className="p-3 text-white font-mono text-xs">{r.id.slice(-8)}</td>
                      <td className="p-3 text-white flex items-center gap-2">{r.userAvatar && <img src={r.userAvatar} className="w-6 h-6 rounded-full" />}{r.userName}</td>
                      <td className="p-3 text-white">{r.coins}</td>
                      <td className="p-3 text-white font-semibold">${r.amount.toFixed(2)}</td>
                      <td className="p-3 text-white">{r.paymentMethod}</td>
                      <td className="p-3 text-white text-xs">{new Date(r.requestDate).toLocaleDateString()}</td>
                      <td className="flex gap-1">
                        {r.status === "pending" && (<><Button size="sm" variant="ghost" className="text-green-400" onClick={() => updateStatus(r.id, "processing")}><Check className="w-4 h-4" /></Button><Button size="sm" variant="ghost" className="text-red-400" onClick={() => updateStatus(r.id, "rejected")}><X className="w-4 h-4" /></Button></>)}
                        {r.status === "processing" && (<Button size="sm" variant="ghost" className="text-blue-400" onClick={() => updateStatus(r.id, "completed")}>Complete</Button>)}
                        {r.status === "completed" && <Badge className="bg-green-500/20 text-green-400">Done</Badge>}
                        {r.status === "rejected" && <Badge className="bg-red-500/20 text-red-400">Rejected</Badge>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
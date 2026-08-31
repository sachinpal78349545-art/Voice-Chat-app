// src/pages/LuckyGiftHistory.tsx
import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

interface LuckyGiftTx {
  id: string;
  senderName: string;
  receiverName: string;
  giftName: string;
  count: number;
  coins: number;
  createdAt: number;
}

export default function LuckyGiftHistory() {
  const [txs, setTxs] = useState<LuckyGiftTx[]>([]);
  const [filtered, setFiltered] = useState<LuckyGiftTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({ total: 0, totalCoins: 0, reserve: 1300, today: 0, thisMonth: 0 });

  useEffect(() => {
    const refTxs = ref(db, "luckyGiftHistory");
    const unsub = onValue(refTxs, snap => {
      if (snap.exists()) {
        const data = snap.val();
        const list: LuckyGiftTx[] = Object.keys(data).map(key => ({ ...data[key], id: key }));
        list.sort((a, b) => b.createdAt - a.createdAt);
        setTxs(list);
        setFiltered(list);
        calculateStats(list);
      } else { setTxs([]); setFiltered([]); setStats({ total: 0, totalCoins: 0, reserve: 1300, today: 0, thisMonth: 0 }); }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const calculateStats = (list: LuckyGiftTx[]) => {
    const now = new Date();
    const today = now.toDateString();
    const thisMonth = now.getMonth();
    setStats({
      total: list.length,
      totalCoins: list.reduce((sum, t) => sum + t.coins, 0),
      reserve: 1300,
      today: list.filter(t => new Date(t.createdAt).toDateString() === today).length,
      thisMonth: list.filter(t => new Date(t.createdAt).getMonth() === thisMonth).length,
    });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toLowerCase();
    setSearch(q);
    setFiltered(txs.filter(t => t.senderName.toLowerCase().includes(q) || t.receiverName.toLowerCase().includes(q) || t.giftName.toLowerCase().includes(q)));
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <h1 className="text-2xl font-bold text-white">Lucky Gift History</h1>
      <div className="grid grid-cols-6 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-sm text-muted-foreground">Total Tx</p><p className="text-xl font-bold text-white">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-sm text-muted-foreground">Total Coins</p><p className="text-xl font-bold text-yellow-400">{stats.totalCoins}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-sm text-muted-foreground">Reserve</p><p className="text-xl font-bold text-green-400">{stats.reserve}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-sm text-muted-foreground">Today</p><p className="text-xl font-bold text-blue-400">{stats.today}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-sm text-muted-foreground">This Month</p><p className="text-xl font-bold text-purple-400">{stats.thisMonth}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-sm text-muted-foreground">Admin Total</p><p className="text-xl font-bold text-pink-400">1100</p></CardContent></Card>
      </div>

      <div className="flex gap-2">
        <Input placeholder="Search by sender, receiver, gift..." value={search} onChange={handleSearch} className="max-w-md bg-background border-border" />
        <Button variant="outline" size="sm"><Filter className="w-4 h-4 mr-2" />Filter by Date</Button>
      </div>

      <div className="bg-card border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground"><th>#</th><th>History ID</th><th>Sender</th><th>Receiver</th><th>Gift</th><th>Coins</th><th>Date</th></tr></thead>
          <tbody>
            {filtered.length === 0 ? (<tr><td colSpan={7} className="p-6 text-center text-muted-foreground">No transactions</td></tr>) : (
              filtered.slice(0, 10).map((t, i) => (
                <tr key={t.id} className="border-b border-border/40">
                  <td className="p-3 text-white">{i+1}</td>
                  <td className="p-3 text-white font-mono text-xs">{t.id.slice(-6)}</td>
                  <td className="p-3 text-white">{t.senderName}</td>
                  <td className="p-3 text-white">{t.receiverName}</td>
                  <td className="p-3 text-white">{t.giftName} (x{t.count})</td>
                  <td className="p-3 text-white">{t.coins}</td>
                  <td className="p-3 text-white text-xs">{new Date(t.createdAt).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
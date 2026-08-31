// src/pages/UserOverview.tsx
import { useState, useEffect } from "react";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useParams } from "wouter";  // ← यहाँ बदलाव
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function UserOverview() {
  const { uid } = useParams<{ uid: string }>();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    if (!uid) return;
    const fetch = async () => {
      const snap = await get(ref(db, `users/${uid}`));
      if (snap.exists()) {
        const data = snap.val();
        setUser({ ...data, uid });
        const txSnap = await get(ref(db, `users/${uid}/transactions`));
        if (txSnap.exists()) {
          const txData = txSnap.val();
          setTransactions(Object.keys(txData).map(k => ({ ...txData[k], id: k })));
        }
      } else toast({ title: "User not found", variant: "destructive" });
      setLoading(false);
    };
    fetch();
  }, [uid]);

  if (loading) return <div className="text-white p-6">Loading...</div>;
  if (!user) return <div className="text-white p-6">User not found</div>;

  const wealthLevel = user.wealthLevel || { name: "Bronze Explorer", level: 1, coinsRequired: 999 };

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <div className="flex items-center gap-4">
        <Avatar className="w-16 h-16"><AvatarImage src={user.avatar} /><AvatarFallback>{(user.name || "U")[0]}</AvatarFallback></Avatar>
        <div><h1 className="text-2xl font-bold text-white">{user.name}</h1><p className="text-muted-foreground">@{user.userId || user.uid?.slice(0, 8)}</p></div>
        <Badge className="ml-auto">{user.globalRole || "User"}</Badge>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Current Coins</p><p className="text-2xl font-bold text-yellow-400">{user.coins || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Top Up Coins</p><p className="text-2xl font-bold text-green-400">{user.topUpCoins || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Spent Coins</p><p className="text-2xl font-bold text-red-400">{user.spentCoins || 0}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Wealth Level</p><p className="text-xl font-bold text-purple-400">{wealthLevel.name} (Lv.{wealthLevel.level})</p></CardContent></Card>
      </div>

      <Tabs defaultValue="transactions">
        <TabsList className="bg-card border-border"><TabsTrigger value="transactions">Transactions</TabsTrigger><TabsTrigger value="details">Details</TabsTrigger></TabsList>
        <TabsContent value="transactions" className="mt-4">
          <div className="bg-card border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground"><th>Type</th><th>Amount</th><th>Description</th><th>Date</th></tr></thead>
              <tbody>
                {transactions.length === 0 ? (<tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No transactions</td></tr>) : (
                  transactions.map(t => (
                    <tr key={t.id} className="border-b border-border/40">
                      <td className="p-3"><Badge>{t.type}</Badge></td>
                      <td className="p-3 text-white">{t.amount}</td>
                      <td className="p-3 text-white">{t.description}</td>
                      <td className="p-3 text-white text-xs">{new Date(t.timestamp).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
        <TabsContent value="details" className="mt-4">
          <div className="bg-card border-border rounded-xl p-4 space-y-2 text-white">
            <p><strong>Email:</strong> {user.email || "N/A"}</p>
            <p><strong>Gender:</strong> {user.gender || "N/A"}</p>
            <p><strong>Age:</strong> {user.age || "N/A"}</p>
            <p><strong>Video Call Rate:</strong> {user.videoCallRate || 50} coins/min</p>
            <p><strong>Audio Call Rate:</strong> {user.audioCallRate || 25} coins/min</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
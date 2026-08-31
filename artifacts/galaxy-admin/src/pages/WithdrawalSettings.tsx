// src/pages/WithdrawalSettings.tsx
import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function WithdrawalSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState({ currency: 1, minCoinsUser: 150, minCoinsAgency: 50, minCoinsBD: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const snap = await get(ref(db, "appConfig/withdrawal"));
      if (snap.exists()) setConfig(snap.val());
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await set(ref(db, "appConfig/withdrawal"), config); toast({ title: "Saved" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
    setSaving(false);
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Withdrawal Settings</h1>
      <Card className="bg-card border-border">
        <CardContent className="space-y-2">
          <div><Label>Currency (1 Currency = ? coins)</Label><Input type="number" value={config.currency} onChange={e => setConfig({...config, currency: Number(e.target.value)})} /></div>
          <div><Label>Minimum Coins Payout For User</Label><Input type="number" value={config.minCoinsUser} onChange={e => setConfig({...config, minCoinsUser: Number(e.target.value)})} /></div>
          <div><Label>Minimum Coins Payout For Agency</Label><Input type="number" value={config.minCoinsAgency} onChange={e => setConfig({...config, minCoinsAgency: Number(e.target.value)})} /></div>
          <div><Label>Minimum Coins Payout For BD</Label><Input type="number" value={config.minCoinsBD} onChange={e => setConfig({...config, minCoinsBD: Number(e.target.value)})} /></div>
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
    </div>
  );
}
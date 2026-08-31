// src/pages/GameBetManagement.tsx
import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GameBetManagement() {
  const { toast } = useToast();
  const [bets, setBets] = useState<number[]>([100, 200, 300, 400, 5000]);
  const [thirdParty, setThirdParty] = useState({ enabled: false, testServer: "", appKey: "", appId: "", prodServer: "", channel: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const [betSnap, thirdSnap] = await Promise.all([get(ref(db, "appConfig/gameBets")), get(ref(db, "appConfig/thirdPartyGame"))]);
      if (betSnap.exists()) setBets(betSnap.val());
      if (thirdSnap.exists()) setThirdParty(thirdSnap.val());
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await set(ref(db, "appConfig/gameBets"), bets);
      await set(ref(db, "appConfig/thirdPartyGame"), thirdParty);
      toast({ title: "Saved ✅" });
    } catch { toast({ title: "Failed", variant: "destructive" }); }
    setSaving(false);
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Game Bet Management</h1>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white">Bet Amounts</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-5 gap-2">
          {bets.map((b, i) => (
            <div key={i}><Label>Bet {i+1}</Label><Input type="number" value={b} onChange={e => { const newBets = [...bets]; newBets[i] = Number(e.target.value); setBets(newBets); }} /></div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white flex items-center justify-between">Third Party Game <Switch checked={thirdParty.enabled} onCheckedChange={v => setThirdParty({...thirdParty, enabled: v})} /></CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Baishun Test Server</Label><Input value={thirdParty.testServer} onChange={e => setThirdParty({...thirdParty, testServer: e.target.value})} /></div>
          <div><Label>Baishun App Key</Label><Input value={thirdParty.appKey} onChange={e => setThirdParty({...thirdParty, appKey: e.target.value})} /></div>
          <div><Label>Baishun App ID</Label><Input value={thirdParty.appId} onChange={e => setThirdParty({...thirdParty, appId: e.target.value})} /></div>
          <div><Label>Baishun Prod Server</Label><Input value={thirdParty.prodServer} onChange={e => setThirdParty({...thirdParty, prodServer: e.target.value})} /></div>
          <div><Label>Baishun App Channel</Label><Input value={thirdParty.channel} onChange={e => setThirdParty({...thirdParty, channel: e.target.value})} /></div>
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
    </div>
  );
}
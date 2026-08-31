// src/pages/WealthLevel.tsx
import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Save } from "lucide-react";

interface WealthLevel {
  id: string;
  name: string;
  coinsRequired: number;
  level: number;
  permissions: {
    liveStreaming: boolean;
    freeCall: boolean;
    redeemCashout: boolean;
    uploadSocialPost: boolean;
    uploadVideo: boolean;
  };
}

const DEFAULT_LEVELS: WealthLevel[] = [
  { id: "bronze", name: "Bronze Explorer", coinsRequired: 999, level: 1, permissions: { liveStreaming: true, freeCall: true, redeemCashout: true, uploadSocialPost: true, uploadVideo: true } },
  { id: "silver", name: "Silver Spender", coinsRequired: 1499, level: 2, permissions: { liveStreaming: true, freeCall: true, redeemCashout: true, uploadSocialPost: true, uploadVideo: true } },
  { id: "gold", name: "Gold Patron", coinsRequired: 1999, level: 3, permissions: { liveStreaming: true, freeCall: true, redeemCashout: true, uploadSocialPost: true, uploadVideo: true } },
  { id: "platinum", name: "Platinum Guardian", coinsRequired: 2599, level: 4, permissions: { liveStreaming: true, freeCall: true, redeemCashout: true, uploadSocialPost: true, uploadVideo: true } },
  { id: "diamond", name: "Diamond Pioneer", coinsRequired: 2999, level: 5, permissions: { liveStreaming: true, freeCall: true, redeemCashout: true, uploadSocialPost: true, uploadVideo: true } },
  { id: "ruby", name: "Ruby Champion", coinsRequired: 3499, level: 6, permissions: { liveStreaming: true, freeCall: true, redeemCashout: true, uploadSocialPost: true, uploadVideo: true } },
  { id: "sapphire", name: "Sapphire Visionary", coinsRequired: 4999, level: 7, permissions: { liveStreaming: true, freeCall: true, redeemCashout: true, uploadSocialPost: true, uploadVideo: true } },
  { id: "titanium", name: "Titanium Legend", coinsRequired: 5599, level: 8, permissions: { liveStreaming: true, freeCall: true, redeemCashout: true, uploadSocialPost: true, uploadVideo: true } },
];

export default function WealthLevel() {
  const { toast } = useToast();
  const [levels, setLevels] = useState<WealthLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const snap = await get(ref(db, "appConfig/wealthLevels"));
      if (snap.exists()) setLevels(snap.val());
      else setLevels(DEFAULT_LEVELS);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await set(ref(db, "appConfig/wealthLevels"), levels); toast({ title: "Wealth levels saved ✅" }); }
    catch { toast({ title: "Save failed", variant: "destructive" }); }
    setSaving(false);
  };

  const updateLevel = (id: string, field: string, value: any) => {
    setLevels(levels.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const updatePermission = (id: string, perm: string, value: boolean) => {
    setLevels(levels.map(l => l.id === id ? { ...l, permissions: { ...l.permissions, [perm]: value } } : l));
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">Wealth Levels</h1><p className="text-muted-foreground text-sm">Manage your wealth levels</p></div>
        <Button onClick={handleSave} disabled={saving}><Save className="w-4 h-4 mr-2" />{saving ? "Saving..." : "Save Changes"}</Button>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-sm text-muted-foreground">Total Levels</p><p className="text-xl font-bold text-white">{levels.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-sm text-muted-foreground">Live Streaming</p><p className="text-xl font-bold text-blue-400">{levels.filter(l => l.permissions.liveStreaming).length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-sm text-muted-foreground">Free Calls</p><p className="text-xl font-bold text-green-400">{levels.filter(l => l.permissions.freeCall).length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-sm text-muted-foreground">Cashout Enabled</p><p className="text-xl font-bold text-yellow-400">{levels.filter(l => l.permissions.redeemCashout).length}</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-sm text-muted-foreground">Upload Posts</p><p className="text-xl font-bold text-purple-400">{levels.filter(l => l.permissions.uploadSocialPost).length}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {levels.map(l => (
          <Card key={l.id} className="bg-card border-border p-4">
            <div className="flex items-center justify-between">
              <div><h3 className="text-white font-semibold">{l.name}</h3><p className="text-sm text-muted-foreground">{l.coinsRequired} coins required</p><Badge className="bg-primary/20 text-primary">Level {l.level}</Badge></div>
              <div className="text-right space-y-1">
                <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Live</span><Switch checked={l.permissions.liveStreaming} onCheckedChange={v => updatePermission(l.id, "liveStreaming", v)} size="sm" /></div>
                <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Call</span><Switch checked={l.permissions.freeCall} onCheckedChange={v => updatePermission(l.id, "freeCall", v)} size="sm" /></div>
                <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Cashout</span><Switch checked={l.permissions.redeemCashout} onCheckedChange={v => updatePermission(l.id, "redeemCashout", v)} size="sm" /></div>
                <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Post</span><Switch checked={l.permissions.uploadSocialPost} onCheckedChange={v => updatePermission(l.id, "uploadSocialPost", v)} size="sm" /></div>
                <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Video</span><Switch checked={l.permissions.uploadVideo} onCheckedChange={v => updatePermission(l.id, "uploadVideo", v)} size="sm" /></div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Input type="number" value={l.coinsRequired} onChange={e => updateLevel(l.id, "coinsRequired", Number(e.target.value))} className="w-24 h-8 text-sm bg-background border-border" />
              <Input value={l.name} onChange={e => updateLevel(l.id, "name", e.target.value)} className="flex-1 h-8 text-sm bg-background border-border" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
// src/pages/GeneralSettings.tsx
import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GeneralConfig {
  callRate: { privateVideo: number; privateAudio: number };
  hostTask: { minLiveMinutes: number; shortsDuration: number };
  app: { loginBonus: number; pkEndTime: number };
  agora: { appId: string; certificate: string };
  policies: { privacy: string; terms: string; about: string };
  commission: { bd: number; agency: number; admin: number };
  shortsEffects: { enabled: boolean; androidKey: string; iosKey: string };
  watermark: { enabled: boolean };
  luckyGift: { taxPercent: number; receiverShare: number };
  firebase: { privateKeyJSON: string };
  androidAssetLinks: string;
  appleAppSiteAssociation: string;
}

export default function GeneralSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState<GeneralConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      const snap = await get(ref(db, "appConfig/general"));
      if (snap.exists()) setConfig(snap.val());
      else setConfig(getDefaultConfig());
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const getDefaultConfig = (): GeneralConfig => ({
    callRate: { privateVideo: 10, privateAudio: 5 },
    hostTask: { minLiveMinutes: 30, shortsDuration: 10 },
    app: { loginBonus: 10, pkEndTime: 120 },
    agora: { appId: "", certificate: "" },
    policies: { privacy: "", terms: "", about: "" },
    commission: { bd: 0, agency: 0, admin: 0 },
    shortsEffects: { enabled: false, androidKey: "", iosKey: "" },
    watermark: { enabled: false },
    luckyGift: { taxPercent: 10, receiverShare: 50 },
    firebase: { privateKeyJSON: "" },
    androidAssetLinks: "",
    appleAppSiteAssociation: "",
  });

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await set(ref(db, "appConfig/general"), config);
      toast({ title: "Settings saved ✅" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
    setSaving(false);
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;
  if (!config) return <div className="text-white p-6">No config</div>;

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">General Settings</h1>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white text-lg">Call Rate Setting</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Private Video Call Rate (coins/min)</Label><Input type="number" value={config.callRate.privateVideo} onChange={e => setConfig({...config, callRate: {...config.callRate, privateVideo: Number(e.target.value)}})} /></div>
            <div><Label>Private Audio Call Rate (coins/min)</Label><Input type="number" value={config.callRate.privateAudio} onChange={e => setConfig({...config, callRate: {...config.callRate, privateAudio: Number(e.target.value)}})} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white text-lg">Host Task Setting</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Minimum Live Minutes For Valid Day</Label><Input type="number" value={config.hostTask.minLiveMinutes} onChange={e => setConfig({...config, hostTask: {...config.hostTask, minLiveMinutes: Number(e.target.value)}})} /></div>
            <div><Label>Duration of Shorts (seconds)</Label><Input type="number" value={config.hostTask.shortsDuration} onChange={e => setConfig({...config, hostTask: {...config.hostTask, shortsDuration: Number(e.target.value)}})} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white text-lg">App Setting</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Login Bonus (coins)</Label><Input type="number" value={config.app.loginBonus} onChange={e => setConfig({...config, app: {...config.app, loginBonus: Number(e.target.value)}})} /></div>
            <div><Label>PK End Time (seconds)</Label><Input type="number" value={config.app.pkEndTime} onChange={e => setConfig({...config, app: {...config.app, pkEndTime: Number(e.target.value)}})} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white text-lg">Agora Setting</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Agora App ID</Label><Input value={config.agora.appId} onChange={e => setConfig({...config, agora: {...config.agora, appId: e.target.value}})} /></div>
          <div><Label>Agora App Certificate</Label><Input value={config.agora.certificate} onChange={e => setConfig({...config, agora: {...config.agora, certificate: e.target.value}})} /></div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white text-lg">Policy Links</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Privacy Policy Link</Label><Input value={config.policies.privacy} onChange={e => setConfig({...config, policies: {...config.policies, privacy: e.target.value}})} /></div>
          <div><Label>Terms of Use</Label><Input value={config.policies.terms} onChange={e => setConfig({...config, policies: {...config.policies, terms: e.target.value}})} /></div>
          <div><Label>About Us</Label><Input value={config.policies.about} onChange={e => setConfig({...config, policies: {...config.policies, about: e.target.value}})} /></div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white text-lg">Commission Setting</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-3 gap-4">
            <div><Label>BD Rate (%)</Label><Input type="number" value={config.commission.bd} onChange={e => setConfig({...config, commission: {...config.commission, bd: Number(e.target.value)}})} /></div>
            <div><Label>Agency Rate (%)</Label><Input type="number" value={config.commission.agency} onChange={e => setConfig({...config, commission: {...config.commission, agency: Number(e.target.value)}})} /></div>
            <div><Label>Admin Rate (%)</Label><Input type="number" value={config.commission.admin} onChange={e => setConfig({...config, commission: {...config.commission, admin: Number(e.target.value)}})} /></div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white text-lg">Shorts Effect Setting</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-4"><Switch checked={config.shortsEffects.enabled} onCheckedChange={v => setConfig({...config, shortsEffects: {...config.shortsEffects, enabled: v}})} /><Label>Enable Shorts Effects</Label></div>
          <div><Label>Android Effect License Key</Label><Input value={config.shortsEffects.androidKey} onChange={e => setConfig({...config, shortsEffects: {...config.shortsEffects, androidKey: e.target.value}})} /></div>
          <div><Label>iOS Effect License Key</Label><Input value={config.shortsEffects.iosKey} onChange={e => setConfig({...config, shortsEffects: {...config.shortsEffects, iosKey: e.target.value}})} /></div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white text-lg">Watermark Setting</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-4"><Switch checked={config.watermark.enabled} onCheckedChange={v => setConfig({...config, watermark: {...config.watermark, enabled: v}})} /><Label>Enable Watermark</Label></div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white text-lg">Lucky Gift Setting</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Lucky Gift Admin Tax Percent (%)</Label><Input type="number" value={config.luckyGift.taxPercent} onChange={e => setConfig({...config, luckyGift: {...config.luckyGift, taxPercent: Number(e.target.value)}})} /></div>
          <div><Label>Lucky Gift Receiver Share Percent (%)</Label><Input type="number" value={config.luckyGift.receiverShare} onChange={e => setConfig({...config, luckyGift: {...config.luckyGift, receiverShare: Number(e.target.value)}})} /></div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white text-lg">Firebase Notification Setting</CardTitle></CardHeader>
        <CardContent><Label>Private Key JSON</Label><textarea className="w-full h-32 bg-background border border-border rounded p-2 text-white text-sm" value={config.firebase.privateKeyJSON} onChange={e => setConfig({...config, firebase: {...config.firebase, privateKeyJSON: e.target.value}})} /></CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white text-lg">Asset Links</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Android Asset Links (JSON Array)</Label><textarea className="w-full h-24 bg-background border border-border rounded p-2 text-white text-sm" value={config.androidAssetLinks} onChange={e => setConfig({...config, androidAssetLinks: e.target.value})} /></div>
          <div><Label>Apple App Site Association (JSON Object)</Label><textarea className="w-full h-24 bg-background border border-border rounded p-2 text-white text-sm" value={config.appleAppSiteAssociation} onChange={e => setConfig({...config, appleAppSiteAssociation: e.target.value})} /></div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Button>
    </div>
  );
}
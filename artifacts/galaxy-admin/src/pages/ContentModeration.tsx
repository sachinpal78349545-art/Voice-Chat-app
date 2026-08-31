// src/pages/ContentModeration.tsx
import { useState, useEffect } from "react";
import { ref, get, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ContentModeration() {
  const { toast } = useToast();
  const [config, setConfig] = useState({ sightengineUser: "", sightengineSecret: "", videoKeywords: "", postKeywords: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const snap = await get(ref(db, "appConfig/moderation"));
      if (snap.exists()) setConfig(snap.val());
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await set(ref(db, "appConfig/moderation"), config); toast({ title: "Saved" }); }
    catch { toast({ title: "Failed", variant: "destructive" }); }
    setSaving(false);
  };

  if (loading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Content Moderation</h1>
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white">Sightengine</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Sightengine User</Label><Input value={config.sightengineUser} onChange={e => setConfig({...config, sightengineUser: e.target.value})} /></div>
          <div><Label>Sightengine API Secret</Label><Input type="password" value={config.sightengineSecret} onChange={e => setConfig({...config, sightengineSecret: e.target.value})} /></div>
        </CardContent>
      </Card>
      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-white">Banned Keywords</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div><Label>Video Banned Keywords (comma separated)</Label><Input value={config.videoKeywords} onChange={e => setConfig({...config, videoKeywords: e.target.value})} /></div>
          <div><Label>Post Banned Keywords</Label><Input value={config.postKeywords} onChange={e => setConfig({...config, postKeywords: e.target.value})} /></div>
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
    </div>
  );
}
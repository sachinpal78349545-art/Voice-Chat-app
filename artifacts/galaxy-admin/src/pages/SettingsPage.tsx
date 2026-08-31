import { useState, useEffect } from "react";
import { Settings, Wrench, Radio, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { setMaintenanceMode, subscribeMaintenanceMode, setAutoEntryRoom, getAutoEntryRoom, subscribeRooms, Room } from "@/lib/adminService";
import { useAdmin } from "@/App";
import { cn } from "@/lib/utils";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Wallet, User, Mic, Gamepad2 } from "lucide-react";

// ---------- Existing SectionCard (unchanged) ----------
function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-white text-sm">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ---------- New Tingle-style Settings Interface ----------
interface TingleSettings {
  general?: {
    callRate?: { video: number; audio: number };
    app?: { loginBonus: number; shortsDuration: number; pkEndTime: number };
    agora?: { appId: string; certificate: string };
    resendApiKey?: string;
    policyLinks?: { privacy: string; terms: string; about: string };
    bannerAnnouncement?: { minGift: number; minGame: number };
    commission?: { bd: number; agency: number; admin: number };
  };
  moderation?: {
    sightengine?: { user: string; secret: string };
  };
  withdrawal?: {
    currency: number;
    minCoinsPayout: { user: number; agency: number; bd: number };
  };
  profile?: {
    removeButtons?: boolean;
  };
  audio?: {
    effects?: { enabled: boolean; androidKey: string; iosKey: string };
    watermark?: { enabled: boolean; image: string };
  };
  gameBet?: {
    bets: number[];
    thirdParty?: { enabled: boolean; server: string; appKey: string; appId: string; channel: string };
  };
}

const defaultTingleSettings: TingleSettings = {
  general: {
    callRate: { video: 10, audio: 8 },
    app: { loginBonus: 10, shortsDuration: 10, pkEndTime: 120 },
    agora: { appId: "", certificate: "" },
    resendApiKey: "",
    policyLinks: { privacy: "", terms: "", about: "" },
    bannerAnnouncement: { minGift: 100, minGame: 100 },
    commission: { bd: 0, agency: 0, admin: 0 },
  },
  moderation: { sightengine: { user: "", secret: "" } },
  withdrawal: {
    currency: 1,
    minCoinsPayout: { user: 150, agency: 50, bd: 0 },
  },
  profile: { removeButtons: true },
  audio: {
    effects: { enabled: false, androidKey: "", iosKey: "" },
    watermark: { enabled: false, image: "" },
  },
  gameBet: {
    bets: [100, 200, 300, 400, 5000],
    thirdParty: { enabled: false, server: "", appKey: "", appId: "", channel: "" },
  },
};

export default function SettingsPage() {
  const { toast } = useToast();
  const { isDemo, showDemoBlock } = useAdmin();

  // ----- Existing states -----
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);
  const [maintMsg, setMaintMsg] = useState("");
  const [maintLoading, setMaintLoading] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [autoEntryRoom, setAutoEntry] = useState<string>("");
  const [currentAutoEntry, setCurrentAutoEntry] = useState<string | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);

  // ----- New Tingle settings states -----
  const [tingleSettings, setTingleSettings] = useState<TingleSettings>(defaultTingleSettings);
  const [tingleLoading, setTingleLoading] = useState(true);
  const [tingleSaving, setTingleSaving] = useState(false);

  // ----- Existing effects -----
  useEffect(() => {
    const unsub = subscribeMaintenanceMode(data => { setMaintenance(data); if (data) setMaintMsg(data.message); });
    return unsub;
  }, []);
  useEffect(() => { const unsub = subscribeRooms(list => setRooms(list)); return unsub; }, []);
  useEffect(() => { getAutoEntryRoom().then(id => { setCurrentAutoEntry(id); if (id) setAutoEntry(id); }); }, []);

  // ----- New Tingle fetch effect -----
  useEffect(() => {
    const settingsRef = ref(db, "settings");
    const unsub = onValue(settingsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        setTingleSettings((prev) => {
          const merged = { ...prev };
          Object.keys(data).forEach((key) => {
            if (typeof data[key] === "object" && data[key] !== null) {
              merged[key as keyof TingleSettings] = {
                ...(prev[key as keyof TingleSettings] || {}),
                ...data[key],
              };
            } else {
              (merged as any)[key] = data[key];
            }
          });
          return merged;
        });
      } else {
        setTingleSettings(defaultTingleSettings);
      }
      setTingleLoading(false);
    });
    return () => unsub();
  }, []);

  // ----- Existing functions (unchanged) -----
  async function toggleMaintenance() {
    if (isDemo) { showDemoBlock(); return; }
    setMaintLoading(true);
    try {
      const newState = !maintenance?.enabled;
      await setMaintenanceMode(newState, maintMsg || undefined);
      toast({ title: newState ? "🔧 Maintenance mode ON" : "✅ Maintenance mode OFF" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
    setMaintLoading(false);
  }

  async function saveMaintMsg() {
    if (isDemo) { showDemoBlock(); return; }
    setMaintLoading(true);
    try {
      await setMaintenanceMode(maintenance?.enabled ?? false, maintMsg);
      toast({ title: "Message updated" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
    setMaintLoading(false);
  }

  async function handleSetAutoEntry() {
    if (isDemo) { showDemoBlock(); return; }
    setAutoLoading(true);
    try {
      await setAutoEntryRoom(autoEntryRoom.trim() || null);
      setCurrentAutoEntry(autoEntryRoom.trim() || null);
      toast({ title: autoEntryRoom.trim() ? "Auto-entry room set" : "Auto-entry room cleared" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
    setAutoLoading(false);
  }

  async function clearAutoEntry() {
    if (isDemo) { showDemoBlock(); return; }
    setAutoLoading(true);
    try {
      await setAutoEntryRoom(null);
      setCurrentAutoEntry(null); setAutoEntry("");
      toast({ title: "Auto-entry room cleared" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
    setAutoLoading(false);
  }

  // ----- New Tingle save function -----
  async function saveTingleSettings() {
    if (isDemo) { showDemoBlock(); return; }
    setTingleSaving(true);
    try {
      await set(ref(db, "settings"), tingleSettings);
      toast({ title: "Success", description: "Settings saved" });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally {
      setTingleSaving(false);
    }
  }

  // Helper to update nested settings
  const updateTingleGeneral = (path: string, value: any) => {
    setTingleSettings((prev) => {
      const newSettings = { ...prev };
      const keys = path.split(".");
      let current: any = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  if (tingleLoading) return <div className="text-white p-6">Loading...</div>;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* ----- Page Title ----- */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-muted-foreground text-sm">App-wide configuration and controls</p>
      </div>

      {/* ----- EXISTING SECTIONS (Maintenance, Auto-Entry, App Info) ----- */}
      <SectionCard title="Maintenance Mode" icon={Wrench}>
        <div className={cn("flex items-center justify-between p-3 rounded-lg border",
          maintenance?.enabled ? "bg-red-500/10 border-red-500/30" : "bg-green-500/10 border-green-500/30")}>
          <div>
            <p className="text-sm font-semibold text-white">{maintenance?.enabled ? "🔧 Maintenance is ON" : "✅ App is Live"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{maintenance?.enabled ? "Users cannot access the app right now" : "App is accessible to all users"}</p>
          </div>
          <Button size="sm" variant={maintenance?.enabled ? "outline" : "destructive"} onClick={toggleMaintenance} disabled={maintLoading}
            className={maintenance?.enabled ? "border-green-500 text-green-400 hover:bg-green-500/10" : ""}>
            {maintLoading ? "..." : maintenance?.enabled ? "Turn OFF" : "Turn ON"}
          </Button>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Maintenance Message</Label>
          <div className="flex gap-2">
            <Input placeholder="App is under maintenance. Please try again later." value={maintMsg} onChange={e => setMaintMsg(e.target.value)} className="bg-background border-border flex-1" />
            <Button size="sm" variant="outline" onClick={saveMaintMsg} disabled={maintLoading}>
              <Save className="w-3.5 h-3.5 mr-1.5" />Save
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Auto-Entry Room" icon={Radio}>
        <p className="text-xs text-muted-foreground">Set a room that users are automatically redirected to when they open the app.</p>
        {currentAutoEntry && (
          <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-3 py-2">
            <div><p className="text-xs text-muted-foreground">Current auto-entry room</p><code className="text-sm text-primary font-mono">{currentAutoEntry}</code></div>
            <Button size="sm" variant="outline" onClick={clearAutoEntry} disabled={autoLoading} className="text-xs text-destructive hover:bg-destructive/10">Clear</Button>
          </div>
        )}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Select from active rooms</Label>
          <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-border bg-background p-2">
            {rooms.length === 0 ? <p className="text-xs text-muted-foreground text-center py-4">No active rooms</p>
              : rooms.map(room => (
                <button key={room.id} onClick={() => setAutoEntry(room.id)}
                  className={cn("w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs text-left transition-colors",
                    autoEntryRoom === room.id ? "bg-primary/20 text-primary" : "hover:bg-muted text-foreground")}>
                  <span>{room.coverEmoji || "🎤"}</span>
                  <span className="flex-1 truncate">{room.name}</span>
                  <span className="text-muted-foreground shrink-0">{room.listeners ?? 0} listeners</span>
                </button>
              ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Or enter room ID manually" value={autoEntryRoom} onChange={e => setAutoEntry(e.target.value)} className="bg-background border-border text-xs flex-1" />
            <Button size="sm" onClick={handleSetAutoEntry} disabled={autoLoading || !autoEntryRoom.trim()}>
              <Save className="w-3.5 h-3.5 mr-1.5" />Set
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="App Info" icon={Settings}>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: "App Name",     value: "Galaxy Voice Chat"    },
            { label: "Admin Version", value: "1.0.0"              },
            { label: "SuperAdmin ID", value: "306623582"           },
            { label: "Backend",      value: "Firebase Realtime DB" },
          ].map(({ label, value }) => (
            <div key={label} className="bg-muted/50 rounded-lg px-3 py-2">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold text-white mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* ----- NEW TINGLE-STYLE TABS ----- */}
      <div className="mt-8 border-t border-border pt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Advanced Settings</h2>
          <Button onClick={saveTingleSettings} disabled={tingleSaving} className="bg-blue-600 hover:bg-blue-700">
            <Save className="h-4 w-4 mr-2" />
            {tingleSaving ? "Saving..." : "Save All"}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1 bg-muted/20 p-1 rounded-lg">
            <TabsTrigger value="general" className="text-gray-300 data-[state=active]:bg-blue-600">
              <Settings className="h-4 w-4 mr-2" /> General
            </TabsTrigger>
            <TabsTrigger value="moderation" className="text-gray-300 data-[state=active]:bg-blue-600">
              <Shield className="h-4 w-4 mr-2" /> Moderation
            </TabsTrigger>
            <TabsTrigger value="withdrawal" className="text-gray-300 data-[state=active]:bg-blue-600">
              <Wallet className="h-4 w-4 mr-2" /> Withdrawal
            </TabsTrigger>
            <TabsTrigger value="profile" className="text-gray-300 data-[state=active]:bg-blue-600">
              <User className="h-4 w-4 mr-2" /> Profile
            </TabsTrigger>
            <TabsTrigger value="audio" className="text-gray-300 data-[state=active]:bg-blue-600">
              <Mic className="h-4 w-4 mr-2" /> Audio
            </TabsTrigger>
            <TabsTrigger value="game" className="text-gray-300 data-[state=active]:bg-blue-600">
              <Gamepad2 className="h-4 w-4 mr-2" /> Game Bet
            </TabsTrigger>
          </TabsList>

          {/* GENERAL */}
          <TabsContent value="general" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-white">Call Rate Setting</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Private Video Call Rate (coins/min)</label>
                      <Input type="number" value={tingleSettings.general?.callRate?.video || 10}
                        onChange={e => updateTingleGeneral("general.callRate.video", parseInt(e.target.value) || 0)}
                        className="bg-background border-border/50" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Private Audio Call Rate (coins/min)</label>
                      <Input type="number" value={tingleSettings.general?.callRate?.audio || 8}
                        onChange={e => updateTingleGeneral("general.callRate.audio", parseInt(e.target.value) || 0)}
                        className="bg-background border-border/50" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <h3 className="text-sm font-semibold text-white">App Setting</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Login Bonus (coins)</label>
                      <Input type="number" value={tingleSettings.general?.app?.loginBonus || 10}
                        onChange={e => updateTingleGeneral("general.app.loginBonus", parseInt(e.target.value) || 0)}
                        className="bg-background border-border/50" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Duration of Shorts (sec)</label>
                      <Input type="number" value={tingleSettings.general?.app?.shortsDuration || 10}
                        onChange={e => updateTingleGeneral("general.app.shortsDuration", parseInt(e.target.value) || 0)}
                        className="bg-background border-border/50" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">PK End Time (sec)</label>
                      <Input type="number" value={tingleSettings.general?.app?.pkEndTime || 120}
                        onChange={e => updateTingleGeneral("general.app.pkEndTime", parseInt(e.target.value) || 0)}
                        className="bg-background border-border/50" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <h3 className="text-sm font-semibold text-white">Agora Setting</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Agora App ID</label>
                      <Input value={tingleSettings.general?.agora?.appId || ""}
                        onChange={e => updateTingleGeneral("general.agora.appId", e.target.value)}
                        className="bg-background border-border/50" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Agora Certificate</label>
                      <Input value={tingleSettings.general?.agora?.certificate || ""}
                        onChange={e => updateTingleGeneral("general.agora.certificate", e.target.value)}
                        className="bg-background border-border/50" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Resend API Key</label>
                    <Input value={tingleSettings.general?.resendApiKey || ""}
                      onChange={e => updateTingleGeneral("general.resendApiKey", e.target.value)}
                      className="bg-background border-border/50" />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <h3 className="text-sm font-semibold text-white">Commission Setting</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">BD Rate (%)</label>
                      <Input type="number" value={tingleSettings.general?.commission?.bd || 0}
                        onChange={e => updateTingleGeneral("general.commission.bd", parseInt(e.target.value) || 0)}
                        className="bg-background border-border/50" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Agency Rate (%)</label>
                      <Input type="number" value={tingleSettings.general?.commission?.agency || 0}
                        onChange={e => updateTingleGeneral("general.commission.agency", parseInt(e.target.value) || 0)}
                        className="bg-background border-border/50" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Admin Rate (%)</label>
                      <Input type="number" value={tingleSettings.general?.commission?.admin || 0}
                        onChange={e => updateTingleGeneral("general.commission.admin", parseInt(e.target.value) || 0)}
                        className="bg-background border-border/50" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">Allowed range: 0-100</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <h3 className="text-sm font-semibold text-white">Banner Announcement</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Min Gift Announcement Coin</label>
                      <Input type="number" value={tingleSettings.general?.bannerAnnouncement?.minGift || 100}
                        onChange={e => updateTingleGeneral("general.bannerAnnouncement.minGift", parseInt(e.target.value) || 0)}
                        className="bg-background border-border/50" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Min Game Announcement Coin</label>
                      <Input type="number" value={tingleSettings.general?.bannerAnnouncement?.minGame || 100}
                        onChange={e => updateTingleGeneral("general.bannerAnnouncement.minGame", parseInt(e.target.value) || 0)}
                        className="bg-background border-border/50" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CONTENT MODERATION */}
          <TabsContent value="moderation" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold text-white">Content Moderation</h3>
                <p className="text-sm text-gray-400">Configure Sightengine for content moderation</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Sightengine User</label>
                    <Input value={tingleSettings.moderation?.sightengine?.user || ""}
                      onChange={e => setTingleSettings({
                        ...tingleSettings,
                        moderation: { ...tingleSettings.moderation, sightengine: { ...tingleSettings.moderation?.sightengine, user: e.target.value, secret: tingleSettings.moderation?.sightengine?.secret || "" } }
                      })}
                      className="bg-background border-border/50" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Sightengine API Secret</label>
                    <Input value={tingleSettings.moderation?.sightengine?.secret || ""}
                      onChange={e => setTingleSettings({
                        ...tingleSettings,
                        moderation: { ...tingleSettings.moderation, sightengine: { ...tingleSettings.moderation?.sightengine, secret: e.target.value, user: tingleSettings.moderation?.sightengine?.user || "" } }
                      })}
                      className="bg-background border-border/50" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WITHDRAWAL */}
          <TabsContent value="withdrawal" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold text-white">Withdrawal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Currency (1 = 100 coins)</label>
                    <Input type="number" value={tingleSettings.withdrawal?.currency || 1}
                      onChange={e => setTingleSettings({
                        ...tingleSettings,
                        withdrawal: { ...tingleSettings.withdrawal, currency: parseInt(e.target.value) || 0, minCoinsPayout: tingleSettings.withdrawal?.minCoinsPayout || { user: 150, agency: 50, bd: 0 } }
                      })}
                      className="bg-background border-border/50" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Min Payout (User)</label>
                    <Input type="number" value={tingleSettings.withdrawal?.minCoinsPayout?.user || 150}
                      onChange={e => setTingleSettings({
                        ...tingleSettings,
                        withdrawal: {
                          ...tingleSettings.withdrawal,
                          minCoinsPayout: { ...tingleSettings.withdrawal?.minCoinsPayout, user: parseInt(e.target.value) || 0, agency: tingleSettings.withdrawal?.minCoinsPayout?.agency || 50, bd: tingleSettings.withdrawal?.minCoinsPayout?.bd || 0 }
                        }
                      })}
                      className="bg-background border-border/50" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Min Payout (Agency)</label>
                    <Input type="number" value={tingleSettings.withdrawal?.minCoinsPayout?.agency || 50}
                      onChange={e => setTingleSettings({
                        ...tingleSettings,
                        withdrawal: {
                          ...tingleSettings.withdrawal,
                          minCoinsPayout: { ...tingleSettings.withdrawal?.minCoinsPayout, agency: parseInt(e.target.value) || 0, user: tingleSettings.withdrawal?.minCoinsPayout?.user || 150, bd: tingleSettings.withdrawal?.minCoinsPayout?.bd || 0 }
                        }
                      })}
                      className="bg-background border-border/50" />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Min Payout (BD)</label>
                    <Input type="number" value={tingleSettings.withdrawal?.minCoinsPayout?.bd || 0}
                      onChange={e => setTingleSettings({
                        ...tingleSettings,
                        withdrawal: {
                          ...tingleSettings.withdrawal,
                          minCoinsPayout: { ...tingleSettings.withdrawal?.minCoinsPayout, bd: parseInt(e.target.value) || 0, user: tingleSettings.withdrawal?.minCoinsPayout?.user || 150, agency: tingleSettings.withdrawal?.minCoinsPayout?.agency || 50 }
                        }
                      })}
                      className="bg-background border-border/50" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PROFILE MANAGEMENT */}
          <TabsContent value="profile" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold text-white">Profile Management</h3>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={tingleSettings.profile?.removeButtons || true}
                    onCheckedChange={(checked) => setTingleSettings({
                      ...tingleSettings,
                      profile: { removeButtons: checked }
                    })}
                  />
                  <span className="text-sm text-gray-400">Enable Remove Buttons</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AUDIO MANAGER */}
          <TabsContent value="audio" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold text-white">Audio Manager</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-300">Enable Shorts Effects</h4>
                    <Switch
                      checked={tingleSettings.audio?.effects?.enabled || false}
                      onCheckedChange={(checked) => setTingleSettings({
                        ...tingleSettings,
                        audio: {
                          ...tingleSettings.audio,
                          effects: { ...tingleSettings.audio?.effects, enabled: checked, androidKey: tingleSettings.audio?.effects?.androidKey || "", iosKey: tingleSettings.audio?.effects?.iosKey || "" }
                        }
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Android Effect License Key</label>
                      <Input value={tingleSettings.audio?.effects?.androidKey || ""}
                        onChange={e => setTingleSettings({
                          ...tingleSettings,
                          audio: {
                            ...tingleSettings.audio,
                            effects: { ...tingleSettings.audio?.effects, androidKey: e.target.value, iosKey: tingleSettings.audio?.effects?.iosKey || "" }
                          }
                        })}
                        className="bg-background border-border/50" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">iOS Effect License Key</label>
                      <Input value={tingleSettings.audio?.effects?.iosKey || ""}
                        onChange={e => setTingleSettings({
                          ...tingleSettings,
                          audio: {
                            ...tingleSettings.audio,
                            effects: { ...tingleSettings.audio?.effects, iosKey: e.target.value, androidKey: tingleSettings.audio?.effects?.androidKey || "" }
                          }
                        })}
                        className="bg-background border-border/50" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-300">Enable Watermark</h4>
                    <Switch
                      checked={tingleSettings.audio?.watermark?.enabled || false}
                      onCheckedChange={(checked) => setTingleSettings({
                        ...tingleSettings,
                        audio: {
                          ...tingleSettings.audio,
                          watermark: { ...tingleSettings.audio?.watermark, enabled: checked, image: tingleSettings.audio?.watermark?.image || "" }
                        }
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Watermark Image URL</label>
                    <Input value={tingleSettings.audio?.watermark?.image || ""}
                      onChange={e => setTingleSettings({
                        ...tingleSettings,
                        audio: {
                          ...tingleSettings.audio,
                          watermark: { ...tingleSettings.audio?.watermark, image: e.target.value, enabled: tingleSettings.audio?.watermark?.enabled || false }
                        }
                      })}
                      className="bg-background border-border/50" placeholder="Upload URL" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* GAME BET MANAGEMENT */}
          <TabsContent value="game" className="space-y-4">
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-4 space-y-4">
                <h3 className="text-sm font-semibold text-white">Game Bet Management</h3>
                <p className="text-sm text-gray-400">Configure betting amounts available to players.</p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {tingleSettings.gameBet?.bets?.map((bet, index) => (
                    <div key={index}>
                      <label className="text-sm text-gray-400">Bet {index+1}</label>
                      <Input type="number" value={bet}
                        onChange={e => {
                          const newBets = [...(tingleSettings.gameBet?.bets || [])];
                          newBets[index] = parseInt(e.target.value) || 0;
                          setTingleSettings({ ...tingleSettings, gameBet: { ...tingleSettings.gameBet, bets: newBets } });
                        }}
                        className="bg-background border-border/50" />
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-gray-300">Enable Third Party Game</h4>
                    <Switch
                      checked={tingleSettings.gameBet?.thirdParty?.enabled || false}
                      onCheckedChange={(checked) => setTingleSettings({
                        ...tingleSettings,
                        gameBet: {
                          ...tingleSettings.gameBet,
                          thirdParty: { ...tingleSettings.gameBet?.thirdParty, enabled: checked, server: tingleSettings.gameBet?.thirdParty?.server || "", appKey: tingleSettings.gameBet?.thirdParty?.appKey || "", appId: tingleSettings.gameBet?.thirdParty?.appId || "", channel: tingleSettings.gameBet?.thirdParty?.channel || "" }
                        }
                      })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400">Baishun Server</label>
                      <Input value={tingleSettings.gameBet?.thirdParty?.server || ""}
                        onChange={e => setTingleSettings({
                          ...tingleSettings,
                          gameBet: {
                            ...tingleSettings.gameBet,
                            thirdParty: { ...tingleSettings.gameBet?.thirdParty, server: e.target.value, appKey: tingleSettings.gameBet?.thirdParty?.appKey || "", appId: tingleSettings.gameBet?.thirdParty?.appId || "", channel: tingleSettings.gameBet?.thirdParty?.channel || "" }
                          }
                        })}
                        className="bg-background border-border/50" placeholder="https://..." />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Baishun App Key</label>
                      <Input value={tingleSettings.gameBet?.thirdParty?.appKey || ""}
                        onChange={e => setTingleSettings({
                          ...tingleSettings,
                          gameBet: {
                            ...tingleSettings.gameBet,
                            thirdParty: { ...tingleSettings.gameBet?.thirdParty, appKey: e.target.value, server: tingleSettings.gameBet?.thirdParty?.server || "", appId: tingleSettings.gameBet?.thirdParty?.appId || "", channel: tingleSettings.gameBet?.thirdParty?.channel || "" }
                          }
                        })}
                        className="bg-background border-border/50" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Baishun App ID</label>
                      <Input value={tingleSettings.gameBet?.thirdParty?.appId || ""}
                        onChange={e => setTingleSettings({
                          ...tingleSettings,
                          gameBet: {
                            ...tingleSettings.gameBet,
                            thirdParty: { ...tingleSettings.gameBet?.thirdParty, appId: e.target.value, server: tingleSettings.gameBet?.thirdParty?.server || "", appKey: tingleSettings.gameBet?.thirdParty?.appKey || "", channel: tingleSettings.gameBet?.thirdParty?.channel || "" }
                          }
                        })}
                        className="bg-background border-border/50" />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400">Baishun App Channel</label>
                      <Input value={tingleSettings.gameBet?.thirdParty?.channel || ""}
                        onChange={e => setTingleSettings({
                          ...tingleSettings,
                          gameBet: {
                            ...tingleSettings.gameBet,
                            thirdParty: { ...tingleSettings.gameBet?.thirdParty, channel: e.target.value, server: tingleSettings.gameBet?.thirdParty?.server || "", appKey: tingleSettings.gameBet?.thirdParty?.appKey || "", appId: tingleSettings.gameBet?.thirdParty?.appId || "" }
                          }
                        })}
                        className="bg-background border-border/50" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Bell, Send, Users, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ref, push, set, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAdmin } from "@/App";
import { cn } from "@/lib/utils";

const NOTIF_TYPES = [
  { value: "system",      label: "📢 System"      },
  { value: "gift",        label: "🎁 Gift"         },
  { value: "achievement", label: "🏆 Achievement"  },
  { value: "room_invite", label: "🎤 Room Invite"  },
];

export default function NotificationsPage() {
  const { toast } = useToast();
  const { isDemo, showDemoBlock } = useAdmin();
  const [mode, setMode]         = useState<"all" | "user">("all");
  const [targetUid, setTargetUid] = useState("");
  const [title, setTitle]       = useState("");
  const [body, setBody]         = useState("");
  const [type, setType]         = useState("system");
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState<{ count: number; ts: number } | null>(null);

  async function handleSend() {
    if (isDemo) { showDemoBlock(); return; }
    if (!title.trim() || !body.trim()) return;
    setSending(true);
    try {
      const notif = {
        type,
        title: title.trim(),
        body: body.trim(),
        icon: NOTIF_TYPES.find(t => t.value === type)?.label?.split(" ")[0] || "📢",
        read: false,
        timestamp: Date.now(),
      };

      if (mode === "user") {
        if (!targetUid.trim()) {
          toast({ title: "Enter a user UID", variant: "destructive" });
          setSending(false);
          return;
        }
        const nRef = push(ref(db, `notifications/${targetUid.trim()}`));
        await set(nRef, { ...notif, id: nRef.key });
        setSent({ count: 1, ts: Date.now() });
        toast({ title: "Notification sent to user" });
      } else {
        const usersSnap = await get(ref(db, "users"));
        if (!usersSnap.exists()) {
          toast({ title: "No users found", variant: "destructive" });
          setSending(false);
          return;
        }
        const uids = Object.keys(usersSnap.val());
        const batch: Record<string, unknown> = {};
        let count = 0;
        for (const uid of uids) {
          const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          batch[`notifications/${uid}/${id}`] = { ...notif, id };
          count++;
        }
        const batchRef = ref(db);
        const { update } = await import("firebase/database");
        await update(batchRef, batch);
        setSent({ count, ts: Date.now() });
        toast({ title: `Notification sent to ${count} users!` });
      }
      setTitle(""); setBody("");
    } catch {
      toast({ title: "Failed to send", variant: "destructive" });
    }
    setSending(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Push Notifications</h1>
        <p className="text-muted-foreground text-sm">Send in-app notifications to users</p>
      </div>

      {sent && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 text-green-400 text-sm flex items-center gap-2">
          ✅ Sent to {sent.count} user{sent.count !== 1 ? "s" : ""} successfully
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex gap-2">
          <button onClick={() => setMode("all")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all", mode === "all" ? "bg-primary border-primary text-white" : "border-border text-muted-foreground hover:text-white")}>
            <Users className="w-4 h-4" />All Users
          </button>
          <button onClick={() => setMode("user")} className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all", mode === "user" ? "bg-primary border-primary text-white" : "border-border text-muted-foreground hover:text-white")}>
            <User className="w-4 h-4" />Specific User
          </button>
        </div>

        {mode === "user" && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">User Firebase UID</Label>
            <Input placeholder="Enter user UID..." value={targetUid} onChange={e => setTargetUid(e.target.value)} className="bg-background border-border" />
          </div>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Notification Type</Label>
          <div className="flex gap-2 flex-wrap">
            {NOTIF_TYPES.map(t => (
              <button key={t.value} onClick={() => setType(t.value)}
                className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium transition-all", type === t.value ? "bg-primary border-primary text-white" : "border-border text-muted-foreground hover:text-white")}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Title</Label>
          <Input placeholder="Notification title" value={title} onChange={e => setTitle(e.target.value)} className="bg-background border-border" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Message</Label>
          <Input placeholder="Notification body message" value={body} onChange={e => setBody(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} className="bg-background border-border" />
        </div>

        <Button onClick={handleSend} disabled={sending || !title.trim() || !body.trim()} className="w-full bg-primary hover:bg-primary/90">
          {sending ? <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sending...</span>
                   : <span className="flex items-center gap-2"><Send className="w-4 h-4" />Send to {mode === "all" ? "All Users" : "User"}</span>}
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-white text-sm mb-3">Notification Tips</h3>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li>• Use <span className="text-white">All Users</span> to broadcast announcements, events, or maintenance alerts</li>
          <li>• Use <span className="text-white">Specific User</span> to send rewards, responses to support requests</li>
          <li>• Notifications appear in the user's in-app notification center</li>
          <li>• System type works best for admin messages</li>
        </ul>
      </div>
    </div>
  );
}

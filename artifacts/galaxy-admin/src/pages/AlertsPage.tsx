import { useState, useEffect } from "react";
import { Bell, Send, Trash2, ToggleLeft, ToggleRight, AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  sendGlobalAlert, subscribeGlobalAlerts, deleteGlobalAlert, toggleGlobalAlert, GlobalAlert
} from "@/lib/adminService";
import { useAdmin } from "@/App";
import { cn } from "@/lib/utils";

const ALERT_TYPES: { value: GlobalAlert["type"]; label: string; icon: React.ElementType; color: string }[] = [
  { value: "info",    label: "Info",    icon: Info,          color: "text-blue-400 bg-blue-500/20"   },
  { value: "success", label: "Success", icon: CheckCircle,   color: "text-green-400 bg-green-500/20" },
  { value: "warning", label: "Warning", icon: AlertTriangle, color: "text-yellow-400 bg-yellow-500/20" },
  { value: "error",   label: "Error",   icon: XCircle,       color: "text-red-400 bg-red-500/20"     },
];

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function AlertCard({
  alert, onDelete, onToggle,
}: { alert: GlobalAlert; onDelete: () => void; onToggle: () => void }) {
  const type = ALERT_TYPES.find(t => t.value === alert.type) || ALERT_TYPES[0];
  const Icon = type.icon;
  return (
    <div className={cn("bg-card border rounded-xl px-4 py-3 flex items-start gap-3", alert.active ? "border-border" : "border-border/40 opacity-60")}>
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", type.color)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">{alert.message}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {type.label} · {timeAgo(alert.createdAt)} · {alert.active ? "Active" : "Inactive"}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-white" onClick={onToggle}>
          {alert.active ? <ToggleRight className="w-4 h-4 text-green-400" /> : <ToggleLeft className="w-4 h-4" />}
        </Button>
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={onDelete}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { toast } = useToast();
  const { isDemo, showDemoBlock } = useAdmin();
  const [alerts, setAlerts] = useState<GlobalAlert[]>([]);
  const [message, setMessage] = useState("");
  const [type, setType] = useState<GlobalAlert["type"]>("info");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsub = subscribeGlobalAlerts(setAlerts);
    return unsub;
  }, []);

  async function handleSend() {
    if (isDemo) { showDemoBlock(); return; }
    if (!message.trim()) return;
    setSending(true);
    try {
      await sendGlobalAlert(message.trim(), type);
      toast({ title: "Alert sent!", description: "All users will see this alert." });
      setMessage("");
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setSending(false);
  }

  async function handleDelete(id: string) {
    if (isDemo) { showDemoBlock(); return; }
    try {
      await deleteGlobalAlert(id);
      toast({ title: "Alert deleted" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }

  async function handleToggle(alert: GlobalAlert) {
    if (isDemo) { showDemoBlock(); return; }
    try {
      await toggleGlobalAlert(alert.id, !alert.active);
      toast({ title: alert.active ? "Alert deactivated" : "Alert activated" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Global Alerts</h1>
        <p className="text-muted-foreground text-sm">Broadcast messages to all users in the app</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-white text-sm">Send New Alert</h3>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Alert Type</Label>
          <div className="flex gap-2 flex-wrap">
            {ALERT_TYPES.map(({ value, label, icon: Icon, color }) => (
              <button key={value} onClick={() => setType(value)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                  type === value ? `${color} border-current` : "border-border text-muted-foreground hover:border-muted-foreground")}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Message</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Write your global alert message..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSend()}
              className="bg-background border-border flex-1"
            />
            <Button onClick={handleSend} disabled={sending || !message.trim()} className="bg-primary hover:bg-primary/90 shrink-0">
              <Send className="w-4 h-4 mr-2" />Send
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-white text-sm">Active Alerts ({alerts.filter(a => a.active).length})</h3>
        {alerts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No alerts yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert}
                onDelete={() => handleDelete(alert.id)}
                onToggle={() => handleToggle(alert)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

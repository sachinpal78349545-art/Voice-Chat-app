import { useState, useEffect } from "react";
import { Check, X, Clock, RefreshCw, IndianRupee, Coins, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  subscribeRechargeRequests, approveRechargeRequest, rejectRechargeRequest,
  RechargeRequest,
} from "@/lib/adminService";
import { useAdmin } from "@/App";
import { cn } from "@/lib/utils";

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

function RequestCard({
  req,
  adminUid,
}: {
  req: RechargeRequest;
  adminUid: string;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  async function handleApprove() {
    setLoading(true);
    try {
      await approveRechargeRequest(req.id, adminUid, req);
      toast({ title: "✅ Recharge approved", description: `${req.totalCoins} coins sent to ${req.userName}` });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setLoading(false);
  }

  async function handleReject() {
    setLoading(true);
    try {
      await rejectRechargeRequest(req.id, adminUid, rejectReason || "Not approved");
      toast({ title: "❌ Recharge rejected" });
      setShowReject(false);
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
    setLoading(false);
  }

  const statusColor = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    approved: "bg-green-500/20 text-green-400 border-green-500/30",
    rejected: "bg-red-500/20 text-red-400 border-red-500/30",
  }[req.status];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-sm shrink-0">
          {req.userAvatar || "👤"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-white">{req.userName}</span>
            <span className="text-xs text-muted-foreground">ID: {req.userId}</span>
            <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border", statusColor)}>
              {req.status.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <IndianRupee className="w-3 h-3" />₹{req.inrPaid}
            </span>
            <span className="flex items-center gap-1">
              🪙 {req.totalCoins} coins
            </span>
            <span>Txn: <code className="text-foreground/80 bg-muted px-1 rounded">{req.transactionId}</code></span>
            <span>{timeAgo(req.createdAt)}</span>
          </div>
          {req.status === "rejected" && req.rejectReason && (
            <p className="text-xs text-red-400/80 mt-1">Reason: {req.rejectReason}</p>
          )}
        </div>
      </div>

      {req.status === "pending" && (
        <div className="border-t border-border px-4 py-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            className="text-xs bg-green-600 hover:bg-green-700 text-white"
            disabled={loading}
            onClick={handleApprove}
          >
            <Check className="w-3.5 h-3.5 mr-1.5" />
            Approve {req.totalCoins} Coins
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="text-xs"
            disabled={loading}
            onClick={() => setShowReject(v => !v)}
          >
            <X className="w-3.5 h-3.5 mr-1.5" />
            Reject
          </Button>
          {showReject && (
            <div className="w-full flex gap-2 mt-1">
              <Input
                placeholder="Reject reason (optional)"
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                className="text-xs h-8 bg-background flex-1"
              />
              <Button size="sm" variant="destructive" className="text-xs" disabled={loading} onClick={handleReject}>
                Confirm
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RechargePage() {
  const { adminUser } = useAdmin();
  const [requests, setRequests] = useState<RechargeRequest[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeRechargeRequests(list => {
      setRequests(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === "pending").length;

  const filters: { key: typeof filter; label: string }[] = [
    { key: "pending", label: `Pending${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { key: "approved", label: "Approved" },
    { key: "rejected", label: "Rejected" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Recharge Requests</h1>
        <p className="text-muted-foreground text-sm">{pendingCount} pending approval</p>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {filters.map(({ key, label }) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "default" : "outline"}
            onClick={() => setFilter(key)}
            className={cn("text-xs", filter === key && key === "pending" && pendingCount > 0 && "bg-orange-600 hover:bg-orange-700")}
          >
            {key === "pending" && pendingCount > 0 && <Clock className="w-3 h-3 mr-1" />}
            {label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Coins className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No {filter} requests</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(req => (
            <RequestCard key={req.id} req={req} adminUid={adminUser?.uid || ""} />
          ))}
        </div>
      )}
    </div>
  );
}

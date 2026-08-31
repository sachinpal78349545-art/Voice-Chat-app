import React, { useState, useEffect } from "react";
import { UserProfile } from "../lib/userService";
import {
  RechargeRequest, subscribeRechargeRequests,
  approveRechargeRequest, rejectRechargeRequest,
} from "../lib/rechargeService";
import { useToast } from "../lib/toastContext";
import { ArrowLeft, CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";

interface Props {
  user: UserProfile;
  onBack: () => void;
}

type FilterTab = "pending" | "approved" | "rejected" | "all";

const STATUS_COLOR: Record<string, string> = {
  pending:  "#f59e0b",
  approved: "#22c55e",
  rejected: "#ef4444",
};

export default function AdminRechargePage({ user, onBack }: Props) {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<RechargeRequest[]>([]);
  const [filter, setFilter]     = useState<FilterTab>("pending");
  const [loading, setLoading]   = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = subscribeRechargeRequests(reqs => {
      setRequests(reqs);
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === "pending").length;

  const handleApprove = async (req: RechargeRequest) => {
    if (!window.confirm(`Approve ${req.totalCoins} coins for ${req.userName}?`)) return;
    setProcessing(req.id);
    try {
      await approveRechargeRequest(req.id, user.uid, req);
      showToast(`✅ Approved! ${req.totalCoins} coins added to ${req.userName}`, "success");
    } catch (err: any) {
      showToast(err.message || "Approval failed", "error");
    }
    setProcessing(null);
  };

  const handleReject = async (req: RechargeRequest) => {
    const reason = rejectReason[req.id] || "";
    if (!window.confirm(`Reject this request?\nReason: ${reason || "No reason"}`)) return;
    setProcessing(req.id);
    try {
      await rejectRechargeRequest(req.id, user.uid, reason);
      showToast("Request rejected", "info");
    } catch (err: any) {
      showToast(err.message || "Rejection failed", "error");
    }
    setProcessing(null);
    setRejectReason(prev => { const n = { ...prev }; delete n[req.id]; return n; });
  };

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(108,92,231,0.18)",
    borderRadius: 16,
    padding: "14px 16px",
    marginBottom: 12,
    fontFamily: "inherit",
  };

  const tabs: { id: FilterTab; label: string }[] = [
    { id: "pending",  label: `Pending ${pendingCount > 0 ? `(${pendingCount})` : ""}` },
    { id: "approved", label: "Approved" },
    { id: "rejected", label: "Rejected" },
    { id: "all",      label: "All" },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#0d001a 0%,#1a0030 100%)",
      color: "#fff",
      fontFamily: "'Poppins','Inter',sans-serif",
      overflowY: "auto",
      paddingBottom: 32,
      // ✅ Safe-area top padding for the whole page
      paddingTop: "env(safe-area-inset-top, 0px)",
    }}>
      {/* Header – now with safe-area aware top and padding */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 16px 12px",
        // ✅ Use calc to combine safe-area with padding
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)",
        borderBottom: "1px solid rgba(108,92,231,0.15)",
        position: "sticky",
        top: "env(safe-area-inset-top, 0px)", // ✅ Safe-area aware sticky top
        zIndex: 10,
        background: "rgba(13,0,26,0.92)", backdropFilter: "blur(12px)",
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#a78bfa", padding: 4 }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>
          🛡️ Recharge Admin
          {pendingCount > 0 && (
            <span style={{ marginLeft: 8, fontSize: 13, background: "#ef4444", color: "#fff", borderRadius: 10, padding: "2px 8px" }}>
              {pendingCount} new
            </span>
          )}
        </h1>
        {loading && <RefreshCw size={18} color="#a78bfa" style={{ animation: "spin 1s linear infinite" }} />}
      </div>

      {/* UPI info */}
      <div style={{ padding: "12px 16px", background: "rgba(108,92,231,0.08)", borderBottom: "1px solid rgba(108,92,231,0.12)" }}>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>Receiving UPI</p>
        <p style={{ fontSize: 14, fontWeight: 800, color: "#a78bfa", fontFamily: "monospace" }}>7834954512@fam</p>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 6, padding: "12px 16px", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setFilter(t.id)} style={{
            padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700,
            cursor: "pointer", whiteSpace: "nowrap", fontFamily: "inherit",
            background: filter === t.id ? "linear-gradient(135deg,#6C5CE7,#a78bfa)" : "rgba(255,255,255,0.06)",
            border: filter === t.id ? "none" : "1px solid rgba(255,255,255,0.1)",
            color: filter === t.id ? "#fff" : "rgba(255,255,255,0.5)",
            boxShadow: filter === t.id ? "0 0 14px rgba(108,92,231,0.4)" : "none",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: "0 16px" }}>
        {loading ? (
          <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 40 }}>Loading requests...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>
              {filter === "pending" ? "✅" : "📭"}
            </p>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>
              {filter === "pending" ? "No pending requests" : "No requests here"}
            </p>
          </div>
        ) : (
          filtered.map(req => (
            <div key={req.id} style={card}>
              {/* User info */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 19,
                  background: "rgba(108,92,231,0.3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, flexShrink: 0, overflow: "hidden",
                }}>
                  {req.userAvatar?.startsWith("http")
                    ? <img src={req.userAvatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : req.userAvatar || "👤"}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700 }}>{req.userName}</p>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)" }}>
                    ID: {req.userId} • {new Date(req.createdAt).toLocaleString()}
                  </p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  color: STATUS_COLOR[req.status],
                  background: `${STATUS_COLOR[req.status]}18`,
                  borderRadius: 8, padding: "4px 8px",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  {req.status === "pending" && <Clock size={11} />}
                  {req.status === "approved" && <CheckCircle size={11} />}
                  {req.status === "rejected" && <XCircle size={11} />}
                  {req.status.toUpperCase()}
                </span>
              </div>

              {/* Payment details */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8, marginBottom: 12,
              }}>
                {[
                  { label: "Paid",    value: `₹${req.inrPaid}`,          color: "#fbbf24" },
                  { label: "Coins",   value: `💎 ${req.totalCoins.toLocaleString()}`, color: "#c4b5fd" },
                  { label: "Package", value: req.packageId.toUpperCase(), color: "rgba(255,255,255,0.5)" },
                ].map(item => (
                  <div key={item.label} style={{
                    background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "8px 10px", textAlign: "center",
                  }}>
                    <p style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 3 }}>{item.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 800, color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Transaction ID */}
              <div style={{
                background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "8px 12px", marginBottom: 12,
              }}>
                <p style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>TRANSACTION ID</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa", fontFamily: "monospace", wordBreak: "break-all" }}>
                  {req.transactionId}
                </p>
              </div>

              {/* Reject reason + action buttons (only for pending) */}
              {req.status === "pending" && (
                <>
                  <input
                    placeholder="Reject reason (optional)"
                    value={rejectReason[req.id] || ""}
                    onChange={e => setRejectReason(prev => ({ ...prev, [req.id]: e.target.value }))}
                    style={{
                      width: "100%", boxSizing: "border-box", marginBottom: 10,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10,
                      padding: "8px 12px", color: "#fff", fontSize: 12, fontFamily: "inherit", outline: "none",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={processing === req.id}
                      style={{
                        flex: 1, padding: "11px 0", borderRadius: 12, border: "none", cursor: "pointer",
                        background: processing === req.id ? "rgba(34,197,94,0.3)" : "linear-gradient(135deg,#16a34a,#22c55e)",
                        color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
                        boxShadow: "0 0 14px rgba(34,197,94,0.3)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      <CheckCircle size={15} />
                      {processing === req.id ? "..." : "Approve"}
                    </button>
                    <button
                      onClick={() => handleReject(req)}
                      disabled={processing === req.id}
                      style={{
                        flex: 1, padding: "11px 0", borderRadius: 12, border: "none", cursor: "pointer",
                        background: processing === req.id ? "rgba(239,68,68,0.3)" : "linear-gradient(135deg,#dc2626,#ef4444)",
                        color: "#fff", fontSize: 14, fontWeight: 800, fontFamily: "inherit",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                      }}
                    >
                      <XCircle size={15} />
                      {processing === req.id ? "..." : "Reject"}
                    </button>
                  </div>
                </>
              )}

              {/* Processed info */}
              {req.status !== "pending" && req.processedAt && (
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 8 }}>
                  {req.status === "approved" ? "✅ Approved" : "❌ Rejected"} on {new Date(req.processedAt).toLocaleString()}
                  {req.rejectReason && <span> — "{req.rejectReason}"</span>}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
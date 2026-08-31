import React, { useState } from "react";
import { UserProfile } from "../lib/userService";
import {
  RECHARGE_PACKAGES, RechargePackage,
  submitRechargeRequest, getUserRechargeHistory, RechargeRequest,
} from "../lib/rechargeService";
import { useToast } from "../lib/toastContext";
import { Copy, CheckCircle, Clock, XCircle, ArrowLeft, Wallet } from "lucide-react";

interface Props {
  user: UserProfile;
  onBack: () => void;
}

const UPI_ID = "7834954512@fam";
const UPI_NAME = "Galaxy Voice Chat";
const QR_URL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=6C5CE7&bgcolor=0d001a&data=${encodeURIComponent(`upi://pay?pa=${UPI_ID}&pn=${UPI_NAME}&cu=INR`)}`;

const STATUS_COLOR: Record<string, string> = {
  pending:  "#f59e0b",
  approved: "#22c55e",
  rejected: "#ef4444",
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:  <Clock   size={13} />,
  approved: <CheckCircle size={13} />,
  rejected: <XCircle  size={13} />,
};

export default function RechargePage({ user, onBack }: Props) {
  const { showToast } = useToast();
  const [selectedPkg, setSelectedPkg] = useState<RechargePackage | null>(null);
  const [txId, setTxId]               = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [copied, setCopied]           = useState(false);
  const [step, setStep]               = useState<"select" | "pay" | "confirm">("select");
  const [history, setHistory]         = useState<RechargeRequest[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(UPI_ID).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const h = await getUserRechargeHistory(user.uid);
      setHistory(h);
    } catch {}
    setLoadingHistory(false);
  };

  const handleSelectPkg = (pkg: RechargePackage) => {
    setSelectedPkg(pkg);
    setStep("pay");
    setTxId("");
  };

  const handleSubmit = async () => {
    if (!selectedPkg) return;
    const trimmedTx = txId.trim();
    if (!trimmedTx) { showToast("Please enter your UPI Transaction ID", "error", "❌"); return; }
    if (trimmedTx.length < 6) { showToast("Transaction ID too short — please check", "error", "❌"); return; }

    setSubmitting(true);
    try {
      await submitRechargeRequest(
        user.uid, user.name, user.avatar, user.userId || user.uid,
        trimmedTx, selectedPkg,
      );
      setStep("confirm");
      showToast("Request submitted! Admin will approve within 24h", "success", "✅");
    } catch (err: any) {
      showToast(err.message || "Submission failed, try again", "error", "❌");
    }
    setSubmitting(false);
  };

  const card: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(108,92,231,0.2)",
    borderRadius: 16,
    padding: "14px 16px",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#0d001a 0%,#1a0030 100%)",
      color: "#fff",
      fontFamily: "'Poppins','Inter',sans-serif",
      overflowY: "auto",
      paddingBottom: 32,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "16px 16px 12px",
        borderBottom: "1px solid rgba(108,92,231,0.15)",
        position: "sticky", top: 0, zIndex: 10,
        background: "rgba(13,0,26,0.92)", backdropFilter: "blur(12px)",
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "#a78bfa", padding: 4 }}>
          <ArrowLeft size={22} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 800, flex: 1 }}>💎 Recharge Coins</h1>
        <button onClick={() => { setShowHistory(s => !s); if (!showHistory) loadHistory(); }}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#a78bfa", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
          <Wallet size={15} /> History
        </button>
      </div>

      <div style={{ padding: "16px 16px 0" }}>

        {/* Current coins */}
        <div style={{ ...card, display: "flex", alignItems: "center", gap: 12, marginBottom: 16,
          background: "linear-gradient(135deg,rgba(108,92,231,0.15),rgba(167,139,250,0.08))",
          border: "1px solid rgba(167,139,250,0.25)" }}>
          <span style={{ fontSize: 32 }}>💎</span>
          <div>
            <p style={{ fontSize: 11, color: "rgba(167,139,250,0.6)", fontWeight: 600 }}>YOUR BALANCE</p>
            <p style={{ fontSize: 22, fontWeight: 900, color: "#c4b5fd" }}>{user.coins.toLocaleString()} coins</p>
          </div>
        </div>

        {/* STEP 1: Select package */}
        {step === "select" && (
          <>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 12, fontWeight: 600 }}>SELECT PACKAGE</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {RECHARGE_PACKAGES.map(pkg => (
                <button key={pkg.id} onClick={() => handleSelectPkg(pkg)} style={{
                  ...card, display: "flex", alignItems: "center", gap: 14,
                  cursor: "pointer", width: "100%", textAlign: "left",
                  transition: "border 0.15s, background 0.15s",
                  border: "1px solid rgba(108,92,231,0.25)",
                }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: 14,
                    background: "linear-gradient(135deg,#6C5CE7,#a78bfa)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, flexShrink: 0,
                    boxShadow: "0 0 14px rgba(108,92,231,0.4)",
                  }}>💎</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                        {(pkg.coins + pkg.bonusCoins).toLocaleString()} coins
                      </p>
                      {pkg.bonusCoins > 0 && (
                        <span style={{ fontSize: 10, background: "rgba(0,230,118,0.15)", color: "#00e676", borderRadius: 6, padding: "2px 6px", fontWeight: 700 }}>
                          +{pkg.bonusCoins} bonus
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{pkg.label}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 18, fontWeight: 900, color: "#fbbf24" }}>₹{pkg.inrPrice}</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* STEP 2: Pay via UPI */}
        {step === "pay" && selectedPkg && (
          <>
            <button onClick={() => setStep("select")} style={{
              background: "none", border: "none", cursor: "pointer", color: "#a78bfa",
              fontSize: 12, display: "flex", alignItems: "center", gap: 4, marginBottom: 16, padding: 0,
            }}>
              ← Back to packages
            </button>

            {/* Selected package summary */}
            <div style={{ ...card, marginBottom: 16, background: "rgba(108,92,231,0.1)", border: "1px solid rgba(108,92,231,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>You get</p>
                  <p style={{ fontSize: 20, fontWeight: 900, color: "#c4b5fd" }}>
                    💎 {(selectedPkg.coins + selectedPkg.bonusCoins).toLocaleString()} coins
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Pay</p>
                  <p style={{ fontSize: 24, fontWeight: 900, color: "#fbbf24" }}>₹{selectedPkg.inrPrice}</p>
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div style={{ ...card, textAlign: "center", marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,139,250,0.8)", marginBottom: 12 }}>
                📱 Scan QR to pay
              </p>
              <div style={{
                display: "inline-flex", padding: 12, background: "#fff", borderRadius: 16,
                boxShadow: "0 0 30px rgba(108,92,231,0.4)", marginBottom: 12,
              }}>
                <img
                  src={QR_URL}
                  alt="UPI QR Code"
                  width={180} height={180}
                  style={{ display: "block", borderRadius: 8 }}
                  onError={e => {
                    // fallback if QR service is unavailable
                    (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180' fill='%23f3f4f6'><rect width='180' height='180' rx='8'/><text x='90' y='80' text-anchor='middle' font-size='14' fill='%236C5CE7' font-family='sans-serif'>UPI QR</text><text x='90' y='104' text-anchor='middle' font-size='11' fill='%236C5CE7' font-family='sans-serif'>${UPI_ID}</text></svg>`;
                  }}
                />
              </div>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                Works with GPay, PhonePe, Paytm, BHIM
              </p>
            </div>

            {/* UPI ID with copy */}
            <div style={{ ...card, display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 2, fontWeight: 600 }}>UPI ID</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: "#a78bfa", fontFamily: "monospace" }}>{UPI_ID}</p>
              </div>
              <button onClick={handleCopy} style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 10, cursor: "pointer",
                background: copied ? "rgba(0,230,118,0.15)" : "rgba(108,92,231,0.2)",
                border: `1px solid ${copied ? "rgba(0,230,118,0.4)" : "rgba(108,92,231,0.35)"}`,
                color: copied ? "#00e676" : "#a78bfa", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
              }}>
                {copied ? <CheckCircle size={14} /> : <Copy size={14} />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Steps */}
            <div style={{ ...card, marginBottom: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>HOW TO PAY</p>
              {[
                `Open any UPI app (GPay/PhonePe/Paytm)`,
                `Send exactly ₹${selectedPkg.inrPrice} to UPI ID: ${UPI_ID}`,
                `Copy the Transaction/UTR ID from your payment app`,
                `Paste it below and submit — coins added within 24h`,
              ].map((step, i) => (
                <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 3 ? 8 : 0, alignItems: "flex-start" }}>
                  <div style={{
                    width: 20, height: 20, borderRadius: 10, flexShrink: 0, marginTop: 1,
                    background: "linear-gradient(135deg,#6C5CE7,#a78bfa)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 900, color: "#fff",
                  }}>{i + 1}</div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>{step}</p>
                </div>
              ))}
            </div>

            {/* Transaction ID input */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(167,139,250,0.8)", display: "block", marginBottom: 8 }}>
                📋 UPI Transaction / UTR ID *
              </label>
              <input
                value={txId}
                onChange={e => setTxId(e.target.value)}
                placeholder="e.g. 123456789012 or T2024..."
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.06)",
                  border: "1.5px solid rgba(108,92,231,0.35)",
                  borderRadius: 12, padding: "12px 14px",
                  color: "#fff", fontSize: 14, fontFamily: "monospace",
                  outline: "none",
                }}
              />
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 5 }}>
                You can find this in your UPI app under payment history
              </p>
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting || !txId.trim()}
              style={{
                width: "100%", padding: "15px 0", borderRadius: 16, border: "none",
                background: submitting || !txId.trim()
                  ? "rgba(108,92,231,0.3)"
                  : "linear-gradient(135deg,#7c3aed,#a855f7)",
                color: "#fff", fontSize: 16, fontWeight: 800, cursor: submitting || !txId.trim() ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                boxShadow: submitting || !txId.trim() ? "none" : "0 0 24px rgba(124,58,237,0.5)",
              }}
            >
              {submitting ? "⏳ Submitting..." : "✅ Submit Payment Proof"}
            </button>
          </>
        )}

        {/* STEP 3: Confirmation */}
        {step === "confirm" && (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>⏳</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#a78bfa", marginBottom: 8 }}>
              Request Submitted!
            </h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.55)", marginBottom: 6, lineHeight: 1.6 }}>
              Your payment proof has been sent to the admin.
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 28 }}>
              Coins will be added within <strong style={{ color: "#fbbf24" }}>24 hours</strong> after verification.
            </p>
            <button onClick={() => { setStep("select"); setSelectedPkg(null); setTxId(""); }} style={{
              background: "linear-gradient(135deg,#7c3aed,#a855f7)",
              color: "#fff", border: "none", borderRadius: 24, padding: "12px 28px",
              fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}>
              Recharge Again
            </button>
          </div>
        )}

        {/* Transaction History */}
        {showHistory && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 12 }}>📋 RECHARGE HISTORY</p>
            {loadingHistory ? (
              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 20 }}>Loading...</p>
            ) : history.length === 0 ? (
              <p style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 20 }}>No requests yet</p>
            ) : (
              history.map(req => (
                <div key={req.id} style={{ ...card, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>💎 {req.totalCoins.toLocaleString()} coins</p>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>₹{req.inrPaid} • Txn: {req.transactionId}</p>
                      <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{new Date(req.createdAt).toLocaleString()}</p>
                    </div>
                    <span style={{
                      display: "flex", alignItems: "center", gap: 4,
                      fontSize: 11, fontWeight: 700, color: STATUS_COLOR[req.status],
                      background: `${STATUS_COLOR[req.status]}18`, borderRadius: 8, padding: "4px 8px",
                    }}>
                      {STATUS_ICON[req.status]} {req.status.toUpperCase()}
                    </span>
                  </div>
                  {req.rejectReason && (
                    <p style={{ fontSize: 10, color: "#ef4444", marginTop: 6 }}>Reason: {req.rejectReason}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { ref, onValue, off } from "firebase/database";
import { db } from "../../lib/firebase";
import { LiveGift } from "./giftTypes";

const TABS         = ["Backpack", "Gift", "Intimacy", "VIP", "PK"];
const BANNER_NUMS  = [59, 79, 99, 199, 299];
const GIFT_COMBOS  = [1, 10, 50, 100];

interface GiftPanelProps {
  userCoins: number;
  onSendGift: (gift: LiveGift, combo: number) => void;
  onClose: () => void;
}

export default function GiftPanel({ userCoins, onSendGift, onClose }: GiftPanelProps) {
  const [activeTab,    setActiveTab]    = useState("Gift");
  const [selectedId,   setSelectedId]   = useState<string | null>(null);
  const [combo,        setCombo]        = useState(1);
  const [comboOpen,    setComboOpen]    = useState(false);
  const [liveGifts,    setLiveGifts]    = useState<LiveGift[]>([]);
  const [giftsLoading, setGiftsLoading] = useState(true);

  /* inject glow keyframe once */
  useEffect(() => {
    const id = "gift-premium-animation-sheet";
    if (!document.getElementById(id)) {
      const s = document.createElement("style");
      s.id = id;
      s.innerText = `
        @keyframes premiumGiftGlow {
          0%   { transform:scale(1);    box-shadow:0 0 4px rgba(139,92,246,0.2);  border-color:rgba(255,255,255,0.06); }
          50%  { transform:scale(1.03); box-shadow:0 0 16px rgba(236,72,153,0.5),inset 0 0 8px rgba(124,58,237,0.3); border-color:#f472b6; }
          100% { transform:scale(1);    box-shadow:0 0 4px rgba(139,92,246,0.2);  border-color:rgba(255,255,255,0.06); }
        }
        .premium-gift-selected { animation:premiumGiftGlow 2s infinite ease-in-out !important; }
      `;
      document.head.appendChild(s);
    }
  }, []);

  /* Firebase live gifts */
  useEffect(() => {
    const r = ref(db, "appConfig/gifts");
    const unsub = onValue(r, snap => {
      if (snap.exists()) {
        const val = snap.val() as Record<string, LiveGift>;
        setLiveGifts(
          Object.values(val)
            .filter(g => g.enabled !== false)
            .sort((a, b) => a.cost - b.cost)
        );
      } else {
        setLiveGifts([]);
      }
      setGiftsLoading(false);
    });
    return () => off(r, "value", unsub);
  }, []);

  const handleSend = () => {
    if (!selectedId) return;
    const gift = liveGifts.find(g => g.id === selectedId);
    if (!gift) return;
    if (userCoins < gift.cost * combo) return;
    onSendGift(gift, combo);
    onClose();
  };

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1100,
      maxWidth: 480, margin: "0 auto",
      background: "rgba(18,10,36,0.98)", backdropFilter: "blur(20px)",
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      borderTop: "1px solid rgba(236,72,153,0.25)",
      padding: "16px 14px 24px",
      boxShadow: "0 -10px 30px rgba(0,0,0,0.5)",
    }}>

      {/* Header: coins + tabs */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 12, justifyContent: "space-between" }}>
        <div style={{ fontSize: 13, color: "#38bdf8", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
          <span>💎 {userCoins}</span>
          <ChevronDown size={14} />
        </div>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", whiteSpace: "nowrap", paddingBottom: 4 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              background: "none", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
              color: activeTab === t ? "#fff" : "rgba(255,255,255,0.4)",
              position: "relative", padding: "2px 4px", transition: "color 0.2s",
            }}>
              {t}
              {activeTab === t && (
                <div style={{ position: "absolute", bottom: -4, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#ec4899,#8b5cf6)", borderRadius: 1 }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* VIP banner */}
      <div style={{
        background: "linear-gradient(90deg,rgba(236,72,153,0.15),rgba(124,58,237,0.15))",
        borderRadius: 12, padding: "6px 10px", display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 14, border: "1px solid rgba(255,255,255,0.05)",
      }}>
        <span style={{ fontSize: 11, color: "#f472b6", fontWeight: 700 }}>🎁 VIP Store Gifts Enabled</span>
        <div style={{ display: "flex", gap: 6 }}>
          {BANNER_NUMS.map(n => (
            <div key={n} style={{ background: "rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 10, padding: "2px 6px", color: "#c4b5fd" }}>{n}</div>
          ))}
        </div>
      </div>

      {/* Gift grid */}
      {activeTab === "Gift" ? (
        giftsLoading ? (
          <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Loading gifts…</div>
        ) : liveGifts.length === 0 ? (
          <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>No gifts available</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 16, maxHeight: 250, overflowY: "auto", padding: "4px 2px" }}>
            {liveGifts.map(g => {
              const sel = selectedId === g.id;
              return (
                <div key={g.id} onClick={() => setSelectedId(g.id)}
                  className={sel ? "premium-gift-selected" : ""}
                  style={{
                    background: sel ? "rgba(236,72,153,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${sel ? "rgba(236,72,153,0.4)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 16, padding: "10px 4px", display: "flex", flexDirection: "column",
                    alignItems: "center", cursor: "pointer", transition: "all 0.2s", position: "relative",
                  }}
                >
                  {g.animationType === "fullscreen" && (
                    <div style={{ position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: 3, background: "#FFD700" }} />
                  )}
                  <div style={{ width: 54, height: 54, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: 12, position: "relative" }}>
                    {g.url ? (
                      <img src={g.url} alt={g.name} style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        onError={e => {
                          const img = e.target as HTMLImageElement;
                          img.style.display = "none";
                          const fb = img.nextElementSibling as HTMLElement;
                          if (fb) fb.style.display = "flex";
                        }}
                      />
                    ) : null}
                    <span style={{ fontSize: 34, display: g.url ? "none" : "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}>{g.emoji}</span>
                  </div>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.85)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", textAlign: "center", fontWeight: 500, marginBottom: 2 }}>{g.name}</span>
                  <span style={{ fontSize: 10, color: "#ffb703", fontWeight: 700 }}>💎 {g.cost}</span>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div style={{ height: 110, display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Empty Content Stream</div>
      )}

      {/* Footer: host selector + combo + send */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.05)", padding: "4px 10px", borderRadius: 20 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#ec4899", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>H</div>
          <span style={{ fontSize: 11, color: "#fff" }}>Host</span>
          <ChevronDown size={12} color="rgba(255,255,255,0.4)" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
          <button onClick={() => setComboOpen(v => !v)} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff", borderRadius: 20, padding: "5px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4, cursor: "pointer",
          }}>
            <span>x{combo}</span>
            <ChevronDown size={12} />
          </button>

          {comboOpen && (
            <div style={{ position: "absolute", bottom: 38, left: 0, background: "#1e1b4b", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 1200 }}>
              {GIFT_COMBOS.map(c => (
                <button key={c} onClick={() => { setCombo(c); setComboOpen(false); }}
                  style={{ padding: "6px 16px", background: "none", border: "none", color: "#fff", fontSize: 11, textAlign: "left", cursor: "pointer" }}>x{c}</button>
              ))}
            </div>
          )}

          <button onClick={handleSend} style={{
            background: "linear-gradient(90deg,#db2777,#7c3aed)",
            color: "#fff", fontWeight: 700, fontSize: 13, border: "none",
            padding: "6px 20px", borderRadius: 20, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
          }}>Send</button>
        </div>
      </div>
    </div>
  );
}

import React from "react";
import { GiftAnimState } from "./giftTypes";

interface GiftParticle {
  id: number;
  emoji: string;
  x: number;
  y: number;
  px: string;
  py: string;
}

interface GiftAnimationProps {
  giftAnim: GiftAnimState | null;
  giftParticles: GiftParticle[];
}

const SPARKLE_POSITIONS = [
  { t: "12%", l: "8%"  }, { t: "20%", l: "82%" }, { t: "38%", l: "4%"  }, { t: "35%", l: "91%" },
  { t: "58%", l: "10%" }, { t: "62%", l: "80%" }, { t: "72%", l: "28%" }, { t: "70%", l: "68%" },
  { t: "18%", l: "48%" }, { t: "80%", l: "48%" }, { t: "44%", l: "48%" }, { t: "8%",  l: "55%" },
];
const SPARKLE_CHARS = "✨🌟💫⭐🎆";

export default function GiftAnimation({ giftAnim, giftParticles }: GiftAnimationProps) {
  return (
    <>
      {/* ── FLOAT: small compact top animation ── */}
      {giftAnim?.animationType === "float" && (
        <div style={{
          position: "fixed", top: "22%", left: "50%", transform: "translateX(-50%)",
          zIndex: 1500, textAlign: "center", pointerEvents: "none",
          animation: "giftReveal 3s ease forwards",
        }}>
          <div style={{ display: "inline-block", animation: "giftBounce 0.8s ease infinite alternate" }}>
            {giftAnim.url
              ? <img src={giftAnim.url} alt={giftAnim.emoji} style={{ width: 80, height: 80, objectFit: "contain", borderRadius: 8 }} />
              : <span style={{ fontSize: 80 }}>{giftAnim.emoji}</span>
            }
          </div>
          <div style={{ fontSize: 13, color: "#FFD700", fontWeight: 800, marginTop: 8, textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
            {giftAnim.sender} ➤ {giftAnim.receiver}
          </div>
        </div>
      )}

      {/* ── PARTICLE: burst + sparkles around gift ── */}
      {giftAnim?.animationType === "particle" && (
        <div style={{
          position: "fixed", top: "28%", left: "50%", transform: "translateX(-50%)",
          zIndex: 1500, textAlign: "center", pointerEvents: "none",
        }}>
          <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            {["✨", "🌟", "💫", "⭐", "✨", "🌟", "💫", "⭐"].map((s, i) => (
              <div key={i} style={{
                position: "absolute", fontSize: 20,
                animation: `particleOut 1.4s ease-out ${i * 0.08}s forwards`,
                "--pdeg": `${i * 45}deg`,
              } as React.CSSProperties}>{s}</div>
            ))}
            <div style={{ animation: "popIn 0.35s cubic-bezier(0.175,0.885,0.32,1.275) forwards" }}>
              {giftAnim.url
                ? <img src={giftAnim.url} alt={giftAnim.emoji} style={{ width: 110, height: 110, objectFit: "contain", borderRadius: 16, filter: "drop-shadow(0 0 24px rgba(191,0,255,0.7))" }} />
                : <span style={{ fontSize: 90, filter: "drop-shadow(0 0 24px rgba(191,0,255,0.7))" }}>{giftAnim.emoji}</span>
              }
            </div>
          </div>
          <div style={{ fontSize: 13, color: "#FFD700", fontWeight: 800, marginTop: 12, textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}>
            {giftAnim.sender} ➤ {giftAnim.receiver}
          </div>
        </div>
      )}

      {/* ── FULLSCREEN: Yalla/Chalotalk style full overlay ── */}
      {giftAnim?.animationType === "fullscreen" && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 2000,
          background: "rgba(4,2,16,0.93)", backdropFilter: "blur(12px)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          pointerEvents: "none", animation: "fsGiftEntry 0.4s cubic-bezier(0.175,0.885,0.32,1.275) forwards",
        }}>
          {/* Ambient sparkles */}
          {SPARKLE_POSITIONS.map((pos, i) => (
            <div key={i} style={{
              position: "absolute", top: pos.t, left: pos.l,
              fontSize: 18 + (i % 3) * 4,
              animation: `fsSparkle ${1.2 + (i % 4) * 0.25}s ease-in-out ${i * 0.12}s infinite alternate`,
              opacity: 0.75, pointerEvents: "none",
            }}>{SPARKLE_CHARS[i % 5]}</div>
          ))}

          {/* Big gift image */}
          <div style={{ animation: "vipGiftBounce 0.65s ease-in-out infinite alternate", marginBottom: 22 }}>
            {giftAnim.url
              ? <img src={giftAnim.url} alt={giftAnim.emoji} style={{ width: 168, height: 168, objectFit: "contain", borderRadius: 24, filter: "drop-shadow(0 0 40px rgba(191,0,255,0.8)) drop-shadow(0 0 80px rgba(255,215,0,0.35))" }} />
              : <span style={{ fontSize: 144, filter: "drop-shadow(0 0 40px rgba(191,0,255,0.8))" }}>{giftAnim.emoji}</span>
            }
          </div>

          {/* Gift name */}
          <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", letterSpacing: 0.5, marginBottom: 12, textShadow: "0 0 30px rgba(255,215,0,0.9),0 2px 12px rgba(0,0,0,0.9)" }}>
            🎁 {giftAnim.giftName}
          </div>

          {/* Sender → Receiver */}
          <div style={{ background: "rgba(255,255,255,0.07)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 32, padding: "9px 24px", fontSize: 14, fontWeight: 700, color: "#FFD700", textShadow: "0 0 16px rgba(255,215,0,0.7)" }}>
            {giftAnim.sender} ➤ {giftAnim.receiver}
          </div>

          {/* Combo badge */}
          {giftAnim.combo && giftAnim.combo > 1 && (
            <div style={{ marginTop: 14, background: "linear-gradient(135deg,#bf00ff,#ff6b00)", borderRadius: 22, padding: "5px 20px", fontSize: 20, fontWeight: 900, color: "#fff", boxShadow: "0 6px 24px rgba(191,0,255,0.55)", letterSpacing: 1 }}>
              ×{giftAnim.combo}
            </div>
          )}
        </div>
      )}

      {/* ── Background particles (used by all types) ── */}
      {giftParticles.map(p => (
        <div key={p.id} className="gift-particle" style={{
          left: `${p.x}%`, top: `${p.y}%`, fontSize: 20,
          "--px": p.px, "--py": p.py,
        } as React.CSSProperties}>{p.emoji}</div>
      ))}
    </>
  );
}

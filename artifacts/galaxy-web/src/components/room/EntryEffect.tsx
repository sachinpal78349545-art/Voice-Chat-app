/**
 * EntryEffect – animated entry banner when a user joins the room.
 * Slides in from left, glows, then fades out after ~3.5 s.
 *
 * equippedEntry values:
 *   entry_lightning | entry_stars | entry_phoenix | entry_galaxy | (none = default)
 */
import React, { useEffect, useRef } from "react";

interface EntryEffectProps {
  name: string;
  avatar?: string;
  entryId?: string;
  visible: boolean;
}

interface EntryStyle {
  icon: string;
  gradient: string;
  glow: string;
  label: string;
  sound?: string;
  particles: string[];
}

const ENTRY_STYLES: Record<string, EntryStyle> = {
  entry_lightning: {
    icon: "⚡",
    gradient: "linear-gradient(135deg, rgba(255,214,0,0.18), rgba(255,107,0,0.22))",
    glow: "rgba(255,214,0,0.55)",
    label: "Lightning Strike",
    particles: ["⚡", "✨", "💥", "⚡", "✨"],
  },
  entry_stars: {
    icon: "🌟",
    gradient: "linear-gradient(135deg, rgba(108,92,231,0.22), rgba(162,155,254,0.18))",
    glow: "rgba(162,155,254,0.55)",
    label: "Starfall",
    particles: ["⭐", "🌟", "✨", "💫", "⭐"],
  },
  entry_phoenix: {
    icon: "🦅",
    gradient: "linear-gradient(135deg, rgba(255,107,53,0.22), rgba(255,23,68,0.18))",
    glow: "rgba(255,107,53,0.55)",
    label: "Phoenix Rise",
    particles: ["🔥", "💥", "✨", "🔥", "💫"],
  },
  entry_galaxy: {
    icon: "🌀",
    gradient: "linear-gradient(135deg, rgba(13,71,161,0.22), rgba(108,92,231,0.22), rgba(224,64,251,0.18))",
    glow: "rgba(108,92,231,0.6)",
    label: "Galaxy Portal",
    particles: ["🌀", "💫", "⭐", "✨", "🌌"],
  },
};

const DEFAULT_STYLE: EntryStyle = {
  icon: "🎉",
  gradient: "linear-gradient(135deg, rgba(108,92,231,0.18), rgba(0,230,230,0.12))",
  glow: "rgba(108,92,231,0.45)",
  label: "Joined",
  particles: ["🎉", "✨", "🌟", "💫", "🎊"],
};

export default function EntryEffect({ name, avatar, entryId, visible }: EntryEffectProps) {
  const style = (entryId && ENTRY_STYLES[entryId]) || DEFAULT_STYLE;
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!visible) return;
    try {
      const frequencies: Record<string, number[]> = {
        entry_lightning: [880, 660, 440],
        entry_stars:     [523, 659, 784],
        entry_phoenix:   [440, 554, 659],
        entry_galaxy:    [261, 329, 415],
      };
      const freqs = frequencies[entryId || ""] || [440, 523];
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.08, ctx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.3);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + i * 0.07 + 0.35);
      });
    } catch {}
  }, [visible, entryId]);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed",
      left: 0, right: 0,
      top: "18%",
      zIndex: 1400,
      display: "flex",
      justifyContent: "center",
      pointerEvents: "none",
      animation: "entryBannerIn 3.8s ease forwards",
    }}>
      {/* Floating particles */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {style.particles.map((p, i) => (
          <div key={i} style={{
            position: "absolute",
            fontSize: 16 + (i % 3) * 4,
            left: `${10 + i * 18}%`,
            top: `${-20 + (i % 2) * 40}%`,
            animation: `entryParticle ${1.2 + i * 0.15}s ease-out ${i * 0.08}s both`,
            opacity: 0,
          }}>{p}</div>
        ))}
      </div>

      {/* Main banner card */}
      <div style={{
        background: style.gradient,
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${style.glow}`,
        borderRadius: 32,
        padding: "10px 20px 10px 10px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: `0 0 24px ${style.glow}, 0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.12)`,
        maxWidth: 320,
      }}>

        {/* Avatar bubble */}
        <div style={{
          width: 44, height: 44, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
          border: `2px solid ${style.glow}`,
          boxShadow: `0 0 12px ${style.glow}`,
          background: "rgba(108,92,231,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {avatar && (avatar.startsWith("http") || avatar.startsWith("/")) ? (
            <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 24 }}>{style.icon}</span>
          )}
        </div>

        {/* Text */}
        <div>
          <div style={{
            fontSize: 14, fontWeight: 900, color: "#fff",
            textShadow: `0 0 12px ${style.glow}, 0 2px 4px rgba(0,0,0,0.8)`,
            letterSpacing: 0.3,
          }}>
            {style.icon} {name}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)", marginTop: 2, fontWeight: 500 }}>
            {style.label} · just joined ✨
          </div>
        </div>
      </div>
    </div>
  );
}

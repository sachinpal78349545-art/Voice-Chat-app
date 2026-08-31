import React from "react";

interface GameHubProps {
  hasControl: boolean;
  onSelectGame: (game: string) => void;
  onClose: () => void;
}

const GAMES = [
  { id: "dice",   emoji: "\u{1F3B2}",   name: "Dice Roll",         desc: "Roll dice, everyone sees live!", adminOnly: false, gradient: "linear-gradient(135deg,#6366f1,#3b82f6)" },
  { id: "ludo",   emoji: "\u{1F3F0}",   name: "3D Ludo",           desc: "Classic 4-player board, neon galaxy theme", adminOnly: true,  gradient: "linear-gradient(135deg,#8b5cf6,#ec4899)" },
  { id: "snake",  emoji: "\u{1F40D}",   name: "Snake & Ladders",   desc: "Climb the cosmic ladders, dodge the snakes!", adminOnly: true,  gradient: "linear-gradient(135deg,#10b981,#06b6d4)" },
  { id: "carrom", emoji: "\u{1F3B1}",   name: "Galaxy Carrom",     desc: "Neon striker board — pocket all the coins", adminOnly: true,  gradient: "linear-gradient(135deg,#7c3aed,#06b6d4)" },
  { id: "tod",    emoji: "\u{1F37E}",   name: "Truth or Dare",     desc: "Spin the bottle in the room center!", adminOnly: true,  gradient: "linear-gradient(135deg,#f59e0b,#ef4444)" },
];

export default function GameHub({ hasControl, onSelectGame, onClose }: GameHubProps) {
  return (
    <div className="game-overlay" onClick={onClose}>
      <div className="game-card" style={{ width: 320, maxHeight: "70vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 20, fontWeight: 900, color: "#fff", marginBottom: 4 }}>
          {"\u{1F3AE}"} Games
        </h3>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 16 }}>
          {hasControl ? "Start a game for everyone!" : "Join games started by the host"}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {GAMES.map(g => {
            const canStart = !g.adminOnly || hasControl;
            return (
              <button
                key={g.id}
                onClick={() => canStart && onSelectGame(g.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 14,
                  background: canStart ? "rgba(108,92,231,0.12)" : "rgba(255,255,255,0.03)",
                  border: canStart ? "1px solid rgba(108,92,231,0.35)" : "1px solid rgba(255,255,255,0.08)",
                  cursor: canStart ? "pointer" : "not-allowed",
                  opacity: canStart ? 1 : 0.4,
                  textAlign: "left", fontFamily: "'Poppins','Inter',sans-serif",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{
                  width: 46, height: 46, borderRadius: 12,
                  background: g.gradient,
                  boxShadow: `0 0 14px ${canStart ? "rgba(108,92,231,0.5)" : "transparent"}, inset 0 1px 2px rgba(255,255,255,0.3)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 26, flexShrink: 0,
                  filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
                }}>{g.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>{g.name}</div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{g.desc}</div>
                </div>
                {g.adminOnly && !hasControl && (
                  <span style={{ fontSize: 8, color: "rgba(255,215,0,0.6)", fontWeight: 700 }}>{"\u{1F512}"} Admin</span>
                )}
                {canStart && (
                  <span style={{ fontSize: 10, color: "#00ffff", fontWeight: 700 }}>{g.adminOnly ? "Start" : "Play"} {"\u25B6"}</span>
                )}
              </button>
            );
          })}
        </div>

        <button onClick={onClose} style={{
          marginTop: 16, background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: "'Poppins','Inter',sans-serif",
        }}>Close</button>
      </div>
    </div>
  );
}

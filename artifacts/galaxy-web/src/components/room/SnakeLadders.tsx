import React, { useState, useEffect } from "react";
import { ref, onValue, off, update, get } from "firebase/database";
import { db } from "../../lib/firebase";
import { cleanName } from "./types";
import { playGameStart, playTurnSound, playWinSound, playDiceSound } from "./gameSounds";

const PLAYER_COLORS = ["#a78bfa", "#22d3ee", "#f472b6", "#facc15"];
const PLAYER_GLOW = ["rgba(167,139,250,0.7)", "rgba(34,211,238,0.7)", "rgba(244,114,182,0.7)", "rgba(250,204,21,0.7)"];
const DICE_FACES: Record<number, string> = { 1: "\u2680", 2: "\u2681", 3: "\u2682", 4: "\u2683", 5: "\u2684", 6: "\u2685" };

const SNAKES: Record<number, number> = {
  17: 7, 54: 34, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 99: 78,
};
const LADDERS: Record<number, number> = {
  4: 14, 9: 31, 20: 38, 28: 84, 40: 59, 51: 67, 63: 81, 71: 91,
};

interface SLPlayer { uid: string; name: string; pos: number; colorIdx: number; }
interface SLState {
  started: boolean;
  players: Record<string, SLPlayer>;
  turnOrder: string[];
  turnUid: string;
  dice: number;
  diceRolled: boolean;
  winner: string | null;
  lastEvent: string;
}

interface Props {
  roomId: string; userId: string; username: string; hasControl: boolean; onClose: () => void;
}

const cellXY = (n: number): [number, number] => {
  const idx = n - 1;
  const row = 9 - Math.floor(idx / 10);
  const col = (Math.floor(idx / 10) % 2 === 0) ? (idx % 10) : (9 - (idx % 10));
  return [col, row];
};

export default function SnakeLadders({ roomId, userId, username: _username, hasControl, onClose }: Props) {
  const [game, setGame] = useState<SLState | null>(null);
  const [rolling, setRolling] = useState(false);
  const [_moveAnim, setMoveAnim] = useState<{ uid: string; from: number; to: number; via?: "snake" | "ladder" } | null>(null);

  const gameRef = ref(db, `roomGames/${roomId}/snake`);

  useEffect(() => {
    const handler = onValue(gameRef, snap => {
      if (!snap.exists()) { setGame(null); return; }
      setGame(snap.val());
    });
    return () => off(gameRef, "value", handler);
  }, [roomId]);

  const startGame = async () => {
    const snap = await get(ref(db, `rooms/${roomId}/roomUsers`));
    if (!snap.exists()) return;
    const users = snap.val();
    const uids = Object.keys(users).slice(0, 4);
    if (uids.length < 1) return;
    const players: Record<string, SLPlayer> = {};
    uids.forEach((uid, i) => {
      players[uid] = { uid, name: users[uid].name, pos: 0, colorIdx: i };
    });
    const state: SLState = {
      started: true, players, turnOrder: uids, turnUid: uids[0],
      dice: 1, diceRolled: false, winner: null, lastEvent: "",
    };
    await update(gameRef, state);
    playGameStart();
  };

  const roll = async () => {
    if (!game || rolling || game.turnUid !== userId || game.winner) return;
    setRolling(true);
    playDiceSound();
    const dice = 1 + Math.floor(Math.random() * 6);
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 60));
      await update(gameRef, { dice: 1 + Math.floor(Math.random() * 6) });
    }
    await update(gameRef, { dice, diceRolled: true });

    const me = game.players[userId];
    let newPos = me.pos + dice;
    let event = `\u{1F3B2} Rolled ${dice}`;
    let via: "snake" | "ladder" | undefined;
    if (newPos > 100) { newPos = me.pos; event = `\u{1F3B2} ${dice} (overshot, stayed)`; }
    else if (newPos === 100) { event = `\u{1F3B2} ${dice} \u2728 Reached 100!`; }
    else if (LADDERS[newPos]) { const to = LADDERS[newPos]; setMoveAnim({ uid: userId, from: me.pos, to, via: "ladder" }); event = `\u{1F3B2} ${dice} \u{1FA9C} Ladder ${newPos}\u2192${to}!`; newPos = to; via = "ladder"; }
    else if (SNAKES[newPos]) { const to = SNAKES[newPos]; setMoveAnim({ uid: userId, from: me.pos, to, via: "snake" }); event = `\u{1F3B2} ${dice} \u{1F40D} Snake ${newPos}\u2192${to}!`; newPos = to; via = "snake"; }

    if (!via) setMoveAnim({ uid: userId, from: me.pos, to: newPos });
    setTimeout(() => setMoveAnim(null), 1200);

    const winner = newPos >= 100 ? userId : null;
    const order = game.turnOrder;
    const idx = order.indexOf(userId);
    const nextUid = winner ? userId : order[(idx + 1) % order.length];
    const updates: Record<string, any> = {
      [`players/${userId}/pos`]: newPos,
      lastEvent: event,
      diceRolled: false,
      turnUid: nextUid,
    };
    if (winner) { updates.winner = winner; playWinSound(); }
    else playTurnSound();
    await new Promise(r => setTimeout(r, 700));
    await update(gameRef, updates);
    setRolling(false);
  };

  const isMyTurn = game?.turnUid === userId;
  const players = game ? Object.values(game.players) : [];
  const cellSize = 28;

  return (
    <div className="game-overlay" onClick={onClose}>
      <div className="game-card" onClick={e => e.stopPropagation()} style={{
        width: 340, padding: 16,
        background: "linear-gradient(160deg, #1A0F2E 0%, #0d0820 100%)",
        border: "1px solid rgba(108,92,231,0.45)",
        boxShadow: "0 0 30px rgba(108,92,231,0.4), 0 0 60px rgba(0,255,255,0.15)",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 900, color: "#fff" }}>{"\u{1F40D}"} Snake & Ladders</h3>
          <button onClick={onClose} style={{
            width: 26, height: 26, borderRadius: 13, background: "rgba(255,255,255,0.07)",
            border: "none", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 800,
          }}>{"\u00D7"}</button>
        </div>

        {!game?.started ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 60, marginBottom: 10, filter: "drop-shadow(0 0 16px rgba(108,92,231,0.7))" }}>
              {"\u{1F40D}"}{"\u{1FA9C}"}
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginBottom: 18, lineHeight: 1.5 }}>
              {hasControl ? "Climb the cosmic ladders, dodge the snakes! First to 100 wins." : "Waiting for host to start..."}
            </p>
            {hasControl && (
              <button onClick={startGame} style={{
                padding: "12px 24px", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #10b981, #06b6d4)",
                color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 0 20px rgba(16,185,129,0.4)",
              }}>{"\u{1F3AE}"} Start Game</button>
            )}
          </div>
        ) : (
          <>
            {/* Board */}
            <div style={{
              position: "relative",
              width: cellSize * 10, height: cellSize * 10, margin: "0 auto",
              background: "linear-gradient(135deg, #0d0820 0%, #1a0f2e 100%)",
              borderRadius: 12, border: "2px solid rgba(167,139,250,0.4)",
              boxShadow: "inset 0 0 20px rgba(108,92,231,0.25), 0 0 30px rgba(108,92,231,0.3)",
              overflow: "hidden",
            }}>
              {/* Cells */}
              {Array.from({ length: 100 }, (_, i) => {
                const n = 100 - i;
                const [cx, cy] = cellXY(n);
                const isLadderStart = !!LADDERS[n];
                const isSnakeStart = !!SNAKES[n];
                const isWin = n === 100;
                return (
                  <div key={n} style={{
                    position: "absolute",
                    left: cx * cellSize, top: cy * cellSize,
                    width: cellSize, height: cellSize,
                    border: "1px solid rgba(167,139,250,0.12)",
                    background: isWin
                      ? "radial-gradient(circle, rgba(250,204,21,0.45), rgba(250,204,21,0.1))"
                      : (n + Math.floor((100 - n) / 10)) % 2 === 0
                        ? "rgba(167,139,250,0.04)"
                        : "rgba(34,211,238,0.04)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 8, color: "rgba(255,255,255,0.35)", fontWeight: 700,
                    boxSizing: "border-box",
                  }}>
                    <span style={{ position: "absolute", top: 1, left: 2, fontSize: 7, lineHeight: 1 }}>{n}</span>
                    {isLadderStart && <span style={{ fontSize: 11 }}>{"\u{1FA9C}"}</span>}
                    {isSnakeStart && <span style={{ fontSize: 11 }}>{"\u{1F40D}"}</span>}
                    {isWin && <span style={{ fontSize: 14, filter: "drop-shadow(0 0 4px gold)" }}>{"\u{1F3C6}"}</span>}
                  </div>
                );
              })}

              {/* SVG overlay for ladders + snakes */}
              <svg width={cellSize * 10} height={cellSize * 10} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
                {Object.entries(LADDERS).map(([from, to]) => {
                  const [fx, fy] = cellXY(+from);
                  const [tx, ty] = cellXY(+to);
                  return (
                    <line key={`l${from}`}
                      x1={fx * cellSize + cellSize / 2} y1={fy * cellSize + cellSize / 2}
                      x2={tx * cellSize + cellSize / 2} y2={ty * cellSize + cellSize / 2}
                      stroke="url(#ladderGrad)" strokeWidth="3" strokeLinecap="round"
                      style={{ filter: "drop-shadow(0 0 4px rgba(34,211,238,0.6))" }}
                    />
                  );
                })}
                {Object.entries(SNAKES).map(([from, to]) => {
                  const [fx, fy] = cellXY(+from);
                  const [tx, ty] = cellXY(+to);
                  return (
                    <line key={`s${from}`}
                      x1={fx * cellSize + cellSize / 2} y1={fy * cellSize + cellSize / 2}
                      x2={tx * cellSize + cellSize / 2} y2={ty * cellSize + cellSize / 2}
                      stroke="url(#snakeGrad)" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 3"
                      style={{ filter: "drop-shadow(0 0 4px rgba(244,114,182,0.6))" }}
                    />
                  );
                })}
                <defs>
                  <linearGradient id="ladderGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                  <linearGradient id="snakeGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#f472b6" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Tokens */}
              {players.map((p, i) => {
                if (p.pos < 1) return null;
                const [cx, cy] = cellXY(p.pos);
                const samePos = players.filter(q => q.pos === p.pos);
                const offset = samePos.indexOf(p);
                const px = cx * cellSize + cellSize / 2 + (offset - (samePos.length - 1) / 2) * 5;
                const py = cy * cellSize + cellSize / 2 - 2;
                return (
                  <div key={p.uid} style={{
                    position: "absolute",
                    left: px - 7, top: py - 7,
                    width: 14, height: 14, borderRadius: 7,
                    background: `radial-gradient(circle at 30% 30%, ${PLAYER_COLORS[p.colorIdx]}, ${PLAYER_COLORS[p.colorIdx]}80)`,
                    border: "2px solid rgba(255,255,255,0.55)",
                    boxShadow: `0 0 8px ${PLAYER_GLOW[p.colorIdx]}`,
                    transition: "all 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                    zIndex: 10 + i,
                  }} />
                );
              })}
            </div>

            {/* Players row */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${players.length}, 1fr)`, gap: 6, marginTop: 12 }}>
              {players.map(p => (
                <div key={p.uid} style={{
                  padding: "6px 4px", borderRadius: 8,
                  background: game.turnUid === p.uid ? `rgba(167,139,250,0.18)` : "rgba(255,255,255,0.04)",
                  border: game.turnUid === p.uid ? `1px solid ${PLAYER_COLORS[p.colorIdx]}` : "1px solid rgba(255,255,255,0.08)",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: 9, color: PLAYER_COLORS[p.colorIdx], fontWeight: 800,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cleanName(p.name)}</div>
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#fff" }}>{p.pos}</div>
                </div>
              ))}
            </div>

            {/* Status */}
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <div className={rolling ? "dice-rolling" : ""} style={{
                width: 48, height: 48, borderRadius: 12,
                background: "linear-gradient(135deg, rgba(108,92,231,0.3), rgba(0,255,255,0.15))",
                border: "2px solid rgba(0,255,255,0.5)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 26, color: "#fff",
                boxShadow: "0 0 14px rgba(0,255,255,0.3)",
              }}>{DICE_FACES[game.dice] || "\u2680"}</div>
              {game.winner ? (
                <div style={{ flex: 1, fontSize: 12, fontWeight: 800, color: "#FFD700", textAlign: "left" }}>
                  {"\u{1F3C6}"} {cleanName(game.players[game.winner]?.name)} wins!
                </div>
              ) : (
                <button onClick={roll} disabled={!isMyTurn || rolling}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
                    background: isMyTurn ? "linear-gradient(135deg, #10b981, #06b6d4)" : "rgba(108,92,231,0.15)",
                    color: "#fff", fontSize: 13, fontWeight: 800,
                    fontFamily: "inherit",
                    cursor: isMyTurn && !rolling ? "pointer" : "not-allowed",
                    opacity: isMyTurn ? 1 : 0.45,
                    boxShadow: isMyTurn ? "0 0 14px rgba(16,185,129,0.5)" : "none",
                  }}>
                  {rolling ? "Rolling..." : isMyTurn ? "\u{1F3B2} Roll Dice" : `${cleanName(game.players[game.turnUid]?.name || "")}'s turn`}
                </button>
              )}
            </div>

            {game.lastEvent && (
              <div style={{
                marginTop: 8, padding: "6px 10px", borderRadius: 8,
                background: "rgba(0,255,255,0.06)", border: "1px solid rgba(0,255,255,0.18)",
                fontSize: 10, color: "#22d3ee", fontWeight: 600, textAlign: "center",
              }}>{game.lastEvent}</div>
            )}

            {hasControl && game.winner && (
              <button onClick={startGame} style={{
                marginTop: 10, width: "100%", padding: "10px 0", borderRadius: 12, border: "none",
                background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer",
                fontFamily: "inherit",
              }}>{"\u{1F504}"} Play Again</button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

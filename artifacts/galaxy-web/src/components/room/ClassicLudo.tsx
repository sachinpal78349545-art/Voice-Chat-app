import React, { useState, useEffect, useRef } from "react";
import { ref, onValue, off, update, set } from "firebase/database";
import { db } from "../../lib/firebase";
import { cleanName } from "./types";
import { playGameStart, playTurnSound, playWinSound, playDiceSound } from "./gameSounds";

// ─── CONSTANTS ──────────────────────────────────────────────
const C = 18; // cell size

// Traditional Ludo Colors
const PC = ["#E74C3C", "#2ECC71", "#F1C40F", "#3498DB"]; // Red, Green, Yellow, Blue
const PCDark = ["#C0392B", "#27AE60", "#F39C12", "#2980B9"];
const PLAYER_NAMES = ["Red", "Green", "Yellow", "Blue"];

// Path positions (row, col) on 15x15 grid – traditional Ludo path
const MAIN_PATH: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7], [0, 8],
  [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14], [8, 14],
  [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7], [14, 6],
  [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0], [6, 0],
];

// Home paths (6 steps each)
const HOME_PATHS: [number, number][][] = [
  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5], [7, 6]],
  [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]],
  [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9], [7, 8]],
  [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7], [8, 7]],
];

// Base spots (4 per color)
const BASE_SPOTS: [number, number][][] = [
  [[2, 2], [2, 3], [3, 2], [3, 3]],
  [[2, 11], [2, 12], [3, 11], [3, 12]],
  [[11, 11], [11, 12], [12, 11], [12, 12]],
  [[11, 2], [11, 3], [12, 2], [12, 3]],
];

const START_ABS = [0, 13, 26, 39]; // starting absolute positions
const SAFE_SET = new Set([0, 8, 13, 21, 26, 34, 39, 47]); // safe spots

// ─── Helper functions ──────────────────────────────────────
function absPos(ci: number, steps: number) {
  return (START_ABS[ci] + steps) % 52;
}

function tokenXY(ci: number, steps: number, ti: number): [number, number] {
  if (steps < 0) {
    const [r, c] = BASE_SPOTS[ci][ti];
    return [c * C + C / 2, r * C + C / 2];
  }
  if (steps >= 52) {
    const hi = Math.min(steps - 52, 5);
    const [r, c] = HOME_PATHS[ci][hi];
    return [c * C + C / 2, r * C + C / 2];
  }
  const a = absPos(ci, steps);
  const [r, c] = MAIN_PATH[a];
  return [c * C + C / 2, r * C + C / 2];
}

function isValidMove(p: any, dice: number, tokenIdx: number): boolean {
  const s = p.tokens[tokenIdx];
  if (s === 57) return false; // already home
  if (s < 0) return dice === 6; // can come out only on 6
  return s + dice <= 57; // cannot exceed home
}

function getValidMoves(p: any, dice: number): number[] {
  const valid: number[] = [];
  for (let i = 0; i < 4; i++) {
    if (isValidMove(p, dice, i)) valid.push(i);
  }
  return valid;
}

// ─── Types ──────────────────────────────────────────────────
interface PlayerData {
  name: string;
  colorIndex: number;
  tokens: number[];
}

interface GameData {
  phase: string; // "waiting" | "playing" | "finished"
  players: Record<string, PlayerData>;
  turnOrder?: string[];
  turnUid?: string;
  dice?: number;
  diceRolled?: boolean;
  winner?: string | null;
  lastAction?: string;
  entryFee?: number;
  prizePool?: number;
}

interface VoiceUser { uid: string; name: string; avatar?: string | null; }

interface Props {
  roomId: string;
  userId: string;
  username: string;
  hasControl: boolean;
  onClose: () => void;
  voiceUsers?: VoiceUser[];
  speakingUidsHash?: Set<number>;
  hashCode?: (s: string) => number;
}

// ─── Main Component ────────────────────────────────────────
export default function ClassicLudo({
  roomId, userId, username, hasControl, onClose,
  voiceUsers = [], speakingUidsHash, hashCode,
}: Props) {
  const [game, setGame] = useState<GameData | null>(null);
  const [rolling, setRolling] = useState(false);
  const [diceAnim, setDiceAnim] = useState(1);
  const [localDice, setLocalDice] = useState(0);
  const [selectable, setSelectable] = useState<number[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [entryFee, setEntryFee] = useState<number>(10); // default fee

  const gRef = ref(db, `roomGames/${roomId}/ludo`);

  // ── Subscribe to game ──
  useEffect(() => {
    const h = onValue(gRef, snap => {
      if (!snap.exists()) { setGame(null); return; }
      const d = snap.val() as GameData;
      // ensure tokens array
      if (d.players) {
        Object.values(d.players).forEach((p: any) => {
          if (!Array.isArray(p.tokens)) p.tokens = [-1, -1, -1, -1];
        });
      }
      if (d.turnOrder && !Array.isArray(d.turnOrder)) {
        d.turnOrder = Object.values(d.turnOrder);
      }
      setGame(d);
    });
    return () => off(gRef, "value", h);
  }, [roomId]);

  // ── Create Game ──
  const createGame = async () => {
    await set(gRef, {
      phase: "waiting",
      players: {
        [userId]: { name: username, colorIndex: 0, tokens: [-1, -1, -1, -1] },
      },
      entryFee: entryFee,
      prizePool: 0,
    });
    playGameStart();
  };

  // ── Join as a color ──
  const joinAsColor = async (colorIndex: number) => {
    if (!game) return;
    if (game.players[userId]) return;
    const taken = Object.values(game.players).map(p => p.colorIndex);
    if (taken.includes(colorIndex)) return;
    await update(ref(db, `roomGames/${roomId}/ludo/players/${userId}`), {
      name: username,
      colorIndex,
      tokens: [-1, -1, -1, -1],
    });
  };

  // ── Start Game ──
  const startPlaying = async () => {
    if (!game) return;
    const uids = Object.keys(game.players);
    if (uids.length < 2) return;
    // Fill remaining slots with bots (up to 4 players)
    const botNames = ["🤖 Bot1", "🤖 Bot2", "🤖 Bot3"];
    const currentPlayers = [...uids];
    let botIndex = 0;
    while (currentPlayers.length < 4) {
      const colorIndex = currentPlayers.length;
      const botUid = `bot_${Date.now()}_${colorIndex}`;
      currentPlayers.push(botUid);
      // Add bot to players
      game.players[botUid] = {
        name: botNames[botIndex % botNames.length],
        colorIndex,
        tokens: [-1, -1, -1, -1],
      };
      botIndex++;
    }

    // Calculate prize pool
    const fee = game.entryFee || 0;
    const prize = currentPlayers.length * fee;

    // Update game
    await update(gRef, {
      phase: "playing",
      turnOrder: currentPlayers,
      turnUid: currentPlayers[0],
      dice: 0,
      diceRolled: false,
      winner: null,
      lastAction: "Game started!",
      players: game.players,
      prizePool: prize,
    });
    playGameStart();
  };

  // ── Next Turn ──
  const nextTurn = async (bonus: boolean) => {
    if (!game?.turnOrder) return;
    if (bonus) {
      await update(gRef, { diceRolled: false, dice: 0 });
      playTurnSound();
    } else {
      const idx = game.turnOrder.indexOf(game.turnUid!);
      const next = (idx + 1) % game.turnOrder.length;
      await update(gRef, { turnUid: game.turnOrder[next], diceRolled: false, dice: 0 });
      playTurnSound();
    }
  };

  // ── Move Token ──
  const moveToken = async (ti: number) => {
    if (!game) return;
    const d = localDice;
    const me = game.players[userId];
    const oldS = me.tokens[ti];
    const newS = oldS < 0 ? 0 : oldS + d;
    const newTokens = [...me.tokens];
    newTokens[ti] = newS;
    setChoosing(false);
    setSelectable([]);

    const updates: Record<string, any> = {
      [`players/${userId}/tokens`]: newTokens,
    };
    let killed = false;
    let action = `${cleanName(username)} moved ${d} steps`;

    // Check for capture
    if (newS >= 0 && newS < 52) {
      const myAbs = absPos(me.colorIndex, newS);
      if (!SAFE_SET.has(myAbs)) {
        for (const [uid, player] of Object.entries(game.players)) {
          if (uid === userId) continue;
          for (let t = 0; t < 4; t++) {
            const ts = player.tokens[t];
            if (ts >= 0 && ts < 52 && absPos(player.colorIndex, ts) === myAbs) {
              const kt = [...player.tokens];
              kt[t] = -1;
              updates[`players/${uid}/tokens`] = kt;
              killed = true;
              action = `${cleanName(username)} captured ${cleanName(player.name)}!`;
            }
          }
        }
      }
    }

    const allHome = newTokens.every(s => s === 57);
    const gotHome = newS === 57 && oldS !== 57;
    if (allHome) {
      updates.winner = userId;
      updates.lastAction = `${cleanName(username)} won the game!`;
      playWinSound();
    } else {
      updates.lastAction = action;
    }

    await update(gRef, updates);
    if (!allHome) {
      // Bonus turn if killed, rolled 6, or got home
      await nextTurn(killed || d === 6 || gotHome);
    }
  };

  // ── Bot AI ──
  const botPlay = async (botUid: string) => {
    if (!game) return;
    const bot = game.players[botUid];
    if (!bot) return;

    // Roll dice
    await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
    const dice = Math.floor(Math.random() * 6) + 1;
    setDiceAnim(dice);
    setLocalDice(dice);
    await update(gRef, { dice, diceRolled: true });

    // Choose best move: prefer capture, then closest to home
    const valid = getValidMoves(bot, dice);
    if (valid.length === 0) {
      await update(gRef, { lastAction: `${bot.name} rolled ${dice} – no moves` });
      await new Promise(r => setTimeout(r, 400));
      await nextTurn(dice === 6);
      return;
    }

    // Heuristic: choose token that can capture or advance furthest
    let bestIdx = valid[0];
    let bestScore = -1;
    for (const idx of valid) {
      const s = bot.tokens[idx];
      let score = 0;
      if (s < 0) score = 0; // coming out is good
      else {
        score = s; // higher steps = closer to home
        // Bonus if landing on opponent
        const newS = s + dice;
        if (newS < 52 && !SAFE_SET.has(absPos(bot.colorIndex, newS))) {
          // check if any opponent token here
          for (const [uid, p] of Object.entries(game.players)) {
            if (uid === botUid) continue;
            for (let t = 0; t < 4; t++) {
              const ts = p.tokens[t];
              if (ts >= 0 && ts < 52 && absPos(p.colorIndex, ts) === absPos(bot.colorIndex, newS)) {
                score += 50; // capture bonus
              }
            }
          }
        }
        if (newS > 51) score += 10; // going home
      }
      if (score > bestScore) { bestScore = score; bestIdx = idx; }
    }

    // Execute move
    const d = dice;
    const ti = bestIdx;
    const me = bot;
    const oldS = me.tokens[ti];
    const newS = oldS < 0 ? 0 : oldS + d;
    const newTokens = [...me.tokens];
    newTokens[ti] = newS;

    const updates: Record<string, any> = {
      [`players/${botUid}/tokens`]: newTokens,
    };
    let killed = false;
    let action = `${bot.name} moved ${d} steps`;

    if (newS >= 0 && newS < 52) {
      const myAbs = absPos(me.colorIndex, newS);
      if (!SAFE_SET.has(myAbs)) {
        for (const [uid, player] of Object.entries(game.players)) {
          if (uid === botUid) continue;
          for (let t = 0; t < 4; t++) {
            const ts = player.tokens[t];
            if (ts >= 0 && ts < 52 && absPos(player.colorIndex, ts) === myAbs) {
              const kt = [...player.tokens];
              kt[t] = -1;
              updates[`players/${uid}/tokens`] = kt;
              killed = true;
              action = `${bot.name} captured ${cleanName(player.name)}!`;
            }
          }
        }
      }
    }

    const allHome = newTokens.every(s => s === 57);
    if (allHome) {
      updates.winner = botUid;
      updates.lastAction = `${bot.name} won the game!`;
      playWinSound();
    } else {
      updates.lastAction = action;
    }

    await update(gRef, updates);
    if (!allHome) {
      await nextTurn(killed || d === 6 || newS === 57);
    }
  };

  // ── Watch for bot turn ──
  useEffect(() => {
    if (!game) return;
    if (game.phase !== "playing") return;
    if (game.winner) return;
    if (!game.turnUid) return;
    if (game.diceRolled) return;
    if (game.turnUid === userId) return; // human turn

    // Check if turnUid is a bot
    const isBot = !game.players[game.turnUid]?.name?.startsWith("🤖") === false;
    const botName = game.players[game.turnUid]?.name || "";
    if (!botName.startsWith("🤖")) return;

    const timer = setTimeout(() => botPlay(game.turnUid!), 800 + Math.random() * 600);
    return () => clearTimeout(timer);
  }, [game, userId]);

  // ── Render ──────────────────────────────────────────────
  const isMyTurn = game?.turnUid === userId;
  const phase = game?.phase;
  const players = game?.players ? Object.entries(game.players) : [];
  const myColor = game?.players?.[userId]?.colorIndex;

  // ── Build Board SVG ──
  const boardEls: React.ReactNode[] = [];

  // 1. Draw base rectangles (homes)
  const basePositions: [number, number, number][] = [
    [0, 0, 0], [0, 9, 1], [9, 9, 2], [9, 0, 3]
  ];
  basePositions.forEach(([br, bc, ci]) => {
    const isJoinable = phase === "waiting" && !game?.players[userId] && !Object.values(game?.players || {}).some(p => p.colorIndex === ci);
    boardEls.push(
      <g key={`base${ci}`} onClick={() => isJoinable && joinAsColor(ci)} style={{ cursor: isJoinable ? "pointer" : "default" }}>
        <rect x={bc * C} y={br * C} width={6 * C} height={6 * C} rx={6} fill={PC[ci]} opacity={0.15} stroke={PC[ci]} strokeWidth={1} />
        <rect x={(bc + 1) * C} y={(br + 1) * C} width={4 * C} height={4 * C} rx={4} fill="#1a1a2e" stroke={PC[ci]} strokeWidth={0.5} />
        {BASE_SPOTS[ci].map(([sr, sc], si) => (
          <circle key={`bs${ci}${si}`} cx={sc * C + C/2} cy={sr * C + C/2} r={5} fill={PC[ci]} opacity={0.4} />
        ))}
        {isJoinable && (
          <text x={(bc + 3) * C} y={(br + 3) * C + 2} textAnchor="middle" dominantBaseline="middle" fontSize={6} fill="#fff" fontWeight="bold">+</text>
        )}
      </g>
    );
  });

  // 2. Draw path cells
  for (let r = 0; r < 15; r++) {
    for (let c = 0; c < 15; c++) {
      // skip home areas
      const inHome = (r >= 0 && r <= 5 && c >= 0 && c <= 5) ||
                     (r >= 0 && r <= 5 && c >= 9 && c <= 14) ||
                     (r >= 9 && r <= 14 && c >= 0 && c <= 5) ||
                     (r >= 9 && r <= 14 && c >= 9 && c <= 14);
      if (inHome) continue;
      // center
      if (r >= 6 && r <= 8 && c >= 6 && c <= 8) continue;
      // check if on main path
      const key = `${r},${c}`;
      const mainIdx = MAIN_PATH.findIndex(([pr, pc]) => pr === r && pc === c);
      const homeIdx = HOME_PATHS.findIndex(path => path.some(([pr, pc]) => pr === r && pc === c));
      let fill = "rgba(255,255,255,0.05)";
      let stroke = "rgba(255,255,255,0.1)";
      if (mainIdx !== -1) {
        const colorIdx = Math.floor(mainIdx / 13) % 4; // roughly map to color
        fill = PC[colorIdx] + "22";
        stroke = PC[colorIdx] + "44";
        // safe spots
        if (SAFE_SET.has(mainIdx)) {
          fill = "rgba(255,215,0,0.3)";
          stroke = "#FFD700";
        }
      } else if (homeIdx !== -1) {
        const ci = homeIdx;
        fill = PC[ci] + "33";
        stroke = PC[ci] + "66";
      }
      boardEls.push(
        <rect key={`c${key}`} x={c * C} y={r * C} width={C} height={C} fill={fill} stroke={stroke} strokeWidth={0.5} rx={2} />
      );
    }
  }

  // 3. Center triangle
  const cx = 7 * C + C/2, cy = 7 * C + C/2;
  const tri = [
    [6*C, 6*C, 6*C, 9*C, cx, cy],
    [6*C, 6*C, 9*C, 6*C, cx, cy],
    [9*C, 6*C, 9*C, 9*C, cx, cy],
    [6*C, 9*C, 9*C, 9*C, cx, cy]
  ];
  tri.forEach((pts, i) => {
    const [x1,y1,x2,y2,x3,y3] = pts;
    boardEls.push(
      <polygon key={`tri${i}`} points={`${x1},${y1} ${x2},${y2} ${x3},${y3}`} fill={PC[i] + "22"} stroke={PC[i]} strokeWidth={0.5} />
    );
  });
  boardEls.push(
    <circle key="center" cx={cx} cy={cy} r={12} fill="#1a1a2e" stroke="#FFD700" strokeWidth={1} />
  );
  boardEls.push(
    <text key="centerText" x={cx} y={cy+2} textAnchor="middle" dominantBaseline="middle" fontSize={5} fill="#FFD700" fontWeight="bold">★</text>
  );

  // 4. Draw tokens
  const tokenRender: { uid: string; ci: number; ti: number; x: number; y: number; steps: number }[] = [];
  if (game?.players) {
    for (const [uid, p] of Object.entries(game.players)) {
      for (let t = 0; t < 4; t++) {
        const [x, y] = tokenXY(p.colorIndex, p.tokens[t], t);
        tokenRender.push({ uid, ci: p.colorIndex, ti: t, x, y, steps: p.tokens[t] });
      }
    }
  }
  // Offset overlapping tokens
  const posGroups: Record<string, typeof tokenRender> = {};
  tokenRender.forEach(tp => {
    const k = `${Math.round(tp.x)},${Math.round(tp.y)}`;
    if (!posGroups[k]) posGroups[k] = [];
    posGroups[k].push(tp);
  });
  const tokens = tokenRender.map(tp => {
    const k = `${Math.round(tp.x)},${Math.round(tp.y)}`;
    const g = posGroups[k];
    const idx = g.indexOf(tp);
    const n = g.length;
    let ox = 0, oy = 0;
    if (n === 2) { ox = idx === 0 ? -3 : 3; }
    else if (n === 3) { ox = [-3, 3, 0][idx]; oy = [0, 0, -3][idx]; }
    else if (n >= 4) { ox = idx % 2 === 0 ? -3 : 3; oy = idx < 2 ? -3 : 3; }
    return { ...tp, rx: tp.x + ox, ry: tp.y + oy };
  });

  const tokenEls = tokens.map(tp => {
    const isSel = choosing && tp.uid === userId && selectable.includes(tp.ti);
    const rad = tp.steps === 57 ? 4 : 6;
    return (
      <g key={`tk${tp.uid}${tp.ti}`}
        onClick={() => isSel && moveToken(tp.ti)}
        style={{ cursor: isSel ? "pointer" : "default" }}>
        <circle cx={tp.rx} cy={tp.ry} r={rad} fill={PC[tp.ci]} stroke={isSel ? "#fff" : "rgba(0,0,0,0.5)"} strokeWidth={isSel ? 1.5 : 0.8} />
        {tp.steps === 57 && (
          <circle cx={tp.rx} cy={tp.ry} r={2} fill="#fff" />
        )}
        {isSel && (
          <circle cx={tp.rx} cy={tp.ry} r={rad+3} fill="none" stroke="#fff" strokeWidth={1} opacity={0.5} />
        )}
      </g>
    );
  });

  // ─── UI Controls ─────────────────────────────────────────
  const renderControls = () => {
    if (!game) {
      return hasControl ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "#fff" }}>Entry Fee: 💎</span>
            <input
              type="number"
              value={entryFee}
              onChange={(e) => setEntryFee(Math.max(0, Number(e.target.value)))}
              style={{ width: 50, padding: "4px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.2)", background: "transparent", color: "#fff", fontSize: 12 }}
            />
          </div>
          <button onClick={createGame} style={{
            width: "100%", padding: "10px 0", borderRadius: 12,
            background: "linear-gradient(90deg, #FFD700, #FFA500)",
            border: "none", color: "#000", fontWeight: 800, fontSize: 13,
            cursor: "pointer"
          }}>🚀 Create Ludo Game</button>
        </div>
      ) : (
        <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Waiting for host to create game...</p>
      );
    }

    if (game.phase === "waiting") {
      const canStart = hasControl && Object.keys(game.players).length >= 2;
      return (
        <div>
          {!game.players[userId] && Object.keys(game.players).length < 4 && (
            <p style={{ fontSize: 9, textAlign: "center", color: "#FFD700", marginBottom: 6 }}>
              Tap an empty color zone to join
            </p>
          )}
          {canStart && (
            <button onClick={startPlaying} style={{
              width: "100%", padding: "10px 0", borderRadius: 12,
              background: "linear-gradient(90deg, #2ECC71, #27AE60)",
              border: "none", color: "#fff", fontWeight: 800, fontSize: 13,
              cursor: "pointer"
            }}>
              🎯 Start Game ({Object.keys(game.players).length} players)
            </button>
          )}
          {!hasControl && (
            <p style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Waiting for host to start...</p>
          )}
        </div>
      );
    }

    if (game.winner) {
      const winnerName = game.players[game.winner]?.name || "Unknown";
      return (
        <div style={{ textAlign: "center", background: "rgba(255,215,0,0.08)", padding: 8, borderRadius: 10, border: "1px solid rgba(255,215,0,0.3)" }}>
          <span style={{ fontSize: 14, fontWeight: 900, color: "#FFD700" }}>🏆 {winnerName} Wins! 🏆</span>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>Prize: 💎 {game.prizePool || 0}</div>
          {hasControl && (
            <button onClick={createGame} style={{ marginTop: 6, padding: "4px 12px", borderRadius: 6, background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", fontSize: 10, cursor: "pointer" }}>🔄 New Game</button>
          )}
        </div>
      );
    }

    // Playing state
    const isBot = game.turnUid ? game.players[game.turnUid]?.name?.startsWith("🤖") : false;
    const isMyTurn = game.turnUid === userId;
    const dice = game.dice || 0;
    const diceRolled = game.diceRolled || false;

    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, background: "#1a1a2e",
          border: `2px solid ${myColor !== undefined ? PC[myColor] : "#666"}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, color: myColor !== undefined ? PC[myColor] : "#fff",
          flexShrink: 0
        }}>
          {diceRolled ? dice : "🎲"}
        </div>
        <div style={{ flex: 1 }}>
          {isMyTurn && !diceRolled ? (
            <button onClick={async () => {
              if (rolling) return;
              setRolling(true);
              playDiceSound();
              let cnt = 0;
              const iv = setInterval(() => { setDiceAnim(Math.floor(Math.random()*6)+1); cnt++; if (cnt>=8) clearInterval(iv); }, 80);
              await new Promise(r => setTimeout(r, 700));
              clearInterval(iv);
              const diceVal = Math.floor(Math.random() * 6) + 1;
              setDiceAnim(diceVal);
              setLocalDice(diceVal);
              setRolling(false);
              await update(gRef, { dice: diceVal, diceRolled: true });
              const me = game.players[userId];
              const valid = getValidMoves(me, diceVal);
              if (valid.length === 0) {
                await update(gRef, { lastAction: `Rolled ${diceVal} – no moves` });
                setTimeout(() => nextTurn(diceVal === 6), 800);
              } else if (valid.length === 1) {
                setLocalDice(diceVal);
                await moveToken(valid[0]);
              } else {
                setSelectable(valid);
                setChoosing(true);
              }
            }} disabled={rolling} style={{
              width: "100%", padding: "10px 0", borderRadius: 12,
              background: "linear-gradient(90deg, #FFD700, #F39C12)",
              border: "none", color: "#000", fontWeight: 800, fontSize: 13,
              cursor: rolling ? "not-allowed" : "pointer", opacity: rolling ? 0.6 : 1
            }}>{rolling ? "Rolling..." : "🎲 Roll Dice"}</button>
          ) : isMyTurn && diceRolled && choosing ? (
            <div style={{ padding: "10px", borderRadius: 10, background: "rgba(255,255,255,0.05)", border: "1px solid #FFD700", textAlign: "center", fontSize: 12, color: "#FFD700" }}>
              Select a token to move
            </div>
          ) : isMyTurn && diceRolled && !choosing ? (
            <div style={{ padding: "10px", borderRadius: 10, background: "rgba(255,255,255,0.02)", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
              Processing...
            </div>
          ) : (
            <div style={{ padding: "10px", borderRadius: 10, background: "rgba(255,255,255,0.02)", textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              {isBot ? "🤖 Bot thinking..." : "Waiting for opponent..."}
            </div>
          )}
          {game.lastAction && (
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", textAlign: "center", marginTop: 4 }}>
              {game.lastAction}
            </div>
          )}
        </div>
      </div>
    );
  };

  // ─── Render Full UI ──────────────────────────────────────
  return (
    <div style={{
      background: "linear-gradient(160deg, #0b051f 0%, #030107 100%)",
      borderRadius: 20,
      padding: 12,
      border: "1px solid rgba(255,255,255,0.05)",
      maxWidth: 400,
      margin: "0 auto",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", letterSpacing: 0.5 }}>🎲 Ludo</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: "#FFD700" }}>💎 {game?.prizePool || 0}</span>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "4px 8px", color: "rgba(255,255,255,0.5)", fontSize: 10, cursor: "pointer" }}>✕</button>
        </div>
      </div>

      {/* Board */}
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: 280,
        margin: "0 auto 8px auto",
        aspectRatio: "1 / 1",
        background: "#1a1a2e",
        borderRadius: 12,
        padding: 4,
        border: "1px solid rgba(255,255,255,0.05)",
      }}>
        <svg viewBox={`0 0 ${15 * C} ${15 * C}`} style={{ width: "100%", height: "100%", display: "block" }}>
          <rect width={15 * C} height={15 * C} fill="#1a1a2e" />
          {boardEls}
          {tokenEls}
        </svg>
      </div>

      {/* Players */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", marginBottom: 8 }}>
        {players.map(([uid, p]) => {
          const homeCount = p.tokens.filter(t => t === 57).length;
          const isTurn = game?.turnUid === uid;
          return (
            <div key={uid} style={{
              display: "flex", alignItems: "center", gap: 3,
              padding: "2px 6px", borderRadius: 10,
              background: isTurn ? "rgba(255,255,255,0.08)" : "transparent",
              border: `1px solid ${isTurn ? PC[p.colorIndex] : "transparent"}`,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: PC[p.colorIndex] }} />
              <span style={{ fontSize: 9, color: isTurn ? "#fff" : "rgba(255,255,255,0.5)" }}>
                {p.name.startsWith("🤖") ? p.name : cleanName(p.name)}
              </span>
              <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>{homeCount}/4</span>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{ marginTop: "auto" }}>
        {renderControls()}
      </div>
    </div>
  );
}
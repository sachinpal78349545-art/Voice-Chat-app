import React, { useState, useEffect } from "react";
import { ref, push, set, onValue, off } from "firebase/database";
import { db } from "../../lib/firebase";
import { cleanName } from "./types";
import { playDiceSound } from "./gameSounds";

interface DiceRoll {
  id: string;
  userId: string;
  username: string;
  dice1: number;
  dice2: number;
  total: number;
  timestamp: number;
}

interface DiceGameProps {
  roomId: string;
  userId: string;
  username: string;
  onClose: () => void;
}

export default function DiceGame({ roomId, userId, username, onClose }: DiceGameProps) {
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [history, setHistory] = useState<DiceRoll[]>([]);

  useEffect(() => {
    const r = ref(db, `roomGames/${roomId}/dice`);
    const handler = onValue(r, snap => {
      if (!snap.exists()) { setHistory([]); return; }
      const val = snap.val();
      const rolls: DiceRoll[] = Object.keys(val).map(k => ({ ...val[k], id: k }));
      rolls.sort((a, b) => b.timestamp - a.timestamp);
      setHistory(rolls.slice(0, 20));

      if (rolls.length > 0) {
        const latest = rolls[0];
        setDice1(latest.dice1);
        setDice2(latest.dice2);
        if (latest.userId !== userId) {
          setLastResult(`${cleanName(latest.username)} rolled ${latest.dice1} + ${latest.dice2} = ${latest.total}`);
        }
      }
    });
    return () => off(r, "value", handler);
  }, [roomId]);

  const rollDice = async () => {
    if (rolling) return;
    setRolling(true);
    setLastResult(null);
    playDiceSound();

    let rollCount = 0;
    const interval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
      rollCount++;
      if (rollCount >= 10) clearInterval(interval);
    }, 80);

    await new Promise(res => setTimeout(res, 900));
    clearInterval(interval);

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    setDice1(d1);
    setDice2(d2);
    setRolling(false);

    const total = d1 + d2;
    setLastResult(`You rolled ${d1} + ${d2} = ${total}!`);

    const rollRef = push(ref(db, `roomGames/${roomId}/dice`));
    await set(rollRef, {
      userId,
      username,
      dice1: d1,
      dice2: d2,
      total,
      timestamp: Date.now(),
    });
  };

  const DICE_DOTS: Record<number, string> = {
    1: "\u2680", 2: "\u2681", 3: "\u2682", 4: "\u2683", 5: "\u2684", 6: "\u2685",
  };

  return (
    <div className="game-overlay" onClick={onClose}>
      <div className="game-card" onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 4 }}>
          {"\u{1F3B2}"} Dice Roll
        </h3>
        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
          Roll the dice! Everyone sees your result live
        </p>

        <div className="dice-container">
          <div className={`dice-face ${rolling ? "dice-rolling" : ""}`}>
            {DICE_DOTS[dice1] || dice1}
          </div>
          <div className={`dice-face ${rolling ? "dice-rolling" : ""}`}>
            {DICE_DOTS[dice2] || dice2}
          </div>
        </div>

        {lastResult && (
          <div className="dice-result">{lastResult}</div>
        )}

        <button
          onClick={rollDice}
          disabled={rolling}
          style={{
            marginTop: 16, width: "100%", padding: "12px 0",
            borderRadius: 14, border: "none", cursor: rolling ? "not-allowed" : "pointer",
            background: rolling ? "rgba(108,92,231,0.2)" : "linear-gradient(135deg, #bf00ff, #00e6e6)",
            color: "#fff", fontSize: 14, fontWeight: 800,
            fontFamily: "'Poppins', 'Inter', sans-serif",
            boxShadow: rolling ? "none" : "0 0 20px rgba(191,0,255,0.3)",
          }}
        >
          {rolling ? "Rolling..." : "\u{1F3B2} Roll Dice!"}
        </button>

        {history.length > 0 && (
          <div className="game-history">
            <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 4, fontWeight: 700 }}>Recent Rolls</p>
            {history.map(h => (
              <div key={h.id} className="game-history-item">
                {cleanName(h.username)}: {DICE_DOTS[h.dice1]}{DICE_DOTS[h.dice2]} = {h.total}
              </div>
            ))}
          </div>
        )}

        <button onClick={onClose} style={{
          marginTop: 12, background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: "'Poppins', 'Inter', sans-serif",
        }}>Close</button>
      </div>
    </div>
  );
}

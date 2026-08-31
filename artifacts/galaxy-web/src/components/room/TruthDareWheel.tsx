import React, { useState, useEffect, useRef } from "react";
import { ref, onValue, off, update } from "firebase/database";
import { db } from "../../lib/firebase";
import { cleanName } from "./types";
import { playGameStart, playSpinSound, playSpinStop } from "./gameSounds";

interface TodState {
  started: boolean;
  spinning: boolean;
  result: string | null;
  targetUser: string | null;
  targetName: string | null;
  type: "truth" | "dare" | null;
  history: { user: string; type: string; task: string; ts: number }[];
}

interface TruthDareWheelProps {
  roomId: string;
  userId: string;
  username: string;
  hasControl: boolean;
  roomUsers: { uid: string; name: string }[];
  onClose: () => void;
}

const TRUTHS = [
  "What's the most embarrassing song on your playlist?",
  "What's the last lie you told?",
  "Have you ever pretended to like a gift?",
  "What's your biggest fear?",
  "What's the weirdest dream you've had?",
  "Have you ever had a crush on a friend?",
  "What's the longest you've gone without showering?",
  "What's a secret talent you have?",
  "Have you ever stalked someone on social media?",
  "What's the most childish thing you still do?",
  "What's your guilty pleasure?",
  "Have you ever blamed someone else for something you did?",
];

const DARES = [
  "Sing a song for 30 seconds on mic!",
  "Talk in a funny accent for 2 minutes!",
  "Tell a joke right now!",
  "Make an animal sound on mic!",
  "Say a tongue twister 3 times fast!",
  "Give a compliment to everyone in the room!",
  "Do your best impression of a celebrity!",
  "Speak only in questions for 1 minute!",
  "Tell your most embarrassing story!",
  "Rap about the room topic for 15 seconds!",
  "Make up a poem about the person next to you!",
  "Whisper everything you say for 2 minutes!",
];

const WHEEL_SEGMENTS = ["Truth", "Dare", "Truth", "Dare", "Truth", "Dare", "Truth", "Dare"];
const SEGMENT_COLORS = ["#bf00ff", "#00e6e6", "#bf00ff", "#00e6e6", "#bf00ff", "#00e6e6", "#bf00ff", "#00e6e6"];

export default function TruthDareWheel({ roomId, userId, username, hasControl, roomUsers, onClose }: TruthDareWheelProps) {
  const [game, setGame] = useState<TodState | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const spinRef = useRef<NodeJS.Timeout | null>(null);

  const gameRef = ref(db, `roomGames/${roomId}/tod`);

  useEffect(() => {
    const handler = onValue(gameRef, snap => {
      if (!snap.exists()) { setGame(null); return; }
      const data = snap.val();
      setGame(data);
      if (data.result && data.targetName) {
        setNotification(`${data.targetName}: ${data.type === "truth" ? "\u{1F4AC}" : "\u26A1"} ${data.result}`);
        setTimeout(() => setNotification(null), 5000);
      }
    });
    return () => off(gameRef, "value", handler);
  }, [roomId]);

  const startGame = async () => {
    await update(gameRef, {
      started: true, spinning: false, result: null,
      targetUser: null, targetName: null, type: null, history: [],
    });
    playGameStart();
  };

  const spin = async () => {
    if (isSpinning) return;
    setIsSpinning(true);

    const totalRotation = 1440 + Math.random() * 720;
    const segIndex = Math.floor((totalRotation % 360) / (360 / WHEEL_SEGMENTS.length));
    const type = WHEEL_SEGMENTS[segIndex] === "Truth" ? "truth" : "dare";

    const eligible = roomUsers.length > 0 ? roomUsers : [{ uid: userId, name: username }];
    const target = eligible[Math.floor(Math.random() * eligible.length)];

    const task = type === "truth"
      ? TRUTHS[Math.floor(Math.random() * TRUTHS.length)]
      : DARES[Math.floor(Math.random() * DARES.length)];

    let currentSpeed = 50;
    let currentRot = rotation;
    const targetRot = rotation + totalRotation;

    const tickInterval = setInterval(() => {
      playSpinSound();
    }, 150);

    const animate = () => {
      const progress = (currentRot - rotation) / totalRotation;
      const eased = 1 - Math.pow(1 - progress, 3);
      currentSpeed = 5 + (50 - 5) * (1 - eased);
      currentRot += currentSpeed * 0.3;

      if (currentRot >= targetRot) {
        setRotation(targetRot % 360);
        clearInterval(tickInterval);
        setIsSpinning(false);
        playSpinStop();

        update(gameRef, {
          spinning: false, result: task,
          targetUser: target.uid, targetName: cleanName(target.name),
          type,
          history: [...((game?.history || []).slice(-9)), {
            user: cleanName(target.name), type, task, ts: Date.now(),
          }],
        });
        return;
      }

      setRotation(currentRot % 360);
      spinRef.current = setTimeout(animate, 16);
    };

    await update(gameRef, { spinning: true });
    animate();
  };

  const history = game?.history || [];

  return (
    <div className="game-overlay" onClick={onClose}>
      <div className="game-card" style={{ width: 320 }} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontSize: 18, fontWeight: 900, color: "#fff", marginBottom: 4 }}>
          {"\u{1F3A1}"} Truth or Dare
        </h3>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
          Spin the wheel! A random player gets truth or dare
        </p>

        {!game?.started ? (
          <div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
              {hasControl ? "Start Truth or Dare!" : "Waiting for host..."}
            </p>
            {hasControl && (
              <button onClick={startGame} style={{
                width: "100%", padding: "12px 0", borderRadius: 14, border: "none",
                background: "linear-gradient(135deg, #bf00ff, #00e6e6)",
                color: "#fff", fontSize: 14, fontWeight: 800, cursor: "pointer",
                fontFamily: "'Poppins','Inter',sans-serif",
                boxShadow: "0 0 20px rgba(191,0,255,0.3)",
              }}>
                {"\u{1F3A1}"} Start Game!
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto 16px" }}>
              <svg width="180" height="180" viewBox="0 0 180 180" style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? "none" : "transform 0.3s ease",
              }}>
                {WHEEL_SEGMENTS.map((seg, i) => {
                  const angle = (i * 360) / WHEEL_SEGMENTS.length;
                  const nextAngle = ((i + 1) * 360) / WHEEL_SEGMENTS.length;
                  const startRad = (angle - 90) * (Math.PI / 180);
                  const endRad = (nextAngle - 90) * (Math.PI / 180);
                  const x1 = 90 + 80 * Math.cos(startRad);
                  const y1 = 90 + 80 * Math.sin(startRad);
                  const x2 = 90 + 80 * Math.cos(endRad);
                  const y2 = 90 + 80 * Math.sin(endRad);
                  const midRad = ((angle + nextAngle) / 2 - 90) * (Math.PI / 180);
                  const tx = 90 + 50 * Math.cos(midRad);
                  const ty = 90 + 50 * Math.sin(midRad);
                  return (
                    <g key={i}>
                      <path
                        d={`M90,90 L${x1},${y1} A80,80 0 0,1 ${x2},${y2} Z`}
                        fill={SEGMENT_COLORS[i]}
                        opacity={0.7}
                        stroke="rgba(255,255,255,0.2)"
                        strokeWidth="1"
                      />
                      <text
                        x={tx} y={ty}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="#fff" fontSize="10" fontWeight="800"
                        transform={`rotate(${(angle + nextAngle) / 2}, ${tx}, ${ty})`}
                      >{seg}</text>
                    </g>
                  );
                })}
                <circle cx="90" cy="90" r="22" fill="#0d0820" stroke="rgba(255,215,0,0.5)" strokeWidth="2" />
                {/* Spin-the-bottle in room center */}
                <g transform="translate(90,90)">
                  <ellipse cx="0" cy="0" rx="6" ry="14" fill="url(#bottleBody)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                  <rect x="-2.5" y="-22" width="5" height="10" rx="1.5" fill="#1f2937" stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
                  <rect x="-2" y="-23" width="4" height="2" rx="0.5" fill="#facc15" />
                  <ellipse cx="-1.5" cy="-2" rx="1" ry="3" fill="rgba(255,255,255,0.4)" />
                </g>
                <defs>
                  <linearGradient id="bottleBody" x1="-1" y1="-1" x2="1" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#7c3aed" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{
                position: "absolute", top: -4, left: "50%", transform: "translateX(-50%)",
                width: 0, height: 0,
                borderLeft: "8px solid transparent", borderRight: "8px solid transparent",
                borderTop: "14px solid #FFD700",
                filter: "drop-shadow(0 0 4px rgba(255,215,0,0.6))",
              }} />
            </div>

            {notification && (
              <div style={{
                padding: "10px 14px", borderRadius: 12, marginBottom: 12,
                background: game?.type === "truth" ? "rgba(191,0,255,0.15)" : "rgba(0,230,230,0.15)",
                border: `1px solid ${game?.type === "truth" ? "rgba(191,0,255,0.5)" : "rgba(0,230,230,0.5)"}`,
                boxShadow: `0 0 20px ${game?.type === "truth" ? "rgba(191,0,255,0.2)" : "rgba(0,230,230,0.2)"}`,
                animation: "chatFadeIn 0.3s ease",
              }}>
                <div style={{ fontSize: 11, fontWeight: 900, color: game?.type === "truth" ? "#bf00ff" : "#00ffff", marginBottom: 4 }}>
                  {game?.type === "truth" ? "\u{1F4AC} TRUTH" : "\u26A1 DARE"} for {game?.targetName}
                </div>
                <div style={{ fontSize: 12, color: "#fff", fontWeight: 600, lineHeight: 1.4 }}>
                  {game?.result}
                </div>
              </div>
            )}

            {hasControl ? (
              <button
                onClick={spin}
                disabled={isSpinning}
                style={{
                  width: "100%", padding: "10px 0", borderRadius: 14, border: "none",
                  cursor: isSpinning ? "not-allowed" : "pointer",
                  background: isSpinning ? "rgba(108,92,231,0.2)" : "linear-gradient(135deg, #bf00ff, #00e6e6)",
                  color: "#fff", fontSize: 13, fontWeight: 800,
                  fontFamily: "'Poppins','Inter',sans-serif",
                }}
              >
                {isSpinning ? "Spinning..." : "\u{1F3A1} Spin!"}
              </button>
            ) : (
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 600 }}>
                Only host/admin can spin the wheel
              </p>
            )}

            {history.length > 0 && (
              <div className="game-history" style={{ marginTop: 12 }}>
                <p style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 4, fontWeight: 700 }}>History</p>
                {history.slice().reverse().map((h, i) => (
                  <div key={i} className="game-history-item" style={{ textAlign: "left" }}>
                    <span style={{ color: h.type === "truth" ? "#bf00ff" : "#00ffff", fontWeight: 700 }}>
                      {h.type === "truth" ? "\u{1F4AC}" : "\u26A1"}
                    </span>{" "}
                    {h.user}: {h.task.length > 40 ? h.task.slice(0, 40) + "..." : h.task}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <button onClick={onClose} style={{
          marginTop: 12, background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.3)", fontSize: 12, fontFamily: "'Poppins','Inter',sans-serif",
        }}>Close</button>
      </div>
    </div>
  );
}

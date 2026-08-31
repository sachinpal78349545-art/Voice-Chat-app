/**
 * OfficialHostTasks – Daily task panel shown to Official Hosts
 * Opens as a full-screen overlay from ProfilePage
 */
import React, { useState, useEffect } from "react";
import { ref, get, set, update } from "firebase/database";
import { db } from "../lib/firebase";

interface HostTask {
  id: string;
  title: string;
  icon: string;
  description: string;
  target: number;
  unit: string;
  reward: number;
}

const HOST_TASKS: HostTask[] = [
  { id: "oh_gift_daily",   title: "Daily Gifting Target", icon: "🎁", description: "Send gifts worth 500+ coins today", target: 500, unit: "coins",   reward: 200 },
  { id: "oh_room_time",    title: "Host a Room",           icon: "🎤", description: "Spend 60 min in a voice room",      target: 60,  unit: "minutes", reward: 150 },
  { id: "oh_welcome",      title: "Welcome Users",         icon: "👋", description: "Invite 2 users to join today",      target: 2,   unit: "users",   reward: 100 },
  { id: "oh_login",        title: "Daily Check-in",        icon: "✅", description: "Log in every day consistently",     target: 1,   unit: "day",     reward: 50  },
];

interface TaskProgress {
  progress: number;
  completed: boolean;
  claimed: boolean;
}

interface Props {
  uid: string;
  onClose: () => void;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export default function OfficialHostTasks({ uid, onClose }: Props) {
  const [tasks, setTasks] = useState<Record<string, TaskProgress>>({});
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const date = todayKey();
  const basePath = `officialHostTasks/${uid}/${date}`;

  useEffect(() => {
    const loadTasks = async () => {
      try {
        const snap = await get(ref(db, basePath));
        if (snap.exists()) {
          setTasks(snap.val());
        } else {
          // Init today's tasks
          const init: Record<string, TaskProgress> = {};
          for (const t of HOST_TASKS) {
            init[t.id] = { progress: t.id === "oh_login" ? 1 : 0, completed: t.id === "oh_login", claimed: false };
          }
          await set(ref(db, basePath), init);
          setTasks(init);
        }
      } catch { /* demo mode — no tasks */ }
      setLoading(false);
    };
    loadTasks();
  }, [uid]);

  async function claimReward(task: HostTask) {
    const t = tasks[task.id];
    if (!t?.completed || t?.claimed) return;
    setClaiming(task.id);
    try {
      await update(ref(db, `${basePath}/${task.id}`), { claimed: true });
      // Add coins reward
      const coinsRef = ref(db, `users/${uid}/coins`);
      const snap = await get(coinsRef);
      await set(coinsRef, (snap.val() || 0) + task.reward);
      setTasks(prev => ({ ...prev, [task.id]: { ...prev[task.id], claimed: true } }));
    } catch { /* demo */ }
    setClaiming(null);
  }

  const totalReward  = HOST_TASKS.reduce((s, t) => s + t.reward, 0);
  const earnedReward = HOST_TASKS.reduce((s, t) => {
    const p = tasks[t.id];
    return p?.claimed ? s + t.reward : s;
  }, 0);
  const allCompleted = HOST_TASKS.every(t => tasks[t.id]?.completed);
  const allClaimed   = HOST_TASKS.every(t => tasks[t.id]?.claimed);

  return (
    <div style={{
      position: "fixed", inset: 0, background: "linear-gradient(180deg, #0d0826 0%, #0a0515 100%)",
      zIndex: 9999, display: "flex", flexDirection: "column", fontFamily: "inherit",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #1a0a32 0%, #0d0826 100%)",
        borderBottom: "1px solid rgba(255,215,0,0.2)",
        padding: "16px 20px", flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            background: "linear-gradient(135deg, #FFD700, #FFA500)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
            boxShadow: "0 0 16px rgba(255,215,0,0.5)",
          }}>👑</div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 900, color: "#FFD700", margin: 0, lineHeight: 1.2 }}>Host Daily Tasks</h1>
            <p style={{ fontSize: 11, color: "rgba(255,215,0,0.5)", margin: 0 }}>{date} · Reset at midnight</p>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: "rgba(255,255,255,0.08)", border: "none", cursor: "pointer",
          width: 36, height: 36, borderRadius: "50%", fontSize: 18, color: "rgba(255,255,255,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✕</button>
      </div>

      {/* Earnings Bar */}
      <div style={{
        margin: "16px 20px 0", background: "rgba(255,215,0,0.08)",
        border: "1px solid rgba(255,215,0,0.2)", borderRadius: 16,
        padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <p style={{ fontSize: 11, color: "rgba(255,215,0,0.5)", margin: 0 }}>Today's Rewards</p>
          <p style={{ fontSize: 18, fontWeight: 900, color: "#FFD700", margin: 0 }}>
            🪙 {earnedReward} / {totalReward}
          </p>
        </div>
        {allClaimed ? (
          <div style={{ background: "rgba(0,230,118,0.15)", border: "1px solid rgba(0,230,118,0.3)", borderRadius: 999, padding: "4px 14px", color: "#00e676", fontSize: 12, fontWeight: 700 }}>✅ All Done!</div>
        ) : allCompleted ? (
          <div style={{ background: "rgba(255,215,0,0.15)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 999, padding: "4px 14px", color: "#FFD700", fontSize: 12, fontWeight: 700 }}>🏆 Claim Rewards!</div>
        ) : (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{HOST_TASKS.filter(t => tasks[t.id]?.completed).length}/{HOST_TASKS.length} done</div>
        )}
      </div>

      {/* Tasks List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 200 }}>
            <div style={{ color: "rgba(255,215,0,0.5)", fontSize: 14 }}>Loading tasks...</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {HOST_TASKS.map(task => {
              const p = tasks[task.id] || { progress: 0, completed: false, claimed: false };
              const pct = Math.min(100, (p.progress / task.target) * 100);
              return (
                <div key={task.id} style={{
                  background: p.claimed
                    ? "rgba(0,230,118,0.06)"
                    : p.completed
                    ? "rgba(255,215,0,0.08)"
                    : "rgba(255,255,255,0.04)",
                  border: p.claimed
                    ? "1px solid rgba(0,230,118,0.25)"
                    : p.completed
                    ? "1px solid rgba(255,215,0,0.3)"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16, padding: "14px 16px",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{
                      width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                      background: p.claimed ? "rgba(0,230,118,0.2)" : p.completed ? "rgba(255,215,0,0.2)" : "rgba(255,255,255,0.08)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                    }}>{p.claimed ? "✅" : task.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: p.claimed ? "#00e676" : p.completed ? "#FFD700" : "rgba(255,255,255,0.9)", margin: 0 }}>
                          {task.title}
                        </p>
                        <span style={{ fontSize: 11, color: "#FFD700", fontWeight: 700 }}>+🪙{task.reward}</span>
                      </div>
                      <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: "2px 0 0" }}>{task.description}</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      background: p.claimed ? "#00e676" : p.completed ? "#FFD700" : "linear-gradient(90deg, #FFD700, #FFA500)",
                      width: `${pct}%`, transition: "width 0.5s ease",
                    }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
                      {p.progress}/{task.target} {task.unit}
                    </span>
                    {p.completed && !p.claimed && (
                      <button
                        onClick={() => claimReward(task)}
                        disabled={claiming === task.id}
                        style={{
                          background: "linear-gradient(90deg, #FFD700, #FFA500)",
                          border: "none", cursor: "pointer", borderRadius: 999,
                          padding: "4px 16px", fontSize: 11, fontWeight: 800, color: "#1a0a00",
                          opacity: claiming === task.id ? 0.6 : 1,
                        }}
                      >
                        {claiming === task.id ? "Claiming..." : "Claim 🪙"}
                      </button>
                    )}
                    {p.claimed && (
                      <span style={{ fontSize: 11, color: "#00e676", fontWeight: 700 }}>Claimed ✓</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info Banner */}
        <div style={{
          marginTop: 20, background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.15)",
          borderRadius: 12, padding: "12px 14px",
        }}>
          <p style={{ fontSize: 12, color: "rgba(255,215,0,0.6)", margin: 0, lineHeight: 1.6 }}>
            👑 <strong style={{ color: "#FFD700" }}>Official Host Responsibilities</strong>
            <br />• Host rooms regularly and keep users engaged
            <br />• Gift active users to encourage participation
            <br />• Welcome new members warmly
            <br />• Maintain positive and respectful environment
            <br />• Complete daily tasks to earn bonus coins
          </p>
        </div>
      </div>
    </div>
  );
}

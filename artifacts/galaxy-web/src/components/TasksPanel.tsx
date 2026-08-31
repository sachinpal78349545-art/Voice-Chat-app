import { useState, useCallback } from "react";
import { UserProfile, claimDailyReward } from "../lib/userService";

interface TasksPanelProps {
  user: UserProfile;
  onClose?: () => void;
  onUpdate?: (user: UserProfile) => void;
}

const DAILY_TASKS = [
  { id: 1, title: "Play five rounds of Ludo", progress: "0/5", reward: "x5", type: "diamond" },
  { id: 2, title: "Take the mic for 15 mins", progress: "0/15", reward: "x10", type: "diamond" },
  { id: 3, title: "Received 3 diamond gifts", progress: "0/3", reward: "x1", type: "rose" },
  { id: 4, title: "Play 5 rounds of Truth or Dare", progress: "0/5", reward: "x5", type: "diamond" },
  { id: 5, title: "Like a post in moments", progress: "0/1", reward: "x1", type: "rose" },
];

export default function TasksPanel({ user, onClose, onUpdate }: TasksPanelProps) {
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const daily = user.dailyReward || { lastClaimed: 0, streak: 0 };
  const lastDate = new Date(daily.lastClaimed).toDateString();
  const today = new Date().toDateString();
  const canClaim = lastDate !== today;
  const streak = daily.streak || 0;

  const handleClaim = useCallback(async () => {
    if (!canClaim || claiming) return;
    setClaiming(true);
    try {
      const result = await claimDailyReward(user.uid, user);
      if (result) {
        setClaimSuccess(true);
        if (onUpdate) onUpdate({ ...user, dailyReward: { lastClaimed: Date.now(), streak: result.streak } });
        setTimeout(() => setClaimSuccess(false), 3000);
      }
    } catch {
      /* ignore */
    } finally {
      setClaiming(false);
    }
  }, [canClaim, claiming, user, onUpdate]);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 3000,
      background: "linear-gradient(180deg, #120826 0%, #0d0926 100%)",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "env(safe-area-inset-top, 12px) 20px 14px 20px",
        paddingTop: "max(env(safe-area-inset-top, 0px), 12px)",
        borderBottom: "1px solid rgba(162,155,254,0.1)",
        flexShrink: 0,
        background: "rgba(18,8,38,0.95)",
      }}>
        <button
          onClick={onClose}
          style={{
            background: "rgba(255,255,255,0.08)", border: "none",
            color: "#a29bfe", width: 38, height: 38, borderRadius: "50%",
            cursor: "pointer", fontSize: 18, display: "flex",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}
        >
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: "#fff", flex: 1 }}>
          Tasks & Rewards
        </h2>
        <span style={{ fontSize: 22 }}>🏆</span>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px 120px 16px" }}>
        {/* Daily Login Rewards Card */}
        <div style={{
          background: "linear-gradient(135deg,#2e1a47,#1c143c)", borderRadius: 20, padding: 20,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          border: "1px solid rgba(162,155,254,0.15)", marginBottom: 28,
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}>
          <div>
            <h3 style={{ margin: "0 0 4px 0", fontSize: 18, fontWeight: 900, color: "#fff" }}>Daily Rewards</h3>
            <p style={{ margin: 0, fontSize: 12, color: canClaim ? "#f1c40f" : "rgba(162,155,254,0.7)" }}>
              {claimSuccess
                ? "Claimed! 🎉 Come back tomorrow"
                : canClaim
                ? "Reward ready — claim now! 🎁"
                : `Day ${streak} streak — come back tomorrow`}
            </p>
          </div>
          <button
            onClick={() => setShowDailyModal(true)}
            style={{
              background: canClaim ? "linear-gradient(90deg,#f1c40f,#f39c12)" : "rgba(255,255,255,0.08)",
              color: canClaim ? "#000" : "rgba(255,255,255,0.4)",
              border: "none", borderRadius: 20, padding: "10px 20px",
              fontWeight: 800, fontSize: 13, cursor: "pointer",
              boxShadow: canClaim ? "0 0 14px rgba(241,196,15,0.4)" : "none",
            }}
          >
            {canClaim ? "Claim" : `Day ${streak}`}
          </button>
        </div>

        {/* Daily Tasks section */}
        <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 14, color: "#fff" }}>Daily Tasks</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {DAILY_TASKS.map(task => (
            <div key={task.id} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: 18, padding: "14px 16px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 46, height: 46, background: "rgba(108,92,231,0.15)",
                  borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
                }}>
                  {task.type === "diamond" ? "🎲" : "🌹"}
                </div>
                <div>
                  <p style={{ margin: "0 0 3px 0", fontSize: 14, fontWeight: 700, color: "#fff" }}>{task.title}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>{task.progress}</span>
                    <span style={{ fontSize: 12, color: task.type === "diamond" ? "#60a5fa" : "#f43f5e" }}>
                      {task.type === "diamond" ? "💎" : "🌹"} {task.reward}
                    </span>
                  </div>
                </div>
              </div>
              <button style={{
                background: "#6c5ce7", color: "#fff", border: "none",
                borderRadius: 16, padding: "8px 18px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>Go</button>
            </div>
          ))}
        </div>
      </div>

      {/* 7-Day Streak Modal */}
      {showDailyModal && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 4000,
            background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          }}
          onClick={() => setShowDailyModal(false)}
        >
          <div
            style={{
              background: "linear-gradient(180deg,#322361,#150f2e)",
              width: "100%", maxWidth: 360, borderRadius: 28, padding: 24,
              border: "1px solid rgba(162,155,254,0.2)", boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
              position: "relative",
            }}
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setShowDailyModal(false)} style={{
              position: "absolute", top: 16, right: 16,
              background: "rgba(255,255,255,0.1)", border: "none", color: "#fff",
              width: 32, height: 32, borderRadius: "50%", cursor: "pointer", fontSize: 16,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>✕</button>

            <h3 style={{ textAlign: "center", color: "#f1c40f", fontSize: 22, fontWeight: 900, margin: "8px 0 4px 0" }}>
              Daily Rewards 🏆
            </h3>
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: 12, margin: "0 0 18px 0" }}>
              {streak > 0 ? `Current streak: ${streak} day${streak !== 1 ? "s" : ""} 🔥` : "Start your streak today!"}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 300, overflowY: "auto", paddingRight: 4 }}>
              {[1,2,3,4,5,6,7].map(day => {
                const done = day <= streak;
                const isToday = day === (streak + 1) && canClaim;
                return (
                  <div key={day} style={{
                    background: done ? "rgba(46,204,113,0.1)" : isToday ? "rgba(108,92,231,0.15)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${done ? "rgba(46,204,113,0.3)" : isToday ? "rgba(108,92,231,0.4)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 14, padding: "11px 14px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: done ? "#2ecc71" : isToday ? "#a29bfe" : "rgba(255,255,255,0.25)" }}>
                        {done ? "✓" : isToday ? "◆" : "◦"}
                      </span>
                      <span style={{ fontWeight: 700, fontSize: 13, color: done ? "rgba(255,255,255,0.5)" : "#fff" }}>
                        Day {day}
                      </span>
                    </div>
                    <span style={{ fontSize: 16 }}>{done ? "✅" : isToday ? "🎁" : "🎁"}</span>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleClaim}
              disabled={!canClaim || claiming}
              style={{
                width: "100%", marginTop: 18,
                background: canClaim ? "linear-gradient(90deg,#f1c40f,#f39c12)" : "rgba(255,255,255,0.08)",
                color: canClaim ? "#111" : "rgba(255,255,255,0.3)",
                border: "none", borderRadius: 22, padding: "14px 0",
                fontWeight: 800, fontSize: 15, cursor: canClaim ? "pointer" : "default",
                boxShadow: canClaim ? "0 0 16px rgba(241,196,15,0.4)" : "none",
                transition: "all 0.2s",
              }}
            >
              {claiming ? "Claiming..." : claimSuccess ? "Claimed! 🎉" : canClaim ? `Claim Day ${streak + 1} Reward` : "Already claimed today ✓"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// src/pages/UserLevelPage.tsx – Fully functional, NO bottom navigation
import React, { useState, useEffect } from "react";
import { useToast } from "../lib/toastContext";
import { getUser, addCoins, addTransaction, setUserLevelXP } from "../lib/userService";
import { sendLevelUpReward } from "./ChatsPage";

interface UserProfile {
  id?: string | number;
  nickname?: string;
  avatar?: string;
  level?: number;
  wealthLevel?: number;
  charmLevel?: number;
  uid?: string;
  coins?: number;
  xp?: number;
  wealthXp?: number;
  charmXp?: number;
}

interface UserLevelPageProps {
  user: UserProfile;
  onBack: () => void;
  onUpdate?: (updatedUser: UserProfile) => void;
}

interface MedalInsigniaNode {
  tierDisplayNumber: string;
  badgeGraphicIcon: string;
  customHexBackground: string;
  borderStyleToken?: string;
}

interface VisualThemeConfig {
  primaryHexColor: string;
  headerSolidBackground: string;
  tabSelectionFill: string;
  badgeContainerBg: string;
  accentTitleColor: string;
  subtleInfoLabel: string;
  topLimitDescription: string;
  maximumXpLevelCap: number;
  currentXpLiveBalance: number;
  currentLevelNumeric: number;
  percentagePositionAngle: number;
  iconToneOverlay: string;
  medalsArray: MedalInsigniaNode[];
}

// 🎖️ Active Tab Tiers Matrix
const ACTIVE_SPEED_MEDALS: MedalInsigniaNode[] = [
  { tierDisplayNumber: "1", badgeGraphicIcon: "⚡", customHexBackground: "#9CA3AF" },
  { tierDisplayNumber: "6", badgeGraphicIcon: "⚡", customHexBackground: "#D97706" },
  { tierDisplayNumber: "11", badgeGraphicIcon: "⚡", customHexBackground: "#3B82F6" },
  { tierDisplayNumber: "21", badgeGraphicIcon: "⚡", customHexBackground: "#8B5CF6" },
  { tierDisplayNumber: "31", badgeGraphicIcon: "⚡", customHexBackground: "#EF4444" },
  { tierDisplayNumber: "41", badgeGraphicIcon: "⚡", customHexBackground: "#EC4899" },
  { tierDisplayNumber: "51", badgeGraphicIcon: "⚡", customHexBackground: "#FBBF24" },
  { tierDisplayNumber: "61", badgeGraphicIcon: "⚡", customHexBackground: "#10B981" },
  { tierDisplayNumber: "71", badgeGraphicIcon: "⚡", customHexBackground: "#F97316" },
  { tierDisplayNumber: "81", badgeGraphicIcon: "⚡", customHexBackground: "#84CC16" },
  { tierDisplayNumber: "91", badgeGraphicIcon: "⚡", customHexBackground: "#06B6D4" }
];

// 💎 Wealth Tab Premium Shields Matrix
const WEALTH_GOLDEN_MEDALS: MedalInsigniaNode[] = [
  { tierDisplayNumber: "1", badgeGraphicIcon: "⬡", customHexBackground: "linear-gradient(135deg, #7E7E8A, #4A4A5A)", borderStyleToken: "1px solid #A1A1B0" },
  { tierDisplayNumber: "6", badgeGraphicIcon: "⬢", customHexBackground: "linear-gradient(135deg, #B46A25, #783E0F)", borderStyleToken: "1px solid #E28739" },
  { tierDisplayNumber: "11", badgeGraphicIcon: "🔷", customHexBackground: "linear-gradient(135deg, #1E62D4, #0F3D91)", borderStyleToken: "1px solid #4D90FF" },
  { tierDisplayNumber: "21", badgeGraphicIcon: "🔱", customHexBackground: "linear-gradient(135deg, #7C3AED, #4C1D95)", borderStyleToken: "1px solid #A78BFA" },
  { tierDisplayNumber: "31", badgeGraphicIcon: "💥", customHexBackground: "linear-gradient(135deg, #DC2626, #7F1D1D)", borderStyleToken: "1px solid #F87171" },
  { tierDisplayNumber: "41", badgeGraphicIcon: "🌟", customHexBackground: "linear-gradient(135deg, #DB2777, #701A75)", borderStyleToken: "1px solid #F472B6" },
  { tierDisplayNumber: "51", badgeGraphicIcon: "👑", customHexBackground: "linear-gradient(135deg, #D97706, #783E0F)", borderStyleToken: "2px solid #FBBF24" },
  { tierDisplayNumber: "61", badgeGraphicIcon: "🛡️", customHexBackground: "linear-gradient(135deg, #2563EB, #1E3A8A)", borderStyleToken: "2px solid #60A5FA" },
  { tierDisplayNumber: "71", badgeGraphicIcon: "🦅", customHexBackground: "linear-gradient(135deg, #EA580C, #7C2D12)", borderStyleToken: "2px solid #FB923C" },
  { tierDisplayNumber: "81", badgeGraphicIcon: "🔮", customHexBackground: "linear-gradient(135deg, #9333EA, #581C87)", borderStyleToken: "2px solid #C084FC" },
  { tierDisplayNumber: "91", badgeGraphicIcon: "🌌", customHexBackground: "linear-gradient(135deg, #111827, #311042)", borderStyleToken: "2px solid #D8B4FE" }
];

// 🌹 Charm Tab Floral Matrix
const CHARM_FLORAL_MEDALS: MedalInsigniaNode[] = [
  { tierDisplayNumber: "1", badgeGraphicIcon: "🍃", customHexBackground: "linear-gradient(135deg, #5B616A, #374151)", borderStyleToken: "1px solid #9CA3AF" },
  { tierDisplayNumber: "6", badgeGraphicIcon: "🍂", customHexBackground: "linear-gradient(135deg, #845E42, #451A03)", borderStyleToken: "1px solid #B45309" },
  { tierDisplayNumber: "11", badgeGraphicIcon: "🌿", customHexBackground: "linear-gradient(135deg, #15803D, #14532D)", borderStyleToken: "1px solid #4ADE80" },
  { tierDisplayNumber: "21", badgeGraphicIcon: "🌹", customHexBackground: "linear-gradient(135deg, #BE123C, #4C0519)", borderStyleToken: "1px solid #FB7185" },
  { tierDisplayNumber: "31", badgeGraphicIcon: "💮", customHexBackground: "linear-gradient(135deg, #E11D48, #4C0519)", borderStyleToken: "1px solid #FDA4AF" },
  { tierDisplayNumber: "41", badgeGraphicIcon: "🌺", customHexBackground: "linear-gradient(135deg, #D946EF, #4A044E)", borderStyleToken: "1px solid #F472B6" },
  { tierDisplayNumber: "51", badgeGraphicIcon: "🌷", customHexBackground: "linear-gradient(135deg, #EC4899, #50072B)", borderStyleToken: "2px solid #FBCFE8" },
  { tierDisplayNumber: "61", badgeGraphicIcon: "💙", customHexBackground: "linear-gradient(135deg, #0284C7, #0C4A6E)", borderStyleToken: "2px solid #38BDF8" },
  { tierDisplayNumber: "71", badgeGraphicIcon: "💖", customHexBackground: "linear-gradient(135deg, #F43F5E, #4C0519)", borderStyleToken: "2px solid #FECDD3" },
  { tierDisplayNumber: "81", badgeGraphicIcon: "🌻", customHexBackground: "linear-gradient(135deg, #EAB308, #422006)", borderStyleToken: "2px solid #FEF08A" },
  { tierDisplayNumber: "91", badgeGraphicIcon: "👑", customHexBackground: "linear-gradient(135deg, #A855F7, #3B0764)", borderStyleToken: "2px solid #E9D5FF" }
];

const NATIVE_SPEC_THEME_MATRIX: Record<"active" | "wealth" | "charm", VisualThemeConfig> = {
  active: {
    primaryHexColor: "#4F46E5",
    headerSolidBackground: "#5151F5",
    tabSelectionFill: "#FFFFFF",
    badgeContainerBg: "rgba(255, 255, 255, 0.25)",
    accentTitleColor: "#5151F5",
    subtleInfoLabel: "Active Progress Tier",
    topLimitDescription: "Today's upper limit: 2,300 Exp",
    maximumXpLevelCap: 2400,
    currentXpLiveBalance: 213,
    currentLevelNumeric: 5,
    percentagePositionAngle: 9,
    iconToneOverlay: "rgba(81, 81, 245, 0.08)",
    medalsArray: ACTIVE_SPEED_MEDALS
  },
  wealth: {
    primaryHexColor: "#D97706",
    headerSolidBackground: "linear-gradient(180deg, #FF993A 0%, #FF7300 100%)",
    tabSelectionFill: "#FFFFFF",
    badgeContainerBg: "rgba(255, 255, 255, 0.25)",
    accentTitleColor: "#FF7300",
    subtleInfoLabel: "Wealth Investment Tier",
    topLimitDescription: "Unlimited Growth Potential",
    maximumXpLevelCap: 4000,
    currentXpLiveBalance: 487,
    currentLevelNumeric: 4,
    percentagePositionAngle: 12,
    iconToneOverlay: "rgba(255, 115, 0, 0.08)",
    medalsArray: WEALTH_GOLDEN_MEDALS
  },
  charm: {
    primaryHexColor: "#DB2777",
    headerSolidBackground: "linear-gradient(180deg, #E63BE0 0%, #B811B1 100%)",
    tabSelectionFill: "#FFFFFF",
    badgeContainerBg: "rgba(255, 255, 255, 0.25)",
    accentTitleColor: "#B811B1",
    subtleInfoLabel: "Charm Social Influence",
    topLimitDescription: "Ecosystem Star Velocity",
    maximumXpLevelCap: 500,
    currentXpLiveBalance: 322,
    currentLevelNumeric: 1,
    percentagePositionAngle: 64,
    iconToneOverlay: "rgba(230, 59, 224, 0.08)",
    medalsArray: CHARM_FLORAL_MEDALS
  }
};

const SYSTEM_PRESTIGE_PERKS = [
  { perkUniqueId: 1, perkEmojiIcon: "🏅", perkHeadline: "Level medal", unlockRequirementText: "Lv.0" },
  { perkUniqueId: 2, perkEmojiIcon: "👁️", perkHeadline: "Unlimited Moments View", unlockRequirementText: "Lv.1" },
  { perkUniqueId: 3, perkEmojiIcon: "📋", perkHeadline: "Unlimited Visitor List", unlockRequirementText: "Lv.1" },
  { perkUniqueId: 4, perkEmojiIcon: "📅", perkHeadline: "Create event", unlockRequirementText: "Lv.5" },
  { perkUniqueId: 5, perkEmojiIcon: "👑", perkHeadline: "Avatar frame", unlockRequirementText: "Lv.21" },
  { perkUniqueId: 6, perkEmojiIcon: "⭐", perkHeadline: "Personal badge", unlockRequirementText: "Lv.21" },
  { perkUniqueId: 7, perkEmojiIcon: "🛡️", perkHeadline: "Preventing following into room", unlockRequirementText: "Lv.21" },
  { perkUniqueId: 8, perkEmojiIcon: "💬", perkHeadline: "Only friend can chat", unlockRequirementText: "Lv.31" },
  { perkUniqueId: 9, perkEmojiIcon: "📢", perkHeadline: "Worldwide broadcast", unlockRequirementText: "Lv.51" }
];

const UserLevelPage: React.FC<UserLevelPageProps> = ({ user, onBack, onUpdate }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [localUser, setLocalUser] = useState<any>(user);
  const [activeTab, setActiveTab] = useState<"active" | "wealth" | "charm">("active");
  const [diamondSpendToday, setDiamondSpendToday] = useState(0);
  const [timeInRoomToday, setTimeInRoomToday] = useState(0);
  const [messagesSentToday, setMessagesSentToday] = useState(0);

  useEffect(() => {
    const today = new Date().toDateString();
    const loadDaily = (key: string) => {
      const stored = localStorage.getItem(`${key}_${localUser.uid}_${today}`);
      return stored ? parseInt(stored) : 0;
    };
    setDiamondSpendToday(loadDaily("diamondSpend"));
    setTimeInRoomToday(loadDaily("timeInRoom"));
    setMessagesSentToday(loadDaily("messagesSent"));
  }, [localUser.uid]);

  const saveDailyLimit = (key: string, value: number) => {
    const today = new Date().toDateString();
    localStorage.setItem(`${key}_${localUser.uid}_${today}`, value.toString());
  };

  const refreshUser = async () => {
    if (!localUser.uid) return;
    const fresh = await getUser(localUser.uid);
    if (fresh) {
      setLocalUser(fresh);
      if (onUpdate) onUpdate(fresh);
    }
  };

  const getCurrentStats = () => {
    if (activeTab === "active") return { level: localUser.level || 1, xp: localUser.xp || 0 };
    if (activeTab === "wealth") return { level: localUser.wealthLevel || 1, xp: localUser.wealthXp || 0 };
    return { level: localUser.charmLevel || 1, xp: localUser.charmXp || 0 };
  };

  const getXPForLevel = (level: number): number => {
    if (activeTab === "wealth") return 500 * level;
    if (activeTab === "charm") return 400 * level;
    return 250 * level;
  };

  const addXP = async (amount: number, source: string) => {
    if (amount <= 0) return;
    setLoading(source);
    try {
      let { level, xp } = getCurrentStats();
      let newXP = xp + amount;
      let newLevel = level;
      let leveledUp = false;
      let required = getXPForLevel(newLevel);
      while (newXP >= required && newLevel < 100) {
        newXP -= required;
        newLevel++;
        leveledUp = true;
        required = getXPForLevel(newLevel);
      }
      await setUserLevelXP(localUser.uid, newLevel, newXP, activeTab);
      await addTransaction(localUser.uid, {
        type: "xp_reward",
        amount: amount,
        description: `${activeTab.toUpperCase()} (${source}): +${amount} XP`,
      });
      await refreshUser();
      showToast(`+${amount} XP earned!`, "success", "✨");
      if (leveledUp) {
        showToast(`🎉 Level Up! Level ${newLevel} reached! 🎉`, "success", "🏆");
        await sendLevelUpReward(localUser.uid, newLevel, 100);
        await refreshUser();
      }
    } catch (err) {
      showToast("Failed to add XP", "error");
    } finally {
      setLoading(null);
    }
  };

  const handleDiamondBuy = async () => {
    if (loading) return;
    const cost = 10;
    if ((localUser.coins || 0) < cost) { showToast(`Need ${cost} diamonds`, "warning"); return; }
    if (diamondSpendToday >= 2000) { showToast("Daily diamond limit reached", "warning"); return; }
    setLoading("diamond");
    try {
      await addCoins(localUser.uid, -cost);
      await addXP(10, "Diamond cost");
      const newVal = diamondSpendToday + 10;
      setDiamondSpendToday(newVal);
      saveDailyLimit("diamondSpend", newVal);
    } catch { showToast("Purchase failed", "error"); }
    finally { setLoading(null); }
  };

  const handleStayInRoom = async () => {
    if (loading) return;
    if (timeInRoomToday >= 200) { showToast("Daily stay limit reached", "warning"); return; }
    await addXP(10, "Stay in room");
    const newVal = timeInRoomToday + 10;
    setTimeInRoomToday(newVal);
    saveDailyLimit("timeInRoom", newVal);
  };

  const handleSendMessage = async () => {
    if (loading) return;
    if (messagesSentToday >= 50) { showToast("Daily message limit reached", "warning"); return; }
    await addXP(10, "Send Messages");
    const newVal = messagesSentToday + 1;
    setMessagesSentToday(newVal);
    saveDailyLimit("messagesSent", newVal);
  };

  const currentStats = getCurrentStats();
  const currentLevel = currentStats.level;
  const currentXP = currentStats.xp;
  const nextLevelXP = getXPForLevel(currentLevel);
  const percent = (currentXP / nextLevelXP) * 100;
  const nativeConfig = NATIVE_SPEC_THEME_MATRIX[activeTab];
  const displayConfig = {
    ...nativeConfig,
    currentLevelNumeric: currentLevel,
    currentXpLiveBalance: currentXP,
    maximumXpLevelCap: nextLevelXP,
    percentagePositionAngle: Math.round(percent),
  };
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percent / 100) * circumference;

  return (
    <div style={{ background: "#F8F9FC", height: "100vh", width: "100%", maxWidth: 430, margin: "0 auto", display: "flex", flexDirection: "column", overflow: "hidden", color: "#1F2937", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 24, paddingBottom: 12, paddingLeft: 16, paddingRight: 16, background: "#0E0E26", borderBottom: "1px solid rgba(255,255,255,0.08)", height: 44 }}>
        <button onClick={onBack} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>‹</button>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>User Level</div>
        <div style={{ width: 24 }} />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: 20 }}>
        {/* Hero plate */}
        <div style={{ background: nativeConfig.headerSolidBackground, padding: "24px 20px", borderBottomLeftRadius: 36, borderBottomRightRadius: 36, color: "#fff", transition: "background 0.35s" }}>
          <div style={{ position: "relative", width: 150, height: 150, margin: "0 auto 12px" }}>
            <svg width="150" height="150" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="50" cy="50" r={radius} fill="transparent" stroke="rgba(255,255,255,0.2)" strokeWidth="4" />
              <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#fff" strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.5s" }} />
            </svg>
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 86, height: 86, borderRadius: "50%", border: "3px solid #fff", overflow: "hidden", background: "#f3f4f6" }}>
              <img src={localUser.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
            <div style={{ position: "absolute", bottom: -4, left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg, #FFD043, #FFAE00)", color: "#633B00", fontSize: 11, fontWeight: 800, padding: "2px 15px", borderRadius: 20 }}>Lv.{displayConfig.currentLevelNumeric}</div>
            <div style={{ position: "absolute", top: "32%", left: "-10px", background: "rgba(255,255,255,0.35)", fontSize: 10, padding: "2px 6px", borderRadius: 10 }}>{displayConfig.percentagePositionAngle}%</div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, fontSize: 15, fontWeight: 600 }}>
            <span>{displayConfig.currentXpLiveBalance}/{displayConfig.maximumXpLevelCap}</span>
            <span>Next: Lv.{displayConfig.currentLevelNumeric + 1}</span>
          </div>
          <div style={{ display: "flex", background: "rgba(0,0,0,0.12)", padding: 4, borderRadius: 24, marginTop: 22 }}>
            {(["active", "wealth", "charm"] as const).map(mode => (
              <button key={mode} onClick={() => setActiveTab(mode)} style={{ flex: 1, padding: "11px 0", borderRadius: 20, background: activeTab === mode ? "rgba(255,255,255,0.9)" : "transparent", color: activeTab === mode ? "#000" : "rgba(255,255,255,0.65)", fontSize: 13, fontWeight: activeTab === mode ? 700 : 500, cursor: "pointer", border: "none" }}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)} Level
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div style={{ padding: "16px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Ways to Level Up */}
          <div style={{ background: "#fff", borderRadius: 24, padding: "20px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Ways to Level Up</div>
              <div style={{ fontSize: 11, color: "#9CA3AF" }}>{activeTab === "active" ? "Today's limit: 2,300 Exp" : activeTab === "wealth" ? "Unlimited" : "Gift based"}</div>
            </div>
            {activeTab === "active" ? (
              <>
                <div style={{ borderBottom: "1px solid #f3f4f6", paddingBottom: 14, marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600, color: "#374151" }}>
                    <span>💎 Diamond cost</span>
                    <span style={{ color: "#9CA3AF" }}>{diamondSpendToday}/2,000</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>1 diamond = 1 XP</div>
                  <button onClick={handleDiamondBuy} disabled={loading === "diamond"} style={{ marginTop: 8, background: "#4F46E5", border: "none", color: "#fff", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{loading === "diamond" ? "..." : "Use"}</button>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600, color: "#374151" }}>
                    <span>🛋️ Stay in room</span>
                    <span style={{ color: "#9CA3AF" }}>{timeInRoomToday}/200</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>10 mins = 10 XP</div>
                  <button onClick={handleStayInRoom} disabled={loading === "stay"} style={{ marginTop: 8, background: "#10B981", border: "none", color: "#fff", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{loading === "stay" ? "..." : "Earn"}</button>
                </div>
                <div style={{ marginTop: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600, color: "#374151" }}>
                    <span>💬 Send Messages to Friends</span>
                    <span style={{ color: "#9CA3AF" }}>{messagesSentToday}/50</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>1 message = 10 XP</div>
                  <button onClick={handleSendMessage} disabled={loading === "message"} style={{ marginTop: 8, background: "#F59E0B", border: "none", color: "#fff", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{loading === "message" ? "..." : "Send"}</button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "20px" }}>
                <div style={{ fontSize: 13.5, color: "#4B5563", marginBottom: 14 }}>
                  {activeTab === "wealth" ? "Receive points by recharging diamonds." : "Receive gifts in live streams to grow charm."}
                </div>
                <button style={{ color: nativeConfig.accentTitleColor, fontWeight: 700 }} onClick={() => showToast("Coming soon", "info")}>Recharge ›</button>
              </div>
            )}
          </div>

          {/* Level Up Rewards */}
          <div style={{ background: "#fff", borderRadius: 24, padding: "20px 18px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Level Up Rewards</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "24px 12px", textAlign: "center" }}>
              {SYSTEM_PRESTIGE_PERKS.map(perk => {
                const reqLevel = parseInt(perk.unlockRequirementText.replace("Lv.", ""));
                const unlocked = currentLevel >= reqLevel;
                return (
                  <div key={perk.perkUniqueId}>
                    <div style={{ width: 48, height: 48, borderRadius: "50%", background: unlocked ? "rgba(79,70,229,0.1)" : "#F8F9FA", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, border: unlocked ? `1.5px solid ${nativeConfig.primaryHexColor}` : "1px solid #F1F3F5", filter: unlocked ? "none" : "grayscale(100%)", opacity: unlocked ? 1 : 0.55 }}>{perk.perkEmojiIcon}</div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: "#2D3748", marginTop: 8 }}>{perk.perkHeadline}</div>
                    <div style={{ fontSize: 10.5, color: unlocked ? "#10B981" : "#A0AEC0", marginTop: 4 }}>{perk.unlockRequirementText}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Level Medal Matrix */}
          <div style={{ background: "#fff", borderRadius: 24, padding: "20px 18px" }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Level Medal Matrix</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
              {nativeConfig.medalsArray.map((badge, idx) => (
                <div key={idx} style={{ background: badge.customHexBackground, border: badge.borderStyleToken || "none", borderRadius: 12, padding: "6px 0", textAlign: "center", color: "#fff", boxShadow: "0 2px 6px rgba(0,0,0,0.06)" }}>
                  <span style={{ fontSize: 14 }}>{badge.badgeGraphicIcon}</span>
                  <div style={{ fontSize: 10, fontWeight: 800 }}>{badge.tierDisplayNumber}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserLevelPage;
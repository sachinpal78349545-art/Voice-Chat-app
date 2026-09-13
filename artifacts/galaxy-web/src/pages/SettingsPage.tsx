// SettingsPage.tsx – Admin‑connected Privacy Policy & Terms of Service (LIGHT THEME)
import React, { useState, useEffect } from "react";
import { UserProfile } from "../lib/userService";
import { getCurrentLanguage } from "../lib/i18n";
import {
  deviceBanUser,
  shadowBanUser,
  removeShadowBan,
  getUserByUserId,
  unbanUser,
  updateUser,
  setUserLevelXP,
  transferAccountData,
  createVipUserId,
  addCustomBadge,
  removeCustomBadge,
} from "../lib/userService";
import { sendMassDM } from "../lib/notificationService";
import { setMaintenanceMode, clearRoomChat } from "../lib/roomService";
import { useToast } from "../lib/toastContext";
import { auth, db } from "../lib/firebase";
import { deleteUser } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { subscribeConversations, Conversation } from "../lib/chatService";

interface SettingsPageProps {
  user: UserProfile;
  isAdmin: boolean;
  friendRequestsCount: number;
  onMenuAction: (action: string) => void;
  onOpenSubPage: (pageId: string) => void;
  onCloseSubPage: () => void;
  onLogout: () => void;
  onAdminRecharge?: () => void;
  onClose: () => void;
  setNavBarVisible?: (visible: boolean) => void;
}

/* ============================================================
   LIGHT THEME COLORS
   ============================================================ */
const C = {
  bg: "#f2f4fc",
  card: "rgba(255,255,255,0.88)",
  cardBorder: "rgba(255,255,255,0.9)",
  text: "#1e293b",          // slate-800
  textMuted: "#64748b",     // slate-500
  textLight: "#94a3b8",     // slate-400
  iconBg: "rgba(139,92,246,0.1)",
  iconText: "#7c3aed",
  divider: "rgba(226,232,240,0.7)",
  accent: "#7c3aed",
  accentSoft: "rgba(139,92,246,0.08)",
  danger: "#ef4444",
  gold: "#d97706",
  green: "#10b981",
};

function BottomSheet({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: C.bg,
        zIndex: 1100,
        display: "flex",
        flexDirection: "column",
        animation: "pageSlideIn 0.25s ease",
        fontFamily: "'Poppins', 'Inter', sans-serif",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 16px 48px" }}>{children}</div>
    </div>
  );
}

export default function SettingsPage({
  user,
  isAdmin,
  friendRequestsCount,
  onMenuAction,
  onOpenSubPage,
  onCloseSubPage,
  onLogout,
  onAdminRecharge,
  onClose,
  setNavBarVisible,
}: SettingsPageProps) {
  const { showToast } = useToast();
  const [showTerms, setShowTerms] = useState(false);
  const [showGodMode, setShowGodMode] = useState(false);
  const [godTab, setGodTab] = useState<string>("deviceBan");
  const [godUserId, setGodUserId] = useState("");
  const [godUser, setGodUser] = useState<UserProfile | null>(null);
  const [godLoading, setGodLoading] = useState(false);
  const [godLevel, setGodLevel] = useState("");
  const [godXp, setGodXp] = useState("");
  const [godTransferTo, setGodTransferTo] = useState("");
  const [godMassDM, setGodMassDM] = useState("");
  const [godMaintMsg, setGodMaintMsg] = useState("");
  const [godVipId, setGodVipId] = useState("");
  const [godBadgeName, setGodBadgeName] = useState("");
  const [godBadgeIcon, setGodBadgeIcon] = useState("");

  const [privacyContent, setPrivacyContent] = useState<string>("");
  const [termsContent, setTermsContent] = useState<string>("");
  const [showPrivacy, setShowPrivacy] = useState(false);

  const [showClearChatCache, setShowClearChatCache] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvIds, setSelectedConvIds] = useState<Set<string>>(new Set());
  const [showDeleteReason, setShowDeleteReason] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [otherReasonText, setOtherReasonText] = useState("");
  const [appVersion] = useState("2.0.0");
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [notifMessages, setNotifMessages] = useState(() => localStorage.getItem("notif_messages") !== "false");
  const [notifFollows, setNotifFollows] = useState(() => localStorage.getItem("notif_follows") !== "false");
  const [notifOnline, setNotifOnline] = useState(() => localStorage.getItem("notif_online") !== "false");

  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") {
      showToast("Notifications not supported on this browser", "error");
      return;
    }
    if (Notification.permission === "denied") {
      showToast("Notifications blocked — please enable from browser settings", "warning", "🔔");
      return;
    }
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === "granted") showToast("Notifications enabled! 🔔", "success");
    else showToast("Notification permission not granted", "warning");
  };

  const toggleNotif = (key: "messages" | "follows" | "online", val: boolean) => {
    localStorage.setItem(`notif_${key}`, String(val));
    if (key === "messages") setNotifMessages(val);
    if (key === "follows") setNotifFollows(val);
    if (key === "online") setNotifOnline(val);
    if (val && notifPermission !== "granted") requestNotifPermission();
  };

  useEffect(() => {
    if (setNavBarVisible) setNavBarVisible(false);
    return () => {
      if (setNavBarVisible) setNavBarVisible(true);
    };
  }, [setNavBarVisible]);

  useEffect(() => {
    if (!user?.uid) return;
    if (showClearChatCache) {
      const unsub = subscribeConversations(user.uid, setConversations);
      return unsub;
    }
    return;
  }, [showClearChatCache, user?.uid]);

  const handleClearSelected = async () => {
    if (selectedConvIds.size === 0) return;
    for (const convId of selectedConvIds) {
      const convRef = ref(db, `conversations/${user.uid}/${convId}`);
      await set(convRef, null);
    }
    showToast(`${selectedConvIds.size} conversation(s) cleared`, "success");
    setSelectedConvIds(new Set());
    setShowClearChatCache(false);
  };

  const handleDeleteWithReason = async () => {
    if (!deleteReason && !otherReasonText) {
      showToast("Please select a reason", "warning");
      return;
    }
    const finalReason = deleteReason === "Other" ? otherReasonText : deleteReason;
    if (!confirm(`Delete account permanently?\nReason: ${finalReason}`)) return;
    try {
      const fbUser = auth.currentUser;
      if (fbUser && fbUser.uid === user.uid) {
        await set(ref(db, `users/${user.uid}`), null);
        await deleteUser(fbUser);
        showToast("Account deleted", "success");
        onLogout();
      } else showToast("No authenticated user", "error");
    } catch (error: any) {
      if (error.code === "auth/requires-recent-login")
        showToast("Please log out and log in again", "warning");
      else showToast("Delete failed", "error");
    }
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    await new Promise((r) => setTimeout(r, 800));
    setLatestVersion("2.0.0");
    showToast("Your current app is the latest version.", "success");
    setCheckingUpdate(false);
  };

  const fetchPolicyContent = async (type: "privacy" | "terms") => {
    try {
      const path = type === "privacy" ? "appConfig/privacyPolicy" : "appConfig/termsOfService";
      const snap = await get(ref(db, path));
      if (snap.exists()) {
        const data = snap.val();
        if (type === "privacy") setPrivacyContent(data.content || "");
        else setTermsContent(data.content || "");
      } else {
        const defaultContent =
          type === "privacy"
            ? "Privacy Policy content not set. Please configure in Admin Panel."
            : "Terms of Service content not set. Please configure in Admin Panel.";
        if (type === "privacy") setPrivacyContent(defaultContent);
        else setTermsContent(defaultContent);
      }
    } catch (error) {
      console.error("Error fetching policy:", error);
      showToast("Failed to load policy content", "error");
      const fallback =
        type === "privacy"
          ? "Privacy Policy is currently unavailable. Please try again later."
          : "Terms of Service are currently unavailable. Please try again later.";
      if (type === "privacy") setPrivacyContent(fallback);
      else setTermsContent(fallback);
    }
  };

  const handlePrivacyClick = async () => {
    await fetchPolicyContent("privacy");
    setShowPrivacy(true);
  };

  const handleTermsClick = async () => {
    await fetchPolicyContent("terms");
    setShowTerms(true);
  };

  const SETTINGS_ITEMS = [
    { icon: "✏️", label: "Edit Profile", desc: "Name, avatar & bio", action: "edit" },
    { icon: "🌍", label: "Language", desc: getCurrentLanguage().toUpperCase(), action: "language" },
    { icon: "📜", label: "Privacy Policy", desc: "Read our privacy policy", action: "privacy" },
    { icon: "⚖️", label: "Terms of Service", desc: "Community guidelines & rules", action: "terms" },
    { icon: "🚫", label: "Blocked Users", desc: `${(user.blockedList || []).length} blocked`, action: "blocked" },
    {
      icon: "🤝",
      label: "Friend Requests",
      desc: friendRequestsCount > 0 ? `${friendRequestsCount} pending` : "No pending",
      action: "friendRequests",
      badge: friendRequestsCount || 0,
    },
    { icon: "👥", label: "Friends List", desc: `${user.friends || 0} friends`, action: "friendsList" },
  ];

  const handleAction = (action: string) => {
    if (action === "privacy") {
      handlePrivacyClick();
      return;
    }
    if (action === "terms") {
      handleTermsClick();
      return;
    }
    if (action === "godMode") {
      setShowGodMode(true);
      return;
    }
    onClose();
    onCloseSubPage();
    onMenuAction(action);
  };

  return (
    <>
      {/* ============ MAIN SETTINGS ============ */}
      <BottomSheet>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: C.text }}>⚙️ Settings</h2>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.9)",
              border: "1px solid rgba(226,232,240,0.8)",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 18,
              color: C.textMuted,
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>
        </div>

        {/* Main list card */}
        <div
          style={{
            background: C.card,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: 20,
            border: `1px solid ${C.cardBorder}`,
            boxShadow: "0 8px 24px rgba(110,100,179,0.06)",
            padding: "6px 0",
            marginBottom: 16,
          }}
        >
          {SETTINGS_ITEMS.map((item, i) => (
            <React.Fragment key={item.label}>
              <button
                onClick={() => handleAction(item.action)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "12px 14px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  borderRadius: 12,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: C.iconBg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 19,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{item.label}</p>
                  <p style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{item.desc}</p>
                </div>
                {"badge" in item && (item as any).badge > 0 && (
                  <span
                    style={{
                      minWidth: 22,
                      height: 22,
                      borderRadius: 11,
                      background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "0 6px",
                      color: "#fff",
                    }}
                  >
                    {(item as any).badge}
                  </span>
                )}
                <span style={{ color: C.textLight, fontSize: 18, fontWeight: 300 }}>›</span>
              </button>
              {i < SETTINGS_ITEMS.length - 1 && (
                <div style={{ height: 1, background: C.divider, marginLeft: 66, marginRight: 14 }} />
              )}
            </React.Fragment>
          ))}

          {/* Clear chat cache */}
          <div style={{ height: 1, background: C.divider, marginLeft: 66, marginRight: 14 }} />
          <button
            onClick={() => setShowClearChatCache(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "12px 14px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              borderRadius: 12,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(139,92,246,0.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: C.iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 19,
                flexShrink: 0,
              }}
            >
              💬
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <p style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>Clear chat cache</p>
              <p style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>Free up space</p>
            </div>
            <span style={{ color: C.textLight, fontSize: 18 }}>›</span>
          </button>
        </div>

        {/* ============ NOTIFICATION SETTINGS ============ */}
        <div
          style={{
            background: C.card,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: 20,
            border: `1px solid ${C.cardBorder}`,
            boxShadow: "0 8px 24px rgba(110,100,179,0.06)",
            padding: "14px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🔔</span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Notifications</p>
                <p style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>
                  {notifPermission === "granted"
                    ? "✅ Enabled"
                    : notifPermission === "denied"
                    ? "🚫 Blocked in browser"
                    : "⚠️ Permission needed"}
                </p>
              </div>
            </div>
            {notifPermission !== "granted" && (
              <button
                onClick={requestNotifPermission}
                style={{
                  background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                  border: "none",
                  borderRadius: 20,
                  padding: "7px 16px",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(124,58,237,0.3)",
                }}
              >
                Enable
              </button>
            )}
          </div>

          {[
            { key: "messages" as const, icon: "💬", label: "Messages", desc: "When someone sends you a message", val: notifMessages },
            { key: "follows" as const, icon: "👥", label: "New Followers", desc: "When someone follows you", val: notifFollows },
            { key: "online" as const, icon: "🟢", label: "Friend Online", desc: "When someone you follow comes online", val: notifOnline },
          ].map((item) => (
            <div
              key={item.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                paddingTop: 10,
                marginTop: 6,
                borderTop: `1px solid ${C.divider}`,
              }}
            >
              <span style={{ fontSize: 17, width: 26, textAlign: "center" }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{item.label}</p>
                <p style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{item.desc}</p>
              </div>
              <button
                onClick={() => toggleNotif(item.key, !item.val)}
                style={{
                  width: 46,
                  height: 26,
                  borderRadius: 13,
                  border: "none",
                  cursor: "pointer",
                  background:
                    item.val && notifPermission === "granted"
                      ? "linear-gradient(135deg,#7c3aed,#a855f7)"
                      : "rgba(148,163,184,0.3)",
                  position: "relative",
                  transition: "background 0.25s",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 3,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    background: "#fff",
                    transition: "left 0.25s",
                    left: item.val && notifPermission === "granted" ? 23 : 3,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                  }}
                />
              </button>
            </div>
          ))}
        </div>

        {/* ============ APP VERSION ============ */}
        <div
          style={{
            background: C.card,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: 20,
            border: `1px solid ${C.cardBorder}`,
            boxShadow: "0 8px 24px rgba(110,100,179,0.06)",
            padding: "14px",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>App Version</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.accent }}>{appVersion}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted }}>Latest Version</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: latestVersion
                  ? latestVersion > appVersion
                    ? C.danger
                    : C.green
                  : C.textLight,
              }}
            >
              {latestVersion || "Unknown"}
            </span>
          </div>
          <button
            onClick={handleCheckUpdate}
            disabled={checkingUpdate}
            style={{
              width: "100%",
              padding: "12px 0",
              background: "linear-gradient(135deg,#7c3aed,#a855f7)",
              border: "none",
              borderRadius: 40,
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              cursor: checkingUpdate ? "default" : "pointer",
              opacity: checkingUpdate ? 0.6 : 1,
              boxShadow: "0 6px 16px rgba(124,58,237,0.25)",
            }}
          >
            {checkingUpdate ? "Checking..." : "Check for Updates"}
          </button>
        </div>

        {/* ============ ADMINISTRATION ============ */}
        {(user.globalRole === "official" || isAdmin) && (
          <div
            style={{
              background: C.card,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderRadius: 20,
              border: `1px solid ${C.cardBorder}`,
              boxShadow: "0 8px 24px rgba(110,100,179,0.06)",
              padding: "10px 0",
              marginBottom: 16,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 800,
                color: C.gold,
                textTransform: "uppercase",
                letterSpacing: 1.4,
                padding: "6px 16px 4px",
                margin: 0,
              }}
            >
              Administration
            </p>

            {(user.globalRole === "official" || isAdmin) && (
              <button
                onClick={() => {
                  onClose();
                  onCloseSubPage();
                  onOpenSubPage("officialRules");
                  onMenuAction("officialRules");
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "12px 14px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: "rgba(6,182,212,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 19,
                  }}
                >
                  📜
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontSize: 14, color: "#0891b2", fontWeight: 700 }}>Official Guidelines</p>
                </div>
                <span style={{ color: C.textLight, fontSize: 18 }}>›</span>
              </button>
            )}

            {isAdmin && (
              <>
                <button
                  onClick={() => handleAction("admin")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "12px 14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: "rgba(217,119,6,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 19,
                    }}
                  >
                    🛡️
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, color: C.gold, fontWeight: 700 }}>Admin Panel</p>
                  </div>
                  <span style={{ color: C.textLight, fontSize: 18 }}>›</span>
                </button>

                <button
                  onClick={() => {
                    onClose();
                    onCloseSubPage();
                    if (onAdminRecharge) onAdminRecharge();
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "12px 14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: "rgba(16,185,129,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 19,
                    }}
                  >
                    💳
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, color: C.green, fontWeight: 700 }}>Recharge Approvals</p>
                    <p style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>Approve UPI recharge requests</p>
                  </div>
                  <span style={{ color: C.textLight, fontSize: 18 }}>›</span>
                </button>

                <button
                  onClick={() => handleAction("godMode")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "12px 14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: "linear-gradient(135deg, rgba(191,0,255,0.15), rgba(6,182,212,0.12))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 19,
                    }}
                  >
                    ⚡
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: C.text }}>
                      <span style={{ color: "#9333ea" }}>God</span>{" "}
                      <span style={{ color: "#0891b2" }}>Mode</span>
                    </p>
                  </div>
                  <span style={{ color: C.textLight, fontSize: 18 }}>›</span>
                </button>

                <button
                  onClick={() => handleAction("reportQueue")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "12px 14px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: "rgba(249,115,22,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 19,
                    }}
                  >
                    📋
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, color: "#ea580c", fontWeight: 700 }}>Report Queue</p>
                  </div>
                  <span style={{ color: C.textLight, fontSize: 18 }}>›</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* ============ DANGER ZONE ============ */}
        <div
          style={{
            background: C.card,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            borderRadius: 20,
            border: `1px solid rgba(239,68,68,0.15)`,
            boxShadow: "0 8px 24px rgba(110,100,179,0.06)",
            padding: "6px 0",
          }}
        >
          <button
            onClick={() => setShowDeleteReason(true)}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "14px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              color: C.danger,
              fontWeight: 700,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            ⚠️ Delete Account
          </button>
          <div style={{ height: 1, background: C.divider, marginLeft: 16, marginRight: 16 }} />
          <button
            onClick={onLogout}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "14px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              color: C.danger,
              fontWeight: 700,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            🚪 Log Out
          </button>
        </div>
      </BottomSheet>

      {/* ============ PRIVACY POLICY ============ */}
      {showPrivacy && (
        <BottomSheet>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 19, fontWeight: 900, color: "#0891b2" }}>📜 Privacy Policy</h2>
            <button
              onClick={() => setShowPrivacy(false)}
              style={{
                background: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(226,232,240,0.8)",
                borderRadius: 12,
                cursor: "pointer",
                fontSize: 18,
                color: C.textMuted,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              background: C.card,
              borderRadius: 20,
              border: `1px solid ${C.cardBorder}`,
              padding: 18,
              boxShadow: "0 8px 24px rgba(110,100,179,0.06)",
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: C.text,
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
              }}
            >
              {privacyContent || "Loading privacy policy..."}
            </div>
          </div>
        </BottomSheet>
      )}

      {/* ============ TERMS OF SERVICE ============ */}
      {showTerms && (
        <BottomSheet>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 19, fontWeight: 900, color: C.gold }}>⚖️ Terms of Service</h2>
            <button
              onClick={() => setShowTerms(false)}
              style={{
                background: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(226,232,240,0.8)",
                borderRadius: 12,
                cursor: "pointer",
                fontSize: 18,
                color: C.textMuted,
                width: 36,
                height: 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>
          </div>
          <div
            style={{
              background: C.card,
              borderRadius: 20,
              border: `1px solid ${C.cardBorder}`,
              padding: 18,
              boxShadow: "0 8px 24px rgba(110,100,179,0.06)",
            }}
          >
            <div
              style={{
                fontSize: 14,
                color: C.text,
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
              }}
            >
              {termsContent || "Loading terms of service..."}
            </div>
          </div>
        </BottomSheet>
      )}

      {/* ============ CLEAR CHAT CACHE ============ */}
      {showClearChatCache && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.4)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 400,
              borderRadius: 24,
              padding: 20,
              maxHeight: "80%",
              overflowY: "auto",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900, color: C.text }}>Clear chat cache</h3>
              <button
                onClick={() => setShowClearChatCache(false)}
                style={{
                  background: "rgba(241,245,249,0.9)",
                  border: "none",
                  fontSize: 18,
                  cursor: "pointer",
                  color: C.textMuted,
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, color: C.text, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={selectedConvIds.size === conversations.length && conversations.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedConvIds(new Set(conversations.map((c) => c.id)));
                    else setSelectedConvIds(new Set());
                  }}
                />
                <span>Select all</span>
              </label>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {conversations.map((conv) => {
                const otherIdx = conv.participants[0] === user.uid ? 1 : 0;
                const name = conv.participantNames[otherIdx];
                const uid = conv.participants[otherIdx];
                return (
                  <label key={conv.id} style={{ display: "flex", alignItems: "center", gap: 8, color: C.text, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={selectedConvIds.has(conv.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedConvIds);
                        if (e.target.checked) newSet.add(conv.id);
                        else newSet.delete(conv.id);
                        setSelectedConvIds(newSet);
                      }}
                    />
                    <div>
                      <p style={{ fontWeight: 600 }}>{name}</p>
                      <p style={{ fontSize: 10, color: C.textMuted }}>ID: {uid}</p>
                    </div>
                  </label>
                );
              })}
            </div>
            <button
              onClick={handleClearSelected}
              disabled={selectedConvIds.size === 0}
              style={{
                width: "100%",
                padding: "12px 0",
                background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                border: "none",
                borderRadius: 40,
                fontWeight: 800,
                color: "#fff",
                fontSize: 14,
                cursor: selectedConvIds.size === 0 ? "default" : "pointer",
                opacity: selectedConvIds.size === 0 ? 0.5 : 1,
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ============ DELETE ACCOUNT REASON ============ */}
      {showDeleteReason && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.4)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxWidth: 400,
              borderRadius: 24,
              padding: 20,
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
          >
            <h3 style={{ fontSize: 17, fontWeight: 900, marginBottom: 8, color: C.text }}>
              Are you sure you want to delete your account?
            </h3>
            <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
              Please let us know the reason you are leaving.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {[
                "I don't like Chalotalk",
                "Privacy problem",
                "Something is broken",
                "Harassment",
                "This content is not original",
                "Other",
              ].map((reason) => (
                <label key={reason} style={{ display: "flex", alignItems: "center", gap: 8, color: C.text, fontSize: 13 }}>
                  <input
                    type="radio"
                    name="deleteReason"
                    value={reason}
                    checked={deleteReason === reason}
                    onChange={() => setDeleteReason(reason)}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
            {deleteReason === "Other" && (
              <textarea
                placeholder="Type your suggestions to us..."
                maxLength={100}
                value={otherReasonText}
                onChange={(e) => setOtherReasonText(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: 12,
                  background: "#f8fafc",
                  border: `1px solid ${C.divider}`,
                  color: C.text,
                  marginBottom: 16,
                  resize: "none",
                  height: 80,
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                }}
              />
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowDeleteReason(false)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: 40,
                  cursor: "pointer",
                  color: C.text,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWithReason}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  background: "linear-gradient(135deg,#ef4444,#f87171)",
                  border: "none",
                  borderRadius: 40,
                  fontWeight: 800,
                  color: "#fff",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ GOD MODE ============ */}
      {showGodMode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: C.bg,
            display: "flex",
            flexDirection: "column",
            maxWidth: 430,
            margin: "0 auto",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "52px 16px 12px",
              background: "linear-gradient(180deg, rgba(139,92,246,0.15) 0%, transparent 100%)",
              borderBottom: "1px solid rgba(139,92,246,0.15)",
            }}
          >
            <button
              onClick={() => setShowGodMode(false)}
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "rgba(255,255,255,0.9)",
                border: "1px solid rgba(139,92,246,0.2)",
                cursor: "pointer",
                fontSize: 18,
                color: C.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ‹
            </button>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: C.accent }}>
              ⚡ God Mode
            </h2>
            <div style={{ width: 38 }} />
          </div>

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              padding: "12px",
              borderBottom: `1px solid ${C.divider}`,
              overflowX: "auto",
            }}
          >
            {(
              [
                ["deviceBan", "📱", "Device Ban"],
                ["shadowBan", "👻", "Shadow Ban"],
                ["roomHijack", "🏠", "Room Hijack"],
                ["diamondTracker", "💎", "Diamond Tracker"],
                ["massDM", "📧", "Mass DM"],
                ["maintenance", "🛠️", "Maintenance"],
                ["idTransfer", "🔄", "ID Transfer"],
                ["vipId", "👑", "VIP ID Gen"],
                ["ghostMode", "👻", "Ghost Mode"],
                ["levelBooster", "📊", "Level Boost"],
                ["badgeTool", "🎖️", "Badges"],
                ["antiScreenshot", "🛡️", "Anti-SS"],
                ["vanishChat", "💨", "Vanish Chat"],
                ["ipTracker", "🌐", "IP Tracker"],
              ] as const
            ).map(([id, icon, label]) => (
              <button
                key={id}
                onClick={() => setGodTab(id)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontSize: 11,
                  fontWeight: 700,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 3,
                  minWidth: 72,
                  background: godTab === id ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.7)",
                  color: godTab === id ? C.accent : C.textMuted,
                  border:
                    godTab === id
                      ? "1px solid rgba(139,92,246,0.35)"
                      : `1px solid ${C.cardBorder}`,
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                  boxShadow: godTab === id ? "0 4px 12px rgba(139,92,246,0.15)" : "none",
                }}
              >
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
            {/* Universal User Lookup */}
            {(godTab === "deviceBan" ||
              godTab === "shadowBan" ||
              godTab === "diamondTracker" ||
              godTab === "levelBooster" ||
              godTab === "badgeTool" ||
              godTab === "idTransfer" ||
              godTab === "vipId") && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input
                    type="text"
                    value={godUserId}
                    onChange={(e) => {
                      setGodUserId(e.target.value);
                      setGodUser(null);
                    }}
                    placeholder="Enter User ID..."
                    style={{
                      flex: 1,
                      padding: "12px 14px",
                      borderRadius: 14,
                      border: `1px solid ${C.cardBorder}`,
                      background: "rgba(255,255,255,0.9)",
                      color: C.text,
                      fontSize: 13,
                      fontFamily: "monospace",
                      outline: "none",
                    }}
                  />
                  <button
                    style={{
                      background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                      color: "#fff",
                      border: "none",
                      fontWeight: 700,
                      padding: "10px 20px",
                      borderRadius: 14,
                      cursor: "pointer",
                      fontSize: 15,
                      boxShadow: "0 4px 12px rgba(124,58,237,0.25)",
                    }}
                    onClick={async () => {
                      if (!godUserId.trim()) return;
                      setGodLoading(true);
                      try {
                        const found = await getUserByUserId(godUserId.trim());
                        setGodUser(found);
                        if (found) {
                          setGodLevel(String(found.level || 1));
                          setGodXp(String(found.xp || 0));
                        } else showToast("User not found", "warning");
                      } catch {
                        showToast("Lookup failed", "error");
                      }
                      setGodLoading(false);
                    }}
                    disabled={godLoading}
                  >
                    {godLoading ? "..." : "🔍"}
                  </button>
                </div>

                {godUser && (
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 16,
                      marginBottom: 12,
                      background: "rgba(255,255,255,0.9)",
                      border: `1px solid ${C.cardBorder}`,
                      boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          fontSize: 18,
                          background: "rgba(139,92,246,0.1)",
                          border: "2px solid rgba(139,92,246,0.25)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                          flexShrink: 0,
                        }}
                      >
                        {godUser.avatar?.startsWith("http") ? (
                          <img
                            src={godUser.avatar}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          godUser.avatar
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 800, color: C.text, margin: 0 }}>{godUser.name}</p>
                        <p
                          style={{
                            fontSize: 11,
                            color: C.textMuted,
                            fontFamily: "monospace",
                            margin: "2px 0 0",
                          }}
                        >
                          ID: {godUser.userId} | Lv.{godUser.level || 1} | 💎
                          {(godUser.coins || 0).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 6,
                        marginBottom:
                          godUser.isBanned || godUser.deviceBanned || godUser.shadowBanned ? 10 : 0,
                      }}
                    >
                      {godUser.isBanned && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "3px 10px",
                            borderRadius: 8,
                            background: "rgba(239,68,68,0.12)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            color: C.danger,
                          }}
                        >
                          🔴 BANNED
                        </span>
                      )}
                      {godUser.deviceBanned && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "3px 10px",
                            borderRadius: 8,
                            background: "rgba(239,68,68,0.12)",
                            border: "1px solid rgba(239,68,68,0.25)",
                            color: C.danger,
                          }}
                        >
                          📱 DEVICE BANNED
                        </span>
                      )}
                      {godUser.shadowBanned && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "3px 10px",
                            borderRadius: 8,
                            background: "rgba(168,85,247,0.12)",
                            border: "1px solid rgba(168,85,247,0.25)",
                            color: "#a855f7",
                          }}
                        >
                          👻 SHADOW BANNED
                        </span>
                      )}
                      {!godUser.isBanned && !godUser.deviceBanned && !godUser.shadowBanned && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: "3px 10px",
                            borderRadius: 8,
                            background: "rgba(16,185,129,0.12)",
                            border: "1px solid rgba(16,185,129,0.25)",
                            color: C.green,
                          }}
                        >
                          🟢 ACTIVE
                        </span>
                      )}
                    </div>

                    {(godUser.isBanned || godUser.deviceBanned || godUser.shadowBanned) && (
                      <button
                        style={{
                          width: "100%",
                          padding: "13px 0",
                          fontSize: 14,
                          fontWeight: 800,
                          background: "rgba(16,185,129,0.12)",
                          border: "2px solid rgba(16,185,129,0.35)",
                          color: C.green,
                          borderRadius: 12,
                          cursor: "pointer",
                        }}
                        onClick={async () => {
                          if (
                            !confirm(
                              `Remove ALL bans from ${godUser.name}? (ID ban, Device ban, Shadow ban — sab hata denge)`
                            )
                          )
                            return;
                          setGodLoading(true);
                          try {
                            const { update: fbUpdate, ref: fbRef } = await import("firebase/database");
                            const { db: fbDb } = await import("../lib/firebase");
                            await fbUpdate(fbRef(fbDb, `users/${godUser.uid}`), {
                              isBanned: false,
                              banUntil: null,
                              bannedBy: null,
                              banReason: null,
                              deviceBanned: false,
                              shadowBanned: false,
                            });
                            showToast(`${godUser.name} — sab bans hata diye!`, "success");
                            setGodUser({
                              ...godUser,
                              isBanned: false,
                              banUntil: null,
                              deviceBanned: false,
                              shadowBanned: false,
                            });
                          } catch {
                            showToast("Unban failed", "error");
                          }
                          setGodLoading(false);
                        }}
                        disabled={godLoading}
                      >
                        ✅ Remove All Bans
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Device Ban */}
            {godTab === "deviceBan" && godUser && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: C.danger, marginBottom: 8, marginTop: 0 }}>
                  📱 Device ID Ban
                </h3>
                <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
                  Permanently ban this user's device. They cannot create new accounts on the same
                  device.
                </p>
                {godUser.isBanned && (
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      marginBottom: 12,
                      textAlign: "center",
                      background: "rgba(239,68,68,0.08)",
                      border: "1px solid rgba(239,68,68,0.2)",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.danger }}>
                      🔴 User is currently BANNED
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: C.danger,
                      fontWeight: 800,
                      borderRadius: 12,
                      cursor: "pointer",
                    }}
                    onClick={async () => {
                      if (!confirm(`Device ban ${godUser.name}? This bans their device permanently.`)) return;
                      setGodLoading(true);
                      try {
                        await deviceBanUser(godUser.uid, user.uid);
                        showToast(`${godUser.name} device banned!`, "success");
                        setGodUser({ ...godUser, deviceBanned: true, isBanned: true });
                      } catch {
                        showToast("Failed to device ban", "error");
                      }
                      setGodLoading(false);
                    }}
                    disabled={godLoading || godUser.deviceBanned}
                  >
                    {godUser.deviceBanned ? "🔴 Already Device Banned" : "🚫 Device Ban"}
                  </button>
                  {(godUser.deviceBanned || godUser.isBanned) && (
                    <button
                      style={{
                        flex: 1,
                        padding: "12px 0",
                        background: "rgba(16,185,129,0.12)",
                        border: "1px solid rgba(16,185,129,0.3)",
                        color: C.green,
                        fontWeight: 800,
                        borderRadius: 12,
                        cursor: "pointer",
                      }}
                      onClick={async () => {
                        if (!confirm(`Remove device ban and unban ${godUser.name}?`)) return;
                        setGodLoading(true);
                        try {
                          await unbanUser(godUser.uid, user.uid);
                          const { update: fbUpdate, ref: fbRef } = await import("firebase/database");
                          const { db: fbDb } = await import("../lib/firebase");
                          await fbUpdate(fbRef(fbDb, `users/${godUser.uid}`), {
                            deviceBanned: false,
                          });
                          showToast(`${godUser.name} fully unbanned!`, "success");
                          setGodUser({ ...godUser, deviceBanned: false, isBanned: false });
                        } catch {
                          showToast("Failed to unban", "error");
                        }
                        setGodLoading(false);
                      }}
                      disabled={godLoading}
                    >
                      ✅ Remove
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Shadow Ban */}
            {godTab === "shadowBan" && godUser && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.9)",
                  border: `1px solid ${godUser.shadowBanned ? "rgba(16,185,129,0.25)" : "rgba(168,85,247,0.2)"}`,
                  boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#a855f7", marginBottom: 8, marginTop: 0 }}>
                  👻 Shadow Ban
                </h3>
                <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 12, lineHeight: 1.6 }}>
                  User can still use the app but their messages are hidden from others.
                </p>
                {godUser.shadowBanned && (
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      marginBottom: 12,
                      textAlign: "center",
                      background: "rgba(168,85,247,0.08)",
                      border: "1px solid rgba(168,85,247,0.2)",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#a855f7" }}>
                      🔴 User is SHADOW BANNED
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  {!godUser.shadowBanned && (
                    <button
                      style={{
                        flex: 1,
                        padding: "12px 0",
                        background: "rgba(168,85,247,0.12)",
                        border: "1px solid rgba(168,85,247,0.3)",
                        color: "#a855f7",
                        fontWeight: 800,
                        borderRadius: 12,
                        cursor: "pointer",
                      }}
                      onClick={async () => {
                        setGodLoading(true);
                        try {
                          await shadowBanUser(godUser.uid, user.uid);
                          showToast(`${godUser.name} shadow banned!`, "success");
                          setGodUser({ ...godUser, shadowBanned: true });
                        } catch {
                          showToast("Failed", "error");
                        }
                        setGodLoading(false);
                      }}
                      disabled={godLoading}
                    >
                      👻 Apply Shadow Ban
                    </button>
                  )}
                  {godUser.shadowBanned && (
                    <button
                      style={{
                        flex: 1,
                        padding: "14px 0",
                        background: "rgba(16,185,129,0.12)",
                        border: "2px solid rgba(16,185,129,0.35)",
                        color: C.green,
                        fontWeight: 800,
                        fontSize: 14,
                        borderRadius: 12,
                        cursor: "pointer",
                      }}
                      onClick={async () => {
                        setGodLoading(true);
                        try {
                          await removeShadowBan(godUser.uid, user.uid);
                          showToast(`Shadow ban removed from ${godUser.name}`, "success");
                          setGodUser({ ...godUser, shadowBanned: false });
                        } catch {
                          showToast("Failed", "error");
                        }
                        setGodLoading(false);
                      }}
                      disabled={godLoading}
                    >
                      ✅ Lift Shadow Ban
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Room Hijack */}
            {godTab === "roomHijack" && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(6,182,212,0.2)",
                  boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0891b2", marginBottom: 8, marginTop: 0 }}>
                  🏠 Room Hijack
                </h3>
                <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, marginBottom: 12 }}>
                  As Super Admin, you automatically bypass all room passwords and join as Owner.
                </p>
                <div
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: "rgba(6,182,212,0.08)",
                    border: "1px solid rgba(6,182,212,0.18)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🛡️</div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#0891b2", margin: 0 }}>ACTIVE</p>
                  <p style={{ fontSize: 11, color: C.textMuted, marginTop: 4 }}>
                    Password bypass + Owner role in all rooms
                  </p>
                </div>
              </div>
            )}

            {/* Diamond Tracker */}
            {godTab === "diamondTracker" && godUser && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(217,119,6,0.2)",
                  boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: C.gold, marginBottom: 8, marginTop: 0 }}>
                  💎 Diamond Tracker
                </h3>
                <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
                  View user's diamond balance and transaction history
                </p>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: "rgba(217,119,6,0.06)",
                    border: "1px solid rgba(217,119,6,0.12)",
                  }}
                >
                  <p style={{ fontSize: 18, fontWeight: 900, color: C.gold, marginBottom: 8, marginTop: 0 }}>
                    💎 {(godUser.coins || 0).toLocaleString()} diamonds
                  </p>
                  <p style={{ fontSize: 11, color: C.textMuted, margin: 0 }}>
                    Level {godUser.level || 1} | XP: {godUser.xp || 0} | VIP:{" "}
                    {godUser.vip ? "Yes" : "No"}
                  </p>
                  {godUser.transactions && (
                    <div style={{ marginTop: 12, maxHeight: 200, overflowY: "auto" }}>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: C.gold,
                          marginBottom: 6,
                          marginTop: 0,
                        }}
                      >
                        Recent Transactions
                      </p>
                      {Object.values(godUser.transactions as Record<string, any>)
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .slice(0, 20)
                        .map((tx, i) => (
                          <div
                            key={i}
                            style={{
                              padding: "6px 0",
                              borderBottom: `1px solid ${C.divider}`,
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 11,
                            }}
                          >
                            <span style={{ color: C.textMuted }}>
                              {tx.description || tx.type}
                            </span>
                            <span
                              style={{
                                color: tx.amount > 0 ? C.green : C.danger,
                                fontWeight: 700,
                              }}
                            >
                              {tx.amount > 0 ? "+" : ""}
                              {tx.amount}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mass DM */}
            {godTab === "massDM" && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(249,115,22,0.2)",
                  boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#ea580c", marginBottom: 8, marginTop: 0 }}>
                  📧 Mass DM
                </h3>
                <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
                  Send a notification to ALL users
                </p>
                <textarea
                  value={godMassDM}
                  onChange={(e) => setGodMassDM(e.target.value)}
                  placeholder="Type your message to all users..."
                  maxLength={500}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(249,115,22,0.25)",
                    background: "#f8fafc",
                    color: C.text,
                    fontSize: 13,
                    fontFamily: "inherit",
                    outline: "none",
                    resize: "none",
                    minHeight: 80,
                    boxSizing: "border-box",
                  }}
                />
                <p
                  style={{
                    fontSize: 10,
                    color: C.textLight,
                    textAlign: "right",
                    marginTop: 4,
                  }}
                >
                  {godMassDM.length}/500
                </p>
                <button
                  style={{
                    marginTop: 8,
                    width: "100%",
                    padding: "12px 0",
                    background: "rgba(249,115,22,0.12)",
                    border: "1px solid rgba(249,115,22,0.3)",
                    color: "#ea580c",
                    fontWeight: 800,
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    if (!godMassDM.trim()) return;
                    if (!confirm(`Send this message to ALL users?`)) return;
                    setGodLoading(true);
                    try {
                      const count = await sendMassDM(godMassDM.trim(), user.uid, user.name);
                      showToast(`Mass DM sent to ${count} users!`, "success");
                      setGodMassDM("");
                    } catch {
                      showToast("Failed to send", "error");
                    }
                    setGodLoading(false);
                  }}
                  disabled={godLoading || !godMassDM.trim()}
                >
                  {godLoading ? "Sending..." : "📧 Send to All Users"}
                </button>
              </div>
            )}

            {/* Maintenance */}
            {godTab === "maintenance" && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: C.danger, marginBottom: 8, marginTop: 0 }}>
                  🛠️ Server Maintenance
                </h3>
                <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
                  Toggle maintenance mode. Non-admin users will see a maintenance screen.
                </p>
                <input
                  type="text"
                  value={godMaintMsg}
                  onChange={(e) => setGodMaintMsg(e.target.value)}
                  placeholder="Maintenance message (optional)..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    marginBottom: 12,
                    border: "1px solid rgba(239,68,68,0.25)",
                    background: "#f8fafc",
                    color: C.text,
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: C.danger,
                      fontWeight: 800,
                      borderRadius: 12,
                      cursor: "pointer",
                    }}
                    onClick={async () => {
                      setGodLoading(true);
                      try {
                        await setMaintenanceMode(true, godMaintMsg || undefined);
                        showToast("Maintenance mode ON", "success");
                      } catch {
                        showToast("Failed", "error");
                      }
                      setGodLoading(false);
                    }}
                    disabled={godLoading}
                  >
                    🛑 Enable
                  </button>
                  <button
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      background: "rgba(16,185,129,0.12)",
                      border: "1px solid rgba(16,185,129,0.3)",
                      color: C.green,
                      fontWeight: 800,
                      borderRadius: 12,
                      cursor: "pointer",
                    }}
                    onClick={async () => {
                      setGodLoading(true);
                      try {
                        await setMaintenanceMode(false);
                        showToast("Maintenance mode OFF", "success");
                      } catch {
                        showToast("Failed", "error");
                      }
                      setGodLoading(false);
                    }}
                    disabled={godLoading}
                  >
                    ✅ Disable
                  </button>
                </div>
              </div>
            )}

            {/* ID Transfer */}
            {godTab === "idTransfer" && godUser && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(6,182,212,0.2)",
                  boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0891b2", marginBottom: 8, marginTop: 0 }}>
                  🔄 ID Transfer
                </h3>
                <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
                  Transfer diamonds, inventory, level & items from this user to another
                </p>
                <input
                  type="text"
                  value={godTransferTo}
                  onChange={(e) => setGodTransferTo(e.target.value)}
                  placeholder="Target User ID to transfer TO..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    marginBottom: 12,
                    border: "1px solid rgba(6,182,212,0.25)",
                    background: "#f8fafc",
                    color: C.text,
                    fontSize: 13,
                    fontFamily: "monospace",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    background: "rgba(6,182,212,0.12)",
                    border: "1px solid rgba(6,182,212,0.3)",
                    color: "#0891b2",
                    fontWeight: 800,
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    if (!godTransferTo.trim()) return;
                    const target = await getUserByUserId(godTransferTo.trim());
                    if (!target) {
                      showToast("Target user not found", "warning");
                      return;
                    }
                    if (!confirm(`Transfer all data from ${godUser.name} to ${target.name}?`)) return;
                    setGodLoading(true);
                    try {
                      await transferAccountData(godUser.uid, target.uid);
                      showToast(`Transfer complete: ${godUser.name} -> ${target.name}`, "success");
                    } catch {
                      showToast("Transfer failed", "error");
                    }
                    setGodLoading(false);
                  }}
                  disabled={godLoading || !godTransferTo.trim()}
                >
                  {godLoading ? "Transferring..." : "🔄 Transfer Data"}
                </button>
              </div>
            )}

            {/* VIP ID */}
            {godTab === "vipId" && godUser && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(217,119,6,0.2)",
                  boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: C.gold, marginBottom: 8, marginTop: 0 }}>
                  👑 VIP ID Generator
                </h3>
                <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
                  Assign a custom VIP user ID (e.g. "1", "007", "VIP") to a user
                </p>
                <input
                  type="text"
                  value={godVipId}
                  onChange={(e) => setGodVipId(e.target.value)}
                  placeholder="New VIP ID (e.g. 007, VIP, 1)..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    marginBottom: 12,
                    border: "1px solid rgba(217,119,6,0.25)",
                    background: "#f8fafc",
                    color: C.text,
                    fontSize: 13,
                    fontFamily: "monospace",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    background: "linear-gradient(135deg, rgba(217,119,6,0.15), rgba(217,119,6,0.08))",
                    border: "1px solid rgba(217,119,6,0.35)",
                    color: C.gold,
                    fontWeight: 800,
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    if (!godVipId.trim()) return;
                    if (!confirm(`Assign VIP ID "${godVipId.trim()}" to ${godUser.name}?`)) return;
                    setGodLoading(true);
                    try {
                      const ok = await createVipUserId(godVipId.trim(), godUser.uid);
                      if (ok) showToast(`VIP ID "${godVipId.trim()}" assigned!`, "success");
                      else showToast("ID already taken", "warning");
                    } catch {
                      showToast("Failed", "error");
                    }
                    setGodLoading(false);
                  }}
                  disabled={godLoading || !godVipId.trim()}
                >
                  {godLoading ? "Assigning..." : "👑 Assign VIP ID"}
                </button>
              </div>
            )}

            {/* Ghost Mode */}
            {godTab === "ghostMode" && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(139,92,246,0.2)",
                  boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: C.accent, marginBottom: 8, marginTop: 0 }}>
                  👻 Ghost Mode
                </h3>
                <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, marginBottom: 12 }}>
                  When enabled, you appear invisible in rooms.
                </p>
                <button
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    background: user.ghostMode
                      ? "rgba(16,185,129,0.12)"
                      : "rgba(139,92,246,0.12)",
                    border: user.ghostMode
                      ? "1px solid rgba(16,185,129,0.3)"
                      : "1px solid rgba(139,92,246,0.3)",
                    color: user.ghostMode ? C.green : C.accent,
                    fontWeight: 800,
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    setGodLoading(true);
                    try {
                      await updateUser(user.uid, { ghostMode: !user.ghostMode } as any);
                      showToast(user.ghostMode ? "Ghost Mode OFF" : "Ghost Mode ON", "success");
                    } catch {
                      showToast("Failed", "error");
                    }
                    setGodLoading(false);
                  }}
                  disabled={godLoading}
                >
                  {user.ghostMode ? "👁️ Become Visible" : "👻 Go Ghost"}
                </button>
              </div>
            )}

            {/* Level Booster */}
            {godTab === "levelBooster" && godUser && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(59,130,246,0.2)",
                  boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#2563eb", marginBottom: 8, marginTop: 0 }}>
                  📊 Level Booster
                </h3>
                <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
                  Set user's level and XP directly
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: 10,
                        color: C.textMuted,
                        marginBottom: 4,
                        display: "block",
                        fontWeight: 700,
                      }}
                    >
                      Level
                    </label>
                    <input
                      type="number"
                      value={godLevel}
                      onChange={(e) => setGodLevel(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid rgba(59,130,246,0.25)",
                        background: "#f8fafc",
                        color: C.text,
                        fontSize: 14,
                        fontWeight: 700,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: 10,
                        color: C.textMuted,
                        marginBottom: 4,
                        display: "block",
                        fontWeight: 700,
                      }}
                    >
                      XP
                    </label>
                    <input
                      type="number"
                      value={godXp}
                      onChange={(e) => setGodXp(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 12,
                        border: "1px solid rgba(59,130,246,0.25)",
                        background: "#f8fafc",
                        color: C.text,
                        fontSize: 14,
                        fontWeight: 700,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
                <button
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    background: "rgba(59,130,246,0.12)",
                    border: "1px solid rgba(59,130,246,0.3)",
                    color: "#2563eb",
                    fontWeight: 800,
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    const lv = parseInt(godLevel);
                    const xp = parseInt(godXp);
                    if (isNaN(lv) || lv < 1 || isNaN(xp) || xp < 0) {
                      showToast("Invalid values", "warning");
                      return;
                    }
                    if (!confirm(`Set ${godUser.name} to Level ${lv}, XP ${xp}?`)) return;
                    setGodLoading(true);
                    try {
                      await setUserLevelXP(godUser.uid, lv, xp);
                      showToast(`Level set to ${lv}!`, "success");
                      setGodUser({ ...godUser, level: lv, xp });
                    } catch {
                      showToast("Failed", "error");
                    }
                    setGodLoading(false);
                  }}
                  disabled={godLoading}
                >
                  {godLoading ? "Setting..." : "📊 Set Level & XP"}
                </button>
              </div>
            )}

            {/* Badge Tool */}
            {godTab === "badgeTool" && godUser && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(217,119,6,0.2)",
                  boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#ea580c", marginBottom: 8, marginTop: 0 }}>
                  🎖️ Custom Badge Tool
                </h3>
                <p style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
                  Add or remove custom badges for this user
                </p>
                {godUser.customBadges && Object.keys(godUser.customBadges).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#ea580c",
                        marginBottom: 6,
                        marginTop: 0,
                      }}
                    >
                      Current Badges:
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {Object.values(godUser.customBadges).map((b: any) => (
                        <div
                          key={b.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "4px 10px",
                            borderRadius: 8,
                            background: "rgba(217,119,6,0.08)",
                            border: "1px solid rgba(217,119,6,0.18)",
                          }}
                        >
                          <span style={{ fontSize: 14 }}>{b.icon}</span>
                          <span style={{ fontSize: 11, color: "#ea580c" }}>{b.name}</span>
                          <button
                            onClick={async () => {
                              await removeCustomBadge(godUser.uid, b.id);
                              const updated = { ...godUser };
                              delete updated.customBadges?.[b.id];
                              setGodUser(updated);
                              showToast("Badge removed", "info");
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: C.danger,
                              fontSize: 12,
                              padding: 0,
                              marginLeft: 4,
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input
                    type="text"
                    value={godBadgeIcon}
                    onChange={(e) => setGodBadgeIcon(e.target.value)}
                    placeholder="Emoji"
                    maxLength={4}
                    style={{
                      width: 60,
                      padding: "10px",
                      borderRadius: 12,
                      textAlign: "center",
                      border: "1px solid rgba(217,119,6,0.25)",
                      background: "#f8fafc",
                      color: C.text,
                      fontSize: 18,
                      outline: "none",
                    }}
                  />
                  <input
                    type="text"
                    value={godBadgeName}
                    onChange={(e) => setGodBadgeName(e.target.value)}
                    placeholder="Badge name..."
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(217,119,6,0.25)",
                      background: "#f8fafc",
                      color: C.text,
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    background: "rgba(217,119,6,0.12)",
                    border: "1px solid rgba(217,119,6,0.3)",
                    color: "#ea580c",
                    fontWeight: 800,
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    if (!godBadgeName.trim() || !godBadgeIcon.trim()) return;
                    setGodLoading(true);
                    try {
                      const id = `badge_${Date.now()}`;
                      await addCustomBadge(godUser.uid, {
                        id,
                        name: godBadgeName.trim(),
                        icon: godBadgeIcon.trim(),
                      });
                      const newBadges = {
                        ...(godUser.customBadges || {}),
                        [id]: { id, name: godBadgeName.trim(), icon: godBadgeIcon.trim() },
                      };
                      setGodUser({ ...godUser, customBadges: newBadges });
                      showToast("Badge added!", "success");
                      setGodBadgeName("");
                      setGodBadgeIcon("");
                    } catch {
                      showToast("Failed", "error");
                    }
                    setGodLoading(false);
                  }}
                  disabled={godLoading || !godBadgeName.trim() || !godBadgeIcon.trim()}
                >
                  {godLoading ? "Adding..." : "🎖️ Add Badge"}
                </button>
              </div>
            )}

            {/* Anti-Screenshot */}
            {godTab === "antiScreenshot" && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: C.danger, marginBottom: 8, marginTop: 0 }}>
                  🛡️ Anti-Screenshot
                </h3>
                <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, marginBottom: 12 }}>
                  This feature adds a CSS overlay that makes screenshots harder.
                </p>
                <button
                  style={{
                    width: "100%",
                    padding: "14px 0",
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    color: C.danger,
                    fontWeight: 800,
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                  onClick={() => {
                    const el = document.getElementById("anti-ss-overlay");
                    if (el) {
                      el.remove();
                      showToast("Anti-Screenshot OFF", "info");
                    } else {
                      const overlay = document.createElement("div");
                      overlay.id = "anti-ss-overlay";
                      overlay.style.cssText =
                        "position:fixed;inset:0;z-index:99999;pointer-events:none;background:repeating-linear-gradient(45deg,transparent,transparent 10px,rgba(191,0,255,0.03) 10px,rgba(191,0,255,0.03) 20px);";
                      document.body.appendChild(overlay);
                      showToast("Anti-Screenshot ON", "success");
                    }
                  }}
                >
                  🛡️ Toggle Anti-Screenshot
                </button>
              </div>
            )}

            {/* Vanish Chat */}
            {godTab === "vanishChat" && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(168,85,247,0.2)",
                  boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#a855f7", marginBottom: 8, marginTop: 0 }}>
                  💨 Vanish Chat
                </h3>
                <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, marginBottom: 12 }}>
                  Clear all messages in a specific room. Enter Room ID to wipe the chat history.
                </p>
                <input
                  type="text"
                  value={godUserId}
                  onChange={(e) => setGodUserId(e.target.value)}
                  placeholder="Enter Room ID..."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid rgba(168,85,247,0.25)",
                    background: "#f8fafc",
                    color: C.text,
                    fontSize: 13,
                    fontFamily: "monospace",
                    outline: "none",
                    marginBottom: 12,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  style={{
                    width: "100%",
                    padding: "12px 0",
                    background: "rgba(168,85,247,0.12)",
                    border: "1px solid rgba(168,85,247,0.3)",
                    color: "#a855f7",
                    fontWeight: 800,
                    borderRadius: 12,
                    cursor: "pointer",
                  }}
                  onClick={async () => {
                    if (!godUserId.trim()) return;
                    if (!confirm(`Clear ALL chat messages in room ${godUserId.trim()}?`)) return;
                    setGodLoading(true);
                    try {
                      await clearRoomChat(godUserId.trim());
                      showToast("Room chat cleared!", "success");
                    } catch {
                      showToast("Failed to clear chat", "error");
                    }
                    setGodLoading(false);
                  }}
                  disabled={godLoading || !godUserId.trim()}
                >
                  {godLoading ? "Clearing..." : "💨 Vanish All Messages"}
                </button>
              </div>
            )}

            {/* IP Tracker */}
            {godTab === "ipTracker" && godUser && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  boxShadow: "0 6px 18px rgba(110,100,179,0.06)",
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: C.green, marginBottom: 8, marginTop: 0 }}>
                  🌐 IP Tracker
                </h3>
                <p style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, marginBottom: 12 }}>
                  View device and connection info for users.
                </p>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: "rgba(16,185,129,0.05)",
                    border: "1px solid rgba(16,185,129,0.12)",
                  }}
                >
                  <div style={{ display: "grid", gap: 10 }}>
                    <div>
                      <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 700 }}>Device ID:</span>
                      <p style={{ fontSize: 12, fontFamily: "monospace", color: C.green, margin: "2px 0 0" }}>
                        {godUser.deviceId || "Not recorded"}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 700 }}>User Agent:</span>
                      <p
                        style={{
                          fontSize: 11,
                          fontFamily: "monospace",
                          color: C.text,
                          wordBreak: "break-all",
                          margin: "2px 0 0",
                        }}
                      >
                        {(godUser as any).userAgent || "Not recorded"}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 700 }}>Last Login:</span>
                      <p style={{ fontSize: 12, color: C.text, margin: "2px 0 0" }}>
                        {(godUser as any).lastLoginAt
                          ? new Date((godUser as any).lastLoginAt).toLocaleString()
                          : "Unknown"}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: C.textMuted, fontWeight: 700 }}>Account Created:</span>
                      <p style={{ fontSize: 12, color: C.text, margin: "2px 0 0" }}>
                        {(godUser as any).createdAt
                          ? new Date((godUser as any).createdAt).toLocaleString()
                          : "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
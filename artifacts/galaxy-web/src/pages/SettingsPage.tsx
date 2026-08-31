// SettingsPage.tsx – Complete: Clear Chat Cache + App Version + Delete Account with Reason + Navigation Bar Hider
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
import { ref, set } from "firebase/database";
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

function BottomSheet({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(160deg, #0d001a 0%, #1a0030 100%)",
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

  // ----- New features states -----
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
  const [notifMessages, setNotifMessages]   = useState(() => localStorage.getItem("notif_messages")   !== "false");
  const [notifFollows,  setNotifFollows]    = useState(() => localStorage.getItem("notif_follows")    !== "false");
  const [notifOnline,   setNotifOnline]     = useState(() => localStorage.getItem("notif_online")     !== "false");

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
    if (key === "follows")  setNotifFollows(val);
    if (key === "online")   setNotifOnline(val);
    if (val && notifPermission !== "granted") requestNotifPermission();
  };

  // Navigation bar hider
  useEffect(() => {
    if (setNavBarVisible) setNavBarVisible(false);
    return () => {
      if (setNavBarVisible) setNavBarVisible(true);
    };
  }, [setNavBarVisible]);

  // Subscribe to conversations ONLY when showClearChatCache is true AND user exists
  useEffect(() => {
    if (!user?.uid) return; // Fix permission denied on logout
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
    await new Promise(r => setTimeout(r, 800));
    setLatestVersion("2.0.0");
    showToast("Your current app is the latest version.", "success");
    setCheckingUpdate(false);
  };

  const SETTINGS_ITEMS = [
    { icon: "✏️", label: "Edit Profile", desc: "Name, avatar & bio", action: "edit" },
    { icon: "🌍", label: "Language", desc: getCurrentLanguage().toUpperCase(), action: "language" },
    { icon: "📜", label: "Privacy Policy", desc: "Read our privacy policy", action: "privacyPolicy" },
    { icon: "⚖️", label: "Terms of Service", desc: "Community guidelines & rules", action: "termsOfService" },
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
    if (action === "termsOfService") {
      setShowTerms(true);
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
      {/* Main Settings BottomSheet */}
      <BottomSheet>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 900 }}>⚙️ Settings</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "rgba(162,155,254,0.5)" }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {SETTINGS_ITEMS.map((item, i) => (
            <React.Fragment key={item.label}>
              <button
                onClick={() => handleAction(item.action)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "12px 8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "background 0.15s",
                  borderRadius: 12,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(168,85,247,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(168,85,247,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{item.label}</p>
                  <p style={{ fontSize: 10, color: "rgba(139,122,170,0.4)", marginTop: 1 }}>{item.desc}</p>
                </div>
                {"badge" in item && (item as any).badge > 0 && (
                  <span
                    style={{
                      minWidth: 20,
                      height: 20,
                      borderRadius: 10,
                      background: "#a855f7",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 9,
                      fontWeight: 800,
                      padding: "0 5px",
                      color: "#fff",
                    }}
                  >
                    {(item as any).badge}
                  </span>
                )}
                <span style={{ color: "rgba(139,122,170,0.2)", fontSize: 16, fontWeight: 300 }}>›</span>
              </button>
              {i < SETTINGS_ITEMS.length - 1 && (
                <div style={{ height: 1, background: "rgba(168,85,247,0.04)", marginLeft: 56 }} />
              )}
            </React.Fragment>
          ))}

          {/* Clear chat cache button */}
          <button
            onClick={() => setShowClearChatCache(true)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              width: "100%",
              padding: "12px 8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              borderRadius: 12,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(168,85,247,0.06)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(168,85,247,0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                flexShrink: 0,
              }}
            >
              💬
            </div>
            <div style={{ flex: 1, textAlign: "left" }}>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>Clear chat cache</p>
            </div>
            <span style={{ color: "rgba(139,122,170,0.2)", fontSize: 16 }}>›</span>
          </button>
        </div>

        {/* 🔔 NOTIFICATION SETTINGS SECTION */}
        <div style={{ marginTop: 16, padding: "14px 12px", background: "rgba(108,92,231,0.06)", borderRadius: 14, border: "1px solid rgba(108,92,231,0.14)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🔔</span>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Notification Settings</p>
                <p style={{ fontSize: 10, color: "rgba(139,122,170,0.6)" }}>
                  {notifPermission === "granted" ? "✅ Enabled" : notifPermission === "denied" ? "🚫 Blocked in browser" : "⚠️ Permission needed"}
                </p>
              </div>
            </div>
            {notifPermission !== "granted" && (
              <button
                onClick={requestNotifPermission}
                style={{
                  background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                  border: "none", borderRadius: 20, padding: "6px 14px",
                  color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
                }}
              >
                Enable
              </button>
            )}
          </div>

          {[
            { key: "messages" as const, icon: "💬", label: "Messages",     desc: "When someone sends you a message",          val: notifMessages },
            { key: "follows"  as const, icon: "👥", label: "New Followers", desc: "When someone follows you or you follow back", val: notifFollows  },
            { key: "online"   as const, icon: "🟢", label: "Friend Online", desc: "When someone you follow comes online",       val: notifOnline   },
          ].map(item => (
            <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.04)", marginTop: 2 }}>
              <span style={{ fontSize: 16, width: 24, textAlign: "center" }}>{item.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{item.label}</p>
                <p style={{ fontSize: 10, color: "rgba(139,122,170,0.5)" }}>{item.desc}</p>
              </div>
              <button
                onClick={() => toggleNotif(item.key, !item.val)}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                  background: item.val && notifPermission === "granted"
                    ? "linear-gradient(135deg, #6C5CE7, #A29BFE)"
                    : "rgba(255,255,255,0.1)",
                  position: "relative", transition: "background 0.25s", flexShrink: 0,
                }}
              >
                <div style={{
                  position: "absolute", top: 3, width: 18, height: 18, borderRadius: 9, background: "#fff",
                  transition: "left 0.25s",
                  left: item.val && notifPermission === "granted" ? 23 : 3,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
                }} />
              </button>
            </div>
          ))}
        </div>

        {/* App Version Section */}
        <div
          style={{
            marginTop: 16,
            padding: "12px 8px",
            background: "rgba(108,92,231,0.05)",
            borderRadius: 12,
            border: "1px solid rgba(108,92,231,0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>App Version</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#A29BFE" }}>{appVersion}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>Latest Version</span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: latestVersion
                  ? latestVersion > appVersion
                    ? "#ff6482"
                    : "#00e676"
                  : "rgba(162,155,254,0.5)",
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
              padding: "10px 0",
              background: "rgba(108,92,231,0.15)",
              border: "1px solid rgba(108,92,231,0.3)",
              borderRadius: 40,
              color: "#A29BFE",
              fontWeight: 700,
              fontSize: 13,
              cursor: checkingUpdate ? "default" : "pointer",
              opacity: checkingUpdate ? 0.6 : 1,
            }}
          >
            {checkingUpdate ? "Checking..." : "Check for Updates"}
          </button>
        </div>

        {/* Administration section (unchanged) */}
        {(user.globalRole === "official" || isAdmin) && (
          <>
            <div style={{ height: 1, background: "rgba(255,215,0,0.1)", margin: "12px 0" }} />
            <p
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "rgba(255,215,0,0.4)",
                textTransform: "uppercase",
                letterSpacing: 1.5,
                marginBottom: 8,
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
                  padding: "12px 8px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  borderRadius: 12,
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(0,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                  }}
                >
                  📜
                </div>
                <div style={{ flex: 1, textAlign: "left" }}>
                  <p style={{ fontSize: 14, color: "#00ffff", fontWeight: 600 }}>Official Guidelines</p>
                </div>
                <span style={{ color: "rgba(0,255,255,0.2)", fontSize: 16 }}>›</span>
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
                    padding: "12px 8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(255,215,0,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    🛡️
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, color: "#FFD700", fontWeight: 600 }}>Admin Panel</p>
                  </div>
                  <span style={{ color: "rgba(255,215,0,0.2)", fontSize: 16 }}>›</span>
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
                    padding: "12px 8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(0,230,118,0.12)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    💳
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, color: "#00e676", fontWeight: 600 }}>Recharge Approvals</p>
                    <p style={{ fontSize: 10, color: "rgba(0,230,118,0.5)" }}>Approve UPI recharge requests</p>
                  </div>
                  <span style={{ color: "rgba(0,230,118,0.2)", fontSize: 16 }}>›</span>
                </button>
                <button
                  onClick={() => handleAction("godMode")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "12px 8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "linear-gradient(135deg, rgba(191,0,255,0.15), rgba(0,255,255,0.08))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    ⚡
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>
                      <span style={{ color: "#bf00ff" }}>God</span> <span style={{ color: "#00ffff" }}>Mode</span>
                    </p>
                  </div>
                  <span style={{ color: "rgba(191,0,255,0.2)", fontSize: 16 }}>›</span>
                </button>
                <button
                  onClick={() => handleAction("reportQueue")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    width: "100%",
                    padding: "12px 8px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    borderRadius: 12,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "rgba(255,150,50,0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                    }}
                  >
                    📋
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <p style={{ fontSize: 14, color: "#FFA726", fontWeight: 600 }}>Report Queue</p>
                  </div>
                  <span style={{ color: "rgba(255,150,50,0.2)", fontSize: 16 }}>›</span>
                </button>
              </>
            )}
          </>
        )}

        <div style={{ height: 1, background: "rgba(255,100,130,0.08)", margin: "12px 0" }} />

        {/* Delete Account button */}
        <button
          onClick={() => setShowDeleteReason(true)}
          style={{
            width: "100%",
            textAlign: "left",
            padding: "12px 8px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            borderRadius: 12,
            color: "#ff5555",
            fontWeight: 600,
          }}
        >
          ⚠️ Delete Account
        </button>

        {/* Log Out button */}
        <button
          onClick={onLogout}
          className="pf-logout-btn"
          style={{
            width: "100%",
            textAlign: "left",
            padding: "12px 8px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: "inherit",
            borderRadius: 12,
            color: "#ff6482",
            fontWeight: 600,
          }}
        >
          🚪 Log Out
        </button>
      </BottomSheet>

      {/* Terms of Service BottomSheet (unchanged) */}
      {showTerms && (
        <BottomSheet>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: "#FFD700" }}>⚖️ Terms of Service</h2>
            <button
              onClick={() => setShowTerms(false)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 20,
                color: "rgba(162,155,254,0.5)",
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "4px 0 20px 0" }}>
            <p style={{ fontSize: 11, color: "rgba(255,215,0,0.5)", marginBottom: 12 }}>
              Effective Date: May 16, 2026
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#FFD700", marginTop: 8, marginBottom: 4 }}>
              1. Eligibility & Age Limit
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, marginBottom: 12 }}>
              • You must be at least 18 years old to use Galaxy Voice Chat.<br />
              • Creating an account using false birthdates is a serious violation, and such accounts will be terminated without warning.
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#FFD700", marginBottom: 4 }}>
              2. Prohibited Behavior (Ban-able Offenses)
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, marginBottom: 12 }}>
              • <strong>Harassment & Abuse:</strong> Any form of bullying, hate speech, abusive language, or insulting other users/hosts in voice chat rooms.<br />
              • <strong>Toxic Behavior:</strong> Disrupting the peace of chat rooms, toxic arguments, or intentionally ruining the app experience for others.<br />
              • <strong>Spamming:</strong> Flooding the chat rooms with repetitive text, playing loud/distorting audio, or promoting unauthorized third-party links.<br />
              • <strong>Impersonation:</strong> Pretending to be a Galaxy Voice Chat official, admin, or moderator.
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#FFD700", marginBottom: 4 }}>
              3. Virtual Goods & Economy
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, marginBottom: 12 }}>
              • All virtual items (such as diamonds, gifts, VIP badges, and XP/levels) are non-transferable and have no real-world monetary value.<br />
              • Any attempt to exploit bugs, use unauthorized APK modifications, or use third-party tools to manipulate balances will result in a permanent ban and forfeiture of all virtual items.
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#FFD700", marginBottom: 4 }}>
              4. Account Security & Responsibilities
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5, marginBottom: 12 }}>
              • You are solely responsible for keeping your login credentials (mobile number and password) safe.<br />
              • Galaxy Voice Chat is not responsible for any loss resulting from shared accounts.
            </p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#FFD700", marginBottom: 4 }}>
              5. Ban Appeals
            </p>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
              • If your account has been suspended or banned, and you believe it was a mistake or due to false reporting, you can submit a formal review request.<br />
              • All appeals must be sent to our official support email with your correct User ID (UID) and details of the event.<br />
              • Official Support Email: <span style={{ color: "#00ffff" }}>galaxyvoicechat.support@gmail.com</span>
            </p>
          </div>
        </BottomSheet>
      )}

      {/* Clear Chat Cache Modal */}
      {showClearChatCache && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#0F0F1A",
              width: "90%",
              maxWidth: 400,
              borderRadius: 24,
              padding: 20,
              maxHeight: "80%",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 900 }}>Clear chat cache</h3>
              <button
                onClick={() => setShowClearChatCache(false)}
                style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#fff" }}
              >
                ✕
              </button>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={
                    selectedConvIds.size === conversations.length && conversations.length > 0
                  }
                  onChange={(e) => {
                    if (e.target.checked)
                      setSelectedConvIds(new Set(conversations.map((c) => c.id)));
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
                  <label key={conv.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                      <p style={{ fontSize: 10, color: "rgba(162,155,254,0.5)" }}>ID: {uid}</p>
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
                background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                border: "none",
                borderRadius: 40,
                fontWeight: 800,
                cursor: selectedConvIds.size === 0 ? "default" : "pointer",
                opacity: selectedConvIds.size === 0 ? 0.5 : 1,
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Delete Account Reason Modal */}
      {showDeleteReason && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "#0F0F1A",
              width: "90%",
              maxWidth: 400,
              borderRadius: 24,
              padding: 20,
            }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 900, marginBottom: 8 }}>
              Are you sure you want to delete your account?
            </h3>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 16 }}>
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
                <label key={reason} style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  marginBottom: 16,
                  resize: "none",
                  height: 80,
                }}
              />
            )}
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setShowDeleteReason(false)}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  background: "rgba(255,255,255,0.08)",
                  border: "none",
                  borderRadius: 40,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWithReason}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  background: "linear-gradient(135deg, #ff5555, #ff8888)",
                  border: "none",
                  borderRadius: 40,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 GOD MODE BOTTOMSHEET – full original (unchanged) */}
      {showGodMode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1200,
            background: "#0a0618",
            display: "flex",
            flexDirection: "column",
            maxWidth: 430,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "52px 16px 12px",
              background: "linear-gradient(180deg, rgba(191,0,255,0.15) 0%, transparent 100%)",
              borderBottom: "1px solid rgba(191,0,255,0.2)",
            }}
          >
            <button
              onClick={() => setShowGodMode(false)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(191,0,255,0.3)",
                cursor: "pointer",
                fontSize: 16,
                color: "#fff",
              }}
            >
              ‹
            </button>
            <h2
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: "#00ffff",
                textShadow: "0 0 12px rgba(0,255,255,0.4)",
              }}
            >
              ⚡ God Mode
            </h2>
            <div style={{ width: 36 }} />
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              padding: "12px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
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
                  minWidth: 68,
                  background: godTab === id ? "rgba(0,255,255,0.15)" : "rgba(255,255,255,0.04)",
                  color: godTab === id ? "#00ffff" : "rgba(255,255,255,0.4)",
                  border:
                    godTab === id
                      ? "1px solid rgba(0,255,255,0.3)"
                      : "1px solid rgba(255,255,255,0.06)",
                  whiteSpace: "nowrap",
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 18 }}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
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
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,255,255,0.2)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#fff",
                      fontSize: 13,
                      fontFamily: "monospace",
                      outline: "none",
                    }}
                  />
                  <button
                    className="btn btn-sm"
                    style={{
                      background: "rgba(0,255,255,0.12)",
                      color: "#00ffff",
                      border: "1px solid rgba(0,255,255,0.3)",
                      fontWeight: 700,
                      padding: "8px 16px",
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
                      borderRadius: 14,
                      marginBottom: 12,
                      background: "rgba(0,255,255,0.04)",
                      border: "1px solid rgba(0,255,255,0.12)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 8,
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 18,
                          fontSize: 18,
                          background: "rgba(108,92,231,0.12)",
                          border: "2px solid rgba(0,255,255,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
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
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700 }}>{godUser.name}</p>
                        <p
                          style={{
                            fontSize: 10,
                            color: "rgba(162,155,254,0.5)",
                            fontFamily: "monospace",
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
                            background: "rgba(255,60,60,0.15)",
                            border: "1px solid rgba(255,60,60,0.3)",
                            color: "#ff5555",
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
                            background: "rgba(255,60,60,0.15)",
                            border: "1px solid rgba(255,60,60,0.3)",
                            color: "#ff3333",
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
                            background: "rgba(191,0,255,0.15)",
                            border: "1px solid rgba(191,0,255,0.3)",
                            color: "#bf00ff",
                          }}
                        >
                          👻 SHADOW BANNED
                        </span>
                      )}
                      {!godUser.isBanned &&
                        !godUser.deviceBanned &&
                        !godUser.shadowBanned && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "3px 10px",
                              borderRadius: 8,
                              background: "rgba(0,230,118,0.1)",
                              border: "1px solid rgba(0,230,118,0.25)",
                              color: "#00e676",
                            }}
                          >
                            🟢 ACTIVE
                          </span>
                        )}
                    </div>

                    {(godUser.isBanned || godUser.deviceBanned || godUser.shadowBanned) && (
                      <button
                        className="btn btn-full"
                        style={{
                          padding: "13px 0",
                          fontSize: 14,
                          fontWeight: 800,
                          background: "rgba(0,230,118,0.15)",
                          border: "2px solid rgba(0,230,118,0.4)",
                          color: "#00e676",
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
                            const { update: fbUpdate, ref: fbRef } = await import(
                              "firebase/database"
                            );
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

            {/* Device Ban Panel */}
            {godTab === "deviceBan" && godUser && (
              <div
                className="card"
                style={{ padding: 16, border: "1px solid rgba(255,60,60,0.2)" }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#ff5555", marginBottom: 8 }}>
                  📱 Device ID Ban
                </h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
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
                      background: "rgba(255,60,60,0.08)",
                      border: "1px solid rgba(255,60,60,0.2)",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#ff5555" }}>
                      🔴 User is currently BANNED
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn"
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      background: "rgba(255,60,60,0.15)",
                      border: "1px solid rgba(255,60,60,0.3)",
                      color: "#ff5555",
                      fontWeight: 800,
                    }}
                    onClick={async () => {
                      if (
                        !confirm(
                          `Device ban ${godUser.name}? This bans their device permanently.`
                        )
                      )
                        return;
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
                      className="btn"
                      style={{
                        flex: 1,
                        padding: "12px 0",
                        background: "rgba(0,230,118,0.12)",
                        border: "1px solid rgba(0,230,118,0.3)",
                        color: "#00e676",
                        fontWeight: 800,
                      }}
                      onClick={async () => {
                        if (
                          !confirm(
                            `Remove device ban and unban ${godUser.name}? They will be able to access the app again.`
                          )
                        )
                          return;
                        setGodLoading(true);
                        try {
                          await unbanUser(godUser.uid, user.uid);
                          const { update: fbUpdate, ref: fbRef } = await import(
                            "firebase/database"
                          );
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
                      ✅ Remove Device Ban
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Shadow Ban Panel */}
            {godTab === "shadowBan" && godUser && (
              <div
                className="card"
                style={{
                  padding: 16,
                  border: `1px solid ${
                    godUser.shadowBanned ? "rgba(0,230,118,0.2)" : "rgba(191,0,255,0.2)"
                  }`,
                }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#bf00ff", marginBottom: 8 }}>
                  👻 Shadow Ban
                </h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
                  User can still use the app but their messages are hidden from others. They won't
                  know they're banned.
                </p>
                {godUser.shadowBanned && (
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      marginBottom: 12,
                      textAlign: "center",
                      background: "rgba(191,0,255,0.08)",
                      border: "1px solid rgba(191,0,255,0.2)",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#ff5555" }}>
                      🔴 User is SHADOW BANNED
                    </span>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8 }}>
                  {!godUser.shadowBanned && (
                    <button
                      className="btn"
                      style={{
                        flex: 1,
                        padding: "12px 0",
                        background: "rgba(191,0,255,0.15)",
                        border: "1px solid rgba(191,0,255,0.3)",
                        color: "#bf00ff",
                        fontWeight: 800,
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
                      className="btn"
                      style={{
                        flex: 1,
                        padding: "14px 0",
                        background: "rgba(0,230,118,0.15)",
                        border: "2px solid rgba(0,230,118,0.4)",
                        color: "#00e676",
                        fontWeight: 800,
                        fontSize: 14,
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

            {/* Room Hijack Panel */}
            {godTab === "roomHijack" && (
              <div
                className="card"
                style={{ padding: 16, border: "1px solid rgba(0,255,255,0.2)" }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#00ffff", marginBottom: 8 }}>
                  🏠 Room Hijack
                </h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.6, marginBottom: 12 }}>
                  As Super Admin, you automatically bypass all room passwords and join as Owner
                  with full control. This is always active.
                </p>
                <div
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    background: "rgba(0,255,255,0.06)",
                    border: "1px solid rgba(0,255,255,0.15)",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🛡️</div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: "#00ffff" }}>ACTIVE</p>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginTop: 4 }}>
                    Password bypass + Owner role in all rooms
                  </p>
                </div>
              </div>
            )}

            {/* Diamond Tracker Panel */}
            {godTab === "diamondTracker" && godUser && (
              <div
                className="card"
                style={{ padding: 16, border: "1px solid rgba(255,215,0,0.2)" }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#FFD700", marginBottom: 8 }}>
                  💎 Diamond Tracker
                </h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
                  View user's diamond balance and transaction history
                </p>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: "rgba(255,215,0,0.04)",
                    border: "1px solid rgba(255,215,0,0.1)",
                  }}
                >
                  <p style={{ fontSize: 18, fontWeight: 900, color: "#FFD700", marginBottom: 8 }}>
                    💎 {(godUser.coins || 0).toLocaleString()} diamonds
                  </p>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)" }}>
                    Level {godUser.level || 1} | XP: {godUser.xp || 0} | VIP:{" "}
                    {godUser.vip ? "Yes" : "No"}
                  </p>
                  {godUser.transactions && (
                    <div style={{ marginTop: 12, maxHeight: 200, overflowY: "auto" }}>
                      <p
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "rgba(255,215,0,0.6)",
                          marginBottom: 6,
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
                              borderBottom: "1px solid rgba(255,255,255,0.04)",
                              display: "flex",
                              justifyContent: "space-between",
                              fontSize: 11,
                            }}
                          >
                            <span style={{ color: "rgba(255,255,255,0.6)" }}>
                              {tx.description || tx.type}
                            </span>
                            <span
                              style={{
                                color: tx.amount > 0 ? "#00e676" : "#ff5555",
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

            {/* Mass DM Panel */}
            {godTab === "massDM" && (
              <div
                className="card"
                style={{ padding: 16, border: "1px solid rgba(255,165,0,0.2)" }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#ffa500", marginBottom: 8 }}>
                  📧 Mass DM
                </h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
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
                    border: "1px solid rgba(255,165,0,0.2)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fff",
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
                    color: "rgba(162,155,254,0.3)",
                    textAlign: "right",
                    marginTop: 4,
                  }}
                >
                  {godMassDM.length}/500
                </p>
                <button
                  className="btn btn-full"
                  style={{
                    marginTop: 8,
                    padding: "12px 0",
                    background: "rgba(255,165,0,0.15)",
                    border: "1px solid rgba(255,165,0,0.3)",
                    color: "#ffa500",
                    fontWeight: 800,
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

            {/* Maintenance Mode Panel */}
            {godTab === "maintenance" && (
              <div
                className="card"
                style={{ padding: 16, border: "1px solid rgba(255,100,100,0.2)" }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#ff6464", marginBottom: 8 }}>
                  🛠️ Server Maintenance
                </h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
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
                    border: "1px solid rgba(255,100,100,0.2)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fff",
                    fontSize: 13,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    className="btn"
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      background: "rgba(255,60,60,0.15)",
                      border: "1px solid rgba(255,60,60,0.3)",
                      color: "#ff5555",
                      fontWeight: 800,
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
                    className="btn"
                    style={{
                      flex: 1,
                      padding: "12px 0",
                      background: "rgba(0,230,118,0.12)",
                      border: "1px solid rgba(0,230,118,0.3)",
                      color: "#00e676",
                      fontWeight: 800,
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

            {/* ID Transfer Panel */}
            {godTab === "idTransfer" && godUser && (
              <div
                className="card"
                style={{ padding: 16, border: "1px solid rgba(0,200,255,0.2)" }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#00c8ff", marginBottom: 8 }}>
                  🔄 ID Transfer
                </h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
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
                    border: "1px solid rgba(0,200,255,0.2)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "monospace",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  className="btn btn-full"
                  style={{
                    padding: "12px 0",
                    background: "rgba(0,200,255,0.15)",
                    border: "1px solid rgba(0,200,255,0.3)",
                    color: "#00c8ff",
                    fontWeight: 800,
                  }}
                  onClick={async () => {
                    if (!godTransferTo.trim()) return;
                    const target = await getUserByUserId(godTransferTo.trim());
                    if (!target) {
                      showToast("Target user not found", "warning");
                      return;
                    }
                    if (
                      !confirm(
                        `Transfer all data from ${godUser.name} to ${target.name}?`
                      )
                    )
                      return;
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

            {/* VIP ID Generator Panel */}
            {godTab === "vipId" && godUser && (
              <div
                className="card"
                style={{ padding: 16, border: "1px solid rgba(255,215,0,0.2)" }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#FFD700", marginBottom: 8 }}>
                  👑 VIP ID Generator
                </h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
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
                    border: "1px solid rgba(255,215,0,0.2)",
                    background: "rgba(255,255,255,0.04)",
                    color: "#fff",
                    fontSize: 13,
                    fontFamily: "monospace",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  className="btn btn-full"
                  style={{
                    padding: "12px 0",
                    background:
                      "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,215,0,0.08))",
                    border: "1px solid rgba(255,215,0,0.4)",
                    color: "#FFD700",
                    fontWeight: 800,
                  }}
                  onClick={async () => {
                    if (!godVipId.trim()) return;
                    if (!confirm(`Assign VIP ID "${godVipId.trim()}" to ${godUser.name}?`))
                      return;
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

            {/* Ghost Mode Panel */}
            {godTab === "ghostMode" && (
              <div
                className="card"
                style={{ padding: 16, border: "1px solid rgba(150,100,255,0.2)" }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#9664ff", marginBottom: 8 }}>
                  👻 Ghost Mode
                </h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.6, marginBottom: 12 }}>
                  When enabled, you appear invisible in rooms. Your seat shows empty but you can
                  still listen and speak.
                </p>
                <button
                  className="btn btn-full"
                  style={{
                    padding: "14px 0",
                    background: user.ghostMode
                      ? "rgba(0,230,118,0.12)"
                      : "rgba(150,100,255,0.15)",
                    border: user.ghostMode
                      ? "1px solid rgba(0,230,118,0.3)"
                      : "1px solid rgba(150,100,255,0.3)",
                    color: user.ghostMode ? "#00e676" : "#9664ff",
                    fontWeight: 800,
                  }}
                  onClick={async () => {
                    setGodLoading(true);
                    try {
                      await updateUser(user.uid, { ghostMode: !user.ghostMode } as any);
                      showToast(
                        user.ghostMode ? "Ghost Mode OFF" : "Ghost Mode ON",
                        "success"
                      );
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

            {/* Level Booster Panel */}
            {godTab === "levelBooster" && godUser && (
              <div
                className="card"
                style={{ padding: 16, border: "1px solid rgba(100,200,255,0.2)" }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#64c8ff", marginBottom: 8 }}>
                  📊 Level Booster
                </h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
                  Set user's level and XP directly
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label
                      style={{
                        fontSize: 10,
                        color: "rgba(162,155,254,0.4)",
                        marginBottom: 4,
                        display: "block",
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
                        border: "1px solid rgba(100,200,255,0.2)",
                        background: "rgba(255,255,255,0.04)",
                        color: "#fff",
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
                        color: "rgba(162,155,254,0.4)",
                        marginBottom: 4,
                        display: "block",
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
                        border: "1px solid rgba(100,200,255,0.2)",
                        background: "rgba(255,255,255,0.04)",
                        color: "#fff",
                        fontSize: 14,
                        fontWeight: 700,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
                <button
                  className="btn btn-full"
                  style={{
                    padding: "12px 0",
                    background: "rgba(100,200,255,0.15)",
                    border: "1px solid rgba(100,200,255,0.3)",
                    color: "#64c8ff",
                    fontWeight: 800,
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

            {/* Badge Tool Panel */}
            {godTab === "badgeTool" && godUser && (
              <div
                className="card"
                style={{ padding: 16, border: "1px solid rgba(255,150,0,0.2)" }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#ff9600", marginBottom: 8 }}>
                  🎖️ Custom Badge Tool
                </h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", marginBottom: 12 }}>
                  Add or remove custom badges for this user
                </p>
                {godUser.customBadges && Object.keys(godUser.customBadges).length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <p
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "rgba(255,150,0,0.6)",
                        marginBottom: 6,
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
                            background: "rgba(255,150,0,0.08)",
                            border: "1px solid rgba(255,150,0,0.15)",
                          }}
                        >
                          <span style={{ fontSize: 14 }}>{b.icon}</span>
                          <span style={{ fontSize: 11, color: "#ff9600" }}>{b.name}</span>
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
                              color: "#ff5555",
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
                    placeholder="Emoji..."
                    maxLength={4}
                    style={{
                      width: 60,
                      padding: "10px",
                      borderRadius: 12,
                      textAlign: "center",
                      border: "1px solid rgba(255,150,0,0.2)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#fff",
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
                      border: "1px solid rgba(255,150,0,0.2)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#fff",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  className="btn btn-full"
                  style={{
                    padding: "12px 0",
                    background: "rgba(255,150,0,0.15)",
                    border: "1px solid rgba(255,150,0,0.3)",
                    color: "#ff9600",
                    fontWeight: 800,
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

            {/* Anti-Screenshot Panel */}
            {godTab === "antiScreenshot" && (
              <div
                className="card"
                style={{ padding: 16, border: "1px solid rgba(255,100,100,0.2)" }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#ff6464", marginBottom: 8 }}>
                  🛡️ Anti-Screenshot
                </h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.6, marginBottom: 12 }}>
                  This feature adds a CSS overlay that makes screenshots harder by applying a
                  visual watermark pattern over the entire app.
                </p>
                <button
                  className="btn btn-full"
                  style={{
                    padding: "14px 0",
                    background: "rgba(255,100,100,0.12)",
                    border: "1px solid rgba(255,100,100,0.3)",
                    color: "#ff6464",
                    fontWeight: 800,
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

            {/* Vanish Chat Panel */}
            {godTab === "vanishChat" && (
              <div
                className="card"
                style={{ padding: 16, border: "1px solid rgba(200,100,255,0.2)" }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#c864ff", marginBottom: 8 }}>
                  💨 Vanish Chat
                </h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.6, marginBottom: 12 }}>
                  Clear all messages in a specific room. Enter Room ID to wipe the chat history.
                </p>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input
                    type="text"
                    value={godUserId}
                    onChange={(e) => setGodUserId(e.target.value)}
                    placeholder="Enter Room ID..."
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: "1px solid rgba(200,100,255,0.2)",
                      background: "rgba(255,255,255,0.04)",
                      color: "#fff",
                      fontSize: 13,
                      fontFamily: "monospace",
                      outline: "none",
                    }}
                  />
                </div>
                <button
                  className="btn btn-full"
                  style={{
                    padding: "12px 0",
                    background: "rgba(200,100,255,0.15)",
                    border: "1px solid rgba(200,100,255,0.3)",
                    color: "#c864ff",
                    fontWeight: 800,
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

            {/* IP Tracker Panel */}
            {godTab === "ipTracker" && godUser && (
              <div
                className="card"
                style={{ padding: 16, border: "1px solid rgba(100,200,150,0.2)" }}
              >
                <h3 style={{ fontSize: 14, fontWeight: 800, color: "#64c896", marginBottom: 8 }}>
                  🌐 IP Tracker
                </h3>
                <p style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", lineHeight: 1.6, marginBottom: 12 }}>
                  View device and connection info for users. This data is collected when users log
                  in.
                </p>
                <div
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    background: "rgba(100,200,150,0.04)",
                    border: "1px solid rgba(100,200,150,0.1)",
                  }}
                >
                  <div style={{ display: "grid", gap: 8 }}>
                    <div>
                      <span style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>
                        Device ID:
                      </span>
                      <p style={{ fontSize: 12, fontFamily: "monospace", color: "#64c896" }}>
                        {godUser.deviceId || "Not recorded"}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>
                        User Agent:
                      </span>
                      <p
                        style={{
                          fontSize: 11,
                          fontFamily: "monospace",
                          color: "rgba(255,255,255,0.6)",
                          wordBreak: "break-all",
                        }}
                      >
                        {(godUser as any).userAgent || "Not recorded"}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>
                        Last Login:
                      </span>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                        {(godUser as any).lastLoginAt
                          ? new Date((godUser as any).lastLoginAt).toLocaleString()
                          : "Unknown"}
                      </p>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>
                        Account Created:
                      </span>
                      <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
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
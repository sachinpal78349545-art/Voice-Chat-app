import React from "react";
import { UserProfile, followUser } from "../lib/userService";
import { Notification, markNotificationRead, markAllNotificationsRead, clearNotifications, sendNotification } from "../lib/notificationService";
import { getOrCreateConversation } from "../lib/chatService";
import { useToast } from "../lib/toastContext";

interface Props {
  user: UserProfile;
  notifications: Notification[];
  onMessage?: (uid: string) => void;
  onFollowBack?: () => void;
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function NotificationPage({ user, notifications, onMessage, onFollowBack }: Props) {
  const unread = notifications.filter(n => !n.read).length;
  const { showToast } = useToast();

  const handleClear = async () => {
    await clearNotifications(user.uid);
  };

  const handleFollowBack = async (n: Notification) => {
    if (!n.fromUid || !n.fromName) return;
    try {
      await followUser(user.uid, n.fromUid);
      await sendNotification(n.fromUid, {
        type: "follow_back", title: "Followed Back!",
        body: `${user.name} followed you back! You can now chat.`,
        icon: "\u{1F91D}", fromUid: user.uid, fromName: user.name,
      });
      await markNotificationRead(user.uid, n.id);
      showToast(`Following ${n.fromName}!`, "success");
      onFollowBack?.();
    } catch {
      showToast("Failed to follow back", "error");
    }
  };

  const handleMessage = async (n: Notification) => {
    if (!n.fromUid || !n.fromName) return;
    try {
      await getOrCreateConversation(user.uid, user.name, user.avatar, n.fromUid, n.fromName, n.icon || "\u{1F464}");
      showToast(`Chat with ${n.fromName}`, "success");
      onMessage?.(n.fromUid);
    } catch {
      showToast("Could not open chat", "error");
    }
  };

  const handleIgnore = async (n: Notification) => {
    await markNotificationRead(user.uid, n.id);
    showToast("Dismissed", "info");
  };

  const isFollowType = (type: string) => type === "follower" || type === "follow_back" || type === "friend_request";
  const isActionable = (n: Notification) => isFollowType(n.type) && n.fromUid && !n.read;

  return (
    <div className="page-scroll page-enter">
      <div style={{ padding: "52px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h2 style={{ fontSize: 20, fontWeight: 900 }}>{"\u{1F514}"} Notifications</h2>
          {unread > 0 && (
            <span style={{
              background: "rgba(255,100,130,0.15)", border: "1px solid rgba(255,100,130,0.3)",
              borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 800, color: "#ff6482",
            }}>{unread} new</span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          {unread > 0 && (
            <button onClick={() => markAllNotificationsRead(user.uid)} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={handleClear} className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: "rgba(255,100,130,0.6)" }}>
              Clear all
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12, animation: "float 3s ease-in-out infinite" }}>{"\u{1F514}"}</div>
            <p style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>No notifications yet</p>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.4)", lineHeight: 1.5 }}>
              When someone follows you, sends a gift,<br />or interacts with you, it'll appear here
            </p>
          </div>
        ) : (
          notifications.map((n, i) => {
            const showActions = isActionable(n);
            const isFollower = n.type === "follower" && n.fromUid;
            const alreadyFollowing = isFollower && (user.followingList || []).includes(n.fromUid!);

            return (
              <div
                key={n.id}
                onClick={() => { if (!n.read && !showActions) markNotificationRead(user.uid, n.id); }}
                style={{
                  display: "flex", flexDirection: "column", gap: 8, padding: "14px 10px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                  background: n.read ? "transparent" : "rgba(108,92,231,0.06)",
                  borderRadius: 12, marginBottom: 2,
                  animation: `slide-up 0.2s ease ${Math.min(i, 10) * 0.03}s both`,
                  transition: "background 0.2s",
                }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 21, fontSize: 20,
                    background: n.type === "gift" ? "rgba(255,215,0,0.1)"
                      : n.type === "follower" ? "rgba(108,92,231,0.15)"
                      : n.type === "friend_request" ? "rgba(0,230,118,0.1)"
                      : n.type === "room_invite" ? "rgba(0,184,148,0.1)"
                      : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${n.type === "gift" ? "rgba(255,215,0,0.25)"
                      : n.type === "follower" ? "rgba(108,92,231,0.3)"
                      : n.type === "friend_request" ? "rgba(0,230,118,0.25)"
                      : "rgba(255,255,255,0.08)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>{n.icon}</div>
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <p style={{
                      fontSize: 13, fontWeight: n.read ? 500 : 700,
                      color: n.read ? "rgba(255,255,255,0.6)" : "#fff",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{n.fromName || n.title}</p>
                    <p style={{ fontSize: 12, color: "rgba(162,155,254,0.45)", marginTop: 3, lineHeight: 1.4 }}>{n.body}</p>
                    <p style={{ fontSize: 10, color: "rgba(162,155,254,0.25)", marginTop: 4 }}>{formatTimeAgo(n.timestamp)}</p>
                  </div>
                  {!n.read && !showActions && (
                    <div style={{
                      width: 10, height: 10, borderRadius: 5, flexShrink: 0, marginTop: 6,
                      background: "linear-gradient(135deg, #6C5CE7, #A29BFE)",
                      boxShadow: "0 0 8px rgba(108,92,231,0.5)",
                    }} />
                  )}
                </div>

                {showActions && (
                  <div style={{ display: "flex", gap: 6, marginLeft: 54 }}>
                    {isFollower && !alreadyFollowing && (
                      <button onClick={() => handleFollowBack(n)} className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: "5px 12px" }}>
                        {"\u{1F91D}"} Follow Back
                      </button>
                    )}
                    {n.fromUid && (
                      <button onClick={() => handleMessage(n)} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "5px 12px" }}>
                        {"\u{1F4AC}"} Message
                      </button>
                    )}
                    <button onClick={() => handleIgnore(n)} className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: "5px 12px", color: "rgba(162,155,254,0.4)" }}>
                      Ignore
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

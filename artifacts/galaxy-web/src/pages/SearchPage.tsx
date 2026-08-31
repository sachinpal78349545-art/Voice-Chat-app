import React, { useState } from "react";
import { UserProfile, searchUsers, followUser, unfollowUser, isBlocked } from "../lib/userService";
import { getOrCreateConversation } from "../lib/chatService";
import { sendNotification } from "../lib/notificationService";
import { Room, fetchRooms } from "../lib/roomService";
import { useToast } from "../lib/toastContext";

interface Props {
  user: UserProfile;
  onMessage?: (uid: string) => void;
  onBack?: () => void;
}

export default function SearchPage({ user, onMessage, onBack }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserProfile[]>([]);
  const [roomResults, setRoomResults] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tab, setTab] = useState<"users" | "rooms">("users");
  const { showToast } = useToast();

  const handleSearch = async () => {
    const q = query.trim();
    if (q.length < 2) { showToast("Enter at least 2 characters", "info"); return; }
    setLoading(true);
    setSearched(true);
    try {
      const userRes = await searchUsers(q);
      const blockedList = user.blockedList || [];
      setResults(userRes.filter(u => u.uid !== user.uid && !blockedList.includes(u.uid)));

      const allRooms = await fetchRooms();
      const filtered = allRooms.filter(rm =>
        rm.name.toLowerCase().includes(q.toLowerCase()) ||
        rm.id.includes(q) ||
        (rm.topic || "").toLowerCase().includes(q.toLowerCase())
      );
      setRoomResults(filtered);
    } catch {
      showToast("Search failed", "error");
    }
    setLoading(false);
  };

  const handleFollow = async (target: UserProfile) => {
    try {
      const isFollowing = (user.followingList || []).includes(target.uid);
      if (isFollowing) {
        await unfollowUser(user.uid, target.uid);
        showToast(`Unfollowed ${target.name}`, "info");
      } else {
        const result = await followUser(user.uid, target.uid);
        if (result.isMutual) {
          await sendNotification(target.uid, {
            type: "follow_back", title: "Followed Back!",
            body: `${user.name} followed you back! You can now chat.`,
            icon: "\u{1F91D}", fromUid: user.uid, fromName: user.name,
          });
          showToast(`Mutual follow with ${target.name}!`, "success");
        } else {
          await sendNotification(target.uid, {
            type: "follower", title: "New Follower",
            body: `${user.name} started following you`,
            icon: "\u{1F31F}", fromUid: user.uid, fromName: user.name,
          });
          showToast(`Following ${target.name}`, "success");
        }
      }
    } catch {
      showToast("Action failed", "error");
    }
  };

  const handleMessage = async (target: UserProfile) => {
    try {
      await getOrCreateConversation(user.uid, user.name, user.avatar, target.uid, target.name, target.avatar);
      showToast(`Chat with ${target.name}`, "success");
      onMessage?.(target.uid);
    } catch {
      showToast("Could not open chat", "error");
    }
  };

  return (
    <div className="page-scroll page-enter">
      <div style={{ padding: "52px 16px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          {onBack && (
            <button onClick={onBack} className="btn btn-ghost btn-sm" style={{ width: 36, height: 36, padding: 0, borderRadius: 12, fontSize: 18 }}>
              {"\u2039"}
            </button>
          )}
          <h2 style={{ fontSize: 20, fontWeight: 900, flex: 1 }}>{"\u{1F50D}"} Search</h2>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            className="input-field"
            placeholder="Search users or rooms..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSearch()}
            style={{ flex: 1, borderRadius: 22, padding: "12px 18px" }}
            autoFocus
          />
          <button onClick={handleSearch} disabled={loading} className="btn btn-primary" style={{ borderRadius: 22, padding: "12px 20px", fontWeight: 800 }}>
            {loading ? "..." : "\u{1F50D}"}
          </button>
        </div>

        {searched && (
          <div style={{ display: "flex", gap: 0, marginTop: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {(["users", "rooms"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, background: "none", border: "none", cursor: "pointer", padding: "10px 0",
                fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                color: tab === t ? "#A29BFE" : "rgba(162,155,254,0.35)",
                borderBottom: tab === t ? "2px solid #6C5CE7" : "2px solid transparent",
              }}>
                {t === "users" ? `Users (${results.length})` : `Rooms (${roomResults.length})`}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: "0 16px" }}>
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton-card" style={{ display: "flex", gap: 12, alignItems: "center", padding: 14 }}>
                <div className="skeleton skeleton-circle" style={{ width: 48, height: 48 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton skeleton-text" style={{ width: "60%", marginBottom: 6 }} />
                  <div className="skeleton skeleton-text" style={{ width: "40%" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && searched && tab === "users" && results.length === 0 && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{"\u{1F50D}"}</div>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>No users found</p>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.4)" }}>Try a different name or User ID</p>
          </div>
        )}

        {!loading && tab === "users" && results.map((u, i) => {
          const blocked = isBlocked(user, u.uid);
          const isFollowing = (user.followingList || []).includes(u.uid);
          const followsMe = (user.followersList || []).includes(u.uid);
          return (
            <div key={u.uid} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 6px",
              borderBottom: "1px solid rgba(255,255,255,0.04)",
              opacity: blocked ? 0.4 : 1,
              animation: `slide-up 0.25s ease ${i * 0.05}s both`,
            }}>
              <div style={{
                width: 46, height: 46, borderRadius: 23, fontSize: 22,
                background: "linear-gradient(135deg, rgba(108,92,231,0.2), rgba(108,92,231,0.08))",
                border: "2px solid rgba(108,92,231,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                {u.avatar?.startsWith("http") ? (
                  <img src={u.avatar} alt="" style={{ width: "100%", height: "100%", borderRadius: 23, objectFit: "cover" }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; (e.target as HTMLImageElement).parentElement!.textContent = "\u{1F464}"; }} />
                ) : (u.avatar && u.avatar.length <= 4 ? u.avatar : "\u{1F464}")}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>
                  {u.vip && <span className="badge badge-vip" style={{ fontSize: 7, padding: "1px 4px" }}>{"\u{1F451}"}</span>}
                </div>
                <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>
                  {`Lv.${u.level || 1}`} {followsMe && !isFollowing ? " \u2022 Follows you" : ""}
                </p>
              </div>
              {!blocked && (
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => handleMessage(u)} className="btn btn-ghost btn-sm" style={{ fontSize: 10, padding: "5px 8px" }}>
                    {"\u{1F4AC}"}
                  </button>
                  <button onClick={() => handleFollow(u)}
                    className={`btn btn-sm ${isFollowing ? "btn-ghost" : "btn-primary"}`} style={{ fontSize: 10, padding: "5px 10px" }}>
                    {isFollowing ? "Following" : followsMe ? "Follow Back" : "Follow"}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {!loading && searched && tab === "rooms" && roomResults.length === 0 && (
          <div style={{ textAlign: "center", padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>{"\u{1F3A4}"}</div>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>No rooms found</p>
          </div>
        )}

        {!loading && tab === "rooms" && roomResults.map((r, i) => (
          <div key={r.id} className="card" style={{
            marginBottom: 8, padding: 12, cursor: "pointer",
            animation: `slide-up 0.25s ease ${i * 0.05}s both`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, fontSize: 20,
                background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>{r.roomAvatar || r.coverEmoji || "\u{1F3A4}"}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700 }}>{r.name}</p>
                <p style={{ fontSize: 10, color: "rgba(162,155,254,0.4)" }}>by {r.host} {"\u2022"} {r.listeners} listeners</p>
              </div>
              {r.isLive && <span className="badge badge-live" style={{ fontSize: 9 }}><span className="live-dot"/>LIVE</span>}
            </div>
          </div>
        ))}

        {!searched && !loading && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12, animation: "float 3s ease-in-out infinite" }}>{"\u{1F30C}"}</div>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Discover People & Rooms</p>
            <p style={{ fontSize: 12, color: "rgba(162,155,254,0.4)", lineHeight: 1.5 }}>Search by username, User ID, or room name</p>
          </div>
        )}
      </div>
    </div>
  );
}

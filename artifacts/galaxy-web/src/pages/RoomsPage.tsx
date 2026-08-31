import React, { useState, useEffect, useRef } from "react";
import { uploadWithAppCheck } from "../lib/firebase";
import { UserProfile } from "../lib/userService";
import { Room, subscribeRooms, createRoom, subscribeRoom } from "../lib/roomService";
import { useToast } from "../lib/toastContext";

const CATEGORIES = [
  { id: "Chill", icon: "\u{1F319}", label: "Chill" },
  { id: "Music", icon: "\u{1F3B5}", label: "Music" },
  { id: "Talk", icon: "\u{1F4AC}", label: "Talk" },
  { id: "Gaming", icon: "\u{1F3AE}", label: "Gaming" },
  { id: "Comedy", icon: "\u{1F602}", label: "Comedy" },
  { id: "Study", icon: "\u{1F4DA}", label: "Study" },
  { id: "Debate", icon: "\u26A1", label: "Debate" },
  { id: "News", icon: "\u{1F4F0}", label: "News" },
  { id: "Sports", icon: "\u26BD", label: "Sports" },
];

interface Props { user: UserProfile; onJoinRoom: (r: Room) => void; }

export default function RoomsPage({ user, onJoinRoom }: Props) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "Hot" | "New">("All");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Talk");
  const [creating, setCreating] = useState(false);
  const [dpPreview, setDpPreview] = useState<string | null>(null);
  const [dpFile, setDpFile] = useState<File | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [myRoom, setMyRoom] = useState<Room | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const unsub = subscribeRooms(r => { setRooms(r); setLoading(false); });
    return unsub;
  }, []);

  useEffect(() => {
    if (user.hasRoom && user.myRoomId) {
      const unsub = subscribeRoom(user.myRoomId, r => setMyRoom(r));
      return unsub;
    } else {
      setMyRoom(null);
      return undefined;
    }
  }, [user.hasRoom, user.myRoomId]);

  const filtered = rooms.filter(r => {
    if (filter === "Hot") return r.listeners > 5;
    if (filter === "New") return Date.now() - r.createdAt < 3600000;
    return true;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("Please select an image file", "warning");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Image must be under 5MB", "warning");
      return;
    }
    setDpFile(file);
    const reader = new FileReader();
    reader.onload = () => setDpPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setName("");
    setCategory("Talk");
    setDpFile(null);
    setDpPreview(null);
    setIsPrivate(false);
    setPassword("");
    setSelectedGame(null);
    setCreating(false);
  };

  const handleCreate = async () => {
    if (!name.trim()) { showToast("Please enter a room name", "warning"); return; }
    if (creating) return;
    setCreating(true);

    try {
      let roomAvatarUrl: string | undefined;
      if (dpFile) {
        const fileExt = dpFile.name.split(".").pop() || "jpg";
        const path = `room-avatars/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${fileExt}`;
        const result = await uploadWithAppCheck(dpFile, path);
        roomAvatarUrl = result.url;
      }
      const room = await createRoom(user.uid, user.name, user.avatar, name.trim(), category, {
        ...(roomAvatarUrl ? { roomAvatar: roomAvatarUrl } : {}),
        isPrivate: isPrivate,
        ...(isPrivate && password.trim() ? { password: password.trim() } : {}),
        ...(selectedGame ? { initialGame: selectedGame } as any : {}),
      });
      setShowCreate(false);
      resetForm();
      showToast(selectedGame ? `Room created with ${selectedGame}!` : "Room created!", "success");
      onJoinRoom(room);
    } catch (err: any) {
      console.error("Create room error:", err);
      if (err?.message === "ALREADY_HAS_ROOM") {
        showToast("You already have a room! Only one room per user.", "warning");
        setShowCreate(false);
        resetForm();
        return;
      }
      showToast(err?.message || "Failed to create room. Try again.", "error");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-scroll">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "54px 16px 10px" }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>Rooms {"\u{1F3A4}"}</h1>
        {myRoom ? (
          <button className="btn btn-sm" style={{ background: "linear-gradient(135deg, #bf00ff, #6C5CE7)", border: "none", color: "#fff", fontWeight: 800 }} onClick={() => onJoinRoom(myRoom)}>My Room {"\u203A"}</button>
        ) : (
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>{"\uFF0B"} Create</button>
        )}
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.05)", padding: "0 16px" }}>
        {(["All", "Hot", "New"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            background: "none", border: "none", cursor: "pointer", padding: "10px 16px",
            fontFamily: "inherit", fontSize: 14, fontWeight: 700,
            color: filter === f ? "#A29BFE" : "rgba(162,155,254,0.35)",
            borderBottom: filter === f ? "2px solid #6C5CE7" : "2px solid transparent",
            transition: "all 0.2s",
          }}>{f}</button>
        ))}
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton-card" style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
              <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 14 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="skeleton skeleton-text" style={{ width: "60%" }} />
                <div className="skeleton skeleton-text" style={{ width: "40%" }} />
              </div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(162,155,254,0.4)" }}>
            <p style={{ fontSize: 32, marginBottom: 8 }}>{"\u{1F3A4}"}</p>
            <p style={{ fontSize: 14, fontWeight: 600 }}>No rooms yet</p>
            <p style={{ fontSize: 12, marginTop: 4 }}>Create one to get started!</p>
          </div>
        ) : (
          filtered.map((room, i) => (
            <div key={room.id} style={{ animation: `slide-up 0.25s ease ${i * 0.04}s both` }} className="card card-glow" onClick={() => onJoinRoom(room)}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                {room.roomAvatar && room.roomAvatar.startsWith("http") ? (
                  <img src={room.roomAvatar} alt="" style={{
                    width: 48, height: 48, borderRadius: 14, objectFit: "cover",
                    border: "1px solid rgba(108,92,231,0.3)", flexShrink: 0,
                  }} onError={e => { (e.target as HTMLImageElement).style.display = "none"; const p = (e.target as HTMLImageElement).parentElement; if (p) { const d = document.createElement("div"); d.style.cssText = "width:48px;height:48px;border-radius:14px;font-size:24px;background:rgba(108,92,231,0.15);border:1px solid rgba(108,92,231,0.3);display:flex;align-items:center;justify-content:center;flex-shrink:0"; d.textContent = "\u{1F3A4}"; p.replaceChild(d, e.target as HTMLImageElement); }}} />
                ) : (
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, fontSize: 24,
                    background: "rgba(108,92,231,0.15)", border: "1px solid rgba(108,92,231,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>{(() => { const av = room.roomAvatar || room.coverEmoji || "\u{1F3A4}"; return av && av.length <= 4 ? av : "\u{1F3A4}"; })()}</div>
                )}
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{room.name}</span>
                    {room.isLive && <span className="badge badge-live"><span className="live-dot"/>LIVE</span>}
                    {room.password && <span style={{ fontSize: 10, color: "rgba(255,215,0,0.6)" }}>{"\u{1F512}"}</span>}
                    {room.isPrivate && !room.password && <span style={{ fontSize: 10, color: "rgba(255,100,130,0.6)" }}>{"\u{1F510}"}</span>}
                  </div>
                  <p style={{ fontSize: 11, color: "rgba(162,155,254,0.4)", marginBottom: 4 }}>by {room.host}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span className="badge badge-accent" style={{ fontSize: 10 }}>{room.topic}</span>
                    <span style={{ fontSize: 11, color: "rgba(162,155,254,0.4)" }}>{"\u{1F399}"} {room.seats.filter(s => s.userId).length}/{room.seats.length}</span>
                    <span style={{ fontSize: 11, color: "rgba(162,155,254,0.4)" }}>{"\u{1F3A7}"} {room.listeners}</span>
                  </div>
                </div>
                <button
                  className="btn btn-sm"
                  style={{ background: "rgba(108,92,231,0.2)", border: "1px solid rgba(108,92,231,0.4)", color: "#A29BFE", flexShrink: 0 }}
                  onClick={e => { e.stopPropagation(); onJoinRoom(room); }}
                >Join {"\u203A"}</button>
              </div>
            </div>
          ))
        )}
      </div>

      <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />

      {showCreate && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(5,1,18,0.9)", backdropFilter: "blur(16px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
        }} onClick={() => !creating && (setShowCreate(false), resetForm())}>
          <div style={{
            width: "92%", maxWidth: 360, maxHeight: "85vh", overflowY: "auto",
            padding: "28px 22px",
            background: "linear-gradient(160deg, rgba(20,15,40,0.98), rgba(10,8,25,0.98))",
            borderRadius: 28,
            border: "1px solid rgba(108,92,231,0.25)",
            animation: "popIn 0.25s ease",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 18,
          }} onClick={e => e.stopPropagation()}>

            <h2 style={{ fontSize: 20, fontWeight: 900, textAlign: "center" }}>Create Room</h2>

            <button onClick={() => fileRef.current?.click()} disabled={creating} style={{
              width: 100, height: 100, borderRadius: "50%", cursor: "pointer",
              border: dpPreview ? "3px solid #6C5CE7" : "2px dashed rgba(108,92,231,0.4)",
              background: dpPreview ? "transparent" : "rgba(108,92,231,0.08)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              overflow: "hidden", transition: "all 0.2s",
            }}>
              {dpPreview ? (
                <img src={dpPreview} alt="Room DP" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <>
                  <span style={{ fontSize: 28, marginBottom: 2 }}>{"\u{1F4F7}"}</span>
                  <span style={{ fontSize: 9, color: "rgba(162,155,254,0.5)", fontWeight: 700 }}>Upload DP</span>
                </>
              )}
            </button>

            <input
              className="input-field"
              placeholder="Room Name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={creating}
              maxLength={40}
              style={{ width: "100%", textAlign: "center", fontSize: 15, padding: "13px 16px" }}
              autoFocus
            />

            <div style={{ width: "100%" }}>
              <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 8, display: "block" }}>Category</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {CATEGORIES.map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)} disabled={creating} style={{
                    padding: "6px 12px", borderRadius: 12, cursor: "pointer",
                    border: category === c.id ? "1.5px solid #6C5CE7" : "1px solid rgba(255,255,255,0.06)",
                    background: category === c.id ? "rgba(108,92,231,0.2)" : "rgba(255,255,255,0.03)",
                    color: category === c.id ? "#A29BFE" : "rgba(162,155,254,0.5)",
                    fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s",
                  }}>
                    <span style={{ fontSize: 14 }}>{c.icon}</span> {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Game Mode chips — auto-launch a game when room is created */}
            <div style={{ width: "100%" }}>
              <label style={{ fontSize: 11, color: "rgba(162,155,254,0.5)", fontWeight: 700, marginBottom: 8, display: "block" }}>
                🎮 Room Game (optional)
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {[
                  { id: "ludo",   name: "Ludo",     emoji: "🏰", grad: "linear-gradient(135deg,#8b5cf6,#ec4899)" },
                  { id: "snake",  name: "Snake",    emoji: "🐍", grad: "linear-gradient(135deg,#10b981,#06b6d4)" },
                  { id: "tod",    name: "T&D",      emoji: "🍾", grad: "linear-gradient(135deg,#f59e0b,#ef4444)" },
                  { id: "carrom", name: "Carrom",   emoji: "🎱", grad: "linear-gradient(135deg,#7c3aed,#06b6d4)" },
                ].map(g => (
                  <button key={g.id} onClick={() => setSelectedGame(selectedGame === g.id ? null : g.id)} disabled={creating} style={{
                    padding: "8px 4px", borderRadius: 12, cursor: "pointer",
                    border: selectedGame === g.id ? "2px solid #a78bfa" : "1px solid rgba(255,255,255,0.08)",
                    background: selectedGame === g.id ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.03)",
                    fontFamily: "inherit",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    boxShadow: selectedGame === g.id ? "0 0 14px rgba(167,139,250,0.4)" : "none",
                    transition: "all 0.15s",
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10, background: g.grad,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20, filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))",
                    }}>{g.emoji}</div>
                    <span style={{ fontSize: 9, fontWeight: 700, color: selectedGame === g.id ? "#c4b5fd" : "rgba(255,255,255,0.6)" }}>{g.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ width: "100%", display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={() => { setIsPrivate(!isPrivate); if (isPrivate) setPassword(""); }} disabled={creating} style={{
                padding: "8px 14px", borderRadius: 12, cursor: "pointer",
                border: isPrivate ? "1.5px solid #ff6482" : "1px solid rgba(255,255,255,0.06)",
                background: isPrivate ? "rgba(255,100,130,0.1)" : "rgba(255,255,255,0.03)",
                color: isPrivate ? "#ff6482" : "rgba(162,155,254,0.4)",
                fontSize: 12, fontWeight: 700, fontFamily: "inherit",
              }}>
                {isPrivate ? "\u{1F512} Private" : "\u{1F30D} Public"}
              </button>
              {isPrivate && (
                <input
                  className="input-field"
                  placeholder="Password (optional)"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={creating}
                  type="password"
                  maxLength={20}
                  style={{ flex: 1, fontSize: 12, padding: "8px 12px" }}
                />
              )}
            </div>

            <button
              className="btn btn-primary btn-full"
              style={{ padding: "14px 0", fontSize: 16, fontWeight: 800, borderRadius: 16, width: "100%" }}
              onClick={handleCreate}
              disabled={creating || !name.trim()}
            >
              {creating ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <div style={{ width: 18, height: 18, borderRadius: 9, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />
                  Creating...
                </div>
              ) : "Create Room"}
            </button>

            {!creating && (
              <button onClick={() => { setShowCreate(false); resetForm(); }} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "rgba(162,155,254,0.4)", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
              }}>Cancel</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

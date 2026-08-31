import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, User as FBUser, getRedirectResult, signOut } from "firebase/auth";
import { auth } from "./lib/firebase";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { UserProfile, initUser, subscribeUser, setupOnlinePresence, claimDailyReward, isUserBanned, getBanTimeRemaining } from "./lib/userService";
import { Room, subscribeMaintenanceMode, getAutoEntryRoom, createRoom } from "./lib/roomService";
import { subscribeConversations, Conversation } from "./lib/chatService";
import { Notification, subscribeNotifications, GlobalAlert, subscribeGlobalAlerts } from "./lib/notificationService";
import { isSuperAdmin as checkSuperAdmin } from "./lib/userService";
import { ToastProvider, useToast } from "./lib/toastContext";
import AuthPage from "./pages/AuthPage";
import HomePage from "./pages/HomePage";
import RoomsPage from "./pages/RoomsPage";
import VoiceRoomPage from "./pages/VoiceRoomPage";
import ChatsPage from "./pages/ChatsPage";
import ProfilePage from "./pages/ProfilePage";
import EditProfilePage from "./pages/EditProfilePage";
import NotificationPage from "./pages/NotificationPage";
import SearchPage from "./pages/SearchPage";
import ExplorePage from "./pages/ExplorePage";
import RechargePage from "./pages/RechargePage";
import AdminRechargePage from "./pages/AdminRechargePage";
import ProfileViewModal from "./components/ProfileViewModal";
import UserSetupPage from "./pages/UserSetupPage";
import "./index.css";

type NavPage = "home" | "rooms" | "chats" | "moment" | "mine" | "notifications" | "search" | "explore" | "recharge" | "admin-recharge";

const NAV = [
  { id: "home", icon: "\u{1F3E0}", label: "Home" },
  { id: "explore", icon: "\u{1F30C}", label: "Explore" },
  { id: "rooms", icon: "\u{1F3A4}", label: "Rooms" },
  { id: "chats", icon: "\u{1F4AC}", label: "Chats" },
  { id: "mine", icon: "\u{1F464}", label: "Mine" },
] as const;

function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 2200);
    const t2 = setTimeout(() => onDone(), 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);
  return (
    <div className={`splash-screen${fadeOut ? " splash-fade-out" : ""}`}>
      <div className="stars" />
      <div className="splash-content">
        <div className="splash-logo-ring">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Galaxy Voice Chat" className="splash-logo" />
        </div>
        <h1 className="splash-title">Galaxy Voice Chat</h1>
        <p className="splash-tagline">Find your voice, find your galaxy</p>
        <div className="splash-loader">
          <div className="splash-loader-bar" />
        </div>
      </div>
    </div>
  );
}

function AppInner() {
  const [fbUser, setFbUser] = useState<FBUser | null | undefined>(undefined);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [page, setPage] = useState<NavPage>("home");
  const [chatTargetUid, setChatTargetUid] = useState<string | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [pageKey, setPageKey] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [passwordPrompt, setPasswordPrompt] = useState<{ room: Room; pwd: string } | null>(null);
  const [chatActive, setChatActive] = useState(false);
  const [globalAlerts, setGlobalAlerts] = useState<GlobalAlert[]>([]);
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);
  const [subPage, setSubPage] = useState<string | null>(null);
  const [viewedProfile, setViewedProfile] = useState<UserProfile | null>(null);

  const presenceCleanup = useRef<(() => void) | null>(null);
  const userSubCleanup = useRef<(() => void) | null>(null);
  const notifSubCleanup = useRef<(() => void) | null>(null);
  const alertSubCleanup = useRef<(() => void) | null>(null);
  const maintSubCleanup = useRef<(() => void) | null>(null);
  const authResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialized = useRef(false);
  const pageHistoryRef = useRef<NavPage[]>(["home"]);
  const [isOnline, setIsOnline] = useState(true);
  const [isPipMode, setIsPipMode] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    getRedirectResult(auth).then(result => {
      if (result?.user) {
        const u = result.user;
        initUser(u.uid, u.displayName || "Space Traveler", u.email || "", u.photoURL || "\u{1F30C}")
          .then(p => setProfile(p));
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    let offValue: (() => void) | null = null;
    Promise.all([import("firebase/database"), import("./lib/firebase")]).then(([{ ref: dbRef, onValue }, { db }]) => {
      const connRef = dbRef(db, ".info/connected");
      offValue = onValue(connRef, snap => setIsOnline(snap.val() === true)) as unknown as () => void;
    });
    return () => { if (offValue) offValue(); };
  }, []);

  useEffect(() => {
    window.history.pushState({ page: "home" }, "");
    const handlePop = () => {
      const hist = pageHistoryRef.current;
      if (hist.length > 1) {
        hist.pop();
        const prev = hist[hist.length - 1];
        setPage(prev);
        setSubPage(null);
        setViewedProfile(null);
        setPageKey(k => k + 1);
      }
      window.history.pushState({ page: hist[hist.length - 1] ?? "home" }, "");
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (u) {
        if (authResetTimer.current) {
          clearTimeout(authResetTimer.current);
          authResetTimer.current = null;
        }
        if (isInitialized.current) {
          setFbUser(u);
          return;
        }
        isInitialized.current = true;
        try {
          const p = await initUser(u.uid, u.displayName || "Space Traveler", u.email || "", u.photoURL || "\u{1F30C}");
          setProfile(p);
          setFbUser(u);
          setAuthLoading(false);
          
          userSubCleanup.current?.();
          userSubCleanup.current = subscribeUser(u.uid, up => { if (up) setProfile(up); });
          presenceCleanup.current = setupOnlinePresence(u.uid);
          notifSubCleanup.current = subscribeNotifications(u.uid, setNotifications);
          alertSubCleanup.current?.();
          alertSubCleanup.current = subscribeGlobalAlerts(setGlobalAlerts);
          maintSubCleanup.current?.();
          maintSubCleanup.current = subscribeMaintenanceMode(setMaintenance);
          
          const reward = await claimDailyReward(u.uid, p);
          if (reward) {
            showToast(`Daily reward: +${reward.coins} coins! (Day ${reward.streak} streak)`, "success", "\u{1F381}");
          }
          
          try {
            if (checkSuperAdmin(p)) {
              const { wipeDummyRooms } = await import("./lib/roomService");
              wipeDummyRooms().catch(console.error);
            }
          } catch {}
          
          try {
            const autoRoom = await getAutoEntryRoom();
            if (autoRoom && !activeRoom) {
              const { ref, get } = await import("firebase/database");
              const { db } = await import("./lib/firebase");
              const roomSnap = await get(ref(db, `rooms/${autoRoom}`));
              if (roomSnap.exists()) {
                const room = { ...roomSnap.val(), id: autoRoom } as Room;
                setActiveRoom(room);
                changePage("rooms");
              }
            }
          } catch {}
        } catch (err) {
          console.error("Init error:", err);
          showToast("Connection error. Some features may be limited.", "error");
          setAuthLoading(false);
          isInitialized.current = false;
        }
      } else {
        authResetTimer.current = setTimeout(() => {
          isInitialized.current = false;
          setAuthLoading(false);
          setFbUser(null);
          setProfile(null);
          userSubCleanup.current?.();
          userSubCleanup.current = null;
          presenceCleanup.current?.();
          notifSubCleanup.current?.();
          notifSubCleanup.current = null;
          alertSubCleanup.current?.();
          alertSubCleanup.current = null;
          maintSubCleanup.current?.();
          maintSubCleanup.current = null;
        }, 5000);
        setAuthLoading(false);
      }
    });
    return () => {
      unsub();
      if (authResetTimer.current) clearTimeout(authResetTimer.current);
      userSubCleanup.current?.();
      presenceCleanup.current?.();
      notifSubCleanup.current?.();
      alertSubCleanup.current?.();
      maintSubCleanup.current?.();
    };
  }, []);

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  const handleCreateRoom = async () => {
    if (!profile) return;
    try {
      showToast("Creating room...", "info", "🎙️");
      const room = await createRoom(
        profile.uid,
        profile.name || "User",
        profile.avatar || "🎙️",
        `${profile.name || "User"}'s Room`,
        "Music"
      );
      setActiveRoom(room);
      setIsPipMode(false);
    } catch (err: any) {
      if (err?.message === "ALREADY_HAS_ROOM") {
        showToast("You already have an active room!", "info", "🎙️");
        changePage("rooms");
      } else {
        showToast("Couldn't create room. Try again!", "error");
      }
    }
  };

  const changePage = (p: NavPage) => {
    if (p !== "chats") { setChatTargetUid(null); setChatActive(false); }
    setSubPage(null);
    setViewedProfile(null);
    setPage(p);
    setPageKey(k => k + 1);
    pageHistoryRef.current.push(p);
    window.history.pushState({ page: p }, "");
  };

  if (authLoading) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, color: "rgba(162,155,254,0.7)", justifyContent: "center", minHeight: "100vh" }}>
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Galaxy Voice Chat" style={{ width: 64, height: 64, borderRadius: 18, animation: "float 2s ease-in-out infinite, logoGlow 3s ease-in-out infinite" }} />
          <div style={{ width: 36, height: 36, borderRadius: 18, border: "3px solid rgba(108,92,231,0.2)", borderTopColor: "#6C5CE7", animation: "spin 0.8s linear infinite" }} />
          <p style={{ fontSize: 13, fontWeight: 600 }}>Loading Galaxy Voice Chat...</p>
        </div>
      </div>
    );
  }

  if (!fbUser || !profile) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <div className="app-container">
          <AuthPage onDone={() => {}} />
        </div>
      </div>
    );
  }

  if (isUserBanned(profile)) {
    const banRemaining = getBanTimeRemaining(profile);
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <div className="app-container" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 32, textAlign: "center" }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(40,10,20,0.95), rgba(26,15,46,0.98))",
            border: "2px solid rgba(255,60,60,0.3)",
            borderRadius: 24,
            padding: "40px 28px",
            maxWidth: 360,
            width: "100%",
            boxShadow: "0 0 40px rgba(255,0,0,0.15), inset 0 0 60px rgba(255,0,0,0.05)",
          }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{"\u{1F6AB}"}</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#ff4444", marginBottom: 8 }}>Account Suspended</h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: 20 }}>
              Your account has been suspended due to a violation of our community guidelines.
            </p>
            {banRemaining && (
              <div style={{
                background: "rgba(255,60,60,0.1)",
                border: "1px solid rgba(255,60,60,0.2)",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 20,
              }}>
                <p style={{ fontSize: 11, color: "rgba(255,150,150,0.7)", marginBottom: 4 }}>Ban Duration</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: "#ff6666" }}>{banRemaining}</p>
              </div>
            )}
            <button
              className="btn"
              onClick={() => { signOut(auth); }}
              style={{
                width: "100%",
                padding: "14px 0",
                borderRadius: 14,
                background: "rgba(255,60,60,0.15)",
                border: "1px solid rgba(255,60,60,0.3)",
                color: "#ff6666",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >Sign Out</button>
          </div>
        </div>
      </div>
    );
  }

  if (maintenance?.enabled && !checkSuperAdmin(profile)) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <div className="app-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
          <div style={{ textAlign: "center", padding: 32 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>{"\u{1F6E0}\uFE0F"}</div>
            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#bf00ff", marginBottom: 8 }}>Under Maintenance</h2>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.6)", lineHeight: 1.6 }}>{maintenance.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (profile.profileCompleted === false) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <UserSetupPage
          user={fbUser}
          onComplete={() => setProfile(prev => prev ? { ...prev, profileCompleted: true } : prev)}
        />
      </div>
    );
  }

  if (showEdit) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <div className="app-container">
          <EditProfilePage user={profile} onUpdate={setProfile} onBack={() => setShowEdit(false)} />
        </div>
      </div>
    );
  }

  const handleRoomLeave = () => { setActiveRoom(null); setIsPipMode(false); changePage("rooms"); };

  if (activeRoom && !isPipMode) {
    return (
      <div className="app-wrapper">
        <div className="stars" />
        <ErrorBoundary
          fallback={
            <div style={{
              minHeight: "100vh", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg,#0d001a,#1a0030)",
              color: "#fff", fontFamily: "'Poppins','Inter',sans-serif", textAlign: "center", padding: 24,
            }}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🎙️</div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#a78bfa", marginBottom: 8 }}>Room error — connection lost</h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 24 }}>The voice room ran into a problem. You've been safely returned.</p>
              <button onClick={handleRoomLeave} style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", color: "#fff", border: "none", borderRadius: 24, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                Back to Rooms
              </button>
            </div>
          }
        >
          <VoiceRoomPage
            roomId={activeRoom.id}
            user={profile}
            onLeave={handleRoomLeave}
            onMinimize={() => setIsPipMode(true)}
            enteredPassword={(activeRoom as any)._enteredPassword}
            onMessage={(uid) => { setActiveRoom(null); setChatTargetUid(uid); changePage("chats"); }}
          />
        </ErrorBoundary>
      </div>
    );
  }

  const joinRoom = (room: Room) => {
    if (checkSuperAdmin(profile)) {
      setActiveRoom(room);
      return;
    }
    if (room.password && room.password !== "" && room.hostId !== profile.uid && !(room.adminIds || []).includes(profile.uid)) {
      if ((room as any)._enteredPassword) {
        setActiveRoom(room);
      } else {
        setPasswordPrompt({ room, pwd: "" });
      }
    } else {
      setActiveRoom(room);
    }
  };

  return (
    <div className="app-wrapper">
      <div className="stars" />
      <div className="app-container" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
        {!isOnline && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
            background: "linear-gradient(90deg, #1a0030, #2d0050)",
            borderBottom: "1px solid rgba(255,100,100,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, padding: "8px 16px", maxWidth: 400, margin: "0 auto",
          }}>
            <span style={{ fontSize: 14 }}>📡</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#ff9999" }}>No internet connection — reconnecting…</span>
          </div>
        )}
        {(page === "home" || page === "rooms" || (page === "chats" && !chatActive)) && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, maxWidth: 400, margin: "0 auto",
            zIndex: 100,
            display: "flex", alignItems: "center", gap: 8, padding: "10px 12px",
            background: "linear-gradient(180deg, rgba(8,4,24,0.98) 60%, transparent)",
          }}>
            <button onClick={() => changePage("search")} className="btn btn-ghost btn-sm" style={{
              width: 38, height: 38, padding: 0, borderRadius: 12, fontSize: 17,
            }}>🔍</button>
            <div style={{ flex: 1 }} />
            <button onClick={() => changePage("notifications")} className="btn btn-ghost btn-sm" style={{
              width: 38, height: 38, padding: 0, borderRadius: 12, fontSize: 17, position: "relative",
            }}>
              🔔
              {unreadNotifCount > 0 && (
                <span style={{
                  position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, borderRadius: 9,
                  background: "#ff6482", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 800, padding: "0 4px", border: "2px solid #0F0F1A",
                }}>{unreadNotifCount > 9 ? "9+" : unreadNotifCount}</span>
              )}
            </button>
          </div>
        )}

        {globalAlerts.length > 0 && (
          <div className="global-alert-bar">
            <span className="global-alert-icon">📢</span>
            <div className="global-alert-scroll-wrap">
              <div className="global-alert-scroll">
                {globalAlerts.map(a => (
                  <span key={a.id} className="global-alert-text">{a.message}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        <div key={pageKey} className="page-enter" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {page === "home" && <HomePage user={profile} onJoinRoom={joinRoom} onCreateRoom={handleCreateRoom} onViewProfile={(p) => setViewedProfile(p)} />}
          {page === "explore" && <ExplorePage user={profile} onMessage={(uid) => { setChatTargetUid(uid); changePage("chats"); }} onNavigate={(p) => changePage(p as NavPage)} />}
          {page === "rooms" && <RoomsPage user={profile} onJoinRoom={joinRoom} />}
          {page === "chats" && <ChatsPage user={profile} initialChatUid={chatTargetUid} onChatActive={setChatActive} />}
          {page === "moment" && <div>Moments Page (Coming Soon)</div>}
          {page === "notifications" && <NotificationPage user={profile} notifications={notifications} onMessage={(uid) => { setChatTargetUid(uid); changePage("chats"); }} onFollowBack={() => {}} />}
          {page === "search" && <SearchPage user={profile} onMessage={(uid) => { setChatTargetUid(uid); changePage("chats"); }} onBack={() => changePage("home")} />}
          {page === "mine" && (
            <ProfilePage
              user={profile}
              onUpdate={setProfile}
              onLogout={() => { setFbUser(null); setProfile(null); }}
              onEditProfile={() => setShowEdit(true)}
              onMessage={(uid) => { setChatTargetUid(uid); changePage("chats"); }}
              onRecharge={() => changePage("recharge")}
              onAdminRecharge={() => changePage("admin-recharge")}
              onOpenSubPage={(sub: string) => setSubPage(sub)}
              onCloseSubPage={() => setSubPage(null)}
            />
          )}
          {page === "recharge" && (
            <RechargePage user={profile} onBack={() => { changePage("mine"); setSubPage(null); }} />
          )}
          {page === "admin-recharge" && (
            <AdminRechargePage user={profile} onBack={() => { changePage("mine"); setSubPage(null); }} />
          )}
        </div>

        {!chatActive && ["home", "explore", "rooms", "chats", "mine"].includes(page) && !subPage && (
          <nav className="bottom-nav">
            {NAV.map(item => (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => changePage(item.id as NavPage)}
              >
                <span className="nav-icon" style={{ position: "relative" }}>
                  {item.icon}
                  {item.id === "chats" && profile && <ChatBadge uid={profile.uid} />}
                </span>
                <span className="nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
        )}

        {viewedProfile && (
          <ProfileViewModal
            profile={viewedProfile}
            currentUser={profile}
            onClose={() => setViewedProfile(null)}
            onMessage={(uid) => {
              setViewedProfile(null);
              setChatTargetUid(uid);
              changePage("chats");
            }}
          />
        )}

        {passwordPrompt && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(5,1,18,0.85)", backdropFilter: "blur(10px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
          }} onClick={() => setPasswordPrompt(null)}>
            <div style={{
              width: 300, padding: 24, background: "rgba(15,15,26,0.95)", borderRadius: 20,
              border: "1px solid rgba(108,92,231,0.2)", animation: "popIn 0.2s ease",
            }} onClick={e => e.stopPropagation()}>
              <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 4, textAlign: "center", color: "#fff" }}>🔒 Password Required</h3>
              <p style={{ fontSize: 12, color: "rgba(162,155,254,0.5)", textAlign: "center", marginBottom: 16 }}>
                Enter the password to join "{passwordPrompt.room.name}"
              </p>
              <input
                className="input-field"
                type="password"
                placeholder="Room password"
                value={passwordPrompt.pwd}
                onChange={e => setPasswordPrompt({ ...passwordPrompt, pwd: e.target.value })}
                onKeyDown={e => {
                  if (e.key === "Enter" && passwordPrompt.pwd.trim()) {
                    setActiveRoom({ ...passwordPrompt.room, _enteredPassword: passwordPrompt.pwd.trim() } as any);
                    setPasswordPrompt(null);
                  }
                }}
                style={{ marginBottom: 12 }}
                autoFocus
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost" style={{ flex: 1, padding: "10px 0" }} onClick={() => setPasswordPrompt(null)}>Cancel</button>
                <button className="btn btn-primary" style={{ flex: 1, padding: "10px 0" }}
                  disabled={!passwordPrompt.pwd.trim()}
                  onClick={() => {
                    setActiveRoom({ ...passwordPrompt.room, _enteredPassword: passwordPrompt.pwd.trim() } as any);
                    setPasswordPrompt(null);
                  }}>Join</button>
              </div>
            </div>
          </div>
        )}

        {activeRoom && isPipMode && (
          <>
            <div style={{ position: "fixed", left: "-200vw", top: 0, width: 400, height: "100vh", zIndex: -1, pointerEvents: "none", opacity: 0 }}>
              <VoiceRoomPage
                roomId={activeRoom.id}
                user={profile}
                onLeave={handleRoomLeave}
                onMinimize={() => {}}
                enteredPassword={(activeRoom as any)._enteredPassword}
                onMessage={(uid) => { setActiveRoom(null); setIsPipMode(false); setChatTargetUid(uid); changePage("chats"); }}
              />
            </div>
            <div
              onClick={() => setIsPipMode(false)}
              style={{
                position: "fixed", bottom: 90, right: 16, zIndex: 998,
                background: "linear-gradient(135deg,#2d1b69,#1a0d36)",
                border: "2px solid rgba(108,92,231,0.6)",
                borderRadius: 20, padding: "10px 14px",
                display: "flex", alignItems: "center", gap: 10,
                boxShadow: "0 4px 24px rgba(108,92,231,0.45), 0 0 0 1px rgba(162,155,254,0.15)",
                cursor: "pointer", minWidth: 140, maxWidth: 200,
                animation: "float 3s ease-in-out infinite",
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 12, flexShrink: 0,
                background: "rgba(108,92,231,0.2)", border: "1.5px solid rgba(108,92,231,0.4)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
              }}>
                {activeRoom.coverEmoji || "🎙️"}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 800, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activeRoom.name}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: "#2ecc71", animation: "pulse 1.5s ease-in-out infinite" }} />
                  <span style={{ fontSize: 10, color: "rgba(162,155,254,0.8)", fontWeight: 600 }}>Live — tap to return</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ChatBadge({ uid }: { uid: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const unsub = subscribeConversations(uid, (convs: Conversation[]) => {
      const total = convs.reduce((sum: number, c) => sum + ((c.unread || {})[uid] || 0), 0);
      setCount(total);
    });
    return unsub;
  }, [uid]);
  if (count <= 0) return null;
  return (
    <span style={{
      position: "absolute", top: -4, right: -6, minWidth: 14, height: 14, borderRadius: 7,
      background: "#ff6482", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 8, fontWeight: 800, padding: "0 3px", border: "1.5px solid #0F0F1A",
    }}>{count > 9 ? "9+" : count}</span>
  );
}

function AppContent() {
  const [splashDone, setSplashDone] = useState(false);
  if (!splashDone) {
    return <SplashScreen onDone={() => setSplashDone(true)} />;
  }
  return <AppInner />;
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}